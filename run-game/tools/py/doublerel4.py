"""Position-only doubles on zone runs, same operator for NFL and sim (x = yd past the LOS, 10 Hz).
Double: two OL each within 1.3 yd of the same DL (on the line at 0.3 s) for 3+ consecutive frames, starting
before 1.0 s. Climb: the first frame one of them is 2+ yd from that DL, past the LOS by 0.5+ yd, and downfield
of the DL. Reports: share of doubles that climb by 2.5 s, climb time, his distance to the nearest LB then,
time the carrier crosses the LOS, and whether the climber touches (1.5 yd) an LB before the carrier reaches
that LB's depth minus 1 yd.
usage: doublerel.py nfl.jsonl.gz trace.json..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
out = defaultdict(list)
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
    cross = next((k for k in range(len(xy)) if xy[k][car][0] > 0), None)
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
                        if d(k, m, t) >= 2 and xy[k][m][0] > 0.5 and xy[k][m][0] > xy[k][t][0]:
                            climb = (k, m); break
                    if climb: break
                row = {"src": p["src"], "climb": climb is not None, "cross": cross * 0.1 if cross is not None else None}
                if climb:
                    k, m = climb
                    row["t"] = k * 0.1
                    sp = lambda kk: math.dist(xy[min(kk+1,len(xy)-1)][m], xy[kk][m]) / 0.1
                    row["v0"] = sp(k); row["v5"] = sp(min(k + 5, len(xy) - 2))
                    kl = max((kk for kk in range(start, k) if d(kk, m, t) < 1.3), default=start)
                    row["vl"] = sp(kl); row["dlv"] = math.dist(xy[min(kl+1,len(xy)-1)][t], xy[kl][t]) / 0.1
                    row["tl"] = kl * 0.1; row["up"] = (xy[min(kl+1,len(xy)-1)][m][0] - xy[kl][m][0]) / 0.1
                    row["mv"] = math.dist(xy[kl][t], xy[start][t])
                    other = b if m == a else a
                    row["cov"] = math.dist(xy[0][m], xy[0][t]) < math.dist(xy[0][other], xy[0][t])
                    row["side"] = (xy[0][m][1] - xy[0][other][1]) * ((xy[min(len(xy)-1, 25)][car][1] - xy[0][car][1]) or 1) > 0
                    if lb:
                        nl = min(lb, key=lambda l: d(k, m, l)); k2 = min(k + 5, len(xy) - 1)
                        row["close"] = (d(k, m, nl) - d(k2, m, nl)) / ((k2 - k) * 0.1 or 1)
                    if lb:
                        near = min(lb, key=lambda l: d(k, m, l)); row["dist"] = d(k, m, near)
                        hit = False
                        for kk in range(k, len(xy)):
                            if xy[kk][car][0] >= xy[kk][near][0] - 1: break
                            if d(kk, m, near) < 1.5: hit = True; break
                        row["hit"] = hit
                out[(c, p["src"])].append(row)
def med(v): v = sorted(v); return round(v[len(v)//2], 2) if v else None
print("CLIMBER: share of climbs by the covered member (nearer the DL at the snap); by the play-side member")
for (c, src), r in sorted(out.items()):
    cl = [x for x in r if x["climb"]]
    print(f"  {c:12s} {src}: climbs {len(cl)} | covered member climbs {sum(x['cov'] for x in cl)/max(1,len(cl)):.2f} | play-side member climbs {sum(x['side'] for x in cl)/max(1,len(cl)):.2f}")
print("LEAVE: t leave, climber speed / upfield speed when he leaves the DL (last frame within 1.3), DL speed then, DL moved during the double")
for (c, src), r in sorted(out.items()):
    cl = [x for x in r if x["climb"]]
    print(f"  {c:12s} {src}: {med([x['tl'] for x in cl])} s | {med([x['vl'] for x in cl])} / {med([x['up'] for x in cl])} yd/s | DL {med([x['dlv'] for x in cl])} yd/s | DL moved {med([x['mv'] for x in cl])} yd")
print("concept src: doubles, climb by 2.5 s, climb time (med), distance to nearest LB then, carrier crosses LOS, climber touches that LB first, climber speed at mark / +0.5 s, closing on LB over 0.5 s")
for (c, src), r in sorted(out.items()):
    cl = [x for x in r if x["climb"]]
    print(f"  {c:12s} {src}: {len(r):5d} {len(cl)/len(r):.2f} {med([x['t'] for x in cl])} {med([x['dist'] for x in cl if 'dist' in x])} "
          f"{med([x['cross'] for x in r if x['cross'] is not None])} {sum(x.get('hit', False) for x in cl)/max(1,len(cl)):.2f} "
          f"{med([x['v0'] for x in cl])} / {med([x['v5'] for x in cl])} {med([x['close'] for x in cl if 'close' in x])}")
