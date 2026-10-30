"""Backside zone: the DL man nearest the backside tackle / guard at the snap (within 2 yd lateral) -- how far he flows play
side by 1.0 s; and, binned by that flow, whether that OL touches an LB/DB (1.2 yd, past -0.5) by crossing + 0.5 s.
usage: bsflow.py box_dir nfl traces..."""
import sys, os, math, collections
sys.path.insert(0, sys.argv[1])
from run_film_reference import nfl
from box_count_reference import run_films
O = collections.defaultdict(collections.Counter)
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
        sl = any(math.dist(xy[k][b], xy[k][j]) < 1.2 and xy[k][b][0] > -0.5 for k in range(2, end) for j in defs)
        c = O[(con, p["src"], name)]; c[bin_ + " n"] += 1; c[bin_ + " climb"] += sl; c["n"] += 1
for p in nfl(sys.argv[2]): measure(p)
for p in run_films(sys.argv[3:]): measure(p)
for key in sorted(O):
    c = O[key]; n = c["n"]
    print(f"{key[0][:7]} {key[2]} {key[1]} n {n:5} | " + " | ".join(f"{b} {c[b+' n']/n:.2f} -> 2nd lvl {c[b+' climb']/max(1,c[b+' n']):.2f}" for b in ("flow <0", "flow 0-1", "flow 1-2", "flow 2+")) + f" | no DL near {c['no DL near']}")
