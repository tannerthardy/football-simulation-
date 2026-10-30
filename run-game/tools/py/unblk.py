"""Who goes untouched in the box, by surplus bucket: box defenders (box_count_reference definitions) touched by any
OL/TE/non-carrier back (within 1.5 yd, blocker past -0.5) before the carrier reaches the defender's depth - 1.
Side: play side = the side of the OL centre the carrier crosses the LOS on. usage: unblk.py box_count_reference_dir nfl traces..."""
import sys, os, math, collections, json, tempfile
sys.path.insert(0, sys.argv[1])
from run_film_reference import nfl, sim
from box_count_reference import run_films, bucket
O = collections.defaultdict(collections.Counter)
def measure(p):
    xy, car, players = p["xy"], p["carrier"], p["players"]
    if not xy or len(xy) < 10: return
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5: return
    cy = sum(xy[0][i][1] for i in ol) / len(ol)
    box = [i for i, g in enumerate(grp) if g in ("DL", "LB", "DB") and xy[0][i][0] < 7.5 and abs(xy[0][i][1] - cy) < 6.5]
    backs = [i for i, g in enumerate(grp) if g == "RB" and i != car and xy[0][i][0] < -1 and abs(xy[0][i][1] - cy) < 6.5]
    tes = [i for i, g in enumerate(grp) if g == "TE" and abs(xy[0][i][1] - cy) < 6.5]
    b = bucket(len(box) - len(ol + tes + backs))
    cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
    if cross is None: return
    side = 1 if xy[cross][car][1] - cy >= 0 else -1
    blk = [i for i, g in enumerate(grp) if g in ("OL", "TE", "RB") and i != car]
    key = (p["src"], p["concept"] if p["concept"] in ("INSIDE ZONE", "OUTSIDE ZONE", "COUNTER", "POWER") else "OTHER", b)
    O[key]["snaps"] += 1
    unt = []
    for j in box:
        arrive = next((k for k in range(len(xy)) if xy[k][car][0] >= xy[k][j][0] - 1), len(xy) - 1)
        touched = any(math.dist(xy[k][q], xy[k][j]) < 1.5 and xy[k][q][0] > -0.5 for k in range(3, max(4, arrive)) for q in blk)
        lat = (xy[0][j][1] - cy) * side
        where = "play" if lat > 1 else "back" if lat < -1 else "mid"
        O[key][f"{grp[j]} {where} n"] += 1
        if not touched: O[key][f"{grp[j]} {where} untouched"] += 1; unt.append(f"{grp[j]}-{where}")
    O[key]["untouched per snap"] += len(unt)
for p in nfl(sys.argv[2]): measure(p)
for p in run_films(sys.argv[3:]): measure(p)
for key in sorted(O, key=lambda k: (k[1], ("light","even","+1","+2 or more").index(k[2]), k[0])):
    c = O[key]; n = c["snaps"]
    if n < 25: continue
    cells = []
    for g in ("DL", "LB", "DB"):
        for w in ("back", "mid", "play"):
            m = c[f"{g} {w} n"]
            if m: cells.append(f"{g}-{w} {m/n:.2f}/{c[f'{g} {w} untouched']/m:.2f}")
    print(f"{key[1]:12} {key[2]:10} {key[0]:3} n {n:4} untouched/snap {c['untouched per snap']/n:.2f} | " + "  ".join(cells))
print("cells: group-side count per snap / share untouched")
