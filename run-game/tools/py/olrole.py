"""Blockers by side (OL/TE/non-carrier RB lateral at snap vs OL centre, signed by the carrier's crossing side): count per
snap, and what each touched first (within 1.2 yd, blocker past -0.5) before the carrier crosses + 0.5 s: DL / LB / DB /
nobody; and the frame of that first touch. usage: bsblk.py box_dir nfl traces... (env CONCEPT, BUCKET)"""
import sys, os, math, collections, statistics as st
sys.path.insert(0, sys.argv[1])
from run_film_reference import nfl
from box_count_reference import run_films, bucket
CON = os.environ.get("CONCEPT", "INSIDE ZONE"); BK = os.environ.get("BUCKET", "+1")
O = collections.defaultdict(collections.Counter); T = collections.defaultdict(list)
def measure(p):
    if p["concept"] != CON: return
    xy, car, players = p["xy"], p["carrier"], p["players"]
    if not xy or len(xy) < 10: return
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5: return
    cy = sum(xy[0][i][1] for i in ol) / len(ol)
    box = [i for i, g in enumerate(grp) if g in ("DL", "LB", "DB") and xy[0][i][0] < 7.5 and abs(xy[0][i][1] - cy) < 6.5]
    backs = [i for i, g in enumerate(grp) if g == "RB" and i != car and xy[0][i][0] < -1 and abs(xy[0][i][1] - cy) < 6.5]
    tes = [i for i, g in enumerate(grp) if g == "TE" and abs(xy[0][i][1] - cy) < 6.5]
    if bucket(len(box) - len(ol + tes + backs)) != BK: return
    cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
    if cross is None: return
    side = 1 if xy[cross][car][1] - cy >= 0 else -1
    src = p["src"]; O[src]["snaps"] += 1
    defs = [i for i, g in enumerate(grp) if g in ("DL", "LB", "DB")]
    end = min(len(xy), cross + 6)
    rank = sorted(ol, key=lambda i: (xy[0][i][1] - cy) * side)
    names = dict(zip(rank, ("BT", "BG", "C", "PG", "PT")))
    for b in ol + tes + backs:
        lat = (xy[0][b][1] - cy) * side
        if b in names: where, role = names[b], "OL"
        else: where = "play" if lat > 0 else "back"; role = grp[b]
        O[src][f"{where} {role} n"] += 1
        first = None
        for k in range(2, end):
            if xy[k][b][0] <= -0.5: continue
            hit = [j for j in defs if math.dist(xy[k][b], xy[k][j]) < 1.2]
            if hit: first = (k, grp[min(hit, key=lambda j: math.dist(xy[k][b], xy[k][j]))]); break
        tag = first[1] if first else "nobody"
        O[src][f"{where} {role} first {tag}"] += 1
        # any second-level touch by crossing+0.5 s
        sl = any(math.dist(xy[k][b], xy[k][j]) < 1.2 and xy[k][b][0] > -0.5 for k in range(2, end) for j in defs if grp[j] in ("LB", "DB"))
        O[src][f"{where} {role} any LB/DB"] += sl
for p in nfl(sys.argv[2]): measure(p)
for p in run_films(sys.argv[3:]): measure(p)
for where in ("BT", "BG", "C", "PG", "PT", "back", "play"):
    for role in ("OL", "TE", "RB"):
        row = []
        for src in ("nfl", "sim"):
            c = O[src]; n = c[f"{where} {role} n"]; s = c["snaps"]
            if not n: continue
            row.append(f"{src} {n/s:.2f}/snap first DL {c[f'{where} {role} first DL']/n:.2f} LB {c[f'{where} {role} first LB']/n:.2f} DB {c[f'{where} {role} first DB']/n:.2f} nobody {c[f'{where} {role} first nobody']/n:.2f} anyLB/DB {c[f'{where} {role} any LB/DB']/n:.2f}")
        if row: print(f"{CON[:2]} {BK:4} {where:4} {role}: " + " || ".join(row))
print({src: O[src]["snaps"] for src in O})
