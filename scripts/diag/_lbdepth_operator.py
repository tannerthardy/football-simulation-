"""Box LB depth at the snap frame, NFL: LBs 1.6-7 yd deep within 6 yd of the OL centre. By play kind (zone run / gap
run / dropback pass) and offensive weight (RB+TE count: light <= 1, mid 2, heavy >= 3), and by down/distance band.
Also downhill displacement by 0.5 / 1.0 s (frames 5 / 10, NFL shifted one frame). usage: lbdepth.py nfl-plays.jsonl.gz [sim.jsonl]"""
import sys, gzip, json, collections, statistics as st
R = collections.defaultdict(list)
for line in gzip.open(sys.argv[1], "rt"):
    p = json.loads(line); pl = p["players"]; n = len(pl)
    xy = [[(r[2 * i], r[2 * i + 1]) for i in range(n)] for r in p["xy"]]
    if len(xy) < 12: continue
    kind = ("pa" if p["cell"].get("concept") in ("OUTSIDE ZONE", "INSIDE ZONE", "POWER", "COUNTER", "MAN", "PULL LEAD", "TRAP") else "pass") if p["kind"] != "run" else {"INSIDE ZONE": "zone", "OUTSIDE ZONE": "zone", "POWER": "gap", "COUNTER": "gap", "TRAP": "gap"}.get(p["cell"]["concept"])
    if not kind: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: continue
    w = sum(1 for q in pl if q["side"] == "O" and q["group"] in ("RB", "TE"))
    wt = "light" if w <= 1 else "mid" if w == 2 else "heavy"
    cy = sum(xy[0][i][1] for i in ol) / 5
    c = p["cell"]; dd = f"d{c.get('down', '?')}"
    for j, q in enumerate(pl):
        if q["side"] != "D" or q["group"] != "LB": continue
        x0 = xy[0][j][0]
        if not (1.6 <= x0 <= 7 and abs(xy[0][j][1] - cy) <= 6): continue
        for key in ((kind, wt), (kind, "all"), ("all", wt)):
            R[key].append((x0, x0 - xy[min(5 - 1, len(xy) - 1)][j][0], x0 - xy[min(10 - 1, len(xy) - 1)][j][0]))
print("cell keys:", list(json.loads(gzip.open(sys.argv[1], "rt").readline())["cell"].keys()))
for k in sorted(R):
    v = R[k]; print(f"{k[0]:5} {k[1]:6} n {len(v):6} depth p25/50/75 {sorted(x[0] for x in v)[len(v)//4]:.2f}/{st.median(x[0] for x in v):.2f}/{sorted(x[0] for x in v)[3*len(v)//4]:.2f} | downhill by 0.5/1.0 s {st.median(x[1] for x in v):+.2f}/{st.median(x[2] for x in v):+.2f}")
# Downhill onset: first frame >= 2 with downhill speed >= 0.5 yd/s (0.2 s central difference) held two frames, box LBs,
# zone/gap runs and passes; NFL time shifted one frame (t - 0.1 s). p25/50/75 and share moving by 0.6 / 1.0 s.
O = collections.defaultdict(list)
for line in gzip.open(sys.argv[1], "rt"):
    p = json.loads(line); pl = p["players"]; n = len(pl)
    xy = [[(r[2 * i], r[2 * i + 1]) for i in range(n)] for r in p["xy"]]
    if len(xy) < 22: continue
    kind = ("pa" if p["cell"].get("concept") in ("OUTSIDE ZONE", "INSIDE ZONE", "POWER", "COUNTER", "MAN", "PULL LEAD", "TRAP") else "pass") if p["kind"] != "run" else {"INSIDE ZONE": "zone", "OUTSIDE ZONE": "zone", "POWER": "gap", "COUNTER": "gap", "TRAP": "gap"}.get(p["cell"]["concept"])
    if not kind: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: continue
    cy = sum(xy[0][i][1] for i in ol) / 5
    for j, q in enumerate(pl):
        if q["side"] != "D" or q["group"] != "LB": continue
        if not (1.6 <= xy[0][j][0] <= 7 and abs(xy[0][j][1] - cy) <= 6): continue
        dh = lambda f: -(xy[f + 1][j][0] - xy[f - 1][j][0]) / .2
        on = next((f for f in range(2, 20) if dh(f) >= .5 and dh(f + 1) >= .5), None)
        O[kind].append(None if on is None else (on + 1) / 10)
for k, v in sorted(O.items()):
    got = sorted(x for x in v if x is not None)
    print(f"nfl {k:5} n {len(v)} downhill onset p25/50/75 {got[len(got)//4]:.1f}/{got[len(got)//2]:.1f}/{got[3*len(got)//4]:.1f} s (of movers) | moving by 0.6 s {100*sum(x <= .6 for x in got)/len(v):.0f}% by 1.0 s {100*sum(x <= 1.0 for x in got)/len(v):.0f}% never by 2 s {100*(len(v)-len(got))/len(v):.0f}%")
