"""Counter wrap (second rule puller toward the pull side), NFL vs sim, same operator: first sustained block (any
defender within 1.2 yd for 3 frames) before carrier cross + 0.6 s. Share none; for blocks: defender group/line, time;
for none: at cross, wrap depth, wrap-carrier lateral (+ = wrap outside), nearest defender distance and whether that man
is near (1.2) another blocker. usage: wrapany.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter); V = collections.defaultdict(list)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def go(p):
    if p["concept"] != "COUNTER": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 26: return
    k = lambda t: min(n - 1, int(round(t / .1)))
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if len(pulls) < 2: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    w = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps)[1]
    defs = [j for j, q in enumerate(pl) if q["side"] == "D"]
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), None)
    if cross is None: return
    end = min(n, cross + 7); C[s]["n"] += 1
    hit = None
    for f in range(3, end - 2):
        for j in defs:
            if all(math.dist(xy[h][w], xy[h][j]) < 1.2 for h in (f, f+1, f+2)): hit = (j, f); break
        if hit: break
    if hit:
        j, f = hit; g = "line" if xy[0][j][0] < 1.6 else pl[j]["group"]
        C[s]["block " + g] += 1; V[s, "t"].append(f / 10)
    else:
        C[s]["none"] += 1; f = cross
        V[s, "none wx"].append(xy[f][w][0]); V[s, "none wlat-car"].append((xy[f][w][1] - xy[f][car][1]) * ps)
        nd = min(defs, key=lambda j: math.dist(xy[f][w], xy[f][j])); V[s, "none nearest"].append(math.dist(xy[f][w], xy[f][nd]))
        mates = [i for i, q in enumerate(pl) if q["side"] == "O" and i not in (w, car)]
        C[s]["none: nearest held by mate"] += any(math.dist(xy[f][i], xy[f][nd]) < 1.2 for i in mates)
        V[s, "none wspeed"].append(math.dist(xy[f][w], xy[max(0,f-1)][w]) * 10)
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    c = C[s]; n = max(1, c["n"])
    print(s, "n", c["n"], " ".join(f"| {k} {v/n:.0%}" for k, v in sorted(c.items()) if k != "n"), "| block t", f"{med(V[s,'t']):.1f}",
          "| none: wrap x", f"{med(V[s,'none wx']):+.2f}", "lat-car", f"{med(V[s,'none wlat-car']):+.2f}", "nearest D", f"{med(V[s,'none nearest']):.2f}", "speed", f"{med(V[s,'none wspeed']):.2f}")
