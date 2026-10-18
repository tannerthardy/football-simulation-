"""Second level at the moment the runner crosses the line, one operator for
NFL and sim (common play format). Second-level defenders: at the snap 2-8 yd
deep and within 7 yd of the ball laterally. Engaged = an OL within 1.5 yd.
Lateral is signed toward the runner's direction of travel at the crossing.
usage: second.py FILE.jsonl.gz [--sim-trace]"""
import gzip, json, math, sys
from collections import Counter
trace = '--sim-trace' in sys.argv
med = lambda xs: round(sorted(xs)[len(xs) // 2], 2) if xs else None
q = lambda xs, f: round(sorted(xs)[int(f * (len(xs) - 1))], 2) if xs else None
near_free, dists, lats, depths, eng, n, speeds = [], [], [], [], [], 0, []
nearest = []
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    if trace: r = r.get('common')
    if not r or r.get('kind') != 'run' or r.get('carrier') is None: continue
    xy, c, dt, by, P = r['xy'], r['carrier'], r.get('dt', .1), r['ball_y'], r['players']
    k = next((k for k in range(3, len(xy)) if xy[k][2*c] is not None and xy[k][2*c] >= 0), None)
    if k is None or k < 2: continue
    n += 1
    cx, cy = xy[k][2*c], xy[k][2*c+1]
    vy = (cy - xy[k-2][2*c+1]) / (2 * dt); s = 1 if vy >= 0 else -1
    O = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL']
    sec = [i for i, p in enumerate(P) if p['side'] == 'D' and xy[0][2*i] is not None and 2 <= xy[0][2*i] <= 8 and abs(xy[0][2*i+1] - by) <= 7]
    best = math.inf; free_close = 0
    for d in sec:
        x, y = xy[k][2*d], xy[k][2*d+1]
        if x is None: continue
        dist = math.hypot(x - cx, y - cy)
        e = any(xy[k][2*o] is not None and math.hypot(xy[k][2*o] - x, xy[k][2*o+1] - y) <= 1.5 for o in O)
        eng.append(e); dists.append(dist); depths.append(x - cx); lats.append((y - cy) * s)
        if x0 := xy[k-2][2*d]: speeds.append(math.hypot(x - x0, y - xy[k-2][2*d+1]) / (2 * dt))
        if not e: best = min(best, dist); free_close += dist <= 3
    near_free.append(free_close)
    if math.isfinite(best): nearest.append(best)
print(sys.argv[1], 'runs', n)
print(f"  second-level defenders: engaged {100*sum(eng)/len(eng):.0f}%  dist to runner p25/p50/p75 {q(dists,.25)}/{q(dists,.5)}/{q(dists,.75)}  depth ahead {med(depths)}  lateral (+ = ahead of his flow) {med(lats)}  speed {med(speeds)}")
print(f"  nearest FREE second-level defender: p25/p50/p75 {q(nearest,.25)}/{q(nearest,.5)}/{q(nearest,.75)}   free within 3 yd per run: {dict(sorted(Counter(min(x,3) for x in near_free).items()))}")
