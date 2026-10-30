"""Counter clock and backside line, NFL vs sim, same operator. Handoff time, carrier crossing time and his lateral at
crossing (toward pull side, from the OL centre); carrier depth at 1.0/1.5 s. Backside line defenders (snap < 1.8 deep,
pull-side-signed lateral < 0): depth x and lateral toward the play at 0.5/1.0/1.5/2.0 s, split DT (inside the
backside tackle's snap spot + 0.5) / DE (outside); min distance to the carrier by 2.5 s."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list)
def med(v): v = sorted(x for x in v if x is not None); return v[len(v)//2] if v else float('nan')
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
    V[s, "handoff"].append(p["handoff"])
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), None)
    V[s, "cross t"].append(cross * 0.1 if cross is not None else 9.9)
    if cross is not None: V[s, "cross lat"].append((xy[cross][car][1] - cy) * ps)
    for t in (1.0, 1.5): V[s, f"car x{t}"].append(xy[k(t)][car][0]); V[s, f"car lat{t}"].append((xy[k(t)][car][1] - cy) * ps)
    bst = min(ol, key=lambda i: (xy[0][i][1] - cy) * ps)
    for j, q in enumerate(pl):
        if q["side"] != "D" or xy[0][j][0] >= 1.8 or (xy[0][j][1] - cy) * ps >= 0: continue
        kind = "DT" if (xy[0][j][1] - xy[0][bst][1]) * ps > -0.5 else "DE"
        for t in (0.5, 1.0, 1.5, 2.0):
            V[s, kind, f"x{t}"].append(xy[k(t)][j][0]); V[s, kind, f"lat{t}"].append((xy[k(t)][j][1] - xy[0][j][1]) * ps)
        V[s, kind, "near car<1.5 by 2.5"].append(1 if min(math.dist(xy[f][j], xy[f][car]) for f in range(min(n, k(2.5)))) < 1.5 else 0)
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
for s in ("nfl", "sim"):
    print(f"{s}: n {len(V[s,'handoff'])} handoff {med(V[s,'handoff']):.2f} cross t {med(V[s,'cross t']):.2f} cross lat {med(V[s,'cross lat']):+.1f} | car x/lat @1.0 {med(V[s,'car x1.0']):+.1f}/{med(V[s,'car lat1.0']):+.1f} @1.5 {med(V[s,'car x1.5']):+.1f}/{med(V[s,'car lat1.5']):+.1f}")
    for kind in ("DT", "DE"):
        nn = len(V[s, kind, "x0.5"])
        print(f"   backside {kind} n {nn}: x " + " ".join(f"{med(V[s,kind,f'x{t}']):+.2f}" for t in (0.5,1.0,1.5,2.0)) + " | lat toward play " + " ".join(f"{med(V[s,kind,f'lat{t}']):+.2f}" for t in (0.5,1.0,1.5,2.0)) + f" | within 1.5 yd of carrier by 2.5 s {sum(V[s,kind,'near car<1.5 by 2.5'])/max(1,nn):.2f}")
