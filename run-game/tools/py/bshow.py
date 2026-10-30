"""Backside zone: the DL man nearest the backside tackle / guard at the snap (within 2 yd lateral) -- how far he flows play
side by 1.0 s; and, binned by that flow, whether that OL touches an LB/DB (1.2 yd, past -0.5) by crossing + 0.5 s.
usage: bsflow.py box_dir nfl traces..."""
import sys, os, math, collections
sys.path.insert(0, sys.argv[1])
from run_film_reference import nfl
from box_count_reference import run_films
O = collections.defaultdict(collections.Counter); R = collections.defaultdict(list)
import statistics as st
def measure(p):
    con = p["concept"]
    if con not in ("INSIDE ZONE", "OUTSIDE ZONE"): return
    xy, car, players = p["xy"], p["carrier"], p["players"]
    if not xy or len(xy) < 12: return
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5: return
    cy = sum(xy[0][i][1] for i in ol) / 5
    cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
    if cross is None: return
    side = 1 if xy[cross][car][1] - cy >= 0 else -1
    rank = sorted(ol, key=lambda i: (xy[0][i][1] - cy) * side)
    dl = [i for i, g in enumerate(grp) if g == "DL" and xy[0][i][0] < 2]
    defs = [i for i, g in enumerate(grp) if g in ("LB", "DB")]
    end = min(len(xy), cross + 6)
    for name, b in (("BT", rank[0]), ("BG", rank[1])):
        near = [d for d in dl if abs(xy[0][d][1] - xy[0][b][1]) < 2]
        if not near: O[(con, p["src"], name)]["no DL near"] += 1; continue
        d = min(near, key=lambda d: abs(xy[0][d][1] - xy[0][b][1]))
        flow = (xy[min(10, len(xy) - 1)][d][1] - xy[0][d][1]) * side
        bin_ = "flow <0" if flow < 0 else "flow 0-1" if flow < 1 else "flow 1-2" if flow < 2 else "flow 2+"
        hit = next(((k, j) for k in range(2, end) for j in defs if math.dist(xy[k][b], xy[k][j]) < 1.2 and xy[k][b][0] > -0.5), None)
        c = O[(con, p["src"], name)]; c["n"] += 1
        if hit:
            k, j = hit; c["hits"] += 1
            R[(con, p["src"], name, "t")].append(k / 10); R[(con, p["src"], name, "OL x")].append(xy[k][b][0])
            R[(con, p["src"], name, "OL lat gain")].append((xy[k][b][1] - xy[0][b][1]) * side)
            R[(con, p["src"], name, "LB x")].append(xy[k][j][0]); R[(con, p["src"], name, "LB x at snap")].append(xy[0][j][0])
            R[(con, p["src"], name, "LB lat from OL at snap")].append((xy[0][j][1] - xy[0][b][1]) * side)
            R[(con, p["src"], name, "OL left DL (dist>1.3) before")].append(1 if any(math.dist(xy[q][b], xy[q][d]) > 1.3 for q in range(max(0, k - 3), k)) else 0)
for p in nfl(sys.argv[2]): measure(p)
for p in run_films(sys.argv[3:]): measure(p)
for key in sorted(O):
    c = O[key]; n = c["n"]
    print(f"{key[0][:7]} {key[2]} {key[1]} n {n:5} 2nd-level touch {c['hits']/n:.2f} | " + " | ".join(f"{w} {st.median(R[key+(w,)]):+.2f}" for w in ("t", "OL x", "OL lat gain", "LB x", "LB x at snap", "LB lat from OL at snap", "OL left DL (dist>1.3) before") if R[key+(w,)]))
