"""Sim counter lead (wrap) puller: first ENGAGEMENT (trace engagedWith) before carrier cross + 0.6 s, slot vs his
planned target; and when he sits within 1.2 yd of the kicked end without engaging, where he is relative to the end
(depth behind the end, lateral) and his speed. usage: wrapeng.py traces..."""
import json, math, sys, collections
C = collections.Counter(); P = collections.defaultdict(list)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p.get("setup", {})
        if p.get("nullified") or s.get("concept") != "counter": continue
        ag = s["agents"]; slot = [a["slot"] for a in ag]; fr = p["frames"]; n = len(fr)
        if n < 26: continue
        car = next((f["c"] for f in fr if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None: continue
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in fr]
        crs = next((k for k in range(n) if xy[k][car][0] >= 0), n - 1); end = min(n, crs + 7)
        lead = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "lead"]
        kick = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "kick"]
        if len(lead) != 1 or len(kick) != 1: continue
        i, k = lead[0], kick[0]; C["plays"] += 1
        e = next(((f, fr[f]["a"][i][5]) for f in range(end) if fr[f]["a"][i][5] >= 0), None)
        kt = ag[k]["tgt"]
        if e is None: C["lead never engaged"] += 1
        else:
            f, j = e; d = slot[j]
            C["lead first engages " + ("his tgt" if d == ag[i]["tgt"] else "kick's tgt" if d == kt else "a line DL" if xy[0][j][0] < 1.8 else "other box/DB")] += 1
            P["t first eng"].append(f / 10)
        # near the kicked end without engagement
        if kt in slot:
            t = slot.index(kt)
            near = [f for f in range(end) if math.dist(xy[f][i], xy[f][t]) < 1.2]
            if near:
                C["lead within 1.2 of kicked end"] += 1
                f = near[0]
                P["lead depth - end depth"].append(xy[f][i][0] - xy[f][t][0])
                P["lead speed at"].append(math.hypot(fr[f]["a"][i][2], fr[f]["a"][i][3]))
                P["t near"].append(f / 10)
                P["frames near (of first 30)"].append(len([g for g in near if g < 30]))
                P["kicker-end dist"].append(math.dist(xy[f][k], xy[f][t]))
                ol = [q for q, a in enumerate(ag) if a["slot"] in ("LT", "LG", "C", "RG", "RT")]
                ps = 1 if sum(xy[15][q][1] - xy[0][q][1] for q in (i, k)) > 0 else -1
                stay = [q for q in ol if ag[q]["plan"] != "pull"]
                pst = max(stay, key=lambda q: (xy[0][q][1]) * ps)
                P["lead lat - end lat"].append((xy[f][i][1] - xy[f][t][1]) * ps)
                P["kicker lat - end lat"].append((xy[f][k][1] - xy[f][t][1]) * ps)
                P["PST lat - end lat"].append((xy[f][pst][1] - xy[f][t][1]) * ps)
                P["end lat from snap PST"].append((xy[f][t][1] - xy[0][pst][1]) * ps)
                P["end x"].append(xy[f][t][0]); P["lead x"].append(xy[f][i][0])
                P["carrier lat - end lat"].append((xy[f][car][1] - xy[f][t][1]) * ps); P["carrier x"].append(xy[f][car][0])
                P["lead engaged at near"].append(1 if fr[f]["a"][i][5] >= 0 else 0)
print(dict(C))
for key, v in P.items(): print(f"{key}: median {med(v):+.2f} n {len(v)}")
