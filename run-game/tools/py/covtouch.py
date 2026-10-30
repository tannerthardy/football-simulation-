"""IZ/counter/power box backers touched by a covered OL (within 1.5 yd of a DL at 0.3 s), NFL vs sim: was that OL's
DL also within 1.3 yd of another OL (a double / overtake) before he left, how long he stayed on the DL, and whether
his DL ended on another blocker."""
import importlib.util, math, statistics as st, sys
from collections import defaultdict, Counter
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(Counter); T = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    if con not in ('INSIDE ZONE', 'COUNTER', 'POWER', 'OUTSIDE ZONE'): continue
    xy, pl, c, src = p['xy'], p['players'], p['carrier'], p['src']; n = len(xy)
    if n < 15: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']
    if len(ol) < 5: continue
    dl = [i for i, q in enumerate(pl) if q['side'] == 'D' and q['group'] == 'DL']
    cy = st.mean(xy[0][i][1] for i in ol)
    cov = {i: min(dl, key=lambda d: math.dist(xy[3][i], xy[3][d])) for i in ol if dl and min(math.dist(xy[3][i], xy[3][d]) for d in dl) < 1.5}
    blk = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] in ('OL', 'TE', 'RB') and i != c]
    for j, q in enumerate(pl):
        x0, y0 = xy[0][j]
        if q['side'] != 'D' or q['group'] != 'LB' or not (2.5 <= x0 <= 8 and abs(y0 - cy) < 6): continue
        arrive = next((f for f in range(n) if xy[f][c][0] >= xy[f][j][0] - 1), n - 1)
        hit = next(((f, b) for f in range(3, arrive) for b in blk if xy[f][b][0] > -0.5 and math.dist(xy[f][b], xy[f][j]) < 1.5), None)
        R[(con, src)]['box'] += 1
        if not hit or hit[1] not in cov: continue
        f, b = hit; d = cov[b]
        left = max((k for k in range(3, f) if math.dist(xy[k][b], xy[k][d]) < 1.3), default=3)
        shared = any(math.dist(xy[k][o], xy[k][d]) < 1.3 for k in range(3, left + 1) for o in ol if o != b)
        R[(con, src)]['covered touch'] += 1; R[(con, src)]['his DL doubled/overtaken before he left' if shared else 'left his DL alone (no OL on him)'] += 1
        T[(con, src)].append(left * .1)
for k in sorted(R):
    r = R[k]; ct = max(1, r['covered touch'])
    print(f"{k[0]:12s} {k[1]}: box {r['box']} covered-OL touches {r['covered touch']/r['box']:.2f} | of those: shared {r['his DL doubled/overtaken before he left']/ct:.2f}, alone {r['left his DL alone (no OL on him)']/ct:.2f} | left DL at {st.median(T[k]) if T[k] else 0:.1f} s")
