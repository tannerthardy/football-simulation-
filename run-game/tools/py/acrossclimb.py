"""Zone doubles (leavepos definition), NFL vs sim. At the climber's leave frame, his target backer = the nearest LB
then. 'Across' = that LB is on the partner's side of the DL (beyond the DL laterally, toward the partner), 'own' =
on the climber's side. For each: share, time from leave until he is within 1.5 yd of that LB (by 2.0 s after leave),
reach share, climber mean speed over the 0.5 s after leave, his path's side of the DL (passes the DL's downfield
face = min depth gap), and whether he crosses the partner's lateral line downfield of the DL.
usage: acrossclimb.py rfr nfl traces"""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
out = defaultdict(lambda: defaultdict(list))
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
    xy, players = p["xy"], p["players"]; n = len(xy)
    if n < 15: continue
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]; dl = [i for i, g in enumerate(grp) if g == "DL" and xy[3][i][0] < 1.5]
    lbs = [i for i, g in enumerate(grp) if g == "LB"]
    if not lbs: continue
    d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
    for t in dl:
        for ai in range(len(ol)):
            for bi in range(ai + 1, len(ol)):
                a, b = ol[ai], ol[bi]; run = 0; start = None
                for k in range(min(10, n)):
                    run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                    if run >= 3: start = k - 2; break
                if start is None: continue
                climb = None
                for k in range(start, min(25, n)):
                    for m in (a, b):
                        if d(k, m, t) >= 2 and xy[k][m][0] > 0.5 and xy[k][m][0] > xy[k][t][0]: climb = (k, m); break
                    if climb: break
                if not climb: continue
                k, m = climb; o = b if m == a else a
                kl = max((kk for kk in range(start, k) if d(kk, m, t) < 1.3), default=start)
                lb = min(lbs, key=lambda j: d(kl, m, j))
                side_p = math.copysign(1, xy[kl][o][1] - xy[kl][t][1]) if xy[kl][o][1] != xy[kl][t][1] else 1
                across = (xy[kl][lb][1] - xy[kl][t][1]) * side_p > 0
                key = (c, p["src"], 'across' if across else 'own')
                O = out[key]; O['n'].append(1)
                reach = next((kk for kk in range(kl, min(n, kl + 21)) if d(kk, m, lb) < 1.5), None)
                O['reach'].append(reach is not None)
                if reach is not None: O['t'].append((reach - kl) * .1)
                if kl + 5 < n: O['v'].append(math.dist(xy[kl][m], xy[kl + 5][m]) / .5)
                # crosses the partner's side of the DL while downfield of him within 1.0 s
                O['cross'].append(any((xy[kk][m][1] - xy[kk][t][1]) * side_p > 0 and xy[kk][m][0] > xy[kk][t][0] for kk in range(kl, min(n, kl + 11))))
for c in ("INSIDE ZONE", "OUTSIDE ZONE"):
    for src in ("nfl", "sim"):
        tot = sum(len(out[(c, src, s)]['n']) for s in ('across', 'own'))
        for s in ('across', 'own'):
            O = out[(c, src, s)]; nn = len(O['n'])
            if not nn: continue
            med = lambda v: f"{sorted(v)[len(v)//2]:.2f}" if v else "-"
            print(f"  {c:12s} {src} {s:6s}: share {nn/tot:.2f} (n {nn}) | reaches LB {sum(O['reach'])/nn:.2f} in {med(O['t'])} s | speed 0-0.5 s {med(O['v'])} | crosses to partner side downfield of DL {sum(O['cross'])/nn:.2f}")
