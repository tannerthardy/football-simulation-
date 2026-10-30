"""Counter/power: the down wall (non-pulling OL) depth during the pull, NFL vs sim: pullers = OL with |lateral move|
>2 yd by 1.5 s; wall = the other OL. Mean wall depth (x, - = backfield) at 0.6/0.9/1.2/1.5 s, the deepest wall member,
and the pullers' depth; separation between the puller and the nearest wall body when he passes it."""
import importlib.util, math, sys, statistics as st
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p['concept']
    if c not in ('COUNTER', 'POWER'): continue
    xy, players = p['xy'], p['players']
    if len(xy) < 16: continue
    grp = [q['group'] for q in players]
    ol = [i for i, g in enumerate(grp) if g == 'OL']
    if len(ol) < 5: continue
    pull = [i for i in ol if abs(xy[15][i][1] - xy[0][i][1]) > 2]
    if not pull: continue
    wall = [i for i in ol if i not in pull]
    if not wall: continue
    for k in (0, 6, 9, 12, 15):
        R[(p['src'], c, k, 'wall mean')].append(st.mean(xy[k][i][0] for i in wall))
        R[(p['src'], c, k, 'wall deepest')].append(min(xy[k][i][0] for i in wall))
        R[(p['src'], c, k, 'puller')].append(st.mean(xy[k][i][0] for i in pull))
        R[(p['src'], c, k, 'gap puller-wall')].append(st.mean(min(xy[k][w][0] for w in wall) - xy[k][q][0] for q in pull))
for c in ('COUNTER', 'POWER'):
    for src in ('nfl', 'sim'):
        if not R[(src, c, 0, 'wall mean')]: continue
        print(f"{c:8} {src} n {len(R[(src,c,0,'wall mean')])}: " + ' | '.join(f"t{k/10:.1f} wall {st.mean(R[(src,c,k,'wall mean')]):+.2f} deepest {st.mean(R[(src,c,k,'wall deepest')]):+.2f} puller {st.mean(R[(src,c,k,'puller')]):+.2f}" for k in (0, 6, 9, 12, 15)))
