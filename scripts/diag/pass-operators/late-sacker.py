"""Who makes the late sack (Integration, 2026-11-15): of dropbacks (five or more OL) still alive at 3.0 s (no forward pass
by then), those ending with no forward pass behind the line (a sack proxy: it includes QB runs for a loss, not fumbles),
by the defender nearest the QB at his last frame: interior (a DL whose snap spot is between the tackles) or edge (any
other DL or LB). Same code on NFL tracking and sim exports.

usage: python3 -I scripts/diag/pass-operators/late-sacker.py <plays.jsonl.gz> [...]
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
for path in sys.argv[1:]:
    n=a3=0; c={'interior':0,'edge':0,'other':0}
    for line in gzip.open(path,'rt'):
        raw=json.loads(line); raw=raw.get('common',raw)
        if raw.get('kind')!='pass' or not raw.get('xy'): continue
        p=Play(raw); ev=raw.get('events',{}); qbs=p.who('O','QB')
        OL=sorted([i for i in p.who('O','OL') if p.pos(i,0)[0] is not None], key=lambda i:p.pos(i,0)[1])
        if len(OL)<5 or not qbs: continue
        n+=1; tend=ev.get('pass_forward', ev.get('end'))
        if tend is None or tend<=3.0: continue
        a3+=1
        if 'pass_forward' in ev or raw.get('yards',0)>=0 or 'fumble' in ev: continue
        k=p.frames-1
        while k>0 and p.pos(qbs[0],k)[0] is None: k-=1
        D=[d for d in p.who('D') if p.pos(d,k)[0] is not None and p.pos(d,0)[0] is not None]
        if not D: continue
        d=min(D,key=lambda d:p.dist(d,qbs[0],k))
        y0=p.pos(d,0)[1]; lo=p.pos(OL[0],0)[1]; hi=p.pos(OL[-1],0)[1]
        g=p.players[d]['group']
        c['interior' if lo<y0<hi and g=='DL' else 'edge' if g in('DL','LB') else 'other']+=1
    tot=sum(c.values())
    print(os.path.basename(path), 'dropbacks',n,'alive at 3 s',a3,'sacked',tot,f'({100*tot/max(1,a3):.1f}%)', {k:f'{v} ({100*v/max(1,a3):.1f}% of alive)' for k,v in c.items()})
