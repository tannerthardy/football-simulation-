"""Sim zone backside tackle/guard with no 2nd-level touch: snap plan, plan kind and target group at 1.0/1.5/2.0 s,
and distance to the nearest LB at 1.5 s; plus the same for those that did touch. usage: bsstate.py rfr traces..."""
import sys, json, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.Counter(); D = collections.defaultdict(list)
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p.get("setup", {})
        if p["nullified"] or not s.get("concept"): continue
        con = rfr.SIM_CONCEPT.get(s["concept"], s["concept"])
        if con not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
        ag = s["agents"]; grp = [rfr.GROUP.get(a["pos"], a["pos"]) for a in ag]; slot = [a["slot"] for a in ag]
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in p["frames"]]
        tg = [[q[6] for q in f["a"]] for f in p["frames"]]; kd = [[q[8] for q in f["a"]] for f in p["frames"]]
        car = next((f["c"] for f in p["frames"] if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None or len(xy) < 21: continue
        ol = [i for i, g in enumerate(grp) if g == "OL"]
        if len(ol) < 5: continue
        cy = sum(xy[0][i][1] for i in ol) / 5
        cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
        if cross is None: continue
        side = 1 if xy[cross][car][1] - cy >= 0 else -1
        rank = sorted(ol, key=lambda i: (xy[0][i][1] - cy) * side)
        defs = [i for i, g in enumerate(grp) if g in ("LB", "DB")]; lbs = [i for i, g in enumerate(grp) if g == "LB"]
        end = min(len(xy), cross + 6)
        for name, b in (("BT", rank[0]), ("BG", rank[1])):
            hit = any(math.dist(xy[k][b], xy[k][j]) < 1.2 and xy[k][b][0] > -0.5 for k in range(2, end) for j in defs)
            key = f"{con[:7]} {name} {'climbed' if hit else 'NO 2nd'}"
            C[key] += 1
            C[key + f" | snap plan {ag[b]['plan']}"] += 1
            for t in (10, 15, 20):
                if t >= len(xy): continue
                tgt = tg[t][b]; tgg = grp[tgt] if tgt >= 0 else "none"
                C[key + f" | @{t/10:.1f}s {kd[t][b]}->{tgg}"] += 1
            if lbs: D[key + " nearest LB @1.5"].append(min(math.dist(xy[15][b], xy[15][l]) for l in lbs))
            D[key + " x @1.5"].append(xy[15][b][0])
import statistics as st
for k in sorted(C):
    base = k.split(" | ")[0]
    if " | " in k and C[k] / C[base] < 0.06: continue
    print(f"{C[k]:5} {C[k]/C[base]:.2f}  {k}")
for k in sorted(D): print(k, f"{st.median(D[k]):.2f}")
