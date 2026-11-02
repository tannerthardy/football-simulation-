"""Counter wrap puller vs the carrier, NFL vs sim, same operator (wrapmeet's rule pullers: wrap = second toward the pull
side). At carrier crossing - 0.4/-0.2/0 s: wrap lateral minus carrier lateral (+ = pull side / outside the runner),
wrap depth, carrier depth, wrap speed, wrap x-velocity (upfield) and lateral velocity (pull side), distance wrap-carrier.
Also: share with wrap outside the carrier by > 1 yd at the crossing; carrier lateral vs the wrap's 1.5 s lateral move."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); N = collections.Counter()
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def q(v, p): v = sorted(v); return v[int(p*(len(v)-1))] if v else float('nan')
DT = (-0.4, -0.2, 0.0)
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
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), None)
    if cross is None or cross < 6: return
    N[s] += 1
    for d in DT:
        f = max(1, min(n - 2, cross + int(round(d / 0.1))))
        vx = (xy[f+1][w][0] - xy[f-1][w][0]) / 0.2; vy = (xy[f+1][w][1] - xy[f-1][w][1]) / 0.2 * ps
        V[s, d, "wlat-car"].append((xy[f][w][1] - xy[f][car][1]) * ps)
        V[s, d, "wx"].append(xy[f][w][0]); V[s, d, "cx"].append(xy[f][car][0])
        V[s, d, "speed"].append(math.hypot(vx, vy)); V[s, d, "vx"].append(vx); V[s, d, "vy"].append(vy)
        V[s, d, "dist"].append(math.dist(xy[f][w], xy[f][car]))
        V[s, d, "cspd"].append(math.dist(xy[f+1][car], xy[f-1][car]) / 0.2)
    V[s, "tcross"].append(cross / 10)
    pst = max([i for i in ol if i not in pulls] or ol, key=lambda i: (xy[0][i][1] - cy) * ps)
    V[s, "car lat vs OL ctr"].append((xy[cross][car][1] - cy) * ps); V[s, "wrap lat vs OL ctr"].append((xy[cross][w][1] - cy) * ps)
    V[s, "car lat vs snap PST"].append((xy[cross][car][1] - xy[0][pst][1]) * ps); V[s, "wrap lat vs snap PST"].append((xy[cross][w][1] - xy[0][pst][1]) * ps)
    V[s, "car lat at snap vs ctr"].append((xy[0][car][1] - cy) * ps)
    for t in (1.0, 1.5, 2.0, 2.5):
        V[s, f"car lat {t}"].append((xy[k(t)][car][1] - cy) * ps); V[s, f"car x {t}"].append(xy[k(t)][car][0])
    N[s, "out>1"] += (xy[cross][w][1] - xy[cross][car][1]) * ps > 1
    N[s, "ahead"] += xy[cross][w][0] > xy[cross][car][0]
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
for s in ("nfl", "sim"):
    n = N[s]
    print(f"{s}: n {n} cross p50 {med(V[s,'tcross']):.1f}s | wrap outside carrier >1 yd {N[s,'out>1']/max(1,n):.2f} | wrap ahead (deeper) {N[s,'ahead']/max(1,n):.2f}")
    for key in ("car lat vs OL ctr","wrap lat vs OL ctr","car lat vs snap PST","wrap lat vs snap PST","car lat at snap vs ctr","car lat 1.0","car x 1.0","car lat 1.5","car x 1.5","car lat 2.0","car x 2.0","car lat 2.5","car x 2.5"):
        v = V[s, key]; print(f"   {key}: {med(v):+.2f} [{q(v,.25):+.2f},{q(v,.75):+.2f}]")
    for d in DT:
        g = lambda key: V[s, d, key]
        print(f"   cross{d:+.1f}: wlat-car {med(g('wlat-car')):+.2f} [{q(g('wlat-car'),.25):+.2f},{q(g('wlat-car'),.75):+.2f}] wx {med(g('wx')):+.2f} cx {med(g('cx')):+.2f} "
              f"speed {med(g('speed')):.2f} vx {med(g('vx')):+.2f} vy {med(g('vy')):+.2f} dist {med(g('dist')):.2f} car speed {med(g('cspd')):.2f}")
