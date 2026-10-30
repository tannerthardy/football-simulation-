"""Counter wrap puller vs the box backers, NFL vs sim, same operator. Rule pullers ranked toward the pull side at the
snap: kicker = first, wrap = second (GT). Box backers = run_film_reference's rule (LB group, 2.5-8 deep, within 6 yd
of the OL centre). At 1.0/1.5/2.0/2.5 s: distance from the wrap to the nearest box backer; that backer's depth x and
lateral relative to the wrap (+ = toward the pull side); the wrap's depth x and lateral move; first time the wrap is
within 1.2 yd of any box backer (share by carrier cross + 0.6 s)."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); N = collections.Counter()
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
TS = (1.0, 1.5, 2.0, 2.5)
def measure(p):
    xy, car, pl = p["xy"], p["carrier"], p["players"]; n = len(xy); s = p["src"]
    if n < 26 or p["concept"] != "COUNTER": return
    k = lambda t: max(0, min(n - 1, int(round(t / 0.1))))
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if len(pulls) < 2: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    order = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps); w = order[1]
    box = [j for j, q in enumerate(pl) if q["side"] == "D" and q["group"] == "LB" and 2.5 <= xy[0][j][0] <= 8 and abs(xy[0][j][1] - cy) < 6]
    if not box: return
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), n); end = min(n, cross + 7)
    N[s] += 1
    for t in TS:
        f = k(t); j = min(box, key=lambda j: math.dist(xy[f][w], xy[f][j]))
        V[s, f"d{t}"].append(math.dist(xy[f][w], xy[f][j])); V[s, f"bx{t}"].append(xy[f][j][0])
        V[s, f"blat{t}"].append((xy[f][j][1] - xy[f][w][1]) * ps); V[s, f"wx{t}"].append(xy[f][w][0])
        V[s, f"wlat{t}"].append((xy[f][w][1] - xy[0][w][1]) * ps)
    meet = next((f for f in range(end) if any(math.dist(xy[f][w], xy[f][j]) < 1.2 for j in box)), None)
    N[s, "meet"] += meet is not None
    if meet is not None: V[s, "tmeet"].append(meet * 0.1)
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
for s in ("nfl", "sim"):
    n = N[s]
    print(f"{s}: n {n} | wrap within 1.2 of a box backer {N[s,'meet']/max(1,n):.2f} at p50 {med(V[s,'tmeet']):.1f}s")
    for t in TS:
        print(f"   t {t}: dist to nearest backer {med(V[s,f'd{t}']):.2f} | backer x {med(V[s,f'bx{t}']):+.2f} lat vs wrap {med(V[s,f'blat{t}']):+.2f} | wrap x {med(V[s,f'wx{t}']):+.2f} lat {med(V[s,f'wlat{t}']):+.2f}")
