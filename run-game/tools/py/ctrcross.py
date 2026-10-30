"""Counter/power: carrier's lateral position when he crosses the LOS, signed toward the pull (+ = play side), from the
ball and from the OL centre; and from the play-side tackle's snap spot. NFL vs sim, run_film_reference loaders."""
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
    xy, players, car = p['xy'], p['players'], p['carrier']
    if len(xy) < 20: continue
    grp = [q['group'] for q in players]
    ol = [i for i, g in enumerate(grp) if g == 'OL']
    if len(ol) < 5: continue
    cy = st.mean(xy[0][i][1] for i in ol)
    # pull direction: OL with the largest lateral move by 1.5 s
    k15 = min(15, len(xy) - 1)
    mv = [(xy[k15][i][1] - xy[0][i][1], i) for i in ol]
    big = max(mv, key=lambda t: abs(t[0]))
    if abs(big[0]) < 2: continue
    s = 1 if big[0] > 0 else -1
    cross = next((k for k in range(len(xy)) if xy[k][car][0] > 0), None)
    if cross is None: R[(p['src'], c, 'never')].append(1); continue
    y = (xy[cross][car][1] - cy) * s
    edge = max((xy[0][i][1] - cy) * s for i in ol)
    R[(p['src'], c, 'from centre')].append(y)
    R[(p['src'], c, 'from playside tackle')].append(y - edge)
    R[(p['src'], c, 't')].append(cross * .1)
for c in ('COUNTER', 'POWER'):
    for src in ('nfl', 'sim'):
        a = R[(src, c, 'from centre')]
        if not a: continue
        q = sorted(a); n = len(q)
        print(f"{c:8} {src}: n {n} | crossing from OL centre (+ play side) p25 {q[n//4]:+.2f} median {st.median(a):+.2f} p75 {q[3*n//4]:+.2f} | from play-side tackle {st.median(R[(src,c,'from playside tackle')]):+.2f} | cross t {st.median(R[(src,c,'t')]):.2f} | share crossing outside the tackle {sum(v > 0 for v in R[(src,c,'from playside tackle')])/n:.2f}")
