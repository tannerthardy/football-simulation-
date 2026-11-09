"""NFL: LBs aligned over an attached TE/wing (an offensive TE/WR/RB within 1.0 yd laterally of him and within 3 yd of the
LOS on offense's side, outside the tackles), depth at the snap frame; vs other off-ball LBs. Runs and passes.
usage: samdepth.py nfl-plays.jsonl.gz"""
import sys, gzip, json, collections
R = collections.defaultdict(list)
for line in gzip.open(sys.argv[1], "rt"):
    p = json.loads(line); pl = p["players"]; n = len(pl); xy = [[(r[2 * i], r[2 * i + 1]) for i in range(n)] for r in p["xy"]]
    if not xy: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: continue
    ys = sorted(xy[0][i][1] for i in ol); cy = sum(ys) / 5
    att = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] in ("TE", "WR", "RB") and -3 <= xy[0][i][0] <= 0 and (xy[0][i][1] < ys[0] - .5 or xy[0][i][1] > ys[-1] + .5) and min(abs(xy[0][i][1] - ys[0]), abs(xy[0][i][1] - ys[-1])) < 3.5]
    kind = "run" if p["kind"] == "run" else "pass"
    for j, q in enumerate(pl):
        if q["side"] != "D" or q["group"] != "LB": continue
        x0, y0 = xy[0][j]
        if not (0 <= x0 <= 7 and abs(y0 - cy) <= 8): continue
        over = any(abs(xy[0][t][1] - y0) <= 1.0 for t in att)
        out = y0 < ys[0] - .5 or y0 > ys[-1] + .5
        R[(kind, "over attached TE/wing" if over else "outside tackles, no TE" if out else "inside tackles")].append(x0)
for k in sorted(R):
    v = sorted(R[k]); n = len(v); print(f"{k[0]:4} {k[1]:24} n {n:5} depth p10/25/50/75/90 " + "/".join(f"{v[int(f*n)]:.2f}" for f in (.1, .25, .5, .75, .9)) + " | bands <1.6/1.6-2.5/2.5-3.5/3.5+ " + "/".join(f"{100*sum(a <= x < b for x in v)/n:.0f}%" for a, b in ((-9, 1.6), (1.6, 2.5), (2.5, 3.5), (3.5, 99))))
