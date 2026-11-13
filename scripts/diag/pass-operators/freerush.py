"""Free first pressure on dropbacks, by who and why. Same code on NFL (nfl-plays.jsonl.gz, pass) and sim pass-frames records.
First pressure = first frame from 0.3 s, before the throw, with a defender within 2.0 yd of the QB; free = no offensive player
(other than the QB) within 1.2 yd of him then. For free ones: rusher group (DL/LB/DB), snap spot (on the line <= 1.6 yd
deep, or off the ball; inside the OL span or outside it), numbers at 1.0 s (rushers = defenders behind the line, blockers =
offensive non-QB players behind the line within 4 yd outside the OL span), and time."""
import sys, os, json, gzip, math, statistics as st, collections as C
def grp(q):
    g=q['group']
    if g in ('OL','DL','QB','LB','DB','WR','TE','RB'): return g
    s=g.split('_')[0]
    if s.startswith('LB') or s in ('MLB','OLB','ILB','MIKE','WILL','SAM'): return 'LB'
    if s in ('CB','S','FS','SS','NB','DB','NICKEL','DIME'): return 'DB'
    if s in ('DE','DT','NT','EDGE'): return 'DL'
    return g
for path in sys.argv[1:]:
    op=gzip.open if path.endswith('.gz') else open
    n=0; F=C.Counter(); T=C.defaultdict(list); G=C.Counter()
    for l in op(path,'rt'):
        p=json.loads(l)
        if p.get('kind')!='pass': continue
        pl,X=p['players'],p['xy']; Q=[i for i,q in enumerate(pl) if q['group']=='QB']
        if len(Q)!=1: continue
        q=Q[0]; O=[i for i,a in enumerate(pl) if a['side']=='O' and i!=q]; D=[i for i,a in enumerate(pl) if a['side']=='D']
        OLi=[i for i in O if pl[i]['group']=='OL']
        if len(OLi)<5: continue
        thr=p['events'].get('pass_forward'); end=len(X) if thr is None else min(len(X),int(round(thr/0.1)))
        if end<8: continue
        n+=1; P=lambda i,f:(X[f][2*i],X[f][2*i+1])
        hit=None
        for f in range(3,end):
            dm,d=min((math.dist(P(e,f),P(q,f)),e) for e in D)
            if dm<=2.0: hit=(f,d); break
        if not hit: continue
        f,d=hit
        if min(math.dist(P(o,f),P(d,f)) for o in O)<=1.2: G['blocked']+=1; continue
        F['free']+=1
        ys=sorted(P(o,0)[1] for o in OLi); lo,hi=ys[0],ys[-1]; x0,y0=P(d,0)
        spot=('line' if x0<=1.6 else 'off')+'/'+('inside' if lo-0.3<=y0<=hi+0.3 else 'outside')
        g=grp(pl[d])
        k1=min(10,len(X)-1)
        rush=sum(1 for e in D if P(e,k1)[0]<1.0 and P(e,k1)[0]<P(e,0)[0]-0.3)
        blk=sum(1 for o in O if P(o,k1)[0]<0 and lo-4<=P(o,k1)[1]<=hi+4)
        num='outnumbered' if rush>blk else 'even or more blockers'
        F[(g,spot)]+=1; F[('tm', '<2.0 s' if f<20 else '2.0-2.9 s' if f<30 else '3.0+ s')]+=1; F[('num',num)]+=1; T['t'].append(f/10); T[(g,spot)].append(f/10)
    print(f"== {os.path.basename(path)}: {n} dropbacks; free first pressure {F['free']/n:.1%} ({F['free']}); blocked first pressure {G['blocked']/n:.1%}")
    for k,v in sorted(((k,v) for k,v in F.items() if isinstance(k,tuple) and k[0] not in ('num','tm')),key=lambda x:-x[1]):
        print(f"   {k[0]:3s} {k[1]:13s} {v/n*100:5.1f} per 100 dropbacks  (t p50 {st.median(T[k]):.1f} s)")
    for k,v in F.items():
        if isinstance(k,tuple) and k[0] in ('num','tm'): print(f"   numbers at 1.0 s: {k[1]:22s} {v/n*100:5.1f} per 100")
