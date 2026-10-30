"""Defense's anticipation split (their stated logic), NFL weeks 1-9 and sim: zone runs; play side s = sign of the
carrier's lateral move from the snap to the first frame past the LOS; back offset = carrier y at snap - OL median y
(skip |off| < 0.5); every DL on the line at the snap (x < 1.5); vy at frames k = (y[k+1]-y[k-1])/0.2 * s; medians
split by off*s > 0 (play toward the back's side) vs < 0 (away). Extra: frame 1, and backside DL only."""
import sys, os, math, collections, statistics as st
sys.path.insert(0, sys.argv[1])
from run_film_reference import nfl
from box_count_reference import run_films
R = collections.defaultdict(list); N = collections.Counter()
def measure(p):
    con = p["concept"]
    if con not in ("INSIDE ZONE", "OUTSIDE ZONE"): return
    xy, car, players = p["xy"], p["carrier"], p["players"]
    if not xy or len(xy) < 8: return
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5: return
    cyy = st.median(xy[0][i][1] for i in ol)
    cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
    if cross is None: return
    s = 1 if xy[cross][car][1] - xy[0][car][1] >= 0 else -1
    off = xy[0][car][1] - cyy
    if abs(off) < 0.5: return
    rel = "toward back" if off * s > 0 else "away from back"
    key = f"{con[:7]} {p['src']} {rel}"
    N[key] += 1; N[f"ALL {p['src']} {rel}"] += 1
    for d in (i for i, g in enumerate(grp) if g == "DL" and xy[0][i][0] < 1.5):
        back = (xy[0][d][1] - cyy) * s < -1
        for k in (1, 2, 3, 4, 5):
            if k + 1 >= len(xy): continue
            vy = (xy[k + 1][d][1] - xy[k - 1][d][1]) / 0.2 * s
            for kk in (key, f"ALL {p['src']} {rel}"):
                R[(kk, "all DL", k)].append(vy)
                if back: R[(kk, "backside DL", k)].append(vy)
for p in nfl(sys.argv[2]): measure(p)
for p in run_films(sys.argv[3:]): measure(p)
keys = sorted({k[0] for k in R})
for kk in keys:
    for who in ("all DL", "backside DL"):
        row = [f"{st.median(R[(kk, who, k)]):+.2f}" for k in (1, 2, 3, 4, 5) if R[(kk, who, k)]]
        if row: print(f"{kk:34} plays {N[kk]:5} {who:11} n {len(R[(kk, who, 2)]):5} | vy @0.1/0.2/0.3/0.4/0.5 s: " + " / ".join(row))
