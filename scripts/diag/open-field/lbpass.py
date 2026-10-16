"""How the runner passes each second-level defender, one operator for NFL and
sim (common plays). Second level: 2-8 yd deep and within 7 yd of the ball at
the snap. At the first frame the runner is level with him (runner depth >=
his depth, after the runner crosses the line): blocked (an OL within 1.5 yd),
far (> 4 yd from the runner), or free-near; signed lateral (+ = ahead of the
runner's lateral flow). Split by final gain.
usage: lbpass.py FILE.jsonl.gz [--sim-trace]"""
import gzip, json, math, sys
from collections import Counter
trace = '--sim-trace' in sys.argv
res = {'all': Counter(), '10+': Counter(), '<10': Counter()}
lat = {'far': [], 'free': []}; plays = Counter()
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    if trace: r = r.get('common')
    if not r or r.get('kind') != 'run' or r.get('carrier') is None: continue
    xy, c, dt, by, P = r['xy'], r['carrier'], r.get('dt', .1), r['ball_y'], r['players']
    O = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL']
    sec = [i for i, p in enumerate(P) if p['side'] == 'D' and xy[0][2*i] is not None and 2 <= xy[0][2*i] <= 8 and abs(xy[0][2*i+1] - by) <= 7]
    band = '10+' if r['yards'] >= 10 else '<10'
    plays[band] += 1
    k0 = next((k for k in range(len(xy)) if xy[k][2*c] is not None and xy[k][2*c] >= 0 and k * dt > .5), None)
    if k0 is None: continue
    for d in sec:
        for k in range(k0, len(xy)):
            cx, cy, x, y = xy[k][2*c], xy[k][2*c+1], xy[k][2*d], xy[k][2*d+1]
            if None in (cx, x): break
            if cx < x: continue
            dist = math.hypot(x - cx, y - cy)
            blocked = any(xy[k][2*o] is not None and math.hypot(xy[k][2*o] - x, xy[k][2*o+1] - y) <= 1.5 for o in O)
            vy = (cy - xy[max(0, k-2)][2*c+1]) / (2 * dt)
            cls = 'blocked' if blocked else 'far' if dist > 4 else 'free-near'
            for b in ('all', band): res[b][cls] += 1
            if not blocked: lat['far' if dist > 4 else 'free'].append((y - cy) * (1 if vy >= 0 else -1))
            break
med = lambda xs: round(sorted(xs)[len(xs)//2], 2) if xs else None
print(sys.argv[1], dict(plays))
for b, c in res.items():
    n = sum(c.values())
    if n: print(f"  {b:4s} passes {n}: " + ', '.join(f"{k} {100*v/n:.0f}%" for k, v in c.most_common()) + f"   per play {n / max(1, sum(plays.values()) if b == 'all' else plays[b]):.2f}")
print('  lateral of unblocked (+ = ahead of flow): far', med(lat['far']), ' free-near', med(lat['free']))
