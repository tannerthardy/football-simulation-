# Box LBs (snap depth 1.6-6.5, |y-ball|<=5) blocked per run (an OL / other offensive body within 1.0 yd) at fixed times, by blocker group.
# Also the time of each LB's first OL touch (p25/50/75 among touched) and share never touched by 3.0 s or contact.
import sys, collections, math, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
TS=(6,9,12,15,20)
for path in sys.argv[1:]:
    C=collections.Counter(); N=collections.Counter(); FT=collections.defaultdict(list); NT=collections.Counter(); NL=collections.Counter()
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        T=len(ol)
        if T<21: continue
        by=car[0][1]; N[con]+=1
        for j,d0 in enumerate(df[0]):
            if abs(d0[1]-by)>5 or not (1.6<d0[0]<=6.5): continue
            NL[con]+=1
            for t in TS:
                d=df[t][j]
                if min(math.dist(o,d) for o in ol[t])<=1.0: C[(con,t,'OL')]+=1
                elif ot[t] and min(math.dist(o,d) for o in ot[t])<=1.0: C[(con,t,'oth')]+=1
            ft=next((t for t in range(min(T,31,fc+1)) if min(math.dist(o,df[t][j]) for o in ol[t])<=1.0),None)
            if ft is None: NT[con]+=1
            else: FT[con].append(ft/10)
    print('==',path.split('/')[-1])
    for con in ('IN','OU'):
        n=N[con]; q=st.quantiles(FT[con],n=4)
        print(f"  {con} runs {n} LBs/run {NL[con]/n:.2f} | blocked by OL per run at " + ' '.join(f"{t/10:.1f}s {C[(con,t,'OL')]/n:.2f}" for t in TS) + " | by other " + ' '.join(f"{C[(con,t,'oth')]/n:.2f}" for t in TS) + f" | first OL touch p25/50/75 {q[0]:.1f}/{q[1]:.1f}/{q[2]:.1f} s, none by contact/3s {NT[con]/NL[con]:.0%}")
