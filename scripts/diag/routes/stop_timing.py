"""Hitch timing against the plant, NFL vs ours: plant, release and catch times, and speed at the release, at the catch and
the slowest between plant and catch. NFL catches from Tools' nfl_catches.py joined to nfl_plays.py's PFF route labels.
usage: python3 -I stop_timing.py nfl-plays.jsonl.gz NFL=nfl-catches.jsonl.gz LABEL=sim.jsonl.gz [...]"""
import gzip, json, math, sys
import numpy as np
sys.path.insert(0,'/tmp/claude-0/scr')
ROUTE={}
for l in gzip.open(sys.argv[1],'rt'):
    p=json.loads(l)
    for r in p['players']:
        if r.get('routeRan') and r.get('id'): ROUTE[(p['id'],r['id'])]=r['routeRan']
SIM={'hitch','quick_hitch'}
for a in sys.argv[2:]:
    lab,path=a.split('=',1); nfl=lab=='NFL'; R=[]
    for l in gzip.open(path,'rt'):
        p=json.loads(l); k=p.get('catch'); i=p.get('recv'); rel=p.get('rel')
        if k is None or i is None or i<0 or rel is None: continue
        X=np.array(p['x']); Y=np.array(p['y']); r=p['players'][i]; nf=X.shape[1]
        if r['pos']!='WR' or k+1>=nf: continue
        if nfl:
            if ROUTE.get((p['id'],r.get('id')))!='HITCH': continue
        elif ((p.get('routes') or {}).get(str(i)) or {}).get('id') not in SIM: continue
        x,y=X[i],Y[i]
        if x[k]>8: continue
        sp=lambda f: math.hypot(x[min(nf-1,f+1)]-x[f-1],y[min(nf-1,f+1)]-y[f-1])/0.2
        vx=lambda f:(x[min(nf-1,f+1)]-x[f-1])/0.2
        kb=next((f for f in range(6,k+1) if x[f]>=2.5 and vx(f)<1.0),None)
        if kb is None: continue
        R.append(dict(plant=kb/10, rel=rel/10, catch=k/10, sp_rel=sp(rel), sp_c=sp(k), mn=min(sp(f) for f in range(kb,k+1))))
    m=lambda key: np.median([r[key] for r in R])
    print(f"{lab}: n {len(R)}; plant {m('plant'):.1f} s, release {m('rel'):.1f}, catch {m('catch'):.1f}; release - plant p25/p50/p75 {np.quantile([r['rel']-r['plant'] for r in R],[.25,.5,.75]).round(1)}; catch - plant p50 {np.median([r['catch']-r['plant'] for r in R]):.1f}; speed at release {m('sp_rel'):.1f}, at catch {m('sp_c'):.1f}; min speed plant..catch {m('mn'):.1f}")
