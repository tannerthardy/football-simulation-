"""Puller path, NFL vs sim, same operator (run_film_reference's puller rule): for each rule-detected puller on
POWER/COUNTER/TRAP, at t = 0.4..2.0 s: lateral displacement toward the play side since the snap, depth x
(yd past the LOS, + downfield), signed lateral position relative to the carrier's eventual crossing point
(+ = beyond the hole, to the outside), speed; time he first crosses the LOS (x > 0); lateral overshoot = his max
lateral beyond the hole before he crosses. Pullers split: first puller (nearest the hole at the snap) / second.
usage: pullpath.py run_film_reference.py nfl.jsonl.gz trace.json..."""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
T = (4, 6, 8, 10, 12, 14, 16, 18, 20)
for p in plays():
    con = p['concept']
    if con not in ('POWER', 'COUNTER', 'TRAP'): continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 21: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']
    if len(ol) < 5: continue
    cross = next((f for f in range(n) if xy[f][c][0] > 0), None)
    if cross is None: continue
    hole = xy[cross][c][1]; cy = st.mean(xy[0][i][1] for i in ol)
    side = 1 if hole > cy else -1
    pullers = [i for i in ol if rfr.puller(xy, i, min(n - 1, 25))]
    pullers.sort(key=lambda i: abs(xy[0][i][1] - hole))
    for rank, i in enumerate(pullers[:2]):
        key = (con, p['src'], 'first' if rank == 0 else 'second')
        o[key + ('n',)].append(1)
        x0, y0 = xy[0][i]
        up = next((f for f in range(n) if xy[f][i][0] > 0), None)
        o[key + ('up',)].append(up * .1 if up is not None else 9)
        beyond = max(((xy[f][i][1] - hole) * side for f in range(0, (up if up is not None else min(n, 25)))), default=0)
        o[key + ('over',)].append(beyond)
        o[key + ('hole0',)].append((hole - y0) * side)
        for k in T:
            if k + 1 >= n: continue
            o[key + ('lat', k)].append((xy[k][i][1] - y0) * side)
            o[key + ('x', k)].append(xy[k][i][0])
            o[key + ('rel', k)].append((xy[k][i][1] - hole) * side)
            o[key + ('v', k)].append(math.dist(xy[k + 1][i], xy[k - 1][i]) / .2)
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
for con in ('POWER', 'COUNTER', 'TRAP'):
    for who in ('first', 'second'):
        for src in ('nfl', 'sim'):
            key = (con, src, who)
            nn = len(o[key + ('n',)])
            if not nn: continue
            print(f"{con:7s} {who:6s} {src}: n {nn} | hole from his snap spot {med(o[key+('hole0',)])} | crosses LOS {med(o[key+('up',)])} s | max beyond hole before crossing {med(o[key+('over',)])}")
            for nm in ('lat', 'x', 'rel', 'v'):
                print(f"      {nm:3s} " + " ".join(f"{k/10:.1f}:{med(o[key+(nm,k)])}" for k in T))
