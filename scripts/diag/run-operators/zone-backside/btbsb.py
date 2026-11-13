# Uncovered backside tackle: the backside backer = box defender (1.6-6.5 deep, |y-ball|<=5) backside of the ball nearest the tackle at the snap.
# Share where the tackle touches him (<=1.0 yd) by contact/2.0 s, touch time p50, snap distance, the backer's play-side move by 1.2 s,
# and whether the backer is touched by any offensive player by then.
import sys, collections, math, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
for path in sys.argv[1:]:
    R=collections.defaultdict(list); N=collections.Counter(); C=collections.Counter()
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        T=len(ol)
        if T<21: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        bt=min(range(5),key=lambda i:ol[0][i][1]*ps); o0=ol[0][bt]; by=car[0][1]
        if any(0<d[0]<=1.6 and abs(d[1]-o0[1])<=1.0 for d in df[0]): continue
        bb=[j for j,d in enumerate(df[0]) if 1.6<d[0]<=6.5 and abs(d[1]-by)<=5 and (d[1]-by)*ps<0]
        if not bb: N[(con,'no backer')]+=1; continue
        j=min(bb,key=lambda j:math.dist(df[0][j],o0)); N[con]+=1; end=min(20,fc,T-1)
        R[(con,'d0')].append(math.dist(df[0][j],o0)); R[(con,'flow')].append((df[12][j][1]-df[0][j][1])*ps)
        t=next((k for k in range(end+1) if math.dist(ol[k][bt],df[k][j])<=1.0),None)
        if t is not None: C[(con,'bt')]+=1; R[(con,'t')].append(t/10)
        if any(math.dist(o,df[k][j])<=1.0 for k in range(end+1) for o in ol[k]+ot[k]): C[(con,'any')]+=1
    print('==',path.split('/')[-1])
    for con in ('IN','OU'):
        n=N[con]; m=lambda k: st.median(R[(con,k)]) if R[(con,k)] else float('nan')
        print(f"  {con} n{n} (no backside backer {N[(con,'no backer')]}): snap dist {m('d0'):.2f} | backer flow by 1.2 s {m('flow'):+.2f} | tackle touches him {C[(con,'bt')]/n:.0%} (t p50 {m('t'):.1f}) | anyone touches him {C[(con,'any')]/n:.0%}")
