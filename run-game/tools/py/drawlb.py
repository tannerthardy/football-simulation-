"""Draws, NFL vs sim, position-only: box backers (LB group 2.5-8 yd deep within 6 yd of the ball at the snap):
depth at the snap, 1.0 s and the handoff; nearest OL distance at the handoff; first OL/TE/back within 1.5 yd (time);
carrier reaches the backer's depth minus 1 yd (time)."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
rows = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    if p['concept'] != 'DRAW': continue
    xy, players, c = p['xy'], p['players'], p['carrier']
    if len(xy) < 20: continue
    g = [q['group'] for q in players]
    ball_y = xy[0][c][1]
    box = [i for i, q in enumerate(g) if q == 'LB' and 2.5 <= xy[0][i][0] <= 8 and abs(xy[0][i][1] - ball_y) <= 6]
    ol = [i for i, q in enumerate(g) if q == 'OL']; blk = [i for i, q in enumerate(g) if q in ('OL', 'TE', 'RB') and i != c]
    h = p.get('handoff') or 1.3; kh = min(len(xy) - 1, int(round(h / 0.1)))
    for b in box:
        k10 = min(len(xy) - 1, 10)
        reach = next((k for k in range(len(xy)) if xy[k][c][0] >= xy[k][b][0] - 1), None)
        touch = next((k for k in range(len(xy)) if any(math.dist(xy[k][o], xy[k][b]) < 1.5 and xy[k][o][0] > -0.5 for o in blk)), None)
        rows[p['src']].append(dict(d0=xy[0][b][0], d10=xy[k10][b][0], dh=xy[kh][b][0], near=min(math.dist(xy[kh][o], xy[kh][b]) for o in ol),
                                  touch=touch * 0.1 if touch is not None else None, reach=reach * 0.1 if reach is not None else None,
                                  before=touch is not None and (reach is None or touch <= reach)))
def med(v): v = sorted(x for x in v if x is not None); return round(v[len(v) // 2], 2) if v else None
for src, r in rows.items():
    print(f"{src}: box backers {len(r)} | depth snap/1.0 s/handoff {med([x['d0'] for x in r])} / {med([x['d10'] for x in r])} / {med([x['dh'] for x in r])} | nearest OL at handoff {med([x['near'] for x in r])} yd | first touch {med([x['touch'] for x in r])} s, carrier reaches {med([x['reach'] for x in r])} s | touched before {sum(x['before'] for x in r)/len(r):.2f}")
