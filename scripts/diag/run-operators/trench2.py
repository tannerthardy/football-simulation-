"""Zone trench from the 0.5 s position: DL (|x|<=1.6 at snap, within 4 yd lateral of OL centre).
Class at 0.5 s: solo = exactly one OL within 1.2 yd; double = two or more; free = none.
Reports DL depth from the snap at 0.5/1.0/2.0 s (+ = into the backfield), and the share
driven back >= 0.5 yd from the 0.5 s position by 2.0 s, and from the snap. NFL shifted 0.1 s.
Solo pairs also report how far the line from the OL to his DL turns from 0.5 to 1.5 s (deg, median and p75) and
their centre separation at 0.5 and 1.5 s: whether engaged pairs rotate around each other (effective-mass step 2)."""
import sys, json, gzip, math, statistics as st, collections
exec(open(__file__.replace("trench2.py","olturn.py")).read().split("\nfor path in sys.argv[1:]:")[0])
for path in sys.argv[1:]:
    sh = 1 if path.endswith(".gz") else 0
    R = collections.defaultdict(list)
    for con, ol, df in plays(path):
        if len(ol) < 21 + sh: continue
        cy = sum(o[1] for o in ol[0]) / 5
        f5, f10, f20 = 5 - sh, 10 - sh, 20 - sh
        for j, d in enumerate(df[0]):
            if abs(d[0]) > 1.6 or abs(d[1] - cy) > 4: continue
            k = sum(math.dist(ol[f5][i], df[f5][j]) <= 1.2 for i in range(5))
            c = 'free' if k == 0 else 'solo' if k == 1 else 'dbl'
            dep = lambda f: -(df[f][j][0] - df[0][j][0])
            if c == 'solo' and len(ol) > 15 - sh:
                i = min(range(5), key=lambda i: math.dist(ol[f5][i], df[f5][j])); f15 = 15 - sh
                a0 = math.atan2(df[f5][j][1] - ol[f5][i][1], df[f5][j][0] - ol[f5][i][0])
                a1 = math.atan2(df[f15][j][1] - ol[f15][i][1], df[f15][j][0] - ol[f15][i][0])
                R[('solo','turn')].append(abs(math.degrees(math.atan2(math.sin(a1 - a0), math.cos(a1 - a0)))))
                R[('solo','s5')].append(math.dist(ol[f5][i], df[f5][j])); R[('solo','s15')].append(math.dist(ol[f15][i], df[f15][j]))
            for key in (c, 'all'):
                R[(key,'n')].append(1)
                R[(key,'d5')].append(dep(f5)); R[(key,'d10')].append(dep(f10)); R[(key,'d20')].append(dep(f20))
                R[(key,'b5')].append(dep(f20) - dep(f5) <= -0.5); R[(key,'b0')].append(dep(f20) <= -0.5)
    print("==", path.split("/")[-1])
    for c in ('all','solo','dbl','free'):
        m = lambda k: st.mean(R[(c,k)]) if R[(c,k)] else float('nan')
        print(f"  {c:4s} n{len(R[(c,'n')]):5d}  DL depth 0.5 {m('d5'):+.2f}  1.0 {m('d10'):+.2f}  2.0 {m('d20'):+.2f} | back>=.5 from 0.5s {100*m('b5'):.0f}%  from snap {100*m('b0'):.0f}%")
    if R[('solo','turn')]:
        tq = sorted(R[('solo','turn')])
        print(f"  solo pair, OL -> DL line turned 0.5 -> 1.5 s: median {st.median(tq):.0f} deg, p75 {tq[int(0.75*(len(tq)-1))]:.0f} deg | separation {st.median(R[('solo','s5')]):.2f} -> {st.median(R[('solo','s15')]):.2f} yd (n {len(tq)})")
