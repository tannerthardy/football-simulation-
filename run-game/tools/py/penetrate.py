"""Early DL penetration on runs, NFL vs sim, same operator: per play, the deepest DL into the offense's backfield
(yd past the LOS toward the offense) at 0.6/0.8/1.0/1.2 s; share of plays with any DL > 1 yd deep at 1.0 s and
> 2 yd deep at 1.2 s; per DL, speed toward the offense at 0.4-0.8 s; and the time each DL is first within 1.2 yd
of an OL/TE (median). usage: penetrate.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']; xy, pl = p['xy'], p['players']; n = len(xy)
    if n < 14 or con not in rfr.CONCEPTS: continue
    fam = 'gap' if con in ('POWER', 'COUNTER', 'TRAP') else 'zone' if 'ZONE' in con else 'other'
    key = (fam, p['src'])
    dl = [j for j, q in enumerate(pl) if q['side'] == 'D' and q['group'] == 'DL' and xy[0][j][0] < 1.5]
    blk = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] in ('OL', 'TE')]
    if not dl: continue
    for k in (6, 8, 10, 12): o[key + ('deep', k)].append(max(-xy[k][j][0] for j in dl))
    o[key + ('p1',)].append(max(-xy[10][j][0] for j in dl) > 1); o[key + ('p2',)].append(max(-xy[12][j][0] for j in dl) > 2)
    for j in dl:
        o[key + ('v',)].append(-(xy[8][j][0] - xy[4][j][0]) / .4)
        f = next((f for f in range(n) if any(math.dist(xy[f][j], xy[f][b]) < 1.2 for b in blk)), None)
        o[key + ('touch',)].append(f * .1 if f is not None else 9)
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
for fam in ('gap', 'zone'):
    for src in ('nfl', 'sim'):
        k = (fam, src)
        print(f"{fam:4s} {src}: deepest DL into backfield 0.6/0.8/1.0/1.2 s " + "/".join(med(o[k + ('deep', t)]) for t in (6, 8, 10, 12)) + f" | plays with a DL >1 yd deep at 1.0 s {mean(o[k+('p1',)])}, >2 yd at 1.2 s {mean(o[k+('p2',)])} | DL upfield speed 0.4-0.8 s {med(o[k+('v',)])} | DL first within 1.2 yd of a blocker {med(o[k+('touch',)])} s")
