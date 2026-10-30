"""Draws, NFL vs sim: the blocker who first touches each box backer: when he first crosses LOS+0.5, his distance to
the backer at 1.0 s and the handoff; handoff time; carrier position at the touch. Plus: share of OL past LOS+1 at 1.0/1.5/2.0 s."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
rows = defaultdict(list); ol_up = defaultdict(lambda: [0, 0, 0, 0]); hos = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    if p['concept'] != 'DRAW': continue
    xy, players, c = p['xy'], p['players'], p['carrier']
    if len(xy) < 25: continue
    g = [q['group'] for q in players]; ball_y = xy[0][c][1]
    box = [i for i, q in enumerate(g) if q == 'LB' and 2.5 <= xy[0][i][0] <= 8 and abs(xy[0][i][1] - ball_y) <= 6]
    ol = [i for i, q in enumerate(g) if q == 'OL']; blk = [i for i, q in enumerate(g) if q in ('OL', 'TE', 'RB') and i != c]
    h = p.get('handoff') or 1.3; kh = min(len(xy) - 1, int(round(h / 0.1))); hos[p['src']].append(h)
    u = ol_up[p['src']]; u[3] += len(ol)
    for j, k in enumerate((10, 15, 20)): u[j] += sum(xy[k][o][0] > 1 for o in ol)
    for b in box:
        tk = next(((k, o) for k in range(len(xy)) for o in blk if math.dist(xy[k][o], xy[k][b]) < 1.5 and xy[k][o][0] > -0.5), None)
        if not tk: continue
        k, o = tk
        up = next((q for q in range(len(xy)) if xy[q][o][0] > 0.5), None)
        rows[p['src']].append(dict(t=k * .1, up=up * .1 if up is not None else None, d10=math.dist(xy[10][o], xy[10][b]),
            dh=math.dist(xy[kh][o], xy[kh][b]), ol=g[o], cx=xy[k][c][0], bx=xy[k][b][0], h=h))
def med(v): v = sorted(x for x in v if x is not None); return round(v[len(v) // 2], 2) if v else None
for src, r in rows.items():
    u = ol_up[src]
    print(f"{src}: handoff {med(hos[src])} | OL past LOS+1 at 1.0/1.5/2.0 s {u[0]/u[3]:.2f}/{u[1]/u[3]:.2f}/{u[2]/u[3]:.2f}")
    print(f"   first toucher ({len(r)}; OL {sum(x['ol']=='OL' for x in r)}): touch {med([x['t'] for x in r])} s, crossed LOS+.5 at {med([x['up'] for x in r])} s, "
          f"dist to backer at 1.0 s {med([x['d10'] for x in r])} / handoff {med([x['dh'] for x in r])}; backer depth at touch {med([x['bx'] for x in r])}, carrier x {med([x['cx'] for x in r])}")
