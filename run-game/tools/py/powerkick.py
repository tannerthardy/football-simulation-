"""Power: who blocks the end man on the line (EMLOS), NFL vs sim, same operator. EMLOS = playside-most defender with snap depth<1.6
within 6 yd laterally of the playside tackle. First offensive player within 1.2 yd for 3 frames after 0.4 s: group (puller OL / OL / TE /
back / WR). Also EMLOS depth & lateral movement at 1.5 s and at that contact. usage: powerkick.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter); V = collections.defaultdict(list)
def q(v, p): v = sorted(v); return round(v[int(p*(len(v)-1))], 2) if v else float('nan')
def go(p):
    if p["concept"] != "POWER": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy)
    if n < 26: return
    gs = [r["group"] for r in pl if r["side"] == "O"]; s = p["src"] + (" 11" if gs.count("RB") == 1 and gs.count("TE") == 1 else " 2back" if gs.count("RB") >= 2 else " 12+")
    ol = [i for i, r in enumerate(pl) if r["side"] == "O" and r["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, 25)]
    if not pulls: return
    ps = 1 if sum(xy[15][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    lat = lambda f, i: (xy[f][i][1] - cy) * ps
    tackle = max(ol, key=lambda i: lat(0, i))
    dl = [j for j, r in enumerate(pl) if r["side"] == "D" and xy[0][j][0] < 1.6 and lat(0, j) > lat(0, tackle) - 1 and lat(0, j) < lat(0, tackle) + 6]
    if not dl: C[s]["no emlos"] += 1; return
    e = max(dl, key=lambda j: lat(0, j))
    C[s]["n"] += 1
    offs = [i for i, r in enumerate(pl) if r["side"] == "O" and i != car]
    hit = None
    for f in range(4, n - 2):
        for i in offs:
            if all(math.dist(xy[h][i], xy[h][e]) < 1.2 for h in (f, f+1, f+2)): hit = (i, f); break
        if hit: break
    V[s, "emlos depth@1.5"].append(xy[15][e][0]); V[s, "emlos lat moved@1.5"].append(lat(15, e) - lat(0, e)); V[s, "emlos snap lat-from-tackle"].append(lat(0, e) - lat(0, tackle))
    if not hit: C[s]["untouched"] += 1; return
    i, f = hit; g = pl[i]["group"]; g = "puller" if i in pulls else g
    C[s][g] += 1; V[s, "contact t"].append(f / 10); V[s, "emlos depth@contact"].append(xy[f][e][0])
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in sorted(C):
    n = C[s]["n"]; print(s, {k: (v if k == "n" else f"{100*v/max(1,n):.0f}%") for k, v in C[s].items()})
    print("   ", " ".join(f"{k}={q(V[ss,k],.5)}" for (ss, k) in V if ss == s))
