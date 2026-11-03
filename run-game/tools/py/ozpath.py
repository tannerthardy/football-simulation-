"""OZ/IZ carrier path after the handoff, NFL vs sim, same operator. Play side = carrier's lateral move from handoff to +1.0 s
(sign). At handoff +0.5/+1.0/+1.5/+2.0 s: depth past LOS, playside lateral moved since handoff, and heading (deg from
downfield; 90 = flat along the line). Also: time from handoff to crossing the LOS, and share crossing within 1.0 s.
usage: ozpath.py rfr nfl traces"""
import sys, math, importlib.util, collections
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list)
def go(p):
    c = p["concept"]
    if c not in ("OUTSIDE ZONE", "INSIDE ZONE"): return
    xy, car, h = p["xy"], p["carrier"], p.get("handoff")
    if h is not None: h = int(round(h * 10)) if isinstance(h, float) and h < 30 else int(h)
    n = len(xy)
    if h is None or h + 21 > n: return
    s = p["src"]; ps = 1 if xy[h + 10][car][1] - xy[h][car][1] >= 0 else -1
    for dt in (5, 10, 15, 20):
        f = h + dt; g = f - 2
        V[(c, s, f"depth +{dt/10}")].append(xy[f][car][0])
        V[(c, s, f"lat +{dt/10}")].append((xy[f][car][1] - xy[h][car][1]) * ps)
        vx, vy = xy[f][car][0] - xy[g][car][0], (xy[f][car][1] - xy[g][car][1]) * ps
        V[(c, s, f"heading +{dt/10}")].append(math.degrees(math.atan2(abs(vy), max(1e-6, vx))) if vx > 0 else 90 + math.degrees(math.atan2(-vx, abs(vy) + 1e-6)))
    cross = next((f for f in range(h, n) if xy[f][car][0] > 0), None)
    V[(c, s, "handoff->LOS s")].append((cross - h) / 10 if cross else 9)
    V[(c, s, "crossed within 1.0 s")].append(1 if cross and cross - h <= 10 else 0)
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
def med(v): v = sorted(v); return v[len(v)//2]
for c in ("OUTSIDE ZONE", "INSIDE ZONE"):
    for s in ("nfl", "sim"):
        ks = [k for k in V if k[0] == c and k[1] == s]
        print(f"{c[:8]} {s} n {len(V[(c, s, 'handoff->LOS s')])} | " + " | ".join(f"{k[2]} {(sum(V[k])/len(V[k]) if 'within' in k[2] else med(V[k])):.2f}" for k in ks))
