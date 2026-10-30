"""Counter kick block, NFL vs sim, same operator (positions only). Two-OL-puller plays; kicker = the rule puller
nearest the pull side at the snap, wrap = the other. Kick man = kicker's first sustained block (1.2 yd x 3 frames,
before carrier cross + 0.6 s), line defenders only (snap depth < 1.8). At block onset + 0.3 s: kicker lateral
relative to his man (+ = kicker outside = log, - = kicked out from inside), the man's lateral from the snap PST
(+ outside) and depth; then at carrier crossing: carrier and wrap lateral relative to the man (+ outside).
usage: kicklog.py rfr nfl.jsonl.gz traces..."""
import importlib.util, math, sys, collections
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); N = collections.Counter()
def q(v):
    v = sorted(v); return f"{v[len(v)//4]:+.2f}/{v[len(v)//2]:+.2f}/{v[3*len(v)//4]:+.2f}" if v else "-"
def measure(p):
    if p["concept"] != "COUNTER": return
    xy, car, pl = p["xy"], p["carrier"], p["players"]; n = len(xy); s = p["src"]
    if n < 26: return
    ol = [i for i, x in enumerate(pl) if x["side"] == "O" and x["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, 25)]
    if len(pulls) != 2: return
    ps = 1 if sum(xy[15][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    stay = [i for i in ol if i not in pulls]
    pst = max(stay, key=lambda i: xy[0][i][1] * ps)
    kick, wrap = sorted(pulls, key=lambda i: -xy[0][i][1] * ps)
    crs = next((k for k in range(n) if xy[k][car][0] >= 0), None)
    if crs is None: return
    end = min(n, crs + 7)
    defs = [i for i, x in enumerate(pl) if x["side"] == "D"]
    hit = None
    for f in range(2, end - 2):
        near = [j for j in defs if all(math.dist(xy[g][kick], xy[g][j]) < 1.2 for g in (f, f + 1, f + 2))]
        if near: hit = (f, min(near, key=lambda j: math.dist(xy[f][kick], xy[f][j]))); break
    N[s, "plays"] += 1
    if not hit: N[s, "kick nobody"] += 1; return
    f, j = hit
    if xy[0][j][0] >= 1.8: N[s, "kick first blocks off-line man"] += 1; return
    N[s, "kick line man"] += 1
    g = min(n - 1, f + 3)
    rel = (xy[g][kick][1] - xy[g][j][1]) * ps
    N[s, "log (kicker outside > .25)"] += rel > .25
    N[s, "kick-out (kicker inside < -.25)"] += rel < -.25
    V[s, "kicker lat rel man @onset+.3"].append(rel)
    V[s, "man lat from snap PST @onset+.3"].append((xy[g][j][1] - xy[0][pst][1]) * ps)
    V[s, "man snap lat from snap PST"].append((xy[0][j][1] - xy[0][pst][1]) * ps)
    V[s, "man x @onset+.3"].append(xy[g][j][0])
    V[s, "onset t"].append(f / 10)
    V[s, "carrier lat rel man @cross"].append((xy[crs][car][1] - xy[crs][j][1]) * ps)
    V[s, "wrap lat rel man @cross"].append((xy[crs][wrap][1] - xy[crs][j][1]) * ps)
    V[s, "wrap x - man x @cross"].append(xy[crs][wrap][0] - xy[crs][j][0])
    key = "log" if rel > .25 else "out" if rel < -.25 else "mid"
    V[s, f"carrier lat rel man @cross [{key}]"].append((xy[crs][car][1] - xy[crs][j][1]) * ps)
    V[s, f"wrap lat rel man @cross [{key}]"].append((xy[crs][wrap][1] - xy[crs][j][1]) * ps)
    V[s, f"wrap x @cross [{key}]"].append(xy[crs][wrap][0])
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
for s in ("nfl", "sim"): print(s, {k[1]: v for k, v in N.items() if k[0] == s})
for k in sorted({k[1] for k in V}):
    print(f"{k:40} nfl {q(V['nfl', k]):20} sim {q(V['sim', k])}")
