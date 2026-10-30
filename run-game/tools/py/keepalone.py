"""Position-only doubles on zone runs, same operator for NFL and sim (x = yd past the LOS, 10 Hz).
Double: two OL each within 1.3 yd of the same DL (on the line at 0.3 s) for 3+ consecutive frames, starting
before 1.0 s. Climb: the first frame one of them is 2+ yd from that DL, past the LOS by 0.5+ yd, and downfield
of the DL. Reports: share of doubles that climb by 2.5 s, climb time, his distance to the nearest LB then,
time the carrier crosses the LOS, and whether the climber touches (1.5 yd) an LB before the carrier reaches
that LB's depth minus 1 yd.
usage: doublerel.py nfl.jsonl.gz trace.json..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
out = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
from collections import Counter
K = defaultdict(list)
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
    xy, players, car = p["xy"], p["players"], p["carrier"]
    if len(xy) < 15: continue
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]; dl = [i for i, g in enumerate(grp) if g == "DL" and xy[3][i][0] < 1.5]
    d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
    for t in dl:
        for ai in range(len(ol)):
            for bi in range(ai + 1, len(ol)):
                a, b = ol[ai], ol[bi]
                run = 0; start = None
                for k in range(min(10, len(xy))):
                    run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                    if run >= 3: start = k - 2; break
                if start is None: continue
                climb = None
                for k in range(start, min(25, len(xy))):
                    for m in (a, b):
                        if d(k, m, t) >= 2 and xy[k][m][0] > 0.5 and xy[k][m][0] > xy[k][t][0]:
                            climb = (k, m); break
                    if climb: break
                if not climb: continue
                k, m = climb; keep = b if m == a else a
                k5 = min(k + 5, len(xy) - 1)
                key = f"{c:12} {p['src']}"
                K[key + ' dl depth change'].append(xy[k5][t][0] - xy[k][t][0])
                K[key + ' keeper-dl dist'].append(d(k5, keep, t))
                K[key + ' dl lateral speed'].append(abs(xy[k5][t][1] - xy[k][t][1]) / 0.5)
                K[key + ' dl into backfield >0.5'].append(1 if xy[k5][t][0] - xy[k][t][0] < -0.5 else 0)
                K[key + ' keeper lost him (>1.5 yd)'].append(1 if d(k5, keep, t) > 1.5 else 0)
                car_x = xy[k5][car][0]; K[key + ' dl within 1.5 of carrier'].append(1 if d(k5, t, car) < 1.5 else 0)
keys = sorted({k.rsplit(' ', 0)[0] for k in K})
import statistics as st
for c in ("INSIDE ZONE", "OUTSIDE ZONE"):
    for src in ("nfl", "sim"):
        key = f"{c:12} {src}"
        if not K.get(key + ' dl depth change'): continue
        n = len(K[key + ' dl depth change'])
        print(f"{key}: climbs {n} | 0.5 s after the climb: DL depth change {st.mean(K[key+' dl depth change']):+.2f} yd (into backfield >0.5: {st.mean(K[key+' dl into backfield >0.5']):.2f}) | keeper-DL {st.median(K[key+' keeper-dl dist']):.2f} yd, lost him >1.5 yd {st.mean(K[key+' keeper lost him (>1.5 yd)']):.2f} | DL lateral {st.median(K[key+' dl lateral speed']):.2f} yd/s | DL within 1.5 yd of carrier {st.mean(K[key+' dl within 1.5 of carrier']):.2f}")
