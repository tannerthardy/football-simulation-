"""Sim counter play-side doubles (ctrdbl operator): the two members' roles (ctrcard ranking) and snap plans/targets, the
DL's slot, and whether a member climbs. usage: ctrdblwho.py rfr traces..."""
import importlib.util, json, math, sys, collections
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.Counter(); N = collections.Counter()
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p.get("setup", {})
        if p.get("nullified") or s.get("concept") != "counter": continue
        ag = s["agents"]; slot = [a["slot"] for a in ag]
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in p["frames"]]
        n = len(xy)
        if n < 26: continue
        ol = [i for i, a in enumerate(ag) if a["slot"] in ("LT", "LG", "C", "RG", "RT")]
        pulls = [i for i in ol if ag[i]["plan"] == "pull"]
        if not pulls: continue
        ps = 1 if sum(xy[15][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
        cyy = sum(xy[0][i][1] for i in ol) / 5
        rank = sorted(ol, key=lambda i: -(xy[0][i][1] - cyy) * ps); role = dict(zip(rank, ("PST", "PSG", "C", "BSG", "BST")))
        dl = [i for i, a in enumerate(ag) if a["team"] == "D" and xy[3][i][0] < 1.5 and a["pos"] in ("DE", "DT", "NT", "DL", "EDGE", "OLB", "LB")]
        d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
        stay = [i for i in ol if i not in pulls]; N["plays"] += 1
        for t in dl:
            if (xy[0][t][1] - cyy) * ps <= 1: continue
            for ai in range(len(stay)):
                for bi in range(ai + 1, len(stay)):
                    a, b = stay[ai], stay[bi]; run = 0; start = None
                    for k in range(min(11, n)):
                        run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                        if run >= 3: start = k - 2; break
                    if start is None: continue
                    climb = any(d(k, m, t) >= 2 and xy[k][m][0] > .5 and xy[k][m][0] > xy[k][t][0] for k in range(start, min(26, n)) for m in (a, b))
                    pa = lambda i: f"{role[i]}:{ag[i]['plan']}>{ag[i]['tgt'] or '-'}{'/' + ag[i]['climb'] if ag[i]['climb'] else ''}"
                    combo = ag[a]["plan"] == "combo" and ag[b]["plan"] == "combo"
                    key = f"{'combo' if combo else 'geom '} DL {slot[t]:5} {pa(a)} + {pa(b)}"
                    C[key, climb] += 1; N["doubles"] += 1; N["combo" if combo else "geom"] += 1; N["climb"] += climb
print(dict(N))
tot = collections.Counter()
for (k, c), v in C.items(): tot[k] += v
for k, v in tot.most_common(25): print(f"{v:4} climb {C[k, True]:3}  {k}")
