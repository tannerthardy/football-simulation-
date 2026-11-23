"""FLIGHT_LEAD check (2026-11-23): for each defender whose last flight-break goal before the catch was a post-catch lead
(tag flight-lead), the goal against where the carrier actually was at the time the defender reached that distance
(catch + late, approximated by catch + his distance-to-goal at his speed). Error in the carrier's frame (along / across)
and against the catch spot itself. Usage: python3 -I pursuit-leadcheck.py ROWS.json"""
import json, math, sys
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
R = json.load(open(sys.argv[1])); rows = []
for r in R:
    F = r['frames']; f0 = F[0]; ct = {round(f['t'], 1): f for f in F}
    for k, d in f0['d'].items():
        b = d.get('fb')
        if not b or not b.get('lead'): continue
        g = b['goal']; p = d['pos']; sp = max(2.0, math.hypot(p[2], p[3]))
        late = math.hypot(g[0] - p[0], g[1] - p[1]) / sp
        f = ct.get(round(min(late, F[-1]['t']), 1)) or F[-1]
        c = f['car']; c0 = f0['car']
        err_goal = math.hypot(g[0] - c[0], g[1] - c[1]); err_spot = math.hypot(c0[0] - c[0], c0[1] - c[1])
        rows.append(dict(late=late, eg=err_goal, es=err_spot, gx=g[0] - c0[0], cx=c[0] - c0[0], gy=g[1] - c0[1], cy=c[1] - c0[1]))
print(f"defenders on a post-catch lead at the catch: {len(rows)}")
if rows:
    print(f"  time to his goal p50 {q([x['late'] for x in rows], .5):.2f} s; carrier's actual position then vs the goal: p50 {q([x['eg'] for x in rows], .5):.1f} yd (p75 {q([x['eg'] for x in rows], .75):.1f}); vs the catch spot: p50 {q([x['es'] for x in rows], .5):.1f} yd")
    print(f"  goal offset from the catch spot p50 along-x {q([x['gx'] for x in rows], .5):+.1f}, y {q([x['gy'] for x in rows], .5):+.1f}; carrier's actual offset then x {q([x['cx'] for x in rows], .5):+.1f}, y {q([x['cy'] for x in rows], .5):+.1f}")
