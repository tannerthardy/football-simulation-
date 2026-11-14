"""Corner-route throws with a deep defender in range: what he does from release to arrival. Same operator on NFL
tracking and sim exports (Run Game for Integration, 2026-11-14). Routes as corner-route.py (NFL routeRan CORNER, sim
route id `corner`), non-designed dropbacks, the corner runner targeted, with a throw and an arrival.

The catch point is the receiver's position at arrival. The deep man is the DB or LB with the lowest speed needed to
reach the catch point from where he is at release, over the flight time (distance / flight); bins of that need match
the QB lane's (0-2, 2-4, 4-6, 6-8, 8+ yd/s). "In range" = need under 6 yd/s. For him:
- break onset relative to release: the first frame from 0.5 s before release at which his speed toward the catch
  point exceeds 2 yd/s and stays above it for 0.2 s (negative = before the ball is out);
- his speed and his heading error (velocity vs the line to the catch point, deg) at release, +0.3 s and +0.6 s;
- his distance from the catch point at arrival;
- NFL only (orientation is in the tracking): the angle between his orientation and the line to the passer at release
  (0 = facing the QB);
- the end: interception; incomplete with him within 1.5 yd at arrival (contested) or not; complete with him within
  1.5 yd (contested catch) or not (uncontested). NFL from passResult; sim from the export's labels/events.

  python3 -I corner-throw.py --data <bdb2025 dir> [--list N] name=a.jsonl.gz,...
"""
import sys, os, json, gzip, csv, math, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
LIST = 0
if '--list' in args:
    i = args.index('--list'); LIST = int(args[i + 1]); del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'CORNER': RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = 1
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
BINS = ((0, 2), (2, 4), (4, 6), (6, 8), (8, 99))
def q(v):
    v = sorted(x for x in v if x is not None)
    if len(v) < 3: return f'- (n {len(v)})'
    return '/'.join(f'{v[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75)) + f' (n {len(v)})'
def vel(p, j, k):
    a, b = max(0, k - 1), min(p.frames - 1, k + 1)
    (x0, y0), (x1, y1) = p.pos(j, a), p.pos(j, b)
    if x0 is None or x1 is None or b == a: return (0.0, 0.0)
    return ((x1 - x0) / ((b - a) * p.dt), (y1 - y0) / ((b - a) * p.dt))
for arg in args:
    name, paths = arg.split('=', 1)
    S = collections.defaultdict(list); C = collections.Counter(); ex = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE'): continue
            cell = raw.get('cell') or {}
            if raw.get('source') == 'sim' and DES.search(str(cell.get('concept') or '')): continue
            ev = raw['events']; fw, arr = ev.get('pass_forward'), ev.get('pass_arrived')
            j = raw.get('target')
            if fw is None or arr is None or j is None or arr <= fw: continue
            pl = raw['players'][j]
            if pf is not None: ok = (raw['id'], str(pl.get('id'))) in RR
            else:
                rt = pl.get('route'); ok = bool(rt) and rt.split(':')[-1] == 'corner'
            if not ok: continue
            p = Play(raw); kr, ka = p.k(fw), p.k(arr); flight = arr - fw
            cx, cy = p.pos(j, ka)
            Dd = [d for d in p.who('D') if p.players[d]['group'] in ('DB', 'LB') and p.pos(d, kr)[0] is not None]
            if not Dd: continue
            need = lambda d: math.hypot(p.pos(d, kr)[0] - cx, p.pos(d, kr)[1] - cy) / flight
            dd = min(Dd, key=need); nd = need(dd)
            b = next(i for i, (lo, hi) in enumerate(BINS) if lo <= nd < hi)
            # Outcome.
            if pf is not None:
                res = pf['passResult']; picked = res == 'IN'; comp = res == 'C'
            else:
                lab = raw.get('labels') or {}; picked = bool(lab.get('interception')); comp = 'catch' in ev and not picked
            close = p.dist(j, dd, ka) <= 1.5
            out = 'interception' if picked else ('complete contested' if comp and close else 'complete open' if comp
                                                  else 'incomplete contested' if close else 'incomplete open')
            C[('bin', b)] += 1; C[('comp', b)] += comp
            if nd >= 6: continue
            C['inrange'] += 1; C[out] += 1
            def toward(k):
                vx, vy = vel(p, dd, k); dx, dy = cx - p.pos(dd, k)[0], cy - p.pos(dd, k)[1]; L = math.hypot(dx, dy) or 1
                return (vx * dx + vy * dy) / L, math.hypot(vx, vy), abs(math.degrees(math.atan2(vx * dy - vy * dx, vx * dx + vy * dy))) if math.hypot(vx, vy) > 0.5 else None
            onset = None
            for k in range(max(0, kr - p.k(0.5)), ka + 1):
                if all(toward(kk)[0] > 2.0 for kk in range(k, min(ka, k + 2) + 1)): onset = (k - kr) * p.dt; break
            S['onset'].append(onset if onset is not None else flight)
            for m, k in (('rel', kr), ('+0.3', kr + p.k(0.3)), ('+0.6', kr + p.k(0.6))):
                if k > ka: continue
                tw, sp, err = toward(k); S['speed' + m].append(sp); S['err' + m].append(err); S['close' + m].append(tw)
            S['arrive'].append(p.dist(j, dd, ka)); S['flight'].append(flight); S['need'].append(nd)
            if raw.get('o') is not None and p.players[dd].get('pos') is not None:
                o = raw['o'][kr][dd] if kr < len(raw['o']) else None
                qb = next((i for i, x in enumerate(p.players) if x['group'] == 'QB' and x['side'] == 'O'), None)
                if o is not None and qb is not None:
                    dx, dy = p.pos(qb, kr)[0] - p.pos(dd, kr)[0], p.pos(qb, kr)[1] - p.pos(dd, kr)[1]
                    # NFL orientation: degrees clockwise from the +y axis in field coordinates; in the converted frame x is
                    # past the line. The conversion keeps o raw, so compare against both conventions and report the
                    # smaller (an operator caveat, see the review).
                    to = math.degrees(math.atan2(dx, dy)) % 360
                    S['face_qb'].append(min(abs((o - to + 180) % 360 - 180), abs((o - (to + 180) % 360 + 180) % 360 - 180)))
            if len(ex) < LIST:
                ex.append(f"{raw['id']} target {j} deep {dd}({p.players[dd].get('pos') or p.players[dd].get('slot')}) need {nd:.1f} flight {flight:.1f} onset {S['onset'][-1]:+.1f} at arrival {p.dist(j, dd, ka):.1f} -> {out}")
    n = max(1, C['inrange'])
    print(f"== {name}: corner-route targets by the deep man's needed speed " + ' '.join(
        f"{lo}-{hi if hi < 99 else '+'}: {C[('bin', i)]} ({100 * C[('comp', i)] / max(1, C[('bin', i)]):.0f}% complete)" for i, (lo, hi) in enumerate(BINS)))
    print(f"   in range (need < 6): {C['inrange']}; flight {q(S['flight'])} s; need {q(S['need'])} yd/s")
    print(f"   break onset vs release {q(S['onset'])} s; speed rel/+0.3/+0.6 {q(S['speedrel'])} | {q(S['speed+0.3'])} | {q(S['speed+0.6'])}")
    print(f"   heading error (deg) rel/+0.3/+0.6 {q(S['errrel'])} | {q(S['err+0.3'])} | {q(S['err+0.6'])}; closing {q(S['closerel'])} | {q(S['close+0.3'])} | {q(S['close+0.6'])}")
    print(f"   distance from the catch point at arrival {q(S['arrive'])}; facing the QB at release (NFL) {q(S['face_qb'])} deg")
    print('   ends: ' + ', '.join(f"{k} {C[k]} ({100 * C[k] / n:.0f}%)" for k in ('interception', 'incomplete contested', 'incomplete open', 'complete contested', 'complete open')))
    for row in ex: print('      ' + row)
