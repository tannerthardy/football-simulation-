"""Zone trench: DL (|x|<=1.6 at snap, within 4 yd lateral of OL centre) and OL displacement from snap, by concept.
Depth + = into offense backfield (toward -x). Lateral + = toward play (play side = mean OL lateral motion over 1 s).
Doubles: two OL within 1.4 yd of the DL at 0.6 s. NFL time shifted -0.1 s (frame t-1)."""
import sys, json, gzip, math, statistics as st, collections
exec(open(__file__.replace("trench.py","olturn.py")).read().split("\nfor path in sys.argv[1:]:")[0])
T = (10, 15, 20)
for path in sys.argv[1:]:
    nfl = path.endswith(".gz"); sh = 1 if nfl else 0
    R = collections.defaultdict(list); n = collections.Counter()
    for con, ol, df in plays(path):
        if len(ol) < 22: continue
        n[con] += 1
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        cy = sum(o[1] for o in ol[0]) / 5
        dl = [j for j, d in enumerate(df[0]) if abs(d[0]) <= 1.6 and abs(d[1]-cy) <= 4]
        for t in T:
            f = t - sh
            if f >= len(ol): continue
            for i in range(5):
                R[(con,'OLdep',t)].append(-(ol[f][i][0]-ol[0][i][0])); R[(con,'OLlat',t)].append((ol[f][i][1]-ol[0][i][1])*ps)
            for j in dl:
                dd = -(df[f][j][0]-df[0][j][0])
                R[(con,'DLdep',t)].append(dd); R[(con,'DLlat',t)].append((df[f][j][1]-df[0][j][1])*ps)
                R[(con,'back',t)].append(dd <= -0.5)
        f6 = 6 - sh
        for j in dl:
            near = [i for i in range(5) if math.dist(ol[f6][i], df[f6][j]) <= 1.4]
            if len(near) >= 2:
                for t in T:
                    f = t - sh
                    if f >= len(ol): continue
                    dd = -(df[f][j][0]-df[0][j][0]); R[(con,'dbl',t)].append(dd); R[(con,'dblback',t)].append(dd <= -0.5)
                R[(con,'ndbl',0)].append(1)
    print("==", path.split("/")[-1])
    for con in ("OU", "IN"):
        m = lambda k,t: st.mean(R[(con,k,t)]) if R[(con,k,t)] else float('nan')
        print(f" {con} n{n[con]} dbl/play {len(R[(con,'ndbl',0)])/max(1,n[con]):.2f}")
        for t in T:
            print(f"   t{t/10:.1f} OL dep {m('OLdep',t):+.2f} lat {m('OLlat',t):+.2f} | DL dep {m('DLdep',t):+.2f} lat {m('DLlat',t):+.2f} back>=.5 {100*m('back',t):.0f}% | dbl DL dep {m('dbl',t):+.2f} back {100*m('dblback',t):.0f}%")
