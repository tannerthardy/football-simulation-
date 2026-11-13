"""NFL box LBs (1.6-7 yd deep within 6 yd of the OL centre at frame 0) by depth band: where they stand laterally
(inside the tackles / outside), what they do in 1.5 s (rush = past the LOS by 1.5 s; drop = 2+ yd deeper; else
fit/hold), by play kind; and the depth quantiles. usage: lbshallow.py nfl-plays.jsonl.gz"""
import sys, gzip, json, collections, statistics as st
R = collections.defaultdict(collections.Counter); D = collections.defaultdict(list)
for line in gzip.open(sys.argv[1], "rt"):
    p = json.loads(line); pl = p["players"]; n = len(pl)
    xy = [[(r[2 * i], r[2 * i + 1]) for i in range(n)] for r in p["xy"]]
    if len(xy) < 16: continue
    kind = "run" if p["kind"] == "run" else "pass"
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: continue
    ys = sorted(xy[0][i][1] for i in ol); cy = sum(ys) / 5
    for j, q in enumerate(pl):
        if q["side"] != "D" or q["group"] != "LB": continue
        x0, y0 = xy[0][j]
        if not (1.6 <= x0 <= 7 and abs(y0 - cy) <= 6): continue
        D[kind].append(x0)
        band = "<2.5" if x0 < 2.5 else "2.5-3.5" if x0 < 3.5 else "3.5-5" if x0 < 5 else "5+"
        lat = "inside tackles" if ys[0] - 0.5 <= y0 <= ys[-1] + 0.5 else "outside tackles"
        x15 = xy[15][j][0]
        act = "rush" if x15 < 0 else "drop" if x15 > x0 + 2 else "fit/hold"
        R[(kind, band)][lat] += 1; R[(kind, band)][act] += 1; R[(kind, band)]["n"] += 1
for kind, v in D.items():
    v.sort(); print(f"{kind}: n {len(v)} depth p10/25/50/75/90 " + "/".join(f"{v[int(f*len(v))]:.2f}" for f in (.1, .25, .5, .75, .9)))
for k in sorted(R):
    c = R[k]; n = c["n"]
    print(f"{k[0]:4} {k[1]:8} n {n:5} ({100*n/len(D[k[0]]):.0f}%) | inside tackles {100*c['inside tackles']/n:.0f}% | rush {100*c['rush']/n:.0f}% drop {100*c['drop']/n:.0f}% fit/hold {100*c['fit/hold']/n:.0f}%")
# Backers who rush (past the LOS by 1.5 s) vs those who don't: depth at the snap, by play kind.
B = collections.defaultdict(list)
for line in gzip.open(sys.argv[1], "rt"):
    p = json.loads(line); pl = p["players"]; n = len(pl)
    xy = [[(r[2 * i], r[2 * i + 1]) for i in range(n)] for r in p["xy"]]
    if len(xy) < 16: continue
    kind = "run" if p["kind"] == "run" else "pass"
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: continue
    cy = sum(xy[0][i][1] for i in ol) / 5
    for j, q in enumerate(pl):
        if q["side"] != "D" or q["group"] != "LB": continue
        x0, y0 = xy[0][j]
        if not (1.6 <= x0 <= 7 and abs(y0 - cy) <= 6): continue
        B[(kind, "rush" if xy[15][j][0] < 0 else "no rush")].append(x0)
for k, v in sorted(B.items()):
    v.sort(); print(f"{k[0]} {k[1]:8}: n {len(v)} depth p10/25/50/75 " + "/".join(f"{v[int(f*len(v))]:.2f}" for f in (.1, .25, .5, .75)))
