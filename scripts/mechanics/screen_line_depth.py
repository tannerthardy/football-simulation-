#!/usr/bin/env python3
"""Line depths on WR screens, NFL vs sim, same code: DL and OL x at 0.5/1.0/1.5/2.0 s after the snap
(yd past the LOS; - = backfield) and the share of DL within 1.1 yd of an OL. Types by screen_scorecard.classify.
    python3 -I scripts/mechanics/screen_line_depth.py NFL.jsonl.gz SIM.jsonl.gz"""
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
    if t is None:
      t={"bubble_screen":"WR-out","tunnel_screen":"WR-in","bunch_now_screen":"WR-now"}.get(sc.get('type'))
    if t not in ('WR-now','WR-out'): continue
    xy=p['xy']; dt=p.get('dt',.1); pl=p['players']
    DL=[j for j,x in enumerate(pl) if x['side']=='D' and x['group']=='DL']; OL=[j for j,x in enumerate(pl) if x['group']=='OL']
    for tt in (0.5,1.0,1.5,2.0):
      k=int(round(tt/dt))
      if k>=len(xy): continue
      for j in DL: R[t][f'DL x {tt}'].append(xy[k][2*j])
      for j in OL: R[t][f'OL x {tt}'].append(xy[k][2*j])
      R[t][f'DL-OL contact {tt}'].append(sum(1 for j in DL if min(math.dist(xy[k][2*j:2*j+2],xy[k][2*o:2*o+2]) for o in OL)<1.1)/max(1,len(DL)))
  print(f)
  for t in R:
    print(' ',t, ' | '.join(f"{k} {q(v)}" if 'contact' not in k else f"{k} {sum(v)/len(v):.0%}" for k,v in sorted(R[t].items())))
