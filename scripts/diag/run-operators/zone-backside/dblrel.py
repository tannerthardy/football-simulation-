# Zone doubles: two adjacent OL both within 1.0 yd of the same front defender (snap depth 0-1.6) in the same frame, by 1.0 s.
# Release = first frame after the double forms where one member is > 1.5 yd from the man (that member is the climber).
# Per double: form time, release time (or none by 2.5 s/contact), side (man play side / backside of the ball), climber then touches a box backer
# (1.6-6.5 deep at the snap) by 2.5 s/contact and when.
import sys, collections, math, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
for path in sys.argv[1:]:
    R=collections.defaultdict(list); N=collections.Counter()
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        T=len(ol)
        if T<26: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1; by=car[0][1]
        order=sorted(range(5),key=lambda i:ol[0][i][1]); end=min(25,fc,T-1)
        LB=[j for j,d in enumerate(df[0]) if 1.6<d[0]<=6.5 and abs(d[1]-by)<=5]
        for j,d0 in enumerate(df[0]):
            if not (0<d0[0]<=1.6): continue
            form=None
            for t in range(0,min(11,end+1)):
                near=[i for i in range(5) if math.dist(ol[t][i],df[t][j])<=1.0]
                pair=[(a,b) for a in near for b in near if a<b and abs(order.index(a)-order.index(b))==1]
                if pair: form=(t,pair[0]); break
            if not form: continue
            t0,(a,b)=form; side='PS' if (d0[1]-by)*ps>=0 else 'BS'; k=(con,side); N[k]+=1; R[k+('form',)].append(t0/10)
            rel=next(((t,m) for t in range(t0+1,end+1) for m in (a,b) if math.dist(ol[t][m],df[t][j])>1.5),None)
            if rel is None: N[k+('stay',)]+=1; continue
            t1,m=rel; R[k+('rel',)].append(t1/10)
            tl=next((t for t in range(t1,end+1) if any(math.dist(ol[t][m],df[t][l])<=1.0 for l in LB)),None)
            if tl is not None: N[k+('lb',)]+=1; R[k+('lbt',)].append(tl/10)
    print('==',path.split('/')[-1])
    for con in ('IN','OU'):
        for side in ('PS','BS'):
            k=(con,side); n=N[k]
            if not n: continue
            q=lambda x: '/'.join(f"{v:.1f}" for v in st.quantiles(R[k+(x,)],n=4)) if len(R[k+(x,)])>3 else '-'
            print(f"  {con} {side} doubles n{n}: formed p25/50/75 {q('form')} | released {1-N[k+('stay',)]/n:.0%} at {q('rel')} | climber touches a backer {N[k+('lb',)]/n:.0%} at {q('lbt')}")
