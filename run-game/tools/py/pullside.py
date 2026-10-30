"""Gap runs, NFL vs sim: does the carrier cross the LOS on the side the pullers went (pull direction = mean puller
lateral displacement at 1.5 s)? Carrier crossing lateral relative to the OL center, signed by the pull direction;
and the carrier's lateral position (signed) at 0.6/1.0 s relative to his snap spot. usage: same as pullpath.py"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    if con not in ('POWER', 'COUNTER', 'TRAP'): continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 16: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']
    if len(ol) < 5: continue
    pullers = [i for i in ol if rfr.puller(xy, i, min(n - 1, 25))]
    if not pullers: continue
    pd = math.copysign(1, st.mean(xy[15][i][1] - xy[0][i][1] for i in pullers))
    cy = st.mean(xy[0][i][1] for i in ol)
    cross = next((f for f in range(n) if xy[f][c][0] > 0), None)
    key = (con, p['src'])
    o[key + ('n',)].append(1)
    if cross is None: o[key + ('nocross',)].append(1); continue
    rel = (xy[cross][c][1] - cy) * pd
    o[key + ('rel',)].append(rel); o[key + ('same',)].append(rel > 0)
    for k in (6, 10):
        o[key + ('c', k)].append((xy[k][c][1] - xy[0][c][1]) * pd)
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
for con in ('POWER', 'COUNTER', 'TRAP'):
    for src in ('nfl', 'sim'):
        k = (con, src)
        print(f"{con:7s} {src}: n {len(o[k+('n',)])} | carrier crosses on the pull side {mean(o[k+('same',)])} | crossing lateral (+pull side) med {med(o[k+('rel',)])} | carrier lateral at 0.6/1.0 s {med(o[k+('c',6)])}/{med(o[k+('c',10)])} | no crossing {len(o[k+('nocross',)])}")
