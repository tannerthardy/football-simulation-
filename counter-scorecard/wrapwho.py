"""Sim counter pullers (snap plan 'pull', ranked toward the pull side: kick = first, wrap = second): first sustained
block (ctrcard's operator: within 1.2 yd for 3 frames before carrier cross + 0.6 s) -> defender slot and his snap
spot (depth, lateral from the PST, + = outside), the puller's planned target, and who else blocked that defender
first. Also 'nobody' cases: nearest defender at closest approach. usage: wrapwho.py traces..."""
import json, math, sys, collections
C = collections.defaultdict(collections.Counter); EX = collections.defaultdict(list)
for path in sys.argv[1:]:
    for pi, p in enumerate(json.load(open(path))):
        s = p.get("setup", {})
        if p.get("nullified") or s.get("concept") != "counter": continue
        ag = s["agents"]; slot = [a["slot"] for a in ag]
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in p["frames"]]; n = len(xy)
        if n < 26: continue
        car = next((f["c"] for f in p["frames"] if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None: continue
        ol = [i for i, a in enumerate(ag) if a["slot"] in ("LT", "LG", "C", "RG", "RT")]
        pulls = [i for i in ol if ag[i]["plan"] == "pull"]
        if len(pulls) != 2: continue
        ps = 1 if sum(xy[15][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
        cyy = sum(xy[0][i][1] for i in ol) / 5
        pst = max(ol, key=lambda i: (xy[0][i][1] - cyy) * ps)
        pulls.sort(key=lambda i: -(xy[0][i][1] - cyy) * ps)  # snap: more play-side first... kicker is BSG (inside), wrap BST
        # roles by the pullRole recorded at the snap
        crs = next((k for k in range(n) if xy[k][car][0] >= 0), n - 1); end = min(n, crs + 7)
        defs = [i for i, a in enumerate(ag) if a["team"] == "D"]
        for i in pulls:
            role = ag[i]["role"] or "?"
            hit = None
            for f in range(2, end - 2):
                near = [j for j in defs if all(math.dist(xy[g][i], xy[g][j]) < 1.2 for g in (f, f + 1, f + 2))]
                if near: hit = (f, min(near, key=lambda j: math.dist(xy[f][i], xy[f][j]))); break
            if hit:
                f, j = hit
                dx, dy = xy[0][j][0], (xy[0][j][1] - xy[0][pst][1]) * ps
                lvl = "line" if dx < 1.8 else "box" if dx < 8 else "out"
                tg = "=tgt" if slot[j] == ag[i]["tgt"] else f"tgt {ag[i]['tgt']}"
                C[role][f"{lvl} {slot[j]:5} {tg}"] += 1
                EX[role, slot[j], ag[i]['tgt']].append(f"{path.split('trace-')[-1][:12]}#{pi} t{f/10:.1f} snap d({dx:+.1f},{dy:+.1f})")
            else:
                # tgt's whereabouts
                t = slot.index(ag[i]["tgt"]) if ag[i]["tgt"] in slot else None
                if t is None: C[role]["nobody, no tgt"] += 1; continue
                eng = [fr["a"][t][5] for fr in p["frames"][:end]]
                by = next((slot[e] for e in eng if e >= 0), None)
                dmin = min(math.dist(xy[k][i], xy[k][t]) for k in range(end))
                C[role][f"nobody: tgt {ag[i]['tgt']} engaged first by {by} (min d {'<2' if dmin < 2 else '>=2'})"] += 1
for role, c in C.items():
    tot = sum(c.values()); print(f"== {role} n {tot}")
    for k, v in c.most_common(18): print(f"  {v/tot:5.2f} {v:4} {k}")
