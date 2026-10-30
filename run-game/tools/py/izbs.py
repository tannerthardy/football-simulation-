"""Sim IZ (or CONCEPT env) in a given surplus bucket: for each box LB (unblk.py definitions), touched or not, and his
assignment story: assigned at the snap (some blocker's tgt/climb names him), ever targeted (frame target column) before
the carrier arrives, and by whom. Also each backside blocker's snap plan and what his snap target was.
usage: izbs.py run_film_reference.py traces..."""
import sys, json, math, collections, importlib.util, os
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CON = os.environ.get("CONCEPT", "INSIDE ZONE"); BK = os.environ.get("BUCKET", "+1")
C = collections.Counter(); ex = []
def bucket(s): return "light" if s < 0 else "even" if s == 0 else "+1" if s == 1 else "+2 or more"
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p.get("setup", {})
        if p["nullified"] or not s.get("concept") or rfr.SIM_CONCEPT.get(s["concept"], s["concept"]) != CON: continue
        ag = s["agents"]; grp = [rfr.GROUP.get(a["pos"], a["pos"]) for a in ag]; slot = [a["slot"] for a in ag]
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in p["frames"]]; tg = [[q[6] for q in f["a"]] for f in p["frames"]]
        kind = [[q[8] for q in f["a"]] for f in p["frames"]]
        car = next((f["c"] for f in p["frames"] if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None or len(xy) < 10: continue
        ol = [i for i, g in enumerate(grp) if g == "OL"]
        if len(ol) < 5: continue
        cy = sum(xy[0][i][1] for i in ol) / 5
        box = [i for i, g in enumerate(grp) if g in ("DL", "LB", "DB") and xy[0][i][0] < 7.5 and abs(xy[0][i][1] - cy) < 6.5]
        backs = [i for i, g in enumerate(grp) if g == "RB" and i != car and xy[0][i][0] < -1 and abs(xy[0][i][1] - cy) < 6.5]
        tes = [i for i, g in enumerate(grp) if g == "TE" and abs(xy[0][i][1] - cy) < 6.5]
        if bucket(len(box) - len(ol + tes + backs)) != BK: continue
        cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
        if cross is None: continue
        side = 1 if xy[cross][car][1] - cy >= 0 else -1
        # designed play side from the concept call (flip) vs crossing side
        blk = [i for i, g in enumerate(grp) if g in ("OL", "TE", "RB") and i != car and ag[i]["team"] == "O"]
        C["snaps"] += 1
        assigned_by = collections.defaultdict(list)
        for i in blk:
            for key in ("tgt", "climb"):
                if ag[i][key]: assigned_by[ag[i][key]].append(f"{slot[i]}:{ag[i]['plan']}:{key}")
        for j in box:
            if grp[j] != "LB": continue
            lat = (xy[0][j][1] - cy) * side; where = "play" if lat > 1 else "back" if lat < -1 else "mid"
            arrive = next((k for k in range(len(xy)) if xy[k][car][0] >= xy[k][j][0] - 1), len(xy) - 1)
            touched = any(math.dist(xy[k][q], xy[k][j]) < 1.5 and xy[k][q][0] > -0.5 for k in range(3, max(4, arrive)) for q in blk)
            tgt_by = sorted({slot[i] for k in range(0, arrive) for i in blk if tg[k][i] == j})
            snap = assigned_by.get(slot[j], [])
            st = ("assigned at snap" if snap else "not assigned at snap") + (" / targeted later" if tgt_by else " / never targeted")
            C[f"LB {where} {'touched' if touched else 'UNTOUCHED'}: {st}"] += 1
            if not touched and where in ("back", "mid") and len(ex) < 25:
                ex.append(f"{p['id']} {s['concept']} {s['formation']} {s['front']} LB {slot[j]} {where} x{xy[0][j][0]:.1f} arrive {arrive/10:.1f} | snap {snap} | targeted by {tgt_by}")
        for i in blk:
            if grp[i] == "RB": continue
            lat = (xy[0][i][1] - cy) * side
            if lat < -1:
                t = ag[i]["tgt"]; tgrp = grp[slot.index(t)] if t in slot else "-"
                C[f"backside {grp[i]} plan {ag[i]['plan']} -> {tgrp}" + (f" then climb {grp[slot.index(ag[i]['climb'])]}" if ag[i]["climb"] in slot else "")] += 1
for k in sorted(C): print(f"{C[k]:5}  {k}")
print("\n".join(ex))
