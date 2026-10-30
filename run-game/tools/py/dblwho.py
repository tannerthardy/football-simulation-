"""Zone doubles (doublerel4 definition), NFL vs sim: who climbs (covered = nearer the DL at the snap) by the DL's lateral
move during the double, signed + toward the uncovered member (start of double to the last frame the climber is within
1.3 yd), and by the nearest LB's lateral side at the leave (+ = the uncovered member's side of the DL).
usage: dblwho.py run_film_reference.py nfl.jsonl.gz trace.json..."""
import importlib.util, math, sys
from collections import defaultdict, Counter
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(Counter)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
    xy, players, car = p["xy"], p["players"], p["carrier"]
    if len(xy) < 15: continue
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]; dl = [i for i, g in enumerate(grp) if g == "DL" and xy[3][i][0] < 1.5]
    lb = [i for i, g in enumerate(grp) if g == "LB"]
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
                sgn = 1 if xy[0][unc][1] > xy[0][cov][1] else -1
                climb = None
                for k in range(start, min(25, len(xy))):
                    for m in (a, b):
                        if d(k, m, t) >= 2 and xy[k][m][0] > 0.5 and xy[k][m][0] > xy[k][t][0]:
                            climb = (k, m); break
                    if climb: break
                key = f"{c:12} {p['src']}"
                R[key]["doubles"] += 1
                if not climb: continue
                k, m = climb
                kl = max((kk for kk in range(start, k) if d(kk, m, t) < 1.3), default=start)
                mv = (xy[kl][t][1] - xy[start][t][1]) * sgn
                mb = "DL to uncovered >0.3" if mv > .3 else "DL to covered >0.3" if mv < -.3 else "DL lateral within 0.3"
                who = "covered climbs" if m == cov else "uncovered climbs"
                R[key]["climbs"] += 1; R[key][mb] += 1; R[key][mb + ": " + who] += 1
                if lb:
                    nl = min(lb, key=lambda l: d(kl, m, l)); ls = (xy[kl][nl][1] - xy[kl][t][1]) * sgn
                    lbk = "LB on uncovered side" if ls > .5 else "LB on covered side" if ls < -.5 else "LB over DL"
                    R[key][lbk] += 1; R[key][lbk + ": " + who] += 1
for key in sorted(R):
    r = R[key]; n = r["climbs"] or 1
    print(f"{key}: doubles {r['doubles']} climbs {r['climbs']}")
    for grpk in ("DL to uncovered >0.3", "DL lateral within 0.3", "DL to covered >0.3", "LB on uncovered side", "LB over DL", "LB on covered side"):
        g = r[grpk] or 1
        print(f"    {grpk:24} share {r[grpk]/n:.2f}  covered climbs {r[grpk + ': covered climbs']/g:.2f}")
