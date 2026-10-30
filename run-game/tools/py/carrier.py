"""Carrier progress by concept, NFL vs sim: x (yd past LOS) at 0.6/1.0/1.4/1.8/2.2 s, speed at 1.0/1.4/1.8 s,
time he first crosses the LOS (when he does), and distance to the nearest defender at 1.4 s. usage: carrier.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']; xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 24 or con not in rfr.CONCEPTS: continue
    key = (con, p['src'])
    for k in (6, 10, 14, 18, 22): o[key + ('x', k)].append(xy[k][c][0])
    for k in (10, 14, 18): o[key + ('v', k)].append(math.dist(xy[k + 1][c], xy[k - 1][c]) / .2)
    cr = next((f for f in range(n) if xy[f][c][0] > 0), None)
    if cr is not None: o[key + ('cross',)].append(cr * .1)
    o[key + ('near',)].append(min(math.dist(xy[14][c], xy[14][j]) for j, q in enumerate(pl) if q['side'] == 'D'))
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
for con in ('INSIDE ZONE', 'OUTSIDE ZONE', 'POWER', 'COUNTER', 'TRAP', 'DRAW'):
    for src in ('nfl', 'sim'):
        k = (con, src)
        print(f"{con:12s} {src}: x 0.6/1.0/1.4/1.8/2.2 " + "/".join(med(o[k+('x',t)]) for t in (6, 10, 14, 18, 22)) + f" | v 1.0/1.4/1.8 " + "/".join(med(o[k+('v',t)]) for t in (10, 14, 18)) + f" | crosses at {med(o[k+('cross',)])} | nearest defender at 1.4 s {med(o[k+('near',)])}")
