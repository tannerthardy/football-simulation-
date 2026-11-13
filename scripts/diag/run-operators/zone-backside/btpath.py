# Uncovered backside tackle: up / across (play side +) from the snap and speed at 0.6/0.9/1.2/1.5 s; and the nearest box LB (within 1.5 across at
# the snap) distance to him at the same times.
import sys, collections, math, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
TS=(6,9,12,15)
for path in sys.argv[1:]:
    R=collections.defaultdict(list)
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        T=len(ol)
        if T<17: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        bt=min(range(5),key=lambda i:ol[0][i][1]*ps); o0=ol[0][bt]
        if any(0<d[0]<=1.6 and abs(d[1]-o0[1])<=1.0 for d in df[0]): continue
        lbs=[j for j,d in enumerate(df[0]) if 1.6<d[0]<=6.5 and abs(d[1]-o0[1])<=1.5]
        lj=min(lbs,key=lambda j:math.dist(df[0][j],o0)) if lbs else None
        for t in TS:
            o=ol[t][bt]; R[(con,t,'up')].append(o[0]-o0[0]); R[(con,t,'ac')].append((o[1]-o0[1])*ps)
            R[(con,t,'v')].append(math.dist(o,ol[t-1][bt])*10)
            if lj is not None: R[(con,t,'d')].append(math.dist(o,df[t][lj]))
        if lj is not None: R[(con,0,'d')].append(math.dist(o0,df[0][lj]))
    print('==',path.split('/')[-1])
    for con in ('IN','OU'):
        m=lambda t,k: st.median(R[(con,t,k)])
        print(f"  {con} n{len(R[(con,6,'up')])} LB n{len(R[(con,0,'d')])} d0 {m(0,'d'):.2f} | "+' | '.join(f"{t/10:.1f}s up {m(t,'up'):+.2f} across {m(t,'ac'):+.2f} v {m(t,'v'):.2f} dLB {m(t,'d'):.2f}" for t in TS))
