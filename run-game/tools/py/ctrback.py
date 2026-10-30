"""Counter back block, NFL vs sim, same operator: the backside line defender nearest the pulling backside guard's snap
spot (within 2.5 yd laterally, < 1.8 deep) and the centre. At 0.2/0.4/0.6/1.0/1.5 s: centre lateral relative to that
man signed toward the pull side (+ = centre still on his play side, - = centre has crossed his face to the backside);
centre and man depth x; distance. Only plays where the backside guard is a rule puller.
usage: ctrback.py rfr nfl traces"""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); N = collections.Counter()
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
TS = (0.2, 0.4, 0.6, 1.0, 1.5, 2.0)
def measure(p):
    xy, car, pl = p["xy"], p["carrier"], p["players"]; n = len(xy); s = p["src"]
    if n < 22 or p["concept"] != "COUNTER": return
    k = lambda t: max(0, min(n - 1, int(round(t / 0.1))))
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if not pulls: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    rank = sorted(ol, key=lambda i: -(xy[0][i][1] - cy) * ps); c, bsg = rank[2], rank[3]
    if bsg not in pulls or c in pulls: return
    cand = [j for j, q in enumerate(pl) if q["side"] == "D" and xy[0][j][0] < 1.8 and abs(xy[0][j][1] - xy[0][bsg][1]) < 2.5 and (xy[0][j][1] - xy[0][c][1]) * ps < -0.3]
    if not cand: N[s, "no man near BSG"] += 1; return
    j = min(cand, key=lambda j: abs(xy[0][j][1] - xy[0][bsg][1]))
    N[s, "plays"] += 1
    tech = (xy[0][j][1] - xy[0][bsg][1]) * ps  # + = shaded toward the centre (A gap), - = outside the guard
    V[s, "tech"].append(tech)
    for t in TS:
        f = k(t)
        V[s, f"rel{t}"].append((xy[f][c][1] - xy[f][j][1]) * ps)
        V[s, f"cx{t}"].append(xy[f][c][0]); V[s, f"jx{t}"].append(xy[f][j][0]); V[s, f"d{t}"].append(math.dist(xy[f][c], xy[f][j]))
    V[s, "jx min 2.5"].append(min(xy[f][j][0] for f in range(min(n, k(2.5)))))
    N[s, "man > 1 yd into backfield by 2.0"] += min(xy[f][j][0] for f in range(min(n, k(2.0)))) < -1
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
for s in ("nfl", "sim"):
    n = N[s, "plays"]
    print(f"{s}: plays {n} (no man near BSG {N[s,'no man near BSG']}) | man snap tech vs BSG (+ = inside) p50 {med(V[s,'tech']):+.2f} | man >1 yd in backfield by 2.0 s {N[s,'man > 1 yd into backfield by 2.0']/max(1,n):.2f}")
    for t in TS:
        print(f"   t {t}: C lat vs man (+ = C on his play side) {med(V[s,f'rel{t}']):+.2f} | C x {med(V[s,f'cx{t}']):+.2f} man x {med(V[s,f'jx{t}']):+.2f} | dist {med(V[s,f'd{t}']):.2f}")
