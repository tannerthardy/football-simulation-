"""Plays whose first defender touch (within 1.0 yd) comes behind the LOS: share where the carrier still crosses
the LOS, his forward progress from the touch to play end (x_end - x_touch), time from touch to end, split by whether that
defender was on a block (OL/TE within 1.2 yd). usage: aftertouch.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    if con not in rfr.CONCEPTS: continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 12: continue
    dfn = [j for j, q in enumerate(pl) if q['side'] == 'D']
    blk = [j for j, q in enumerate(pl) if q['side'] == 'O' and q['group'] in ('OL', 'TE')]
    hit = next(((f, j) for f in range(3, n) for j in dfn if math.dist(xy[f][j], xy[f][c]) < 1.0), None)
    if not hit or xy[hit[0]][c][0] >= 0: continue
    f, j = hit
    onblk = 'on block' if any(math.dist(xy[f][b], xy[f][j]) < 1.2 for b in blk) else 'free'
    end = max(f, min(n - 1, int(round((p["end"] or (n - 1) * .1) / .1))))
    for k in ((con, p['src'], onblk), (con, p['src'], 'all')):
        o[k + ('cross',)].append(max(xy[g][c][0] for g in range(f, end + 1)) > 0)
        o[k + ('gain',)].append(xy[end][c][0] - xy[f][c][0])
        o[k + ('dt',)].append((end - f) * .1)
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
for con in ('INSIDE ZONE', 'OUTSIDE ZONE', 'POWER', 'COUNTER', 'TRAP'):
    for src in ('nfl', 'sim'):
        row = []
        for b in ('all', 'on block', 'free'):
            k = (con, src, b); v = o[k + ('cross',)]
            row.append(f"{b}: n {len(v):3d} crosses {sum(v)/max(1,len(v)):.2f} gain {med(o[k+('gain',)])} t {med(o[k+('dt',)])}")
        print(f"  {con:12s} {src}: " + ' | '.join(row))
