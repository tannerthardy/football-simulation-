#!/usr/bin/env python3
"""Line depths on RB and TE screens, NFL vs sim, same code: OL x (yd past the LOS; - = backfield) at 0.5-2.5 s after the
snap, at the throw and 0.5 s before it; the share of DL within 1.1 yd of an OL; throw time. Types by screen_scorecard.classify.
    python3 -I scripts/mechanics/screen_line_depth_backs.py NFL.jsonl.gz SIM.jsonl.gz"""
import gzip,json,math,sys,collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from screen_scorecard import classify
def q(v):
  v=sorted(v); return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[3*len(v)//4]:.1f} n{len(v)}" if v else '-'
for f in sys.argv[1:]:
  R=collections.defaultdict(lambda: collections.defaultdict(list))
  for l in gzip.open(f,'rt'):
    p=json.loads(l); sc=p.get('screen') or {}; r=sc.get('receiver')
    if r is None or 'pass_forward' not in p['events']: continue
    t=classify(p,r)
    if t not in ('RB','TE'): continue
    xy=p['xy']; dt=p.get('dt',.1); pl=p['players']
    OL=[j for j,x in enumerate(pl) if x['group']=='OL']
    DL=[j for j,x in enumerate(pl) if x['side']=='D' and x['group']=='DL']
    tf=p['events']['pass_forward']
    marks=[(f'{tt:.1f}',tt) for tt in (0.5,1.0,1.5,2.0,2.5)]+[('throw',tf),('throw-0.5',tf-0.5)]
    for name,tt in marks:
      k=int(round(tt/dt))
      if k>=len(xy) or k<0: continue
      for j in OL: R[t][f'OL x {name}'].append(xy[k][2*j])
      R[t][f'contact {name}'].append(sum(1 for j in DL if min(math.dist(xy[k][2*j:2*j+2],xy[k][2*o:2*o+2]) for o in OL)<1.1)/max(1,len(DL)))
    R[t]['throw t'].append(tf)
  print(f)
  for t in R:
    print(' ',t)
    for k,v in sorted(R[t].items()): print('   ',k, f"{sum(v)/len(v):.0%}" if 'contact' in k else q(v))
