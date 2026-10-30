"""Crease at the point of attack, NFL vs sim, same operator. Frame: the carrier first 1.0 yd behind the LOS after the
handoff (x >= -1.0). Defenders in the line band (x in [-2.0, +1.5]) within 4 yd laterally of the carrier, sorted by y:
 - lane clearance: lateral distance from the carrier to the nearest band defender;
 - his gap: width of the gap between the band defenders on either side of the carrier (edges at +-4 yd if none);
 - widest gap in the window and the carrier's lateral distance from its center;
 - share where his gap is the widest one.
usage: crease.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']; xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 10 or con not in rfr.CONCEPTS: continue
    f = next((f for f in range(5, n) if xy[f][c][0] >= -1.0), None)
    if f is None: continue
    cy = xy[f][c][1]
    band = sorted(xy[f][j][1] - cy for j, q in enumerate(pl) if q['side'] == 'D' and -2.0 <= xy[f][j][0] <= 1.5 and abs(xy[f][j][1] - cy) <= 4)
    key = (con, p['src'])
    o[key + ('t',)].append(f * .1)
    o[key + ('clear',)].append(min((abs(v) for v in band), default=4))
    left = max([v for v in band if v < 0], default=-4); right = min([v for v in band if v >= 0], default=4)
    o[key + ('gap',)].append(right - left)
    edges = [-4] + band + [4]
    gaps = [(edges[i + 1] - edges[i], (edges[i + 1] + edges[i]) / 2) for i in range(len(edges) - 1)]
    w, ctr = max(gaps)
    o[key + ('wide',)].append(w); o[key + ('off',)].append(abs(ctr)); o[key + ('his',)].append(abs((right - left) - w) < 1e-6)
    o[key + ('nband',)].append(len(band))
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
print("concept src: when (s) | nearest band defender (yd) | his gap | widest gap | his distance from its center | in the widest gap | band defenders")
for con in ('INSIDE ZONE', 'OUTSIDE ZONE', 'POWER', 'COUNTER', 'TRAP', 'DRAW'):
    for src in ('nfl', 'sim'):
        k = (con, src)
        print(f"  {con:12s} {src}: {med(o[k+('t',)])} | {med(o[k+('clear',)])} | {med(o[k+('gap',)])} | {med(o[k+('wide',)])} | {med(o[k+('off',)])} | {mean(o[k+('his',)])} | {med(o[k+('nband',)])}")
