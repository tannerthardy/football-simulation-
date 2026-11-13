# Uncovered backside tackle by front: end width outside him (outermost front man backside, 1.0-2.0 / 2.0-3.5 / >3.5 yd / none within 6),
# backer within 1.5 across (yes/no). Outcome: first touch by 2.0 s/contact (end / iDL / LB / none), up and across at 1.5 s, speed at 1.2 s.
import sys, collections, math, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
for path in sys.argv[1:]:
    R=collections.defaultdict(list); F=collections.Counter(); N=collections.Counter()
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        T=len(ol)
        if T<17: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        bt=min(range(5),key=lambda i:ol[0][i][1]*ps); o0=ol[0][bt]
        front=[j for j,d in enumerate(df[0]) if 0<d[0]<=1.6]
        if any(abs(df[0][j][1]-o0[1])<=1.0 for j in front): continue
        out=[j for j in front if (o0[1]-df[0][j][1])*ps>1.0 and (o0[1]-df[0][j][1])*ps<=6]
        e=max(out,key=lambda j:(o0[1]-df[0][j][1])*ps) if out else None
        w=(o0[1]-df[0][e][1])*ps if e is not None else 99
        wc='5-6 (1-2)' if w<=2 else '9 (2-3.5)' if w<=3.5 else 'wide' if w<99 else 'none'
        lbc='LB over' if any(1.6<d[0]<=6.5 and abs(d[1]-o0[1])<=1.5 for d in df[0]) else 'no LB'
        k=(con,wc,lbc); N[k]+=1
        end=min(20,fc,T-1)
        hit=next(((t,j) for t in range(end+1) for j in range(len(df[0])) if math.dist(ol[t][bt],df[t][j])<=1.0),None)
        cls='none' if hit is None else 'end' if hit[1]==e else 'front' if hit[1] in front else 'LB' if df[0][hit[1]][0]<=6.5 else 'DB'
        F[k+(cls,)]+=1
        t=min(15,T-1); R[k+('up',)].append(ol[t][bt][0]-o0[0]); R[k+('ac',)].append((ol[t][bt][1]-o0[1])*ps); R[k+('v',)].append(math.dist(ol[12][bt],ol[11][bt])*10)
    print('==',path.split('/')[-1])
    for k in sorted(N):
        if N[k]<8: continue
        m=lambda x: st.median(R[k+(x,)])
        print(f"  {k[0]} end {k[1]:10s} {k[2]:8s} n{N[k]:4d}: "+' '.join(f"{c} {F[k+(c,)]/N[k]:.0%}" for c in ('end','front','LB','DB','none'))+f" | 1.5 s up {m('up'):+.2f} across {m('ac'):+.2f} | v1.2 {m('v'):.1f}")
