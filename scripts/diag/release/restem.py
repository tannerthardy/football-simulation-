"""After the press release: does the receiver get back to his stem, or does his break move with him? (Run Game for
Integration, 2026-11-14.) Same operator on NFL tracking and sim exports; receiver and press selection as
press-release.py (widest WR/TE on his side running a route, non-designed dropback; pressed = nearest DB within 3.0 yd
at the snap and no deeper than 2.5 yd past the line; corners who bail at the snap dropped).
- Break depth: the route's taught break depth, the same both sides: HITCH 5 yd, SLANT 2, OUT 5, GO 10 (a go has no
  break; 10 yd is where a stem must be back on its line). The break frame is the first he reaches it (to 0.6 s after
  the throw, 4 s at most). Off-coverage receivers (no DB within 3 yd) are the on-stem reference.
- Release lateral: his y change from the snap (outward +) when he first reaches 1 yd past the line. Break lateral: the same at the break; break depth: x past the line at the break.
- Change release->break and the slope of break lateral on release lateral: slope about 1 means the break moves with
  the release (no restem); about 0, he works back to the same break point whatever the release did.
Routes: NFL routeRan HITCH, SLANT, OUT, GO; sim route ids hitch/comeback (HITCH), slant, quick_out/out (OUT), go.
  python3 -I restem.py --data <bdb2025 dir> name=a.jsonl.gz,...
"""
import sys, os, json, gzip, csv, math, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
SIM = {'hitch': 'HITCH', 'comeback': 'HITCH', 'slant': 'SLANT', 'quick_out': 'OUT', 'out': 'OUT', 'go': 'GO'}
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
                rt = RR.get((raw['id'], str(P[j].get('id')))) if pf is not None else SIM.get(str(P[j].get('route') or '').split(':')[-1])
                if rt not in ('HITCH', 'SLANT', 'OUT', 'GO'): continue
                x0, y0 = p.pos(j, 0)
                near = [d for d in DBs if p.dist(j, d, 0) <= 3.0 and p.pos(d, 0)[0] <= 2.5]
                pressed = bool(near)
                if pressed:
                    cb = min(near, key=lambda d: p.dist(j, d, 0))
                    if p.pos(cb, min(p.frames - 1, p.k(0.6)))[0] - p.pos(cb, 0)[0] >= 1.0: continue
                lat = lambda k: (p.pos(j, k)[1] - y0) * side
                def v(k):
                    k0, k1 = max(0, k - 1), min(p.frames - 1, k + 1)
                    return ((p.pos(j, k1)[0] - p.pos(j, k0)[0]) / ((k1 - k0) * p.dt), (p.pos(j, k1)[1] - p.pos(j, k0)[1]) * side / ((k1 - k0) * p.dt))
                BD = {'HITCH': 5.0, 'SLANT': 2.0, 'OUT': 5.0, 'GO': 10.0}[rt]
                kb = next((k for k in range(0, kend + 1) if p.pos(j, k)[0] >= BD), None)
                if kb is None: S[('nobreak', pressed, rt)].append(1); continue
                k3 = next((k for k in range(0, kb + 1) if p.pos(j, k)[0] >= 1), kb)
                key = (pressed, rt)
                S[('rel',) + key].append(lat(k3)); S[('brk',) + key].append(lat(kb)); S[('dep',) + key].append(p.pos(j, kb)[0])
                S[('pair',) + key].append((lat(k3), lat(kb)))
    print(f'== {name}')
    for rt in ('HITCH', 'SLANT', 'OUT', 'GO'):
        for pressed in (True, False):
            key = (pressed, rt)
            if not S[('rel',) + key]: continue
            print(f"   {rt:5s} {'press' if pressed else 'off  '}: release lateral {q(S[('rel',) + key])}; break lateral {q(S[('brk',) + key])};"
                  f" break depth {q(S[('dep',) + key])}; change release->break {q([b - a for a, b in S[('pair',) + key]])}; slope {slope(S[('pair',) + key]):.2f}; no break found {len(S[('nobreak', pressed, rt)])}")
