"""Zone doubles (doublerel4 definition) climbs, NFL vs sim: at the climb mark and over the next 0.5 s, the nearest LB's
velocity toward/away from the climber and lateral; climber velocity toward that LB; for sim also the climber's target
(frame tg) and whether it is that nearest LB, and toward-target speed."""
import importlib.util, math, sys, statistics as st
from collections import defaultdict, Counter
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
import json
# sim targets by (id) from traces
TG = {}
for path in sys.argv[3:]:
    for p in json.load(open(path)): TG[p['id']] = [[a[6] for a in f['a']] for f in p['frames']]
R = defaultdict(list); C = Counter()
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
    if not lb: continue
    d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
    v = lambda k, i: ((xy[min(k+1, len(xy)-1)][i][0] - xy[k][i][0]) / .1, (xy[min(k+1, len(xy)-1)][i][1] - xy[k][i][1]) / .1)
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
                        if d(k, m, t) >= 2 and xy[k][m][0] > 0.5 and xy[k][m][0] > xy[k][t][0]:
                            climb = (k, m); break
                    if climb: break
                if not climb: continue
                k, m = climb; k5 = min(k + 5, len(xy) - 1)
                if k5 <= k: continue
                nl = min(lb, key=lambda l: d(k, m, l))
                ux, uy = xy[k][nl][0] - xy[k][m][0], xy[k][nl][1] - xy[k][m][1]; n = math.hypot(ux, uy) or 1; ux /= n; uy /= n
                vm = [v(kk, m) for kk in range(k, k5)]; vl = [v(kk, nl) for kk in range(k, k5)]
                key = f"{c:12} {p['src']}"
                R[key + ' climber speed'].append(st.mean(math.hypot(*q) for q in vm))
                R[key + ' climber toward LB'].append(st.mean(q[0] * ux + q[1] * uy for q in vm))
                R[key + ' LB toward climber'].append(st.mean(-(q[0] * ux + q[1] * uy) for q in vl))
                R[key + ' LB downhill (-x)'].append(st.mean(-q[0] for q in vl))
                R[key + ' LB speed'].append(st.mean(math.hypot(*q) for q in vl))
                R[key + ' LB depth at climb'].append(xy[k][nl][0])
                R[key + ' climber depth at climb'].append(xy[k][m][0])
                R[key + ' LB in front (dx)'].append(xy[k][nl][0] - xy[k][m][0])
                R[key + ' close'].append(d(k, m, nl) - d(k5, m, nl))
                if p['src'] == 'sim' and p.get('id') in TG:
                    tg = TG[p['id']][k][m]
                    C[key + (' target is nearest LB' if tg == nl else ' target is another' if tg >= 0 else ' no target')] += 1
for c in ("INSIDE ZONE", "OUTSIDE ZONE"):
    for src in ("nfl", "sim"):
        key = f"{c:12} {src}"
        if not R[key + ' close']: continue
        print(f"{key}: n {len(R[key+' close'])} | " + ' | '.join(f"{w} {st.median(R[key+' '+w]):+.2f}" for w in ('close', 'climber speed', 'climber toward LB', 'LB toward climber', 'LB downhill (-x)', 'LB speed', 'LB depth at climb', 'climber depth at climb', 'LB in front (dx)')))
for k, v in sorted(C.items()): print(k, v)
