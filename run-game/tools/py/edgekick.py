"""Gap runs, NFL vs sim: the pull-side end man (first defender on the line, snap depth < 1.5 yd, outside the
pull-side edge of the OL/inline TE), his depth (x, + downfield, - into the backfield) and lateral move toward the
ball at 0.5/1.0/1.5 s; first frame a rule puller is within 1.2 yd of him; and the earliest frame he is within 1.2 yd
of the carrier while the carrier is behind the LOS. Pull side = mean puller lateral at 1.5 s. usage: edgekick.py rfr nfl traces"""
import importlib.util, math, sys, statistics as st
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    if con not in ('POWER', 'COUNTER', 'TRAP'): continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 16: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] in ('OL', 'TE') and abs(xy[0][i][0]) < 1.5]
    pullers = [i for i in ol if pl[i]['group'] == 'OL' and rfr.puller(xy, i, min(n - 1, 25))]
    if not pullers: continue
    s = 1 if st.mean(xy[15][i][1] - xy[0][i][1] for i in pullers) > 0 else -1
    edge = max((xy[0][i][1] * s for i in ol))
    cand = [j for j, q in enumerate(pl) if q['side'] == 'D' and xy[0][j][0] < 1.5 and xy[0][j][1] * s > edge - 0.5]
    if not cand: continue
    e = min(cand, key=lambda j: xy[0][j][1] * s)
    key = (con, p['src'])
    for k in (5, 10, 15):
        if k < n:
            o[key + ('x', k)].append(xy[k][e][0]); o[key + ('lat', k)].append(-(xy[k][e][1] - xy[0][e][1]) * s)
    met = next((f for f in range(n) if any(math.dist(xy[f][e], xy[f][i]) < 1.2 for i in pullers)), None)
    o[key + ('met',)].append(met * .1 if met is not None else 9)
    hit = next((f for f in range(3, n) if math.dist(xy[f][e], xy[f][c]) < 1.2 and xy[f][c][0] < 0), None)
    o[key + ('hit',)].append(hit is not None)
    if hit is not None: o[key + ('hitt',)].append(hit * .1); o[key + ('hitx',)].append(xy[hit][c][0])
m = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
print("concept src: n | end depth 0.5/1.0/1.5 s (- = in backfield) | lateral toward ball 0.5/1.0/1.5 | puller reaches him (s) | end reaches carrier behind LOS: share, when, carrier x")
for con in ('POWER', 'COUNTER', 'TRAP'):
    for src in ('nfl', 'sim'):
        key = (con, src); N = len(o[key + ('met',)])
        if not N: continue
        print(f"  {con:7s} {src}: {N:4d} | {m(o[key+('x',5)])} {m(o[key+('x',10)])} {m(o[key+('x',15)])} | {m(o[key+('lat',5)])} {m(o[key+('lat',10)])} {m(o[key+('lat',15)])} | {m(o[key+('met',)])} | {sum(o[key+('hit',)])/N:.2f} {m(o[key+('hitt',)])} {m(o[key+('hitx',)])}")
