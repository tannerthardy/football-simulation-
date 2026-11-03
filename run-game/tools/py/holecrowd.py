"""Counter hole crowding, NFL vs sim, same operator. Frame F: first frame the carrier is within 2.0 yd of the LOS (x >= -2).
Seam point: (0.5, kicker lat - 0.85) [inside the kicker]; A point: (0.5, 0.5 playside). Count defenders within 1.5 yd of each,
and how many of those are within 1.2 yd of an offensive player (in contact) vs free. Also defenders within 1.5 yd of the seam
by snap group. usage: holecrowd.py rfr nfl traces..."""
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
    kk = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps)[0]
    F = next((f for f in range(8, n) if xy[f][car][0] >= -2), None)
    if F is None: return
    defs = [j for j, r in enumerate(pl) if r["side"] == "D"]; offs = [i for i, r in enumerate(pl) if r["side"] == "O" and i != car]
    seam = (0.5, cy + ps * ((xy[F][kk][1] - cy) * ps - .85)); agap = (0.5, cy + ps * .5)
    C[s]["n"] += 1
    for name, pt in (("seam", seam), ("A", agap)):
        near = [j for j in defs if math.dist(xy[F][j], pt) < 1.5]
        free = [j for j in near if not any(math.dist(xy[F][i], xy[F][j]) < 1.2 for i in offs)]
        V[s, name + " defenders within 1.5"].append(len(near)); V[s, name + " FREE defenders within 1.5"].append(len(free))
        C[s][name + " has a free defender"] += bool(free)
        if name == "seam":
            for j in free: C[s]["seam free: " + ("line" if xy[0][j][0] < 1.6 else pl[j]["group"])] += 1
    V[s, "seam lat"].append((seam[1] - cy) * ps); V[s, "F t"].append(F / 10)
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    c = C[s]; nn = c["n"] or 1; print(f"== {s} n={c['n']}")
    for key in sorted(x for x in c if x != "n"): print(f"  {key:36s} {c[key]:4d} {100*c[key]/nn:5.1f}%")
    for (ss, key), v in sorted(V.items()):
        if ss == s: print(f"  {key:36s} mean {sum(v)/len(v):5.2f}  p25 {q(v,.25)} med {q(v,.5)} p75 {q(v,.75)}")
