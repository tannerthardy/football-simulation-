"""Power: carrier vs pullers timing, NFL vs sim, same operator. Puller = OL meeting rfr.puller by 2.5 s. At the carrier's
LOS crossing: time, carrier speed, lead puller's depth (past LOS) and lateral offset to the carrier (+ ahead toward play);
at t = 1.5/2.0: carrier depth; puller depth. Split by offset-gun far side vs other. usage: powertime.py rfr nfl traces..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    if p["concept"] != "POWER": continue
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy)
    if n < 26: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    qb = next((i for i, q in enumerate(pl) if q["group"] == "QB" and q["side"] == "O"), None)
    if len(ol) != 5 or qb is None: continue
    pulls = [i for i in ol if rfr.puller(xy, i, 25)]
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), None)
    if cross is None or not pulls: continue
    cy = sum(xy[0][i][1] for i in ol) / 5; ps = 1 if xy[cross][car][1] >= cy else -1
    lead = max(pulls, key=lambda i: xy[cross][i][0])
    qd = xy[0][qb][0]; lq = (xy[0][car][1] - xy[0][qb][1])
    fam = "offset-far" if qd < -2.5 and abs(lq) > 1 and lq * ps < 0 else "other"
    k = (p["src"], fam)
    V[k, "cross t"].append(cross / 10); V[k, "carrier speed at cross"].append(math.dist(xy[cross][car], xy[cross - 1][car]) * 10)
    V[k, "lead puller depth at cross"].append(xy[cross][lead][0]); V[k, "puller lat ahead of carrier"].append((xy[cross][lead][1] - xy[cross][car][1]) * ps)
    V[k, "puller - carrier dist at cross"].append(math.dist(xy[cross][lead], xy[cross][car]))
    tu = next((f for f in range(6, n) if abs(xy[f][lead][1] - xy[0][lead][1]) > 2 and (xy[f][lead][0] - xy[f-2][lead][0]) > abs(xy[f][lead][1] - xy[f-2][lead][1]) and xy[f][lead][0] > xy[f-2][lead][0] + .1), None)
    if tu: V[k, "turn-up t"].append(tu / 10); V[k, "turn-up depth"].append(xy[tu][lead][0]); V[k, "turn-up lat from snap"].append(abs(xy[tu][lead][1] - xy[0][lead][1]))
    for t in (0, 5, 10, 15, 20):
        V[k, f"pd@{t/10}"].append(xy[t][lead][0])
    for t in (10, 15, 20):
        V[k, f"puller lat moved @{t/10}"].append(abs(xy[t][lead][1] - xy[0][lead][1])); V[k, f"puller speed @{t/10}"].append(math.dist(xy[t][lead], xy[t-1][lead]) * 10)
    for t in (15, 20):
        V[k, f"carrier depth @{t/10}"].append(xy[t][car][0]); V[k, f"puller depth @{t/10}"].append(xy[t][lead][0])
def med(v): v = sorted(v); return f"{v[len(v)//2]:5.2f}" if v else "  -  "
ms = ["pd@0.0", "pd@0.5", "pd@1.0", "pd@1.5", "pd@2.0", "turn-up t", "turn-up depth", "turn-up lat from snap", "puller lat moved @1.0", "puller lat moved @1.5", "puller lat moved @2.0", "puller speed @1.0", "puller speed @1.5", "puller speed @2.0", "cross t", "carrier speed at cross", "lead puller depth at cross", "puller lat ahead of carrier", "puller - carrier dist at cross", "carrier depth @1.5", "puller depth @1.5", "carrier depth @2.0", "puller depth @2.0"]
print("src fam n |", " | ".join(ms))
for src in sys.argv[3:4] and ("nfl",) + tuple(sorted({k[0] for k in V if k[0] != 'nfl'})) or ("nfl",):
    pass
for src in ("nfl", "sim"):
    for fam in ("offset-far", "other"):
        k = (src, fam); print(f"{src} {fam:10s} {len(V[k, 'cross t']):4d} |", " | ".join(med(V[k, m]) for m in ms))
