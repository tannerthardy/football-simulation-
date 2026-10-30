"""Zone doubles (izclimb/doublerel4 selection), NFL vs sim: per double the timeline
start (both OL within 1.3 of the DL for 3 frames) -> leave (climber's last frame within 1.3 of the DL
before the climb mark) -> mark (>= 2 yd from DL, past him upfield, x > 0.5) -> meet (within 1.2 of nearest LB).
Also positions at leave: climber x, DL x, LB x and the climber-LB distance; climber speed leave->mark.
usage: dblphase.py run_film_reference.py nfl.jsonl.gz trace...json"""
import importlib.util, math, sys, statistics as st
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(list)
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
    cyy = sum(xy[0][i][1] for i in ol) / len(ol)
    crs = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
    if crs is None: continue
    sd = 1 if xy[crs][car][1] - cyy >= 0 else -1
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
                lat = (xy[0][t][1] - cyy) * sd
                key = f"{c:12} {'PLAY' if lat > 1 else 'BACK' if lat < -1 else 'MID '} {p['src']}"
                R[key + ' n doubles'].append(1)
                R[key + ' climbs'].append(1 if climb else 0)
                R[key + ' start t'].append(start / 10)
                if not climb: continue
                k, m = climb
                keep = b if m == a else a
                leave = max(kk for kk in range(start, k + 1) if d(kk, m, t) < 1.3) if any(d(kk, m, t) < 1.3 for kk in range(start, k + 1)) else start
                nl = min(lb, key=lambda l: d(leave, m, l))
                meet = next((kk for kk in range(k, len(xy)) if d(kk, m, nl) < 1.2), None)
                R[key + ' leave t'].append(leave / 10)
                R[key + ' mark t'].append(k / 10)
                R[key + ' leave->mark s'].append((k - leave) / 10)
                if meet is not None: R[key + ' mark->meet s'].append((meet - k) / 10); R[key + ' meet t'].append(meet / 10)
                R[key + ' climber x at leave'].append(xy[leave][m][0])
                R[key + ' DL x at leave'].append(xy[leave][t][0])
                R[key + ' keeper x at leave'].append(xy[leave][keep][0])
                R[key + ' LB x at leave'].append(xy[leave][nl][0])
                R[key + ' climber-LB at leave'].append(d(leave, m, nl))
                R[key + ' climber x at mark'].append(xy[k][m][0])
                R[key + ' DL x at mark'].append(xy[k][t][0])
                R[key + ' speed leave->mark'].append(math.dist(xy[k][m], xy[leave][m]) / max(.1, (k - leave) / 10))
                # climber x gain per frame over the double (start->leave)
                R[key + ' climber x gain start->leave'].append(xy[leave][m][0] - xy[start][m][0])
                R[key + ' DL x gain start->leave'].append(xy[leave][t][0] - xy[start][t][0])
W = ('leave t', 'mark t', 'meet t', 'climber x at leave', 'LB x at leave', 'climber-LB at leave', 'climber x at mark')
for c in ("INSIDE ZONE", "OUTSIDE ZONE"):
  for sdn in ("PLAY", "MID ", "BACK"):
    for src in ("nfl", "sim"):
        key = f"{c:12} {sdn} {src}"
        if not R[key + ' n doubles']: continue
        print(f"{key}: doubles {len(R[key+' n doubles'])} climb share {st.mean(R[key+' climbs']):.2f} n climbs {len(R[key+' mark t'])} meet {len(R[key+' meet t'])}")
        print('   ' + ' | '.join(f"{w} {st.median(R[key+' '+w]):+.2f}" for w in W if R[key + ' ' + w]))
