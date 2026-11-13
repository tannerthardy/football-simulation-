#!/usr/bin/env python3
"""Do backside DL lag on runs? The same code on NFL and sim common-format files.

    python3 -I scripts/diag/dl_lag.py LABEL=plays.jsonl.gz [...]

- Play side: the side of the snap (median OL y at frame 0) where the carrier
  is at 1.5 s (more than 1 yd from it).
- DL are playside or backside by alignment at frame 0 (more than 0.5 yd from
  the snap).
- Lateral speed toward the play side over 0.3-1.0 s after the snap.
- Backside DL with an OL within 1.5 yd at 1.0 s: speed relative to that OL,
  and whether the DL is behind him (toward the backside) at 1.0 s.
"""
import math, os, statistics as st, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from run_film_reference import nfl  # noqa: E402


def go(label, path):
    r = {True: [], False: []}
    rel, off = [], []
    for p in nfl(path):
        xy, pl = p["xy"], p["players"]
        if len(xy) < 16:
            continue
        ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
        dl = [i for i, q in enumerate(pl) if q["side"] == "D" and q["group"] == "DL"]
        if len(ol) < 5 or not dl:
            continue
        snap = st.median(xy[0][i][1] for i in ol)
        dy = xy[15][p["carrier"]][1] - snap
        if abs(dy) < 1:
            continue
        side = 1 if dy > 0 else -1
        lat = lambda i: (xy[10][i][1] - xy[3][i][1]) / .7 * side
        for j in dl:
            a = (xy[0][j][1] - snap) * side
            if abs(a) < .5:
                continue
            r[a > 0].append(lat(j))
            if a < 0:
                o = min(ol, key=lambda i: math.dist(xy[10][i], xy[10][j]))
                if math.dist(xy[10][o], xy[10][j]) <= 1.5:
                    rel.append(lat(j) - lat(o))
                    off.append((xy[10][j][1] - xy[10][o][1]) * side)
    for playside in (True, False):
        v = r[playside]
        print(f"{label:8s} {'playside' if playside else 'backside'}: n={len(v):5d}  toward play {st.mean(v):5.2f} yd/s"
              f" (median {st.median(v):5.2f})  >0.5 {sum(x > .5 for x in v) / len(v):4.0%}  <-0.5 {sum(x < -.5 for x in v) / len(v):4.0%}")
    print(f"{label:8s} backside with an OL at 1.0 s: n={len(rel)}  speed relative to him {st.mean(rel):5.2f}"
          f"  behind him {sum(x < 0 for x in off) / len(off):4.0%} (median offset {st.median(off):5.2f} yd)")


for arg in sys.argv[1:]:
    go(*arg.split("=", 1))
