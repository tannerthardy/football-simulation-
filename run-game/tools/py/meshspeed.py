"""Ball carrier at the handoff, NFL vs sim, same operator: speed at the handoff frame and 0.3 s before/after, his
minimum speed in the 0.5 s before the handoff, distance to the QB at the handoff, handoff time, carrier depth.
usage: meshspeed.py rfr nfl traces..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]; h = p.get("handoff")
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER", "TRAP") or h is None: continue
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy)
    qb = next((i for i, q in enumerate(pl) if q["group"] == "QB" and q["side"] == "O"), None)
    f = int(round(h / .1))
    if qb is None or f < 6 or f + 3 >= n: continue
    sp = lambda k: math.dist(xy[k][car], xy[k - 1][car]) * 10
    qd = xy[0][qb][0]; lq = abs(xy[0][car][1] - xy[0][qb][1])
    fam = "UC" if qd > -2.5 else ("OFFSET" if lq > 1.0 else "PISTOL")
    key = (c + " " + fam, p["src"])
    V[key, "t handoff"].append(h); V[key, "speed at handoff"].append(sp(f)); V[key, "speed -0.3"].append(sp(f - 3)); V[key, "speed +0.3"].append(sp(f + 3))
    V[key, "min speed last 0.5 s"].append(min(sp(k) for k in range(f - 5, f + 1)))
    V[key, "dep@0"].append(xy[0][car][0]); V[key, "lat to QB @0"].append(abs(xy[0][car][1] - xy[0][qb][1])); V[key, "QB dep@0"].append(xy[0][qb][0])
    for tt in (3, 5, 7, 9, 11):
        if tt < n: V[key, f"spd@{tt/10}"].append(sp(tt)); V[key, f"lat@{tt/10}"].append(abs(xy[tt][car][1] - xy[0][car][1])); V[key, f"dep@{tt/10}"].append(xy[tt][car][0])
    V[key, "dist to QB"].append(math.dist(xy[f][car], xy[f][qb])); V[key, "carrier depth"].append(xy[f][car][0])
def med(v): v = sorted(v); return f"{v[len(v)//2]:5.2f}" if v else "  -  "
ms = ["dep@0","QB dep@0","lat to QB @0","spd@0.3","spd@0.5","spd@0.7","spd@0.9","spd@1.1","lat@0.7","lat@1.1","dep@0.7","dep@1.1","t handoff", "speed -0.3", "speed at handoff", "speed +0.3", "min speed last 0.5 s", "dist to QB", "carrier depth"]
print("concept src n |", " | ".join(ms))
for c in [f"{c} {fam}" for c in ("INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER") for fam in ("UC", "PISTOL", "OFFSET")]:
    for src in ("nfl", "sim"):
        k = (c, src)
        print(f"{c[:19]:19s} {src} {len(V[k, 't handoff']):4d} |", " | ".join(med(V[k, m]) for m in ms))
