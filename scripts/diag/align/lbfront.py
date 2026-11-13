"""Outside-zone front-seven checks for LB_RUN_THROUGH and EDGE_WIDTH, one operator for
the NFL run-film archive (.gz) and the sim dump (scripts/diag/_runfilm.mts). x is upfield
from the LOS (defense positive), frames 0.1 s from the snap; NFL shifted 0.1 s (as olturn.py).
Play side = the carrier's lateral direction over the 1.0 s after the handoff (a hindsight label).
Box backer: LB at the snap 2.5-7 yd deep and within 4.5 yd of the ball.
  at/behind the line by 2.0 s: x <= 0 at 2.0 s, share of box-backer reps by side.
  backfield hit: first defender within 1.0 yd of the carrier while the carrier is behind the LOS
    and within 3.5 yd of the ball laterally; share of snaps whose hitter is a box backer, by side.
Edge: play-side end man, the widest DL/LB within 1.5 yd of the LOS at the snap on the play side;
  his blocker-in-front is the nearest OL/TE at the snap. At 1.0 s: lateral offset of the edge
  outside that man (yd, + = outside), p50, and the share outside his outside shoulder (> +0.3)."""
import sys, json, gzip, statistics as st
def plays(path):
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt') as f:
        for line in f:
            p = json.loads(line)
            if p.get('kind') == 'run' and p['cell']['concept'] == 'OUTSIDE ZONE': yield p
def q(v, a): v = sorted(v); return v[int(a * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    sh = 1 if path.endswith('.gz') else 0
    reps = {1: [], -1: []}; hits = {'n': 0, 1: 0, -1: 0, 'bf': 0}; edge = []
    for p in plays(path):
        xy, pl, by = p['xy'], p['players'], p['ball_y']
        P = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
        ho = p['events'].get('handoff'); c = p['carrier']
        if ho is None or c is None: continue
        f0, f1 = int(round(ho / .1)) + sh, int(round((ho + 1) / .1)) + sh
        if f1 >= len(xy) or 20 + sh >= len(xy): continue
        dy = P(f1, c)[1] - P(f0, c)[1]
        if abs(dy) < .5: continue
        side = 1 if dy > 0 else -1
        D = [i for i, x in enumerate(pl) if x['side'] == 'D']
        for i in D:
            x, y = P(sh, i)
            if pl[i]['group'] == 'LB' and 2.5 <= x <= 7 and abs(y - by) <= 4.5:
                s = 1 if (y - by) * side >= 0 else -1
                reps[s].append(P(20 + sh, i)[0] <= 0)
        hits['n'] += 1
        for f in range(sh, len(xy)):
            cx, cy = P(f, c)
            if cx >= 0: break
            near = [i for i in D if ((P(f, i)[0] - cx) ** 2 + (P(f, i)[1] - cy) ** 2) ** .5 < 1.0]
            if near:
                if abs(cy - by) <= 3.5:
                    hits['bf'] += 1
                    i = near[0]; x, y = P(sh, i)
                    if pl[i]['group'] == 'LB' and 2.5 <= x <= 7 and abs(y - by) <= 4.5: hits[1 if (y - by) * side >= 0 else -1] += 1
                break
        line = [i for i in D if pl[i]['group'] in ('DL', 'LB') and P(sh, i)[0] <= 1.5 and (P(sh, i)[1] - by) * side > 0]
        if line and 10 + sh < len(xy):
            e = max(line, key=lambda i: (P(sh, i)[1] - by) * side)
            O = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] in ('OL', 'TE')]
            m = min(O, key=lambda i: abs(P(sh, i)[1] - P(sh, e)[1]) + abs(P(sh, i)[0] - P(sh, e)[0]))
            edge.append((P(10 + sh, e)[1] - P(10 + sh, m)[1]) * side)
    print(f"== {path.split('/')[-1]}  OZ snaps {hits['n']}")
    for s, lab in ((1, 'play'), (-1, 'back')):
        r = reps[s]; print(f"  box LB at/behind LOS by 2.0 s, {lab} side: {100*sum(r)/max(1,len(r)):.1f}% (reps {len(r)}) | backfield hits by {lab}-side box LB: {100*hits[s]/max(1,hits['n']):.1f}% of snaps, {100*hits[s]/max(1,hits['bf']):.1f}% of the {hits['bf']} backfield hits inside")
    print(f"  play-side edge vs man in front at 1.0 s: offset p25/p50/p75 {q(edge,.25):+.2f}/{q(edge,.5):+.2f}/{q(edge,.75):+.2f} yd, outside his outside shoulder (>+0.3) {100*sum(x > .3 for x in edge)/max(1,len(edge)):.0f}% (n {len(edge)})")
