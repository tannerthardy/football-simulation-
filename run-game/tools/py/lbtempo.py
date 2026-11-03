"""Box LB tempo, NFL vs sim, same operator (box LB as lbfit2.py). By time since the snap: depth (yd past LOS), downhill
speed (yd/s toward the LOS), lateral speed toward the carrier's eventual crossing side, and distance to the carrier;
also the handoff-relative view at carrier depth -2 yd. usage: lbtempo.py rfr nfl traces..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = defaultdict(list); TS = (5, 10, 15, 20, 25)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER"): continue
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy)
    if n < 26: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) < 5: continue
    cy = sum(xy[0][i][1] for i in ol) / len(ol)
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), n - 1)
    side = 1 if xy[cross][car][1] >= cy else -1
    for j, q in enumerate(pl):
        if q["side"] != "D" or q["group"] != "LB" or not (2.5 <= xy[0][j][0] <= 8 and abs(xy[0][j][1] - cy) < 6): continue
        for f in TS:
            V[(c, p["src"], f, "depth")].append(xy[f][j][0])
            V[(c, p["src"], f, "downhill")].append(-(xy[f][j][0] - xy[f - 2][j][0]) / .2)
            V[(c, p["src"], f, "lateral to play")].append((xy[f][j][1] - xy[f - 2][j][1]) / .2 * side)
        F = next((f for f in range(n) if xy[f][car][0] >= -2), None)
        if F: V[(c, p["src"], "F", "depth at carrier -2")].append(xy[F][j][0]); V[(c, p["src"], "F", "t carrier -2")].append(F / 10)
def med(v): v = sorted(v); return f"{v[len(v)//2]:5.2f}" if v else "  -  "
for c in ("INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER"):
    print(c, "   t =", "  ".join(f"{f/10:5.1f}" for f in TS))
    for m in ("depth", "downhill", "lateral to play"):
        for src in ("nfl", "sim"):
            print(f"   {src} {m:16s}", "  ".join(med(V[(c, src, f, m)]) for f in TS))
    for src in ("nfl", "sim"):
        print(f"   {src} at carrier 2 yd behind LOS: t {med(V[(c, src, 'F', 't carrier -2')])} LB depth {med(V[(c, src, 'F', 'depth at carrier -2')])}")
