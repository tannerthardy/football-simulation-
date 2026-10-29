"""Backside vs playside DL lateral flow in the first second of runs, same code on NFL and sim.
Play side: side of the snap (median OL y at frame 0) where the carrier is at 1.5 s (|dy|>1).
DL playside/backside by alignment at frame 0 (|dy| > 0.5 from the snap). Lateral speed
toward the play side, over 0.3-1.0 s after the snap; also its share of DL moving toward play side."""
import sys, statistics as st, os
sys.path.insert(0, "/home/user/g1-flow/scripts/mechanics")
from run_film_reference import nfl
def go(label, path):
    r = {"play": [], "back": []}
    for p in nfl(path):
        xy, pl = p["xy"], p["players"]
        if len(xy) < 16: continue
        ol = [i for i, q in enumerate(pl) if q["side"] in ("O",) and q["group"] == "OL"]
        dl = [i for i, q in enumerate(pl) if q["side"] == "D" and q["group"] == "DL"]
        if len(ol) < 5 or not dl: continue
        snap = st.median(xy[0][i][1] for i in ol)
        dy = xy[15][p["carrier"]][1] - snap
        if abs(dy) < 1: continue
        side = 1 if dy > 0 else -1
        for j in dl:
            a = (xy[0][j][1] - snap) * side
            if abs(a) < .5: continue
            v = (xy[10][j][1] - xy[3][j][1]) / .7 * side
            r["play" if a > 0 else "back"].append(v)
    f = lambda v: f"n={len(v):5d} mean {st.mean(v):5.2f} median {st.median(v):5.2f} toward-play>0.5 {sum(x>.5 for x in v)/len(v):4.0%} away<-0.5 {sum(x<-.5 for x in v)/len(v):4.0%}"
    print(f"{label:7s} playside {f(r['play'])}\n{'':7s} backside {f(r['back'])}  lag(play-back mean) {st.mean(r['play'])-st.mean(r['back']):5.2f}")
for a in sys.argv[1:]:
    l, p = a.split("=", 1); go(l, p)
