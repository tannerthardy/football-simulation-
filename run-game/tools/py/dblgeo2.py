"""Position-only zone doubles, same operator for NFL and sim (doublerel4 definition): while both OL are within
1.3 yd of the DL, from the double's start until one climbs (or 1.5 s): each member's lateral offset from the DL
(+ = away from his partner), member gap, DL speed and DL retreat (downfield) speed, members' upfield speed.
usage: dblgeo2.py run_film_reference.py nfl.jsonl.gz trace.json..."""
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
                O = out[(c, p["src"])]; O["n"].append(1)
                for k in range(start, min(15, len(xy) - 1)):
                    if d(k, a, t) >= 1.3 or d(k, b, t) >= 1.3: break
                    D = xy[k][t]
                    for m, o in ((a, b), (b, a)):
                        away = 1 if xy[k][m][1] >= xy[k][o][1] else -1
                        O["lat"].append((xy[k][m][1] - D[1]) * away)
                        O["up"].append((xy[k+1][m][0] - xy[k][m][0]) / .1)
                    O["gap"].append(d(k, a, b))
                    O["dlv"].append(math.dist(xy[k+1][t], xy[k][t]) / .1)
                    O["dlback"].append((xy[k+1][t][0] - D[0]) / .1)
                    O["depth"].append(min(xy[k][a][0], xy[k][b][0]) - D[0])
med = lambda v: round(sorted(v)[len(v)//2], 2) if v else None
mean = lambda v: round(sum(v)/len(v), 2) if v else None
print("concept src: doubles frames | member lateral off DL (+away from partner) med, share on DL's near half (<0.15) | member gap med | DL speed med, DL driven back mean | member upfield mean | nearer member depth in front of DL med")
for (c, src), O in sorted(out.items()):
    print(f"  {c:12s} {src}: {len(O['n'])} {len(O['gap'])} | {med(O['lat'])} {mean([x < .15 for x in O['lat']])} | {med(O['gap'])} | {med(O['dlv'])} {mean(O['dlback'])} | {mean(O['up'])} | {med(O['depth'])}")
