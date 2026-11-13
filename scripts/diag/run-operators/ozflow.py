"""OZ engaged lateral carry, timed from each lineman's own start (Integration / Run Game, 2026-11-10). Same code on NFL
tracking and sim zone dumps (olturn.py loader; frame 0 = the tagged snap, unshifted, as Defense's onset rule).

Interior DL: within 1.6 yd of the line at the snap, laterally between the two tackles. Play side = the sign of the OL's
mean lateral motion over 1.0 s (as trench.py). Flow = lateral displacement toward the play side.
- absolute: flow at 1.0 / 1.5 / 2.0 s after the snap (Run Game's measure);
- onset: each DL's own start, the first frame (credited to the step's end) his speed over that 0.1 s step exceeds 0.3 yd/s
  (Defense's rule); flow from the snap at onset + 0.5 / 1.0 / 1.5 s, and the OL's onset (>= 3 of 5 over 0.3 yd/s);
- engaged: an OL within 1.2 yd of him at 1.0 s; their flow and the rate from 1.0 to 1.5 s.
Displacement from the snap spot, no threshold (Run Game's rule: a 0.3 yd/s onset fires at 0.1 s on NFL jitter):
- OL (all five): lateral toward the play and total displacement at 0.2 / 0.3 / 0.5 / 1.0 s;
- interior DL: lateral toward the play at 0.2 / 0.3 / 0.5 s, and the time he first reaches 0.25 / 0.5 / 1.0 yd;
- split: flow gained before his first OL contact (an OL within 1.2 yd) and the rate over the 0.5 s after it.
usage: python3 -I ozflow.py <nfl.jsonl.gz | sim zone dump with off> [...]"""
import sys, os, math, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'olturn.py')).read().split("\nfor path in sys.argv[1:]:")[0]
exec(_src)


def q(v, f=.5):
    v = sorted(x for x in v if x is not None)
    return v[int(f * (len(v) - 1))] if v else float('nan')


for path in sys.argv[1:]:
    rows = []; olrows = []
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
            reach = lambda a: next((f / 10 for f in range(1, min(len(P), 31)) if flow(f) is not None and flow(f) >= a), None)
            c0 = next((f for f in range(1, min(len(P), 31)) if any(math.dist(o[k], P[f]) <= 1.2 for o in [ol[f]] for k in range(5))), None)
            rows.append(dict(f10=flow(10), f15=flow(15), f20=flow(20), on=on / 10 if on else None, olon=olon / 10 if olon else None,
                             o5=flow(on + 5) if on else None, o10=flow(on + 10) if on else None, o15=flow(on + 15) if on else None,
                             eng=eng, rate=(flow(15) - flow(10)) / .5 if flow(15) is not None else None,
                             d2=flow(2), d3=flow(3), d5=flow(5), r25=reach(.25), r50=reach(.5), r100=reach(1.0),
                             c0=c0 / 10 if c0 else None, pre=flow(c0) if c0 else None,
                             post=(flow(c0 + 5) - flow(c0)) / .5 if c0 and flow(c0 + 5) is not None else None))
        for i in range(5):
            O = [o[i] for o in ol]
            lat = lambda f: (O[f][1] - O[0][1]) * ps; tot = lambda f: math.dist(O[f], O[0])
            olrows.append(dict(l2=lat(2), l3=lat(3), l5=lat(5), l10=lat(10), t2=tot(2), t3=tot(3), t5=tot(5), t10=tot(10)))
    print(f"== {os.path.basename(path)}: OZ interior DL, n {len(rows)}")
    for lab, R in (('all', rows), ('engaged at 1.0 s', [r for r in rows if r['eng']]), ('not engaged', [r for r in rows if not r['eng']])):
        m = lambda k: q([r[k] for r in R])
        print(f"   {lab:17} n {len(R):4} | absolute flow 1.0 / 1.5 / 2.0 s {m('f10'):.2f} / {m('f15'):.2f} / {m('f20'):.2f} yd, rate 1.0-1.5 s {m('rate'):.2f} yd/s"
              f" | onset {m('on'):.1f} s (OL {m('olon'):.1f}) | flow at onset + 0.5 / 1.0 / 1.5 s {m('o5'):.2f} / {m('o10'):.2f} / {m('o15'):.2f}")
        print(f"   {'':17}        no threshold: DL lateral at 0.2 / 0.3 / 0.5 s {m('d2'):.2f} / {m('d3'):.2f} / {m('d5'):.2f} yd; reaches 0.25 / 0.5 / 1.0 yd at {m('r25'):.1f} / {m('r50'):.1f} / {m('r100'):.1f} s"
              f" | first OL contact {m('c0'):.1f} s, flow before it {m('pre'):.2f} yd, rate over the 0.5 s after it {m('post'):.2f} yd/s")
    mo = lambda k: q([r[k] for r in olrows])
    print(f"   OL (n {len(olrows)}): lateral toward the play at 0.2 / 0.3 / 0.5 / 1.0 s {mo('l2'):.2f} / {mo('l3'):.2f} / {mo('l5'):.2f} / {mo('l10'):.2f} yd; total {mo('t2'):.2f} / {mo('t3'):.2f} / {mo('t5'):.2f} / {mo('t10'):.2f}")
