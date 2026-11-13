#!/usr/bin/env python3
"""First carrier contact on runs: who makes it, whether a DL contact comes beside a
blocker, his lateral move to it, the carrier depth then and yards after it.
Same code on NFL and sim common-format files (restage.ts arms).

    python3 -I scripts/diag/dl_contact.py LABEL=plays.jsonl.gz [...]
"""
import gzip,json,math,collections,statistics as st,sys
def plays(fn):
    for l in gzip.open(fn,'rt'):
        p=json.loads(l)
        if p.get('kind')=='run' and p.get('carrier') is not None and p['events'].get('first_contact') is not None: yield p
def P(p,k,i): xy=p['xy'][min(k,len(p['xy'])-1)]; return (xy[2*i],xy[2*i+1])
for lab,fn in [a.split('=') for a in sys.argv[1:]]:
    n=0; g=collections.Counter(); eng=0; mv=[]; ts=[]; stuff=collections.Counter(); tot=collections.Counter()
    for p in plays(fn):
        t=p['events']['first_contact']; k=int(round(t/.1)); c=p['carrier']
        if k>=len(p['xy']): continue
        D=[j for j,q in enumerate(p['players']) if q['side']=='D']; O=[j for j,q in enumerate(p['players']) if q['side']=='O' and q['group'] in ('OL','TE')]
        if not D or not O: continue
        j=min(D,key=lambda j:math.dist(P(p,k,j),P(p,k,c))); grp=p['players'][j]['group']; n+=1; g[grp]+=1
        st_=p['yards']<=0; tot[grp]+=1; stuff[grp]+=st_
        if grp=='DL':
            o=min(O,key=lambda o:math.dist(P(p,k,o),P(p,k,j)))
            e=math.dist(P(p,k,o),P(p,k,j))<1.2; eng+=e; ts.append(t)
            side=1 if P(p,k,c)[1]>P(p,0,j)[1] else -1; mv.append((P(p,k,j)[1]-P(p,0,j)[1])*side)
    dl=g['DL']
    print(f"{lab:7s} runs {n}  first contact by DL {dl/n:4.0%} LB {g['LB']/n:4.0%} DB {g['DB']/n:4.0%};  DL contacts: beside an OL/TE (<1.2 yd) {eng/dl:4.0%}, lateral move toward carrier median {st.median(mv):4.2f} yd, t median {st.median(ts):4.2f};  stuffed when DL first {stuff['DL']/max(1,tot['DL']):4.0%}")
print('-- contact depth and yards after contact, first contact by DL')
for lab,fn in [a.split('=') for a in sys.argv[1:]]:
    dep=[]; yac=[]; x0=[]
    for p in plays(fn):
        t=p['events']['first_contact']; k=int(round(t/.1)); c=p['carrier']
        if k>=len(p['xy']): continue
        D=[j for j,q in enumerate(p['players']) if q['side']=='D']
        if not D: continue
        j=min(D,key=lambda j:math.dist(P(p,k,j),P(p,k,c)))
        if p['players'][j]['group']!='DL': continue
        ol=[i for i,q in enumerate(p['players']) if q['group']=='OL']
        los=st.median(P(p,0,i)[0] for i in ol)
        d=P(p,k,c)[0]-los; dep.append(d); yac.append(p['yards']-d)
    print(f"{lab:7s} n={len(dep)} carrier depth at contact (OL snap line) median {st.median(dep):5.2f}, behind it {sum(x<0 for x in dep)/len(dep):4.0%};  yards after contact median {st.median(yac):5.2f} mean {st.mean(yac):5.2f}")
