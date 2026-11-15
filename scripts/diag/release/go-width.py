"""Pressed gos: what is their width at 10 yd? (Run Game for Integration, 2026-11-15.) Same receiver selection and press
definition as press-release.py (widest WR/TE on his side running a route, non-designed dropback; pressed = nearest DB
within 3.0 yd at the snap, no deeper than 2.5 yd past the line; corners who bail at the snap dropped). Route GO (NFL
routeRan GO; sim route id go/fade).
- Width: his y change from his alignment (outward +) at the frame he first reaches 10 yd past the line.
- Sideline room: his distance to his own sideline, at the snap and at 10 yd (field 53.3 yd wide).
- Split by the corner between 3 and 10 yd: "on his hip" = the corner within arm's reach (centres 1.2 yd or less) and
  on his inside (corner y inward of his) on at least 0.3 s of those frames; "beaten/off" otherwise.
- Landmark test: least-squares slope of sideline room at 10 yd on sideline room at the snap, per split. Slope near 0
  with a common level: he converges on a landmark from any alignment; slope near 1: he keeps his alignment's room
  (any width is added on top).
  python3 -I go-width.py --data <bdb2025 dir> name=a.jsonl.gz,...
"""
import sys, os, json, gzip, csv, math, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
W = 53.3
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def q(v):
    v = sorted(v)
    if len(v) < 4: return f'- (n {len(v)})'
    return '/'.join(f'{v[int(p * (len(v) - 1))]:.2f}' for p in (.25, .5, .75)) + f' (n {len(v)})'
def slope(pairs):
    if len(pairs) < 6: return float('nan')
    mx = sum(a for a, _ in pairs) / len(pairs); my = sum(b for _, b in pairs) / len(pairs)
    sxx = sum((a - mx) ** 2 for a, _ in pairs)
    return sum((a - mx) * (b - my) for a, b in pairs) / sxx if sxx else float('nan')
for arg in args:
    name, paths = arg.split('=', 1)
    S = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            p = Play(raw); by = raw.get('ball_y', 0); P = raw['players']
            O = [j for j, pl in enumerate(P) if pl['side'] == 'O' and pl['group'] in ('WR', 'TE', 'RB')]
            DBs = [d for d in p.who('D') if P[d]['group'] == 'DB']
            kend = min(p.frames - 1, p.k(min(raw['events'].get('pass_forward', 99) + 0.6, p.end, 4.0)))
            for side in (1, -1):
                mine = [j for j in O if (p.pos(j, 0)[1] - by) * side > 0]
                if not mine: continue
                j = max(mine, key=lambda j: (p.pos(j, 0)[1] - by) * side)
                if P[j]['group'] not in ('WR', 'TE'): continue
                rt = RR.get((raw['id'], str(P[j].get('id')))) if pf is not None else str(P[j].get('route') or '').split(':')[-1].upper()
                if rt not in ('GO', 'FADE'): continue
                x0, y0 = p.pos(j, 0)
                near = [d for d in DBs if p.dist(j, d, 0) <= 3.0 and p.pos(d, 0)[0] <= 2.5]
                if not near: continue
                cb = min(near, key=lambda d: p.dist(j, d, 0))
                if p.pos(cb, min(p.frames - 1, p.k(0.6)))[0] - p.pos(cb, 0)[0] >= 1.0: continue
                k10 = next((k for k in range(0, kend + 1) if p.pos(j, k)[0] >= 10), None)
                if k10 is None: continue
                room = lambda y: (W - y) if side > 0 else y          # distance to his own sideline (ball_y side sign)
                hip = 0
                for k in range(0, k10 + 1):
                    if p.pos(j, k)[0] < 3: continue
                    inside = (p.pos(cb, k)[1] - p.pos(j, k)[1]) * side < 0
                    if inside and p.dist(j, cb, k) <= 1.2: hip += 1
                split = 'on hip' if hip * p.dt >= 0.3 else 'beaten/off'
                r0, r10 = room(y0), room(p.pos(j, k10)[1])
                for sp in (split, 'all'):
                    S[('w', sp)].append((p.pos(j, k10)[1] - y0) * side); S[('r0', sp)].append(r0); S[('r10', sp)].append(r10)
                    S[('pair', sp)].append((r0, r10))
    print(f'== {name}: pressed gos reaching 10 yd')
    for sp in ('all', 'on hip', 'beaten/off'):
        print(f"   {sp:10s} n {len(S[('w', sp)]):4d}: width at 10 yd {q(S[('w', sp)])}; sideline room at snap {q(S[('r0', sp)])}, at 10 yd {q(S[('r10', sp)])}; slope room10 on room0 {slope(S[('pair', sp)]):.2f}")
    # Landmark check by alignment band: does room at 10 yd converge?
    for lo, hi in ((0, 8), (8, 11), (11, 14), (14, 30)):
        for sp in ('on hip', 'beaten/off'):
            v = [b for a, b in S[('pair', sp)] if lo <= a < hi]
            print(f"     aligned {lo}-{hi} yd from sideline, {sp:10s}: room at 10 yd {q(v)}")
