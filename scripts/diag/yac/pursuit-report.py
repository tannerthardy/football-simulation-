"""Report for pursuit-trace.mts (+ positions-only NFL vs sim heading-rate/speed-change table).
usage: python3 -I scripts/diag/yac/pursuit-report.py out/diag/yac/pt*.json [--nfl NFL.jsonl.gz --sim DIR]"""
import json, math, sys, glob
from collections import Counter
args = sys.argv[1:]
files = [a for a in args if a.endswith('.json')]
mean = lambda v: sum(v) / len(v) if v else float('nan')
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
deg = math.degrees
R = [r for p in files for r in json.load(open(p))]
T = []
for r in R:
    rows = r['rows']
    for a, b in zip(rows, rows[1:]):
        if not (2.5 <= a['dist'] < 6) or a['bond'] or a['contact'] or a['t'] < r['t0'] - 1e-6 or a['t'] > r['t0'] + 0.5: continue
        dt = b['t'] - a['t']
        if dt <= 0: continue
        T.append(dict(reqRate=deg(wrap(b['fin']['h'] - a['fin']['h'])) / dt, brgRate=deg(wrap(b['bearing'] - a['bearing'])) / dt, bodyRate=deg(wrap(a['v1']['h'] - a['v0']['h'])) / dt,
                      dv=(a['v1']['s'] - a['v0']['s']) / dt, off=abs(deg(wrap(a['fin']['h'] - a['v0']['h']))), fin=a['fin']['s'], raw=a['raw']['s'], v=a['v0']['s'], stg=a['stg'], planner=a['planner'],
                      fresh=a['fresh'], csp=a['csp'], spr=abs(deg(wrap(a['stg']['intercept-sprint']['h'] - a['fin']['h']))) if 'intercept-sprint' in a['stg'] else float('nan')))
ap = Counter(); fl = 0; n = 0
for r in R:
    rows = [x for x in r['rows'] if r['t0'] - 1e-6 <= x['t'] <= r['t0'] + 0.5 and 2.5 <= x['dist'] < 6 and not x['bond'] and not x['contact']]
    for a, b in zip(rows, rows[1:]):
        ap[a.get('approach', '?')] += 1; n += 1
        if a.get('approach') in ('original-scored', 'arrival', 'brake') and b.get('approach') in ('original-scored', 'arrival', 'brake') and a['approach'] != b['approach']: fl += 1
print('B. chooseApproach per tick: ' + ', '.join(f"{k} {v / max(1, n):.0%}" for k, v in ap.most_common()) + f"; choice flips between consecutive scored ticks {fl / max(1, n):.1%} of ticks")
print(f"sim pursuers {len(R)}, ticks {len(T)} (2.5-6 yd, carrier > 6 yd/s, side/behind, t0..t0+0.5 s, no contact)")
print(f"1. request: final {mean([t['fin'] for t in T]):.2f} yd/s (decision {mean([t['raw'] for t in T]):.2f}); |heading rate| p50 {q([abs(t['reqRate']) for t in T]):.0f} p75 {q([abs(t['reqRate']) for t in T], .75):.0f} deg/s; "
      f"carrier bearing |rate| p50 {q([abs(t['brgRate']) for t in T]):.0f} deg/s; request turns with the bearing {mean([t['reqRate'] * t['brgRate'] > 0 for t in T if abs(t['reqRate']) > 5]):.0%} of ticks it turns >5 deg/s")
ss = Counter(); sh = Counter()
for t in T:
    for k, v in t['stg'].items():
        if v['s'] < t['raw'] - 0.3 or (k.startswith('post:') and v['s'] < t['raw'] - 0.3): ss[k] += 1
print(f"   stage speed cuts >0.3 (share of ticks): " + ', '.join(f"{k} {v / len(T):.0%}" for k, v in ss.most_common()) + f"; final vs intercept-sprint heading p50 {q([t['spr'] for t in T if t['spr'] == t['spr']]):.0f} deg; planner {Counter(t['planner'] for t in T).most_common(2)}; fresh intercept plan {mean([t['fresh'] for t in T]):.0%}")
print(f"2. body: speed {mean([t['v'] for t in T]):.2f}, change {mean([t['dv'] for t in T]):+.2f} yd/s per s; velocity off the request p50 {q([t['off'] for t in T]):.0f} deg; body heading |rate| p50 {q([abs(t['bodyRate']) for t in T]):.0f} deg/s")
for lo, hi in ((0, 5), (5, 15), (15, 30), (30, 60), (60, 181)):
    g = [t for t in T if lo <= t['off'] < hi]
    if g: print(f"   off request {lo:3d}-{hi:3d} deg: {len(g) / len(T):4.0%} of ticks, speed change {mean([t['dv'] for t in g]):+.2f} yd/s/s (request {mean([t['fin'] for t in g]):.2f}, body {mean([t['v'] for t in g]):.2f})")
for lo, hi in ((0, 20), (20, 60), (60, 150), (150, 1e9)):
    g = [t for t in T if lo <= abs(t['reqRate']) < hi]
    if g: print(f"   request turning {lo}-{hi if hi < 1e9 else ''} deg/s: {len(g) / len(T):4.0%}, body speed change {mean([t['dv'] for t in g]):+.2f}, off request {q([t['off'] for t in g]):.0f} deg")
if '--nfl' in args:
    sys.argv = [sys.argv[0]]
    import importlib.util
    spec = importlib.util.spec_from_file_location('ya', 'scripts/diag/yac/yac-arrive.py'); ya = importlib.util.module_from_spec(spec); spec.loader.exec_module(ya)
    def pos(name, plays):
        rows = []
        for pl in plays:
            C, D, dt = pl['C'], pl['D'], pl['dt']; h = int(round(.5 / dt))
            for i, P in D.items():
                for k in range(1, len(C) - h - 1):
                    if P[k][0] is None or P[k + h][0] is None: continue
                    cvx, cvy = ya.vel(C, k, dt); cs = math.hypot(cvx, cvy)
                    if cs <= 6: continue
                    dx, dy = P[k][0] - C[k][0], P[k][1] - C[k][1]; L = math.hypot(dx, dy)
                    if not 2.5 <= L < 6 or (dx * cvx + dy * cvy) / (L * cs) > 0.5: continue
                    v0 = ya.vel(P, k, dt); v1 = ya.vel(P, k + h, dt)
                    if math.hypot(*v0) < 2: break
                    # stop at contact: any defender within 1 yd of the carrier in the window
                    rows.append((math.hypot(*v0), math.hypot(*v1) - math.hypot(*v0), abs(deg(wrap(math.atan2(v1[1], v1[0]) - math.atan2(v0[1], v0[0])))) / .5,
                                 any(math.hypot(P[j][0] - C[j][0], P[j][1] - C[j][1]) <= 1.0 for j in range(k, k + h + 1) if P[j][0] is not None)))
                    break
        for nm, f in (('no contact in window', lambda r: not r[3]), ('all', lambda r: True)):
            g = [r for r in rows if f(r)]
            print(f"3. {name:3s} {nm:21s} n {len(g):4d} speed {mean([r[0] for r in g]):.2f} change over 0.5 s {mean([r[1] for r in g]):+.2f} | heading rate p50 {q([r[2] for r in g]):.0f} deg/s | " +
                  ', '.join(f"{lo}-{hi if hi < 999 else ''} deg/s: {len([r for r in g if lo <= r[2] < hi]) / max(1, len(g)):.0%} {mean([r[1] for r in g if lo <= r[2] < hi]):+.2f}" for lo, hi in ((0, 20), (20, 60), (60, 999))))
    pos('NFL', ya.nfl(args[args.index('--nfl') + 1]))
    pos('sim', ya.sim(sorted(glob.glob(args[args.index('--sim') + 1] + '/cover[2-6].json'))))
