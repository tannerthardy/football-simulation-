"""Power puller first contact, NFL vs sim, same operator. Puller = OL that rfr.puller() calls (most playside if several).
Contact: first frame (after 0.5 s) within 1.2 yd of a defender for 3 frames. Reports time, puller depth/lat, defender depth at
contact and at snap, defender kind (line if snap depth<1.6), and the carrier depth at that frame. usage: powerhit.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter); V = collections.defaultdict(list)
def q(v, p): v = sorted(v); return round(v[int(p*(len(v)-1))], 2) if v else float('nan')
CON = sys.argv[3] if False else "POWER"
def go(p, con):
    if p["concept"] != con: return
    xy, pl = p["xy"], p["players"]; n = len(xy)
    gs = [r["group"] for r in pl if r["side"] == "O"]; s = p["src"] + (" 11" if gs.count("RB") == 1 and gs.count("TE") == 1 else " 2back" if gs.count("RB") >= 2 else " 12+")
    if n < 26: return
    k = lambda t: min(n - 1, int(round(t / .1)))
    ol = [i for i, r in enumerate(pl) if r["side"] == "O" and r["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if not pulls: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    g = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps)[0]
    defs = [j for j, r in enumerate(pl) if r["side"] == "D"]
    hit = None
    for f in range(5, n - 2):
        for j in defs:
            if all(math.dist(xy[h][g], xy[h][j]) < 1.2 for h in (f, f+1, f+2)): hit = (j, f); break
        if hit: break
    C[s]["n"] += 1
    if not hit: C[s]["no contact"] += 1; return
    j, f = hit; kind = "line" if xy[0][j][0] < 1.6 else ("LB" if xy[0][j][0] < 6 else "DB")
    if kind == "line":
        lat0 = lambda i: (xy[0][i][1] - cy) * ps
        tackle = max(ol, key=lat0)
        dl = [d for d in defs if xy[0][d][0] < 1.6 and lat0(tackle) - 1 < lat0(d) < lat0(tackle) + 6]
        e = max(dl, key=lat0) if dl else None
        kind = "line:emlos" if j == e else ("line:outside-T" if lat0(j) > lat0(tackle) - 1 else "line:inside")
    C[s][kind] += 1
    for key, v in (("t", f/10), ("puller depth", xy[f][g][0]), ("puller lat", (xy[f][g][1]-cy)*ps), ("def depth", xy[f][j][0]), ("def snap depth", xy[0][j][0]), ("def lat", (xy[f][j][1]-cy)*ps)):
        V[s, kind, key].append(v)
    if kind.startswith("line"):
        V[s, kind, "def depth -0.5s"].append(xy[max(0,f-5)][j][0]); V[s, kind, "def lat moved"].append(((xy[f][j][1]-xy[0][j][1]))*ps)
for con in ("POWER",):
    for p in rfr.nfl(sys.argv[2]): go(p, con)
    for p in rfr.sim(sys.argv[3:]): go(p, con)
for s in C:
    print(s, dict(C[s]))
    for kind in ("line:emlos", "line:outside-T", "line:inside", "LB", "DB"):
        ks = [key for (ss, kk, key) in V if ss == s and kk == kind]
        print("  ", kind, " ".join(f"{key}={q(V[s,kind,key],.5)}" for key in ks))
