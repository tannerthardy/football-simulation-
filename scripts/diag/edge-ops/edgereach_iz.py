import sys, collections, statistics as st, math
exec(open(sys.argv[0].replace('edgereach_iz.py','lbarr.py')).read().split("\nfor path in sys.argv[1:]:")[0])
for path in sys.argv[1:]:
    R=collections.defaultdict(list)
    for con, ol, ot, df, car, fc, sh in plays(path):
        if con!='IN' or len(car)<20 or fc<15+sh: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        pst = max(o[1]*ps for o in ol[0])
        cand=[j for j,d in enumerate(df[0]) if abs(d[0])<=1.6 and d[1]*ps>pst-.3 and d[1]*ps<pst+6]
        if not cand: continue
        e=min(cand,key=lambda j: df[0][j][1]*ps)
        for t in (10,15):
            f=t+sh; d=df[f][e]; offs=ol[f]+ot[f]
            b=min(offs,key=lambda o: math.dist(o,d)); near=math.dist(b,d)<=1.5
            R[(t,'blocked')].append(near); R[(t,'reached')].append(near and (b[1]-d[1])*ps>0.2)
            R[(t,'flow')].append((d[1]*ps)-(df[0][e][1]*ps)); R[(t,'pen')].append(d[0])
    print('==',path.split('/')[-1])
    for t in (10,15):
        print(f"  t{t/10}s n{len(R[(t,'blocked')])} edge man blocked {100*st.mean(R[(t,'blocked')]):.0f}%  reached (blocker play side of him) {100*st.mean(R[(t,'reached')]):.0f}%  his flow {st.median(R[(t,'flow')]):+.2f}  depth {st.median(R[(t,'pen')]):+.2f}")
