"""Sim zone backside BT/BG with no LB/DB touch (by crossing+0.5 s): state at 1.0/1.5 s -- plan kind, target group,
own engagement (with whom), target's engagement (by whom), distance to target, target lateral flow since snap
(+ = play side), nearest LB distance and whether that LB is engaged. usage: bsnone.py rfr traces... (env CONCEPT)"""
import sys, os, json, math, collections, statistics as st, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CON = os.environ.get("CONCEPT", "OUTSIDE ZONE")
C = collections.Counter(); D = collections.defaultdict(list)
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p.get("setup", {})
        if p["nullified"] or not s.get("concept") or rfr.SIM_CONCEPT.get(s["concept"], s["concept"]) != CON: continue
        ag = s["agents"]; grp = [rfr.GROUP.get(a["pos"], a["pos"]) for a in ag]; slot = [a["slot"] for a in ag]
        F = p["frames"]; xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in F]
        car = next((f["c"] for f in F if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None or len(xy) < 16: continue
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
            if hit: continue
            C[name + " NO 2nd"] += 1
            for k in (10, 15):
                if k >= len(F): continue
                q = F[k]["a"][b]; kind, tg, eng = q[8], q[6], q[5]
                tgg = grp[tg] if tg >= 0 else "none"
                engg = (grp[eng] + ("" if eng != tg else "=tgt")) if eng >= 0 else "free"
                tq = F[k]["a"][tg] if tg >= 0 else None
                tgeng = "-" if tq is None else ("by him" if tq[5] == b else ("by " + grp[tq[5]] + ":" + slot[tq[5]] if tq[5] >= 0 else "unengaged"))
                C[f"{name} @{k/10} {kind}->{tgg} | self {engg} | target {tgeng}"] += 1
                if tg >= 0:
                    D[f"{name} @{k/10} dist to target"].append(math.dist(xy[k][b], xy[k][tg]))
                    D[f"{name} @{k/10} target flow (+play)"].append((xy[k][tg][1] - xy[0][tg][1]) * side)
                if lbs:
                    l = min(lbs, key=lambda l: math.dist(xy[k][b], xy[k][l]))
                    D[f"{name} @{k/10} nearest LB dist"].append(math.dist(xy[k][b], xy[k][l]))
                    C[f"{name} @{k/10} nearest LB {'engaged' if F[k]['a'][l][5] >= 0 else 'FREE'}"] += 1
for k in sorted(C):
    base = k.split(" @")[0] if " @" in k else k
    tot = C[k.split(" @")[0] + " NO 2nd"] if " @" in k else C[k]
    if C[k] / max(1, tot) >= 0.04: print(f"{C[k]:5} {C[k]/max(1,tot):.2f}  {k}")
for k in sorted(D): print(f"{k:34} median {st.median(D[k]):.2f}")
