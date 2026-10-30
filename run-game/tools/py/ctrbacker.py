"""Counter box backers (run_film_reference's box-backer rule: LB, 2.5-8 deep, within 6 yd of the OL centre), NFL vs sim:
touched by a blocker (1.5 yd, blocker past -0.5) before the carrier reaches his depth; split by side (pull-side-signed
lateral: play > +1, mid, back < -1); for touched ones, the first toucher's role (ctrcard roles). Sim adds, for untouched
ones, who had him at the snap (tgt/climb) and that blocker's first sustained block."""
import sys, json, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter)
def roles(p, ps, cy, ol, pulls):
    xy, pl = p["xy"], p["players"]
    rank = sorted(ol, key=lambda i: -(xy[0][i][1] - cy) * ps)
    r = {i: n + ("+pull" if i in pulls else "") for i, n in zip(rank, ("PST", "PSG", "C", "BSG", "BST"))}
    for i, q in enumerate(pl):
        if q["side"] == "O" and i not in r and q["group"] in ("TE", "RB") and i != p["carrier"]:
            r[i] = q["group"] + (" ps" if (xy[0][i][1] - cy) * ps > 0 else " bs")
    return r
def measure(p, raw=None):
    xy, car, pl = p["xy"], p["carrier"], p["players"]; n = len(xy); s = p["src"]
    if n < 22 or p["concept"] != "COUNTER": return
    k = lambda t: max(0, min(n - 1, int(round(t / 0.1))))
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if not pulls: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    role = roles(p, ps, cy, ol, pulls); blockers = list(role)
    for j, q in enumerate(pl):
        x0, y0 = xy[0][j]
        if q["side"] != "D" or q["group"] != "LB" or not (2.5 <= x0 <= 8 and abs(y0 - cy) < 6): continue
        lat = (y0 - cy) * ps; side = "play" if lat > 1 else "back" if lat < -1 else "mid"
        arrive = next((f for f in range(n) if xy[f][car][0] >= xy[f][j][0] - 1), None)
        last = arrive if arrive is not None else n
        first = next(((f, b) for f in range(3, last) for b in blockers if xy[f][b][0] > -0.5 and math.dist(xy[f][j], xy[f][b]) < 1.5), None)
        C[s, side]["n"] += 1
        if first: C[s, side]["touched by " + role[first[1]]] += 1
        else:
            C[s, side]["untouched"] += 1
            if raw is not None:
                ag = raw["setup"]["agents"]; slot = ag[j]["slot"]
                own = [i for i, a in enumerate(ag) if a["team"] == "O" and (a.get("tgt") == slot or a.get("climb") == slot)]
                C[s, side]["   untouched, snap owner: " + (",".join(role.get(i, ag[i]["slot"]) + ":" + str(ag[i]["plan"]) + ("/" + ag[i]["role"] if ag[i].get("role") else "") for i in own) or "nobody")] += 1
for p in rfr.nfl(sys.argv[2]): measure(p)
for path in sys.argv[3:]:
    raws = [q for q in json.load(open(path)) if not q["nullified"] and q["setup"].get("concept") is not None
            and any(f["c"] >= 0 and q["setup"]["agents"][f["c"]]["slot"] != "QB" for f in q["frames"])]
    for p, q in zip(rfr.sim([path]), raws): measure(p, q)
for side in ("play", "mid", "back"):
    for s in ("nfl", "sim"):
        c = C[s, side]; n = c["n"]
        if not n: continue
        print(f"{side:4} {s}: backers {n} untouched {c['untouched']/n:.2f} | " + " ".join(f"{k[11:]} {v/n:.2f}" for k, v in sorted(c.items(), key=lambda kv: -kv[1]) if k.startswith("touched by")))
        for k, v in sorted(c.items(), key=lambda kv: -kv[1]):
            if k.startswith("   "): print(f"{k} {v}")
