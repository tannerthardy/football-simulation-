"""IZ/OZ box LBs (1.6-7 yd deep within 6 yd of the OL centre at frame 0), NFL: lateral displacement toward the play side
(OL mean lateral motion over 1 s) at 1.0 / 1.5 s (NFL frames 9 / 14, shifted one frame), by side of the ball at the
snap (play / back). Medians. usage: izlbflow.py nfl-plays.jsonl.gz"""
import sys, gzip, json, collections, statistics as st
R = collections.defaultdict(list)
for line in gzip.open(sys.argv[1], "rt"):
    p = json.loads(line)
    if p["kind"] != "run": continue
    fam = {"INSIDE ZONE": "IZ", "OUTSIDE ZONE": "OZ"}.get(p["cell"]["concept"])
    if not fam: continue
    pl = p["players"]; n = len(pl); xy = [[(r[2 * i], r[2 * i + 1]) for i in range(n)] for r in p["xy"]]
    if len(xy) < 16: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: continue
    cy = sum(xy[0][i][1] for i in ol) / 5
    ps = 1 if sum(xy[9][i][1] - xy[0][i][1] for i in ol) >= 0 else -1
    for j, q in enumerate(pl):
        if q["side"] != "D" or q["group"] != "LB": continue
        x0, y0 = xy[0][j]
        if not (1.6 <= x0 <= 7 and abs(y0 - cy) <= 6): continue
        if xy[14][j][0] < 0: continue  # rushers out
        v = ((xy[9][j][1] - y0) * ps, (xy[14][j][1] - y0) * ps)
        for k in ("all", "side play" if (y0 - cy) * ps > 0 else "side back"): R[(fam, k)].append(v)
for k in sorted(R):
    v = R[k]; print(f"nfl {k[0]} {k[1]:9}: n {len(v):5} lateral to play at 1.0/1.5 s {st.median(x[0] for x in v):.2f}/{st.median(x[1] for x in v):.2f}")
