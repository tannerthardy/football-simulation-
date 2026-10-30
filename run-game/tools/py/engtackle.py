"""First defender within 1.0 yd of the carrier after the handoff, NFL vs sim, by concept: share where an OL/TE is within
1.2 yd of that defender at that frame ("still on a block"), split by where the carrier is (behind LOS / beyond);
and among plays that never cross, the same share. Also the defender's speed and the carrier's speed then.
usage: engtackle.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
def spd(xy, f, i):
    a, b = xy[max(0, f - 1)][i], xy[min(len(xy) - 1, f + 1)][i]
    return math.dist(a, b) / (.1 * max(1, (min(len(xy) - 1, f + 1) - max(0, f - 1))))
for p in plays():
    con = p['concept']
    if con not in rfr.CONCEPTS: continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 12: continue
    dfn = [j for j, q in enumerate(pl) if q['side'] == 'D']
    blk = [j for j, q in enumerate(pl) if q['side'] == 'O' and q['group'] in ('OL', 'TE')]
    hit = next(((f, j) for f in range(3, n) for j in dfn if math.dist(xy[f][j], xy[f][c]) < 1.0), None)
    if not hit: continue
    f, j = hit
    onblk = any(math.dist(xy[f][b], xy[f][j]) < 1.2 for b in blk)
    where = 'behind' if xy[f][c][0] < 0 else 'beyond'
    k = (con, p['src'])
    o[k + (where, 'n')].append(1); o[k + (where, 'blk')].append(onblk)
    o[k + (where, 'dv')].append(spd(xy, f, j)); o[k + (where, 'cv')].append(spd(xy, f, c))
    o[k + ('all',)].append(1)
med = lambda v: f"{st.median(v):4.2f}" if v else "  - "
print("concept src: [behind LOS] share of first contacts | defender still on a block | def v | carrier v || [beyond] share on a block")
for con in ('INSIDE ZONE', 'OUTSIDE ZONE', 'POWER', 'COUNTER', 'TRAP'):
    for src in ('nfl', 'sim'):
        k = (con, src); N = len(o[k + ('all',)]) or 1
        b, y = o[k + ('behind', 'blk')], o[k + ('beyond', 'blk')]
        print(f"  {con:12s} {src}: behind {len(b)/N:.2f} | on block {sum(b)/max(1,len(b)):.2f} | {med(o[k+('behind','dv')])} | {med(o[k+('behind','cv')])} || beyond on block {sum(y)/max(1,len(y)):.2f}")
