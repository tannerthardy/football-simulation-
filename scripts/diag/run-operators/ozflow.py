"""OZ engaged lateral carry, timed from each lineman's own start (Integration / Run Game, 2026-11-10). Same code on NFL
tracking and sim zone dumps (olturn.py loader; frame 0 = the tagged snap, unshifted, as Defense's onset rule).

Interior DL: within 1.6 yd of the line at the snap, laterally between the two tackles. Play side = the sign of the OL's
mean lateral motion over 1.0 s (as trench.py). Flow = lateral displacement toward the play side.
- absolute: flow at 1.0 / 1.5 / 2.0 s after the snap (Run Game's measure);
- onset: each DL's own start, the first frame (credited to the step's end) his speed over that 0.1 s step exceeds 0.3 yd/s
  (Defense's rule); flow from the snap at onset + 0.5 / 1.0 / 1.5 s, and the OL's onset (>= 3 of 5 over 0.3 yd/s);
- engaged: an OL within 1.2 yd of him at 1.0 s; their flow and the rate from 1.0 to 1.5 s.
usage: python3 -I ozflow.py <nfl.jsonl.gz | sim zone dump with off> [...]"""
import sys, os, math, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'olturn.py')).read().split("\nfor path in sys.argv[1:]:")[0]
exec(_src)


def q(v, f=.5):
    v = sorted(x for x in v if x is not None)
    return v[int(f * (len(v) - 1))] if v else float('nan')


for path in sys.argv[1:]:
    rows = []
    for con, ol, df in plays(path):
        if con != 'OU' or len(ol) < 26:
            continue
        ps = 1 if sum(ol[10][i][1] - ol[0][i][1] for i in range(5)) >= 0 else -1
        ys = sorted(o[1] for o in ol[0]); lo, hi = ys[0], ys[-1]
        sp = lambda P, f: math.dist(P[f], P[f-1]) / .1
        olon = next((f for f in range(1, 12) if sum(sp([o[i] for o in ol], f) > 0.3 for i in range(5)) >= 3), None)
        for j in range(len(df[0])):
            if abs(df[0][j][0]) > 1.6 or not (lo <= df[0][j][1] <= hi):
                continue
            P = [d[j] for d in df]
            on = next((f for f in range(1, 12) if sp(P, f) > 0.3), None)
            flow = lambda f: (P[f][1] - P[0][1]) * ps if f < len(P) else None
            eng = any(math.dist(o, P[10]) <= 1.2 for o in ol[10])
            rows.append(dict(f10=flow(10), f15=flow(15), f20=flow(20), on=on / 10 if on else None, olon=olon / 10 if olon else None,
                             o5=flow(on + 5) if on else None, o10=flow(on + 10) if on else None, o15=flow(on + 15) if on else None,
                             eng=eng, rate=(flow(15) - flow(10)) / .5 if flow(15) is not None else None))
    print(f"== {os.path.basename(path)}: OZ interior DL, n {len(rows)}")
    for lab, R in (('all', rows), ('engaged at 1.0 s', [r for r in rows if r['eng']]), ('not engaged', [r for r in rows if not r['eng']])):
        m = lambda k: q([r[k] for r in R])
        print(f"   {lab:17} n {len(R):4} | absolute flow 1.0 / 1.5 / 2.0 s {m('f10'):.2f} / {m('f15'):.2f} / {m('f20'):.2f} yd, rate 1.0-1.5 s {m('rate'):.2f} yd/s"
              f" | onset {m('on'):.1f} s (OL {m('olon'):.1f}) | flow at onset + 0.5 / 1.0 / 1.5 s {m('o5'):.2f} / {m('o10'):.2f} / {m('o15'):.2f}")
