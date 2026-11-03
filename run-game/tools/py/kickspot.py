"""Counter kick and wrap spacing, NFL vs sim, same operator (kicker = most playside puller, wrapper = second, as wrapany).
Kick contact: first frame the kicker is within 1.2 yd of a defender for 3 frames (after 0.5 s): time, kicker depth/lat (+ playside
from ball), defender snap group. Wrap at that frame: lateral gap to kicker (+ = wrap outside), depth gap (+ = wrap upfield),
distance; wrap speed. Wrap-kicker spacing at kick+0.3/+0.6 s. usage: kickspot.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter); V = collections.defaultdict(list)
def q(v, p): v = sorted(v); return round(v[int(p*(len(v)-1))], 2) if v else float('nan')
def go(p):
    if p["concept"] != "COUNTER": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 26: return
    k = lambda t: min(n - 1, int(round(t / .1)))
    ol = [i for i, r in enumerate(pl) if r["side"] == "O" and r["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if len(pulls) < 2: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    order = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps); kk, w = order[0], order[1]
    defs = [j for j, r in enumerate(pl) if r["side"] == "D"]
    hit = None
    for f in range(5, n - 2):
        for j in defs:
            if all(math.dist(xy[h][kk], xy[h][j]) < 1.2 for h in (f, f+1, f+2)): hit = (j, f); break
        if hit: break
    C[s]["n"] += 1
    if not hit: C[s]["no kick contact"] += 1; return
    j, f = hit
    C[s]["kick man: " + ("line" if xy[0][j][0] < 1.6 else pl[j]["group"])] += 1
    lat = lambda i, ff: (xy[ff][i][1] - cy) * ps
    V[s, "kick t"].append(f / 10); V[s, "kick depth"].append(xy[f][kk][0]); V[s, "kick lat"].append(lat(kk, f))
    V[s, "kick man snap lat"].append(lat(j, 0)); V[s, "kick man lat at contact"].append(lat(j, f))
    V[s, "wrap lat - kick lat @kick"].append(lat(w, f) - lat(kk, f)); V[s, "wrap depth - kick depth @kick"].append(xy[f][w][0] - xy[f][kk][0])
    V[s, "wrap-kick dist @kick"].append(math.dist(xy[f][w], xy[f][kk]))
    for dt in (3, 6):
        g = min(n - 1, f + dt)
        V[s, f"wrap lat - kick lat @kick+{dt/10}"].append(lat(w, g) - lat(kk, g)); V[s, f"wrap depth @kick+{dt/10}"].append(xy[g][w][0])
        V[s, f"wrap-kickman dist @kick+{dt/10}"].append(math.dist(xy[g][w], xy[g][j]))
    for dt in (3, 6, 10):
        g = min(n - 1, f + dt)
        V[s, f"kick man lat move (+out) +{dt/10}"].append(lat(j, g) - lat(j, f)); V[s, f"kick man depth move (+up) +{dt/10}"].append(xy[g][j][0] - xy[f][j][0])
        V[s, f"kicker lat move (+out) +{dt/10}"].append(lat(kk, g) - lat(kk, f))
    V[s, "kick man lat - kicker lat @kick"].append(lat(j, f) - lat(kk, f))
    V[s, "kick man depth @kick"].append(xy[f][j][0])
    cross = next((ff for ff in range(n) if xy[ff][car][0] >= 0), None)
    if cross is not None: V[s, "carrier lat at cross - kick lat @kick"].append(lat(car, cross) - lat(kk, f))
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    c = C[s]; nn = c["n"] or 1
    print(f"== {s} n={c['n']}")
    for key in sorted(x for x in c if x != "n"): print(f"  {key:44s} {c[key]:4d}  {100*c[key]/nn:5.1f}%")
    for (ss, key), v in sorted(V.items()):
        if ss == s: print(f"  {key:44s} p25 {q(v,.25):6.2f}  med {q(v,.5):6.2f}  p75 {q(v,.75):6.2f}")
