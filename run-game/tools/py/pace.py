"""Back behind the puller, NFL vs sim, power/counter/trap. Frames after 0.8 s while the carrier is behind the LOS
(x < -0.5) and a rule-detected puller is ahead of him within 2.5 yd along the carrier's line to the LOS (puller
x > carrier x, |dy| < 2.2, gap < 2.5): carrier speed, puller speed, the gap, share of such frames; and the carrier's
speed when no puller is there. Also per play: carrier speed at the frame he is 2 yd behind the LOS.
usage: pace.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
def spd(xy, f, i):
    a, b = xy[max(0, f - 1)][i], xy[min(len(xy) - 1, f + 1)][i]
    return math.dist(a, b) / (.1 * (min(len(xy) - 1, f + 1) - max(0, f - 1)))
for p in plays():
    con = p['concept']
    if con not in ('POWER', 'COUNTER', 'TRAP'): continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 16: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']
    pullers = [i for i in ol if rfr.puller(xy, i, min(n - 1, 25))]
    if not pullers: continue
    k = (con, p['src'])
    for f in range(8, min(n, 35)):
        cx, cy = xy[f][c]
        if cx >= -0.5: break
        near = [(xy[f][j][0] - cx, j) for j in pullers if 0 < xy[f][j][0] - cx < 2.5 and abs(xy[f][j][1] - cy) < 2.2]
        if near:
            g, j = min(near)
            o[k + ('pv',)].append(spd(xy, f, c)); o[k + ('ppv',)].append(spd(xy, f, j)); o[k + ('gap',)].append(g)
        else: o[k + ('nv',)].append(spd(xy, f, c))
        o[k + ('frames',)].append(bool(near))
    f2 = next((f for f in range(5, n) if xy[f][c][0] >= -2), None)
    if f2: o[k + ('v2',)].append(spd(xy, f2, c))
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
print("concept src: share of behind-LOS frames with a puller just ahead | carrier v then | puller v | gap | carrier v otherwise | carrier v at 2 yd behind LOS")
for con in ('POWER', 'COUNTER', 'TRAP'):
    for src in ('nfl', 'sim'):
        k = (con, src); fr = o[k + ('frames',)]
        print(f"  {con:8s} {src}: {sum(fr)/max(1,len(fr)):.2f} | {med(o[k+('pv',)])} | {med(o[k+('ppv',)])} | {med(o[k+('gap',)])} | {med(o[k+('nv',)])} | {med(o[k+('v2',)])}")
