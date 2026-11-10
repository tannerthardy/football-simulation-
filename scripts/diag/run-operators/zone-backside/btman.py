# Uncovered backside tackle (front man 2-3.5 yd outside him, as btfront's '9' row): distance to the backside guard's man (nearest front
# defender within 1.0 yd across of the backside guard at the snap) at 0/0.6/0.9/1.2/1.5 s; share within 1.0 yd by 1.2 s and by 1.5 s.
import sys, collections, math, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
for path in sys.argv[1:]:
    R=collections.defaultdict(list); W=collections.Counter(); N=collections.Counter()
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        T=len(ol)
        if T<16: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        order=sorted(range(5),key=lambda i:ol[0][i][1]*ps); bt,bg=order[0],order[1]; o0=ol[0][bt]
        front=[j for j,d in enumerate(df[0]) if 0<d[0]<=1.6]
        if any(abs(df[0][j][1]-o0[1])<=1.0 for j in front): continue
        gm=[j for j in front if abs(df[0][j][1]-ol[0][bg][1])<=1.0]
        if not gm: continue
        j=min(gm,key=lambda j:abs(df[0][j][1]-ol[0][bg][1])); N[con]+=1
        for t in (0,6,9,12,15): R[(con,t)].append(math.dist(ol[t][bt],df[t][j]))
        for t in (12,15):
            if any(math.dist(ol[k][bt],df[k][j])<=1.0 for k in range(t+1)): W[(con,t)]+=1
    print('==',path.split('/')[-1])
    for con in ('IN','OU'):
        n=N[con]; print(f"  {con} n{n}: dist to guard's man 0/.6/.9/1.2/1.5 s "+' / '.join(f"{st.median(R[(con,t)]):.2f}" for t in (0,6,9,12,15))+f" | within 1.0 yd by 1.2 s {W[(con,12)]/n:.0%}, by 1.5 s {W[(con,15)]/n:.0%}")
