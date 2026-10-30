"""Draws: OL depth relative to LOS (negative = backfield) at 0.5/1.0/1.4/2.0 s, all OL and the eventual first backer
toucher; OL speed at 1.0 s; does the first toucher touch a DL first (within 1.2 yd of any DL before touching the backer)."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(lambda: defaultdict(list))
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    if p['concept'] != 'DRAW': continue
    xy, players, c = p['xy'], p['players'], p['carrier']
    if len(xy) < 25: continue
    g = [q['group'] for q in players]; ball_y = xy[0][c][1]
    box = [i for i, q in enumerate(g) if q == 'LB' and 2.5 <= xy[0][i][0] <= 8 and abs(xy[0][i][1] - ball_y) <= 6]
    ol = [i for i, q in enumerate(g) if q == 'OL']; dl = [i for i, q in enumerate(g) if q == 'DL']
    r = R[p['src']]
    for o in ol:
        for k in (5, 10, 14, 20): r[f'all OL x@{k/10}'].append(xy[k][o][0])
        r['all OL speed@1.0'].append(math.dist(xy[11][o], xy[9][o]) / .2)
    for b in box:
        tk = next(((k, o) for k in range(len(xy)) for o in ol if math.dist(xy[k][o], xy[k][b]) < 1.5 and xy[k][o][0] > -0.5), None)
        if not tk: continue
        k, o = tk
        for q in (5, 10, 14, 20): r[f'toucher x@{q/10}'].append(xy[q][o][0])
        r['toucher dl contact first'].append(any(math.dist(xy[q][o], xy[q][d]) < 1.2 for q in range(0, k) for d in dl))
        r['toucher lateral to backer at snap'].append(abs(xy[0][o][1] - xy[0][b][1]))
for src, r in R.items():
    print(src + ': ' + ' | '.join(f"{k} {sorted(v)[len(v)//2]:.2f}" if not isinstance(v[0], bool) else f"{k} {sum(v)/len(v):.2f}" for k, v in r.items()) + f" | n toucher {len(r['toucher x@0.5'])}")
