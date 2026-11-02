"""Draws, NFL vs sim, same operator: per OL by rank from the centre (C, G, T), lateral move outward from his snap y
(+ = away from the OL centre) and depth at 0.5/1.0/1.4 s; T only: nearest DL/LB lateral outward of him at snap."""
import importlib.util, math, sys, collections
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def go(p):
    if p["concept"] != "DRAW": return
    xy, pl = p["xy"], p["players"]; n = len(xy)
    if n < 16: return
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    cy = sum(xy[0][i][1] for i in ol) / 5
    for i in ol:
        rank = sorted(ol, key=lambda j: abs(xy[0][j][1] - cy)).index(i); role = "C" if rank == 0 else "G" if rank < 3 else "T"
        out = 1 if xy[0][i][1] >= cy else -1
        if role == "T":
            dl = [j for j, q in enumerate(pl) if q["side"] == "D" and q["group"] in ("DL", "LB") and xy[0][j][0] < 2 and (xy[0][j][1] - xy[0][i][1]) * out > -0.5 and abs(xy[0][j][1] - xy[0][i][1]) < 3.5]
            if dl:
                e = min(dl, key=lambda j: abs(xy[0][j][1] - xy[0][i][1]))
                for t in (0.5, 1.0, 1.4):
                    f = min(n - 1, int(round(t * 10))); V[p["src"], "EDGE", t, "x"].append(xy[f][e][0]); V[p["src"], "EDGE", t, "lat"].append((xy[f][e][1] - xy[f][i][1]) * out)
        for t in (0.5, 1.0, 1.4):
            f = min(n - 1, int(round(t * 10)))
            V[p["src"], role, t, "lat"].append((xy[f][i][1] - xy[0][i][1]) * out); V[p["src"], role, t, "x"].append(xy[f][i][0])
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    for role in ("C", "G", "T", "EDGE"):
        print(s, role, " ".join(f"t{t}: lat {med(V[s,role,t,'lat']):+.2f} x {med(V[s,role,t,'x']):+.2f}" for t in (0.5, 1.0, 1.4)), "n", len(V[s, role, 1.0, "lat"]))
