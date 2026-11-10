"""Rushers vs protectors on dropbacks, same code both sides. Rusher = defender who by 1.5 s (or the throw) is behind his snap
spot toward the QB by > 1.0 yd and within 3 yd of the line or behind it. Protector = offensive non-QB player who at 1.5 s is
behind the line (x < 0.3) within the OL span +- 3 yd (stay-in). Distribution of rushers - protectors, and free first pressure
(as freerush.py) by that margin. Dropbacks with the ball out before 1.5 s use the throw frame."""
import sys, os, json, gzip, math, collections as C
for path in sys.argv[1:]:
    op=gzip.open if path.endswith('.gz') else open; M=C.Counter(); F=C.Counter(); n=0; R=C.Counter(); P=C.Counter()
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
        n+=1; Pp=lambda i,f:(X[f][2*i],X[f][2*i+1]); k=min(15,end-1,len(X)-1)
        ys=sorted(Pp(o,0)[1] for o in OLi); lo,hi=ys[0]-3,ys[-1]+3
        rush=sum(1 for e in D if Pp(e,k)[0]<Pp(e,0)[0]-1.0 and Pp(e,k)[0]<3)
        prot=sum(1 for o in O if Pp(o,k)[0]<0.3 and lo<=Pp(o,k)[1]<=hi)
        m=max(-2,min(2,rush-prot)); M[m]+=1; R[rush]+=1; P[prot]+=1
        hit=None
        for f in range(3,end):
            dm,d=min((math.dist(Pp(e,f),Pp(q,f)),e) for e in D)
            if dm<=2.0: hit=(f,d); break
        if hit and min(math.dist(Pp(o,hit[0]),Pp(hit[1],hit[0])) for o in O)>1.2: F[m]+=1
    print(f"== {os.path.basename(path)}: {n} dropbacks | rushers {dict(sorted(R.items()))} | protectors {dict(sorted(P.items()))}")
    for m in sorted(M): print(f"   rushers - protectors {m:+d}: {M[m]/n:5.1%} of dropbacks | free first pressure on them {F[m]/max(1,M[m]):5.1%}")
