"""DL lined up over a puller's snap spot (within 1.2 yd laterally), NFL vs sim, power/counter/trap: depth into the
offense's backfield (yd past the LOS toward the offense, + = penetrated) at 0.4/0.6/1.0/1.5 s; first frame a
non-puller OL is within 1.2 yd of him; share > 1 yd deep at 1.5 s; his lateral move toward the vacated spot
side (toward where the puller went) by 1.0 s. usage: vacated.py rfr.py nfl.jsonl.gz traces..."""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    if con not in ('POWER', 'COUNTER', 'TRAP'): continue
    xy, pl = p['xy'], p['players']; n = len(xy)
    if n < 16: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']
    if len(ol) < 5: continue
    pullers = [i for i in ol if rfr.puller(xy, i, min(n - 1, 25))]
    if not pullers: continue
    pd = math.copysign(1, st.mean(xy[15][i][1] - xy[0][i][1] for i in pullers))
    others = [i for i in ol if i not in pullers]
    for j, q in enumerate(pl):
        if q['side'] != 'D' or q['group'] != 'DL' or xy[0][j][0] > 1.5: continue
        if not any(abs(xy[0][j][1] - xy[0][i][1]) < 1.2 for i in pullers): continue
        key = (con, p['src']); o[key + ('n',)].append(1)
        for k in (4, 6, 10, 15):
            if k < n: o[key + ('d', k)].append(-xy[k][j][0])
        o[key + ('deep',)].append(-xy[min(15, n - 1)][j][0] > 1)
        f = next((f for f in range(n) if any(math.dist(xy[f][j], xy[f][i]) < 1.2 for i in others)), None)
        o[key + ('t',)].append(f * .1 if f is not None else 9)
        o[key + ('lat',)].append((xy[min(10, n - 1)][j][1] - xy[0][j][1]) * pd)
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
for con in ('POWER', 'COUNTER', 'TRAP'):
    for src in ('nfl', 'sim'):
        k = (con, src)
        print(f"{con:7s} {src}: n {len(o[k+('n',)]):3d} | depth into backfield 0.4/0.6/1.0/1.5 s {med(o[k+('d',4)])}/{med(o[k+('d',6)])}/{med(o[k+('d',10)])}/{med(o[k+('d',15)])} | >1 yd at 1.5 s {mean(o[k+('deep',)])} | first non-puller OL within 1.2 yd {med(o[k+('t',)])} s | his lateral toward the pull by 1.0 s {med(o[k+('lat',)])}")
