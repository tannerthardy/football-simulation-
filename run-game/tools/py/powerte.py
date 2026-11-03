"""Power with a playside inline TE, NFL vs sim, same operator. Playside = pullers' lateral move by 1.5 s. Inline TE = TE
at the LOS (snap x > -2) within 1-3.5 yd outside the playside tackle. EMLOS = widest snap line defender (depth<1.6)
within 6 yd outside the tackle. Bucket by EMLOS offset from the TE (lat e - lat TE): inside (<-0.75), head-up, outside
(>0.75). Per bucket: who first touches the EMLOS (TE / puller / other / none), and the puller's first contact
(EMLOS / LB / other line). usage: powerte.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter)
def first(xy, a, cands, n, f0=4):
    for f in range(f0, n - 2):
        for j in cands:
            if all(math.dist(xy[h][a], xy[h][j]) < 1.2 for h in (f, f+1, f+2)): return j
    return None
def go(p):
    if p["concept"] != "POWER": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 26: return
    ol = [i for i, r in enumerate(pl) if r["side"] == "O" and r["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, 25)]
    if not pulls: return
    ps = 1 if sum(xy[15][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    lat = lambda i: (xy[0][i][1] - cy) * ps
    tackle = max(ol, key=lat)
    tes = [i for i, r in enumerate(pl) if r["side"] == "O" and r["group"] == "TE" and xy[0][i][0] > -2 and 1 < lat(i) - lat(tackle) < 3.5]
    if not tes: return
    te = min(tes, key=lat)
    dl = [j for j, r in enumerate(pl) if r["side"] == "D" and xy[0][j][0] < 1.6 and lat(tackle) - 1 < lat(j) < lat(tackle) + 6]
    if not dl: return
    e = max(dl, key=lat); off = lat(e) - lat(te)
    b = "inside" if off < -.75 else "outside" if off > .75 else "head-up"
    k = (s, b); C[k]["n"] += 1
    g = sorted(pulls, key=lambda i: -lat(i))[0]
    offs = [i for i, r in enumerate(pl) if r["side"] == "O" and i != car]
    who = None
    for f in range(4, n - 2):
        for i in offs:
            if all(math.dist(xy[h][i], xy[h][e]) < 1.2 for h in (f, f+1, f+2)): who = i; break
        if who is not None: break
    C[k]["emlos by " + ("TE" if who == te else "puller" if who == g else "none" if who is None else ("OT" if who == tackle else ("2ndpuller" if who in pulls else pl[who]["group"] + ("-wing" if pl[who]["group"] != "OL" and xy[0][who][0] < -0.5 and abs(lat(who) - lat(te)) < 3 else ""))))] += 1
    defs = [j for j, r in enumerate(pl) if r["side"] == "D"]
    tj = first(xy, te, defs, n, 3)
    C[k]["TE first " + ("none" if tj is None else "EMLOS" if tj == e else "inside-line" if xy[0][tj][0] < 1.6 and lat(tj) < lat(e) else "LB" if xy[0][tj][0] < 6 else "DB")] += 1
    j = first(xy, g, defs, n, 5)
    held = sum(1 for f in range(5, min(n, 26)) if math.dist(xy[f][te], xy[f][e]) < 1.2) / 10
    C[k]["TE on EMLOS >=1.0s"] += held >= 1.0; C[k]["TE on EMLOS >=0.5s"] += held >= .5
    ek = "TE" if who == te else "puller" if who == g else "none" if who is None else "other"
    C[(s, b + "/emlos:" + ek)]["n"] += 1; C[(s, b + "/emlos:" + ek)]["guard first " + ("none" if j is None else "EMLOS" if j == e else "LB" if xy[0][j][0] >= 1.6 and xy[0][j][0] < 6 else "DB" if xy[0][j][0] >= 6 else "line")] += 1
    C[k]["guard first " + ("none" if j is None else "EMLOS" if j == e else "LB" if xy[0][j][0] >= 1.6 and xy[0][j][0] < 6 else "DB" if xy[0][j][0] >= 6 else "line")] += 1
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for k in sorted(C):
    n = C[k]["n"]; print(f"{k[0]:4} {k[1]:8} n {n:4} | " + " ".join(f"{kk} {100*v/n:.0f}%" for kk, v in sorted(C[k].items()) if kk != "n"))
