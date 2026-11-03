"""Zone doubles by the defender's flow, NFL vs sim, same operator (dblgeo3 selection: two OL within 1.3 yd of an
on-line DL for 3 frames starting before 1.0 s; frames while both within 1.3, up to 1.5 s). Each frame is classed by
the DL's lateral velocity over the last 0.2 s, signed toward the uncovered member's side (covered = nearer the DL at
the snap): SQUARE |v| < 0.6, TO HELPER v >= 0.6, TO COVERED v <= -0.6 yd/s. Per class: frame share, covered and
uncovered member lateral (+ away from partner) and depth in front of the DL, member gap; and per double the
frames it lasted. usage: dblflow.py rfr nfl traces..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
F = defaultdict(lambda: defaultdict(list)); N = defaultdict(int); DUR = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
    xy, players = p["xy"], p["players"]
    if len(xy) < 17: continue
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]; dl = [i for i, g in enumerate(grp) if g == "DL" and xy[3][i][0] < 1.5]
    d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
    for t in dl:
        for ai in range(len(ol)):
            for bi in range(ai + 1, len(ol)):
                a, b = ol[ai], ol[bi]; run = 0; start = None
                for k in range(min(10, len(xy))):
                    run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                    if run >= 3: start = k - 2; break
                if start is None: continue
                cov, unc = (a, b) if d(0, a, t) < d(0, b, t) else (b, a)
                n = 0
                for k in range(max(2, start), min(16, len(xy))):
                    if d(k, a, t) >= 1.3 or d(k, b, t) >= 1.3: break
                    n += 1
                    side = 1 if xy[k][unc][1] >= xy[k][cov][1] else -1
                    v = (xy[k][t][1] - xy[k - 2][t][1]) / 0.2 * side
                    cl = "SQUARE" if abs(v) < 0.6 else ("TO HELPER" if v > 0 else "TO COVERED")
                    key = (c, p["src"], cl); D = xy[k][t]; N[(c, p["src"])] += 1
                    O = F[key]
                    O["cov lat"].append((xy[k][cov][1] - D[1]) * -side); O["cov dep"].append(D[0] - xy[k][cov][0])
                    O["unc lat"].append((xy[k][unc][1] - D[1]) * side); O["unc dep"].append(D[0] - xy[k][unc][0])
                    O["gap"].append(d(k, cov, unc))
                DUR[(c, p["src"])].append(n / 10)
med = lambda v: f"{sorted(v)[len(v)//2]:5.2f}" if v else "  -  "
print("concept src class: share of double frames | covered lat dep | uncovered lat dep | gap")
for c in ("INSIDE ZONE", "OUTSIDE ZONE"):
    for src in ("nfl", "sim"):
        tot = N[(c, src)] or 1; dur = DUR[(c, src)]
        print(f"{c} {src}: doubles {len(dur)}, double length med {med(dur)} s")
        for cl in ("SQUARE", "TO HELPER", "TO COVERED"):
            O = F[(c, src, cl)]
            print(f"   {cl:10s} {len(O['gap'])/tot:5.0%} | {med(O['cov lat'])} {med(O['cov dep'])} | {med(O['unc lat'])} {med(O['unc dep'])} | {med(O['gap'])}")
