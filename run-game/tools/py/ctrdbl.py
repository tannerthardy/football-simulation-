"""Counter doubles, NFL vs sim, same operator (dblside's operator on COUNTER, pull side from the rule pullers).
Double = two non-pulling OL within 1.3 yd of one line DL (snap < 1.5 deep) for 3 frames within the first 1.0 s.
Climb mark = a member >= 2 yd from the DL, past him upfield, x > 0.5 (by 2.5 s). Leave = the climber's last frame
within 1.3 of the DL before the mark. Meet = climber within 1.2 of the nearest LB. Also: carrier crossing time,
leave relative to the crossing, and whether the climber meets an LB before the carrier is 1 yd past the LOS.
usage: ctrdbl.py rfr nfl.jsonl.gz traces..."""
import importlib.util, math, sys, statistics as st
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    if p["concept"] != "COUNTER": continue
    xy, players, car = p["xy"], p["players"], p["carrier"]; n = len(xy)
    if n < 26: continue
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL" and players[i]["side"] == "O"]
    if len(ol) != 5: continue
    pulls = [i for i in ol if rfr.puller(xy, i, 25)]
    if not pulls: continue
    ps = 1 if sum(xy[15][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    dl = [i for i, g in enumerate(grp) if g == "DL" and players[i]["side"] == "D" and xy[3][i][0] < 1.5]
    lb = [i for i, g in enumerate(grp) if g == "LB" and players[i]["side"] == "D"]
    if not lb: continue
    cyy = sum(xy[0][i][1] for i in ol) / 5
    crs = next((k for k in range(n) if xy[k][car][0] >= 0), None)
    past = next((k for k in range(n) if xy[k][car][0] >= 1), n)
    if crs is None: continue
    src = p["src"]; R[src + ' plays'].append(1)
    d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
    stay = [i for i in ol if i not in pulls]
    for t in dl:
        for ai in range(len(stay)):
            for bi in range(ai + 1, len(stay)):
                a, b = stay[ai], stay[bi]; run = 0; start = None
                for k in range(min(11, n)):
                    run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                    if run >= 3: start = k - 2; break
                if start is None: continue
                climb = None
                for k in range(start, min(26, n)):
                    for m in (a, b):
                        if d(k, m, t) >= 2 and xy[k][m][0] > 0.5 and xy[k][m][0] > xy[k][t][0]: climb = (k, m); break
                    if climb: break
                lat = (xy[0][t][1] - cyy) * ps
                key = f"{'PLAY' if lat > 1 else 'BACK' if lat < -1 else 'MID '} {src}"
                R[key + ' n'].append(1); R[key + ' climbs'].append(1 if climb else 0); R[key + ' start t'].append(start / 10)
                R[key + ' cross t'].append(crs / 10)
                if not climb: R[key + ' meet before carrier+1'].append(0); continue
                k, m = climb
                leave = max((kk for kk in range(start, k + 1) if d(kk, m, t) < 1.3), default=start)
                nl = min(lb, key=lambda l: d(leave, m, l))
                meet = next((kk for kk in range(k, n) if d(kk, m, nl) < 1.2), None)
                R[key + ' leave t'].append(leave / 10); R[key + ' leave-cross'].append((leave - crs) / 10)
                R[key + ' LB x at leave'].append(xy[leave][nl][0]); R[key + ' climber-LB at leave'].append(d(leave, m, nl))
                R[key + ' carrier x at leave'].append(xy[leave][car][0])
                for dt in (3, 5, 10):
                    if leave + dt < n: R[key + f' spd +{dt/10}'].append(math.dist(xy[leave + dt][m], xy[leave + dt - 1][m]) * 10); R[key + f' vx +{dt/10}'].append((xy[leave + dt][m][0] - xy[leave + dt - 1][m][0]) * 10); R[key + f' clb-LB +{dt/10}'].append(d(leave + dt, m, nl))
                R[key + ' DL x at leave'].append(xy[leave][t][0])
                R[key + ' meet before carrier+1'].append(1 if meet is not None and meet <= past else 0)
                if meet is not None: R[key + ' meet t'].append(meet / 10)
W = ('spd +0.3', 'spd +0.5', 'spd +1.0', 'vx +0.5', 'clb-LB +0.5', 'clb-LB +1.0', 'start t', 'leave t', 'meet t', 'cross t', 'leave-cross', 'carrier x at leave', 'DL x at leave', 'LB x at leave', 'climber-LB at leave')
for src in ('nfl', 'sim'): print(src, 'plays', len(R[src + ' plays']))
for sdn in ("PLAY", "MID ", "BACK"):
    for src in ("nfl", "sim"):
        key = f"{sdn} {src}"
        if not R[key + ' n']: continue
        def q(v):
            v = sorted(v); return f"{v[len(v)//4]:+.2f}/{v[len(v)//2]:+.2f}/{v[3*len(v)//4]:+.2f}"
        print(f"{key}: doubles {len(R[key+' n'])} climb {st.mean(R[key+' climbs']):.2f} meet-before-carrier+1 {st.mean(R[key+' meet before carrier+1']):.2f}")
        print('   ' + ' | '.join(f"{w} {q(R[key+' '+w])}" for w in W if R[key + ' ' + w]))
