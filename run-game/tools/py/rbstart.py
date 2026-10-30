"""Carrier (ball-carrier back) start, NFL and sim, same operator. Backfield set by QB depth at the snap:
under center (QB > -2 yd), pistol (-2..-4.5 with back directly behind), gun. Distance of the carrier from his
snap spot at 0.2/0.3/0.4/0.5/0.7/1.0 s; time his speed first reaches 0.5 and 2 yd/s; handoff time.
usage: rbstart.py run_film_reference.py nfl.jsonl.gz trace.json..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
rows = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    xy, players, c = p["xy"], p["players"], p["carrier"]
    if len(xy) < 12 or players[c]["group"] != "RB": continue
    qb = next((i for i, q in enumerate(players) if q["group"] == "QB"), None)
    if qb is None: continue
    qd = xy[0][qb][0]
    fm = "under" if qd > -2 else "pistol" if qd > -4.5 and abs(xy[0][c][1] - xy[0][qb][1]) < 1 else "gun"
    x0 = xy[0][c]
    dist = lambda k: math.dist(xy[k][c], x0)
    sp = [math.dist(xy[k + 1][c], xy[k][c]) / 0.1 for k in range(len(xy) - 1)]
    t05 = next((k * 0.1 + 0.05 for k, v in enumerate(sp) if v >= 0.5), None)
    t2 = next((k * 0.1 + 0.05 for k, v in enumerate(sp) if v >= 2), None)
    h = p.get("handoff"); hk = int(round(h / 0.1)) if h is not None else None
    hs = sp[hk] if hk is not None and hk < len(sp) else None
    rows[(p["concept"] if p["concept"] in ("INSIDE ZONE", "OUTSIDE ZONE") else "GAP/OTHER", fm, p["src"])].append(
        ([dist(k) for k in (2, 3, 4, 5, 7, 10)], t05, t2, p.get("handoff"), hs))
def med(v): v = sorted(x for x in v if x is not None); return f"{v[len(v)//2]:.2f}" if v else "-"
print("concept / backfield / src: n | distance at 0.2 0.3 0.4 0.5 0.7 1.0 s | t(0.5 yd/s) t(2 yd/s) | handoff time at speed")
for k in sorted(rows):
    r = rows[k]
    if len(r) < 8: continue
    print(f"{k[0]:12s} {k[1]:6s} {k[2]}: {len(r):4d} | " + " ".join(med([x[0][i] for x in r]) for i in range(6))
          + f" | {med([x[1] for x in r])} {med([x[2] for x in r])} | {med([x[3] for x in r])} at {med([x[4] for x in r])} yd/s")
