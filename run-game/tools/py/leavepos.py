"""Position-only zone doubles (doublerel4 definition), NFL vs sim: at the climber's leave frame (last frame within
1.3 yd of the DL before he reaches the climb mark), his lateral offset from the DL (+ = away from partner) and depth
in front of the DL (+ = toward his own backfield); the partner's the same; time of leave. Also the climber's
position at 0.3 s before leave. usage: leavepos.py run_film_reference.py nfl.jsonl.gz trace.json..."""
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
                climb = None
                for k in range(start, min(25, len(xy))):
                    for m in (a, b):
                        if d(k, m, t) >= 2 and xy[k][m][0] > 0.5 and xy[k][m][0] > xy[k][t][0]: climb = (k, m); break
                    if climb: break
                if not climb: continue
                k, m = climb; o = b if m == a else a
                kl = max((kk for kk in range(start, k) if d(kk, m, t) < 1.3), default=start)
                O = out[(c, p["src"])]
                for tag, kk in (("leave", kl), ("-0.3", max(start, kl - 3))):
                    away = 1 if xy[kk][m][1] >= xy[kk][o][1] else -1
                    O[tag + " lat"].append((xy[kk][m][1] - xy[kk][t][1]) * away)
                    O[tag + " dep"].append(xy[kk][t][0] - xy[kk][m][0])
                O["t"].append(kl * .1)
                O["covered"].append(d(0, m, t) < d(0, o, t))
med = lambda v: f"{sorted(v)[len(v)//2]:5.2f}" if v else "  -  "
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
print("concept src: climbs | leave t | climber at leave: lat (+away from partner), depth in front of DL | 0.3 s before leave | covered share")
for (c, src), O in sorted(out.items()):
    print(f"  {c:12s} {src}: {len(O['t']):4d} | {med(O['t'])} | {med(O['leave lat'])} {med(O['leave dep'])} | {med(O['-0.3 lat'])} {med(O['-0.3 dep'])} | {mean(O['covered'])}")
