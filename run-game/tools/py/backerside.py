"""Box backers on inside zone and counter, NFL vs sim: split by side (play side = the carrier's side of the OL centre
at the LOS crossing); touched before the carrier, and the first toucher's group (OL / TE / RB), plus a covered OL
(an OL who was within 1.5 yd of a DL at 0.3 s) vs an uncovered OL toucher."""
import importlib.util, math, statistics as st, sys
from collections import defaultdict, Counter
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(Counter)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    if con not in ('INSIDE ZONE', 'COUNTER', 'POWER'): continue
    xy, pl, c, src = p['xy'], p['players'], p['carrier'], p['src']; n = len(xy)
    if n < 15: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']
    if len(ol) < 5: continue
    dl = [i for i, q in enumerate(pl) if q['side'] == 'D' and q['group'] == 'DL']
    cy = st.mean(xy[0][i][1] for i in ol)
    cross = next((f for f in range(n) if xy[f][c][0] > 0), None)
    side = 1 if xy[cross if cross is not None else min(n - 1, 25)][c][1] > cy else -1
    covered = {i for i in ol if any(math.dist(xy[3][i], xy[3][d]) < 1.5 for d in dl)}
    blk = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] in ('OL', 'TE', 'RB') and i != c]
    for j, q in enumerate(pl):
        x0, y0 = xy[0][j]
        if q['side'] != 'D' or q['group'] != 'LB' or not (2.5 <= x0 <= 8 and abs(y0 - cy) < 6): continue
        s = 'play' if (y0 - cy) * side > 0.5 else 'back' if (y0 - cy) * side < -0.5 else 'middle'
        arrive = next((f for f in range(n) if xy[f][c][0] >= xy[f][j][0] - 1), n - 1)
        hit = next(((f, b) for f in range(3, arrive) for b in blk if xy[f][b][0] > -0.5 and math.dist(xy[f][b], xy[f][j]) < 1.5), None)
        k = (con, src, s); R[k]['n'] += 1
        if hit:
            b = hit[1]; g = pl[b]['group']; g = ('OL covered' if b in covered else 'OL uncovered') if g == 'OL' else g
            R[k]['touched'] += 1; R[k][g] += 1
for k in sorted(R):
    r = R[k]; n = r['n']
    print(f"{k[0]:11s} {k[1]} {k[2]:6s}: n {n:4d} touched {r['touched']/n:.2f} | by OL uncovered {r['OL uncovered']/n:.2f}, OL covered {r['OL covered']/n:.2f}, TE {r['TE']/n:.2f}, RB {r['RB']/n:.2f}")
