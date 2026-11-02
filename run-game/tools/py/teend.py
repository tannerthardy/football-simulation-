"""Power, NFL vs sim, same operator: plays where a TE is within 1.2 yd of the EMLOS at 0.8 s (TE on the end).
End depth and lateral (from his snap y, + = outside) at 1.2/1.6/2.0 s; share of ends deeper than -1.0 at 1.6 s (in the
backfield); share still within 1.2 of that TE at 1.6 s; TE depth at 1.6 s. usage: teend.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); C = collections.defaultdict(collections.Counter)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def go(p):
    if p["concept"] != "POWER": return
    xy, pl = p["xy"], p["players"]; n = len(xy); s = p["src"]
    if n < 22: return
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, min(25, n - 1))]
    if len(pulls) != 1: return
    kk = pulls[0]; cy = sum(xy[0][i][1] for i in ol) / 5; ps = 1 if xy[15][kk][1] - xy[0][kk][1] > 0 else -1
    line = [j for j, q in enumerate(pl) if q["side"] == "D" and q["group"] in ("DL", "LB") and xy[0][j][0] < 1.6]
    if not line: return
    e = max(line, key=lambda j: (xy[0][j][1] - cy) * ps)
    te = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "TE" and math.dist(xy[8][i], xy[8][e]) < 1.2]
    if not te: return
    t = te[0]; C[s]["n"] += 1
    for tt in (1.2, 1.6, 2.0):
        f = min(n - 1, int(round(tt * 10)))
        V[s, tt, "x"].append(xy[f][e][0]); V[s, tt, "lat"].append((xy[f][e][1] - xy[0][e][1]) * ps)
    f = 16
    C[s]["end in backfield <-1 @1.6"] += xy[f][e][0] < -1.0
    C[s]["still on TE @1.6"] += math.dist(xy[f][t], xy[f][e]) < 1.2
    V[s, "tex"].append(xy[f][t][0])
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    n = max(1, C[s]["n"])
    print(s, "n", C[s]["n"], " ".join(f"| t{tt}: end x {med(V[s,tt,'x']):+.2f} lat {med(V[s,tt,'lat']):+.2f}" for tt in (1.2, 1.6, 2.0)),
          f"| end deeper than -1 @1.6 {C[s]['end in backfield <-1 @1.6']/n:.0%} | still on TE {C[s]['still on TE @1.6']/n:.0%} | TE x @1.6 {med(V[s,'tex']):+.2f}")
