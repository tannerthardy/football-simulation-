"""Pullers by rank (first = nearest the eventual hole at the snap), NFL vs sim: share that come within 1.2 yd of a
defender (after 2 yd lateral, as blockmap), when, that defender's group and depth (x), whether before the carrier
crosses; and the puller's depth x at the hit. usage: pullhit.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    if con not in ('POWER', 'COUNTER'): continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 20: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']
    if len(ol) < 5: continue
    cross = next((f for f in range(n) if xy[f][c][0] > 0), None)
    hole = xy[cross if cross is not None else min(n - 1, 25)][c][1]
    pullers = sorted([i for i in ol if rfr.puller(xy, i, min(n - 1, 25))], key=lambda i: abs(xy[0][i][1] - hole))
    dfn = [j for j, q in enumerate(pl) if q['side'] == 'D']
    for rank, i in enumerate(pullers[:2]):
        key = (con, p['src'], 'first' if rank == 0 else 'second'); o[key + ('n',)].append(1)
        y0 = xy[0][i][1]; hit = None
        for f in range(6, min(n, 40)):
            if abs(xy[f][i][1] - y0) < 2: continue
            h = [j for j in dfn if math.dist(xy[f][i], xy[f][j]) < 1.2]
            if h: hit = (f, h[0]); break
        o[key + ('hit',)].append(hit is not None)
        if hit:
            f, j = hit
            o[key + ('t',)].append(f * .1); o[key + ('grp', pl[j]['group'])].append(1)
            o[key + ('dx',)].append(xy[f][j][0]); o[key + ('px',)].append(xy[f][i][0])
            o[key + ('before',)].append(cross is not None and f <= cross)
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
for con in ('POWER', 'COUNTER'):
    for who in ('first', 'second'):
        for src in ('nfl', 'sim'):
            k = (con, src, who); nn = len(o[k + ('n',)])
            if not nn: continue
            g = {gr: len(o[k + ('grp', gr)]) for gr in ('DL', 'LB', 'DB')}; tot = sum(g.values()) or 1
            print(f"{con:7s} {who:6s} {src}: n {nn:3d} | hits {mean(o[k+('hit',)])} at {med(o[k+('t',)])} s | DL/LB/DB {g['DL']/tot:.2f}/{g['LB']/tot:.2f}/{g['DB']/tot:.2f} | man's x {med(o[k+('dx',)])} | puller x {med(o[k+('px',)])} | before carrier crosses {mean(o[k+('before',)])}")
