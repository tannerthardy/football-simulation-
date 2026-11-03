"""Counter kicker and wrapper by clock, NFL vs sim, same operator (kicker/wrapper as wrapany). At t = 0.5..3.0 s: lateral from
ball (+ playside), depth, speed for each; wrapper-kicker distance and lateral gap. usage: wrapclock.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); N = collections.Counter()
def q(v, p): v = sorted(v); return round(v[int(p*(len(v)-1))], 2) if v else float('nan')
TS = (5, 10, 15, 20, 25, 30)
def go(p):
    if p["concept"] != "COUNTER": return
    xy, pl = p["xy"], p["players"]; n = len(xy); s = p["src"]
    if n < 31: return
    k = lambda t: min(n - 1, int(round(t / .1)))
    ol = [i for i, r in enumerate(pl) if r["side"] == "O" and r["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if len(pulls) < 2: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    kk, w = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps)[:2]
    N[s] += 1
    for f in TS:
        for name, i in (("kick", kk), ("wrap", w)):
            V[s, f, name + " lat"].append((xy[f][i][1] - cy) * ps); V[s, f, name + " depth"].append(xy[f][i][0])
            V[s, f, name + " speed"].append(math.dist(xy[f][i], xy[f-1][i]) * 10)
        V[s, f, "wrap-kick dist"].append(math.dist(xy[f][w], xy[f][kk]))
        V[s, f, "wrap-kick lat"].append((xy[f][w][1] - xy[f][kk][1]) * ps)
        V[s, f, "wrap-kick depth"].append(xy[f][w][0] - xy[f][kk][0])
        V[s, f, "|wrap-kick depth|"].append(abs(xy[f][w][0] - xy[f][kk][0]))
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
keys = ["wrap-kick depth", "|wrap-kick depth|", "kick lat", "kick depth", "kick speed", "wrap lat", "wrap depth", "wrap speed", "wrap-kick dist", "wrap-kick lat"]
print("median by time (s):", "  ".join(f"{f/10:>5}" for f in TS))
for key in keys:
    for s in ("nfl", "sim"):
        print(f"{s} {key:16s}", "  ".join(f"{q(V[s, f, key], .5):5.2f}" for f in TS), "   p25/p75 @2.0:", q(V[s, 20, key], .25), q(V[s, 20, key], .75))
print(N)
