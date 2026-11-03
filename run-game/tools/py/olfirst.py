"""First-level OL contact, NFL vs sim, same operator. Each OL's first DL contact: first frame >= 0.1 s with a DL (on
the line at 0.3 s) within 1.2 yd. At contact: OL speed, his upfield and lateral (toward the play side = carrier's
crossing side) velocity, approach angle (OL velocity vs line to the DL), DL speed. Over the next 0.5 s: DL depth change
(+ = driven back, - = penetrating), DL lateral change toward play, OL-DL distance still < 1.2 share.
usage: olfirst.py rfr nfl traces..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER", "TRAP"): continue
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy)
    if n < 15: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: continue
    cy = sum(xy[0][i][1] for i in ol) / 5
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), n - 1); ps = 1 if xy[cross][car][1] >= cy else -1
    dl = [j for j, q in enumerate(pl) if q["side"] == "D" and xy[3][j][0] < 1.5 and abs(xy[3][j][1] - cy) < 6]
    order = sorted(ol, key=lambda i: (xy[0][i][1] - cy) * ps)
    for rank, i in enumerate(order):
        role = ["BS-T", "BS-G", "C", "PS-G", "PS-T"][rank]
        hit = None
        for f in range(1, min(n, 15)):
            js = [j for j in dl if math.dist(xy[f][i], xy[f][j]) < 1.2]
            if js: hit = (min(js, key=lambda j: math.dist(xy[f][i], xy[f][j])), f); break
        if not hit: continue
        j, f = hit; g = max(0, f - 1); k = min(n - 1, f + 5)
        vx, vy = (xy[f][i][0] - xy[g][i][0]) * 10, (xy[f][i][1] - xy[g][i][1]) * 10; sp = math.hypot(vx, vy)
        dx, dy = xy[f][j][0] - xy[f][i][0], xy[f][j][1] - xy[f][i][1]; L = math.hypot(dx, dy) or 1
        key = (c, p["src"], role)
        V[key + ("t",)].append(f / 10); V[key + ("speed",)].append(sp); V[key + ("upfield",)].append(vx); V[key + ("lat to play",)].append(vy * ps)
        if sp > .3: V[key + ("angle",)].append(math.degrees(math.acos(max(-1, min(1, (vx * dx + vy * dy) / (sp * L))))))
        V[key + ("DL depth chg",)].append(xy[k][j][0] - xy[f][j][0]); V[key + ("DL lat chg to play",)].append((xy[k][j][1] - xy[f][j][1]) * ps)
        V[key + ("held",)].append(sum(math.dist(xy[m][i], xy[m][j]) < 1.2 for m in range(f, k + 1)) / (k - f + 1))
def med(v): v = sorted(v); return f"{v[len(v)//2]:6.2f}" if v else "    - "
ms = ("t", "speed", "upfield", "lat to play", "angle", "DL depth chg", "DL lat chg to play", "held")
print("concept role src n |", " ".join(f"{m:>8s}"[:8] for m in ms))
for c in ("INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER", "TRAP"):
    for role in ("BS-T", "BS-G", "C", "PS-G", "PS-T"):
        for src in ("nfl", "sim"):
            key = (c, src, role); nn = len(V[key + ("t",)])
            if nn: print(f"{c[:5]} {role:4s} {src} {nn:4d} |", " ".join(f"{med(V[key + (m,)]):>8s}" for m in ms))
