"""Sim counter lead puller that never engages before carrier cross + 0.6 s: at the carrier's crossing, his depth,
lateral vs the carrier (+ = pull side), speed, his current target (frame col 6) and its state (engaged with whom,
distance, depth, lat vs lead), and the nearest unengaged defender in front (x > lead x) with distance.
usage: leadnone.py traces..."""
import json, math, sys, collections, re
C = collections.Counter(); P = collections.defaultdict(list); EX = []
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
for path in sys.argv[1:]:
    seed = re.search(r'seed(\d+)', path).group(1)
    for pi, p in enumerate(json.load(open(path))):
        s = p.get("setup", {})
        if p.get("nullified") or s.get("concept") != "counter": continue
        ag = s["agents"]; slot = [a["slot"] for a in ag]; side = [a.get("side") for a in ag]; fr = p["frames"]; n = len(fr)
        if n < 26: continue
        car = next((f["c"] for f in fr if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None: continue
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in fr]
        lead = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "lead"]
        kick = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "kick"]
        if len(lead) != 1 or len(kick) != 1: continue
        i = lead[0]; k = kick[0]
        dirx = 1
        crs = next((f for f in range(n) if xy[f][car][0] >= 0), n - 1); end = min(n, crs + 7)
        C["plays"] += 1
        if any(fr[f]["a"][i][5] >= 0 for f in range(end)): continue
        C["never"] += 1
        ps = 1 if sum(xy[15][q][1] - xy[0][q][1] for q in (i, k)) > 0 else -1
        f = crs; a = fr[f]["a"]
        P["t cross"].append(f / 10); P["lead x"].append(xy[f][i][0]); P["lead lat - car"].append((xy[f][i][1] - xy[f][car][1]) * ps)
        P["lead dist car"].append(math.dist(xy[f][i], xy[f][car]))
        P["lead speed"].append(math.hypot(a[i][2], a[i][3]))
        t = a[i][6]
        D = [j for j in range(len(ag)) if ag[j]["team"] != ag[i]["team"]]
        if t is None or t < 0: C["tgt none"] += 1
        else:
            C["tgt " + ("engaged" if a[t][5] >= 0 else "down" if a[t][7] else "free")] += 1
            P["tgt dist"].append(math.dist(xy[f][i], xy[f][t])); P["tgt x"].append(xy[f][t][0]); P["tgt lat - lead"].append((xy[f][t][1] - xy[f][i][1]) * ps)
        free = [j for j in D if a[j][5] < 0 and not a[j][7] and xy[f][j][0] > xy[f][i][0] - 0.5]
        if free:
            j = min(free, key=lambda j: math.dist(xy[f][i], xy[f][j]))
            P["nearest free dist"].append(math.dist(xy[f][i], xy[f][j])); P["free lat - lead"].append((xy[f][j][1] - xy[f][i][1]) * ps)
            P["free x"].append(xy[f][j][0])
            C["nearest free is tgt"] += (j == t)
            C["nearest free " + slot[j][:2]] += 1
        body = sum(1 for j in range(len(ag)) if j != i and math.dist(xy[f][i], xy[f][j]) < 1.3)
        P["bodies <1.3"].append(body)
        EX.append((seed, pi, f / 10, slot[i], slot[t] if t is not None and t >= 0 else None))
print(dict(C))
for key, v in P.items(): print(f"{key}: median {med(v):+.2f} p25 {sorted(v)[len(v)//4]:+.2f} p75 {sorted(v)[3*len(v)//4]:+.2f} n {len(v)}")
print(EX[:12])
