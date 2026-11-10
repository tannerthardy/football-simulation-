# IZ/OZ crowd: box defenders (snap x 0-1.6 'DL', 1.6-6.5 'LB', |y-ball|<=5). At the handoff and first contact: lateral offset
# from the runner (play-side +), lateral displacement since the snap (play-side +), blocked (an offensive body within 1.0 yd),
# and the share within 2 yd of the runner. For blocked DL at contact: the blocker's own play-side move vs the DL's.
import sys, collections, math, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
for path in sys.argv[1:]:
    R=collections.defaultdict(list); N=collections.Counter()
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        T=len(ol)
        if T<12 or fc>=T or hf>=T: continue
        ps = 1 if sum(ol[min(10,T-1)][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        by=car[0][1]; N[con]+=1
        offs=lambda t: ol[t]+ot[t]
        for j,d0 in enumerate(df[0]):
            if abs(d0[1]-by)>5: continue
            role='DL' if 0<d0[0]<=1.6 else 'LB' if 1.6<d0[0]<=6.5 else None
            if not role: continue
            for tag,t in (('ho',hf),('fc',fc)):
                d=df[t][j]; c=car[t]
                O=offs(t); bi=min(range(len(O)),key=lambda i:math.dist(O[i],d)); bl=O[bi]; blk=math.dist(bl,d)<=1.0
                k=(con,role,tag)
                R[k+('lat',)].append((d[1]-c[1])*ps); R[k+('mv',)].append((d[1]-d0[1])*ps); R[k+('blk',)].append(blk)
                R[k+('dep',)].append(d[0]-c[0])
                near=math.dist(d,c)<=2.0; R[k+('n2',)].append(near); R[k+('n2b',)].append(near and blk)
                if blk and tag=='fc':
                    R[k+('bmv',)].append((bl[1]-offs(0)[bi][1])*ps)
    print('==',path.split('/')[-1], dict(N))
    for con in ('IN','OU'):
        for role in ('DL','LB'):
            for tag in ('ho','fc'):
                k=(con,role,tag); L=R[k+('lat',)]
                if not L: continue
                n=N[con]; m=lambda x: st.median(R[k+(x,)]) if R[k+(x,)] else float('nan')
                blk=R[k+('blk',)]; mvb=[v for v,b in zip(R[k+('mv',)],blk) if b]; mvf=[v for v,b in zip(R[k+('mv',)],blk) if not b]
                print(f"  {con} {role} {tag}: per run {len(L)/n:.2f} blocked {sum(blk)/n:.2f} | within 2 yd {sum(R[k+('n2',)])/n:.2f} (blocked {sum(R[k+('n2b',)])/n:.2f}) | lat to runner p50 {m('lat'):+.2f} |lat| p50 {st.median(map(abs,L)):.2f} depth {m('dep'):+.2f} | moved ps blocked {st.median(mvb) if mvb else float('nan'):+.2f} free {st.median(mvf) if mvf else float('nan'):+.2f}" + (f" | blocker moved {m('bmv'):+.2f}" if tag=='fc' else ''))
