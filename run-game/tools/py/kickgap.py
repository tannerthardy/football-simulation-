"""Counter kick-out, NFL vs sim, same operator. Kick puller = the rule puller nearest the pull side at the snap (first
puller; on GT the backside guard). End man = outermost play-side line defender (snap < 1.8 deep), as edgekick.py.
Reports, medians: puller-to-end distance at 0.5/1.0/1.5/2.0 s; end depth x and lateral toward the ball; puller
lateral toward the pull and depth; first time puller within 1.2 yd of the end (share that ever do by carrier cross +0.6 s);
first time the end is within 1.5 yd of the carrier; share where the end reaches the carrier before the puller reaches
the end; and for misses, the puller's closest approach to the end and when."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); N = collections.Counter()
def med(v): v = sorted(x for x in v if x is not None); return v[len(v)//2] if v else float('nan')
TS = (0.5, 1.0, 1.5, 2.0)
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
    kp = max(pulls, key=lambda i: (xy[0][i][1] - cy) * ps)
    line = [j for j, q in enumerate(pl) if q["side"] == "D" and xy[0][j][0] < 1.8 and (xy[0][j][1] - cy) * ps > 0]
    if not line: return
    e = max(line, key=lambda j: (xy[0][j][1] - cy) * ps)
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), None)
    end = min(n, (cross if cross is not None else n) + 7)
    N[s] += 1
    for t in TS:
        f = k(t)
        V[s, f"d{t}"].append(math.dist(xy[f][kp], xy[f][e])); V[s, f"ex{t}"].append(xy[f][e][0])
        V[s, f"ey{t}"].append((xy[0][e][1] - xy[f][e][1]) * ps); V[s, f"px{t}"].append(xy[f][kp][0])
        V[s, f"py{t}"].append((xy[f][kp][1] - xy[0][kp][1]) * ps)
    reach = next((f for f in range(end) if math.dist(xy[f][kp], xy[f][e]) < 1.2), None)
    hitcar = next((f for f in range(end) if math.dist(xy[f][e], xy[f][car]) < 1.5), None)
    N[s, "puller reaches end"] += reach is not None
    if reach is not None: V[s, "t reach"].append(reach * 0.1)
    if hitcar is not None:
        N[s, "end reaches carrier"] += 1; V[s, "t end-carrier"].append(hitcar * 0.1)
        if reach is None or hitcar < reach: N[s, "end reaches carrier first"] += 1
    if reach is None:
        fm = min(range(end), key=lambda f: math.dist(xy[f][kp], xy[f][e]))
        V[s, "miss min d"].append(math.dist(xy[fm][kp], xy[fm][e])); V[s, "miss t"].append(fm * 0.1)
        V[s, "miss end x at min"].append(xy[fm][e][0]); V[s, "miss puller x at min"].append(xy[fm][kp][0])
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
for s in ("nfl", "sim"):
    n = N[s]
    print(f"{s}: n {n} | puller reaches end (1.2 yd) {N[s,'puller reaches end']/n:.2f} at p50 {med(V[s,'t reach']):.1f}s | end within 1.5 of carrier {N[s,'end reaches carrier']/n:.2f} at {med(V[s,'t end-carrier']):.1f}s, before the puller {N[s,'end reaches carrier first']/n:.2f}")
    print("   puller-end dist " + " ".join(f"{med(V[s,f'd{t}']):.2f}" for t in TS) + " | end x " + " ".join(f"{med(V[s,f'ex{t}']):+.2f}" for t in TS)
          + " | end lat to ball " + " ".join(f"{med(V[s,f'ey{t}']):+.2f}" for t in TS))
    print("   puller lat " + " ".join(f"{med(V[s,f'py{t}']):+.2f}" for t in TS) + " | puller x " + " ".join(f"{med(V[s,f'px{t}']):+.2f}" for t in TS)
          + f" | misses: closest {med(V[s,'miss min d']):.2f} at {med(V[s,'miss t']):.1f}s, end x {med(V[s,'miss end x at min']):+.2f}, puller x {med(V[s,'miss puller x at min']):+.2f}")
