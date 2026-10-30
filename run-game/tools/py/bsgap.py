"""Backside DL (nearest the BT/BG at the snap, within 2 yd): distance to the nearest OL at 0/0.2/0.3/0.5/0.7 s, and the
share within 1.2 yd (hands range, centre to centre) at those times; DL depth at the snap. NFL vs sim, zone runs."""
import sys, os, math, collections, statistics as st
sys.path.insert(0, sys.argv[1])
from run_film_reference import nfl
from box_count_reference import run_films
R = collections.defaultdict(list)
def measure(p):
    con = p["concept"]
    if con not in ("INSIDE ZONE", "OUTSIDE ZONE"): return
    xy, car, players = p["xy"], p["carrier"], p["players"]
    if not xy or len(xy) < 10: return
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5: return
    cy = sum(xy[0][i][1] for i in ol) / 5
    cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
    if cross is None: return
    side = 1 if xy[cross][car][1] - cy >= 0 else -1
    rank = sorted(ol, key=lambda i: (xy[0][i][1] - cy) * side)
    dl = [i for i, g in enumerate(grp) if g == "DL" and xy[0][i][0] < 2]
    key = f"{con[:7]} {p['src']}"
    seen = set()
    for b in rank[:2]:
        near = [d for d in dl if abs(xy[0][d][1] - xy[0][b][1]) < 2]
        if not near: continue
        d = min(near, key=lambda d: abs(xy[0][d][1] - xy[0][b][1]))
        if d in seen: continue
        seen.add(d)
        R[key + " DL depth at snap"].append(xy[0][d][0])
        R[key + " DL-OL gap at snap"].append(min(math.dist(xy[0][d], xy[0][o]) for o in ol))
        for k in (2, 3, 5, 7):
            if k >= len(xy): continue
            g = min(math.dist(xy[k][d], xy[k][o]) for o in ol)
            R[key + f" gap @{k/10}"].append(g); R[key + f" in hands @{k/10}"].append(1 if g < 1.2 else 0)
        first = next((k for k in range(len(xy)) if min(math.dist(xy[k][d], xy[k][o]) for o in ol) < 1.2), None)
        R[key + " first within 1.2 yd (s)"].append((first if first is not None else 30) / 10)
for p in nfl(sys.argv[2]): measure(p)
for p in run_films(sys.argv[3:]): measure(p)
for k in sorted(R):
    v = R[k]; print(f"{k:40} {'share' if 'in hands' in k else 'median'} {st.mean(v) if 'in hands' in k else st.median(v):.2f}")
