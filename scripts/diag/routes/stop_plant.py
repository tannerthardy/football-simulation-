"""Stop routes before the throw, by plant depth, NFL vs ours (open-census play format). NFL: PFF HITCH (it includes curls:
match by plant depth, not label); ours: hitch, quick_hitch, curl, comeback. WRs who are not the target. Plant = first frame
past 2.5 yd with downfield speed under 1 yd/s; needs 1.0 s of track after it. Speed by time from the snap and after the plant,
yards back toward the line and across in the second after it.
usage: python3 -I stop_plant.py NFL=nfl-plays.jsonl.gz LABEL=sim.jsonl.gz [...]"""
import gzip, json, math, sys, collections
import numpy as np
OL={'T','G','C','OT','OG'}
def rows(path, src):
    out=[]
    for l in gzip.open(path,'rt'):
        p=json.loads(l); X=np.array(p['x']); Y=np.array(p['y']); pl=p['players']
        if p.get('rel') is not None: X,Y=X[:,:p['rel']+1],Y[:,:p['rel']+1]
        if p.get('motion') and src=='sim': continue
        nf=X.shape[1]
        for i,r in enumerate(pl):
            if r['side']!='O' or r['pos'] not in ('WR',): continue
            if src=='nfl':
                if r.get('routeRan')!='HITCH' or r.get('motion'): continue
                rid='hitch'
            else:
                rid=((p.get('routes') or {}).get(str(i)) or {}).get('id')
                if rid not in ('hitch','quick_hitch','curl','comeback'): continue
            if r.get('target'): continue
            x,y=X[i],Y[i]
            if nf<15: continue
            vx=lambda k: (x[min(nf-1,k+1)]-x[k-1])/0.2
            kb=next((k for k in range(6,min(nf-1,45)) if x[k]>=2.5 and vx(k)<1.0), None)
            if kb is None or kb+10>=nf: continue
            dep=x[kb]
            sp=lambda k: math.hypot(x[min(nf-1,k+1)]-x[k-1],y[min(nf-1,k+1)]-y[k-1])/0.2
            out.append(dict(rid=rid,dep=dep,tb=kb/10,v=[sp(kb+d) for d in (0,3,6,10)],back=x[kb]-x[kb+10],lat=abs(y[kb+10]-y[kb]),
                            at=[sp(k) if k<nf-1 else None for k in (10,15,20,25)],still=sum(1 for d in range(3,11) if sp(kb+d)<1.0)/8))
    return out
def rep(lab,R):
    print(f"| {lab} | break depth | n | time of break p50 | speed by time | speed at break / +0.3 / +0.6 / +1.0 s p50 | back toward the line by +1.0 s p50 | lateral by +1.0 s p50 | share of +0.3..+1.0 s under 1 yd/s |")
    print('|---|---|---|---|---|---|---|---|---|')
    for a,b in ((3,7.5),(7.5,10),(10,14),(14,20)):
        v=[r for r in R if a<=r['dep']<b]
        if len(v)<5: continue
        m=lambda k: np.median([r[k] for r in v])
        V=np.median(np.array([r['v'] for r in v]),0)
        A=[np.median([r['at'][j] for r in v if r['at'][j] is not None]) for j in range(4)]
        print(f"| {lab} | {a}-{b} | {len(v)} | {m('tb'):.1f} | at 1.0/1.5/2.0/2.5 s: {' / '.join(f'{z:.1f}' for z in A)} | {' / '.join(f'{z:.1f}' for z in V)} | {m('back'):.1f} | {m('lat'):.1f} | {np.mean([r['still'] for r in v]):.2f} |")
    print()
for a in sys.argv[1:]:
    lab,p=a.split('=',1); rep(lab, rows(p, 'nfl' if lab=='NFL' else 'sim'))
