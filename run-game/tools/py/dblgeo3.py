"""Position-only zone doubles (doublerel4 definition), NFL vs sim, by time since snap: the covered member (nearer the DL
at the snap) and the uncovered member: lateral offset from the DL (+ = away from partner) and depth in front of the DL
(yd, + = toward the offense backfield), and distance; only frames while both are within 1.3 yd and before a climb.
usage: dblgeo3.py run_film_reference.py nfl.jsonl.gz trace.json..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
out = defaultdict(lambda: defaultdict(list))
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
    xy, players = p["xy"], p["players"]
    if len(xy) < 15: continue
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]; dl = [i for i, g in enumerate(grp) if g == "DL" and xy[3][i][0] < 1.5]
    d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
    for t in dl:
        for ai in range(len(ol)):
            for bi in range(ai + 1, len(ol)):
                a, b = ol[ai], ol[bi]
                run = 0; start = None
                for k in range(min(10, len(xy))):
                    run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                    if run >= 3: start = k - 2; break
                if start is None: continue
                cov, unc = (a, b) if d(0, a, t) < d(0, b, t) else (b, a)
                for k in range(0, min(16, len(xy))):
                    if k >= start and (d(k, a, t) >= 1.3 or d(k, b, t) >= 1.3): break
                    D = xy[k][t]
                    for nm, m, o in (("cov", cov, unc), ("unc", unc, cov)):
                        away = 1 if xy[k][m][1] >= xy[k][o][1] else -1
                        out[(c, p["src"], k // 3)][nm + " lat"].append((xy[k][m][1] - D[1]) * away)
                        out[(c, p["src"], k // 3)][nm + " dep"].append(D[0] - xy[k][m][0])
med = lambda v: f"{sorted(v)[len(v)//2]:5.2f}" if v else "  -  "
print("concept src t(s) | covered lat dep | uncovered lat dep   (lat + = away from partner; dep = yd in front of DL)")
for key in sorted(out):
    c, src, b = key; O = out[key]
    print(f"  {c:12s} {src} {b*0.3:.1f}-{b*0.3+0.2:.1f} n={len(O['cov lat']):4d} | {med(O['cov lat'])} {med(O['cov dep'])} | {med(O['unc lat'])} {med(O['unc dep'])}")
