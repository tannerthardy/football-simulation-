"""Backside DL (nearest BT/BG at snap, within 2 yd) lateral velocity toward the play side at 0.3..1.2 s, and the OL
surface's mean lateral velocity at the same times; onset = first frame his play-side lateral velocity > 1 yd/s."""
import sys, os, math, collections, statistics as st
sys.path.insert(0, sys.argv[1])
from run_film_reference import nfl
from box_count_reference import run_films
R = collections.defaultdict(list)
def measure(p):
    con = p["concept"]
    if con not in ("INSIDE ZONE", "OUTSIDE ZONE"): return
    xy, car, players = p["xy"], p["carrier"], p["players"]
    if not xy or len(xy) < 14: return
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5: return
    cy = sum(xy[0][i][1] for i in ol) / 5
    cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
    if cross is None: return
    side = 1 if xy[cross][car][1] - cy >= 0 else -1
    rank = sorted(ol, key=lambda i: (xy[0][i][1] - cy) * side)
    dl = [i for i, g in enumerate(grp) if g == "DL" and xy[0][i][0] < 2]
    vy = lambda k, i: (xy[k + 1][i][1] - xy[k - 1][i][1]) / .2 * side
    key = f"{con[:7]} {p['src']}"
    for k in (3, 5, 7, 10, 12): R[key + f" OL mean vy @{k/10}"].append(sum(vy(k, i) for i in ol) / 5)
    for k in (3, 5, 7, 10, 12): R[key + f" OL >=4 same way >0.7 @{k/10}"].append(1 if sum(vy(k, i) > .7 for i in ol) >= 4 else 0)
    for b in rank[:2]:
        near = [d for d in dl if abs(xy[0][d][1] - xy[0][b][1]) < 2]
        if not near: continue
        d = min(near, key=lambda d: abs(xy[0][d][1] - xy[0][b][1]))
        for k in (3, 5, 7, 10, 12): R[key + f" bsDL vy @{k/10}"].append(vy(k, d))
        on = next((k for k in range(1, min(len(xy) - 1, 20)) if vy(k, d) > 1), None)
        R[key + " bsDL onset (s, None=20)"].append((on if on is not None else 20) / 10)
for p in nfl(sys.argv[2]): measure(p)
for p in run_films(sys.argv[3:]): measure(p)
for k in sorted(R):
    v = R[k]; print(f"{k:42} {'share' if 'same way' in k else 'median'} {st.mean(v) if 'same way' in k else st.median(v):+.2f}")
