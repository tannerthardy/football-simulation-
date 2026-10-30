"""Zone runs: whole-line lateral flow toward the play side (sign from the carrier's lateral move snap -> first frame
past the LOS). Median over plays of the mean OL lateral displacement, and of the mean front-DL (snap depth < 1.5 yd)
lateral displacement, at 0.5 / 1.0 / 1.5 s; also mean OL depth gained (+ = upfield). usage: lineflow.py rfr nfl traces"""
import importlib.util, sys, statistics as st
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
out = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
    xy, pl, car = p["xy"], p["players"], p["carrier"]
    if len(xy) < 16: continue
    cross = next((k for k in range(len(xy)) if xy[k][car][0] > 0), None)
    if cross is None: continue
    side = xy[cross][car][1] - xy[0][car][1]
    if abs(side) < 0.5: continue
    s = 1 if side > 0 else -1
    ol = [i for i, q in enumerate(pl) if q["group"] == "OL"]
    dl = [i for i, q in enumerate(pl) if q["group"] == "DL" and xy[0][i][0] < 1.5]
    if len(ol) != 5 or not dl: continue
    for k in (5, 10, 15):
        out[(c, p["src"], k, "ol")].append(st.mean((xy[k][i][1] - xy[0][i][1]) * s for i in ol))
        out[(c, p["src"], k, "dl")].append(st.mean((xy[k][i][1] - xy[0][i][1]) * s for i in dl))
        out[(c, p["src"], k, "olx")].append(st.mean(xy[k][i][0] - xy[0][i][0] for i in ol))
print("concept src: OL lateral with play @0.5/1.0/1.5 s | front DL lateral @0.5/1.0/1.5 | OL upfield @0.5/1.0/1.5 (medians over plays)")
for c in ("INSIDE ZONE", "OUTSIDE ZONE"):
    for src in ("nfl", "sim"):
        f = lambda kind: " ".join(f"{st.median(out[(c, src, k, kind)]):5.2f}" for k in (5, 10, 15)) if out[(c, src, 5, kind)] else "-"
        print(f"  {c:12s} {src} n={len(out[(c, src, 5, 'ol')]):4d}: {f('ol')} | {f('dl')} | {f('olx')}")
