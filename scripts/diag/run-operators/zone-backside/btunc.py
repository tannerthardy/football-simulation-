# Uncovered backside tackle (no front defender 0-1.6 deep within 1.0 yd laterally): first defender he touches (<=1.0 yd) by 2.0 s/contact,
# classed by that defender's snap spot: edge (0-1.6 deep, outside him), interior DL (inside him), LB (1.6-6.5), DB, none.
# Plus: is the outermost backside front defender touched by anyone offensive by 1.5 s (i.e. left unblocked as a read)?
import sys, collections, math
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
for path in sys.argv[1:]:
    F=collections.Counter(); N=collections.Counter(); E=collections.Counter()
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        T=len(ol)
        if T<21: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        bt=min(range(5),key=lambda i:ol[0][i][1]*ps); y0=ol[0][bt][1]
        front=[j for j,d in enumerate(df[0]) if 0<d[0]<=1.6]
        if any(abs(df[0][j][1]-y0)<=1.0 for j in front): continue
        N[con]+=1; end=min(20,fc,T-1)
        hit=next(((t,j) for t in range(end+1) for j in range(len(df[0])) if math.dist(ol[t][bt],df[t][j])<=1.0),None)
        if hit is None: F[(con,'none')]+=1
        else:
            d=df[0][hit[1]]; out=(d[1]-y0)*ps<0
            F[(con,'edge' if 0<d[0]<=1.6 and out else 'iDL' if 0<d[0]<=1.6 else 'LB' if d[0]<=6.5 else 'DB')]+=1
        bf=[j for j in front if (df[0][j][1]-y0)*ps<0]
        if bf:
            e=min(bf,key=lambda j:df[0][j][1]*ps)
            if not any(math.dist(o,df[t][e])<=1.0 for t in range(min(16,T)) for o in ol[t]+ot[t]): E[con]+=1
    print('==',path.split('/')[-1])
    for con in ('IN','OU'):
        n=N[con]; print(f"  {con} uncovered BT n{n}: first touch "+' '.join(f"{k} {F[(con,k)]/n:.0%}" for k in ('edge','iDL','LB','DB','none'))+f" | backside end untouched by 1.5 s {E[con]/n:.0%}")
