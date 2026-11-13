# Zone plays (pff_manZone Zone), every throw: each non-rushing defender (CB/S/LB) and the nearest eligible receiver within
# 7 yd of him at the release (pass_forward). His speed toward that receiver (velocity component along the line to him) and
# the distance, at release -0.8 .. 0 s; split by whether that receiver was the target.
import csv, sys, collections, math
D=sys.argv[1]; weeks=sys.argv[2].split(',')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r.get('pff_manZone')=='Zone' and r['passResult'] in ('C','I','IN')}
tgt={}; rush=set()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k=(r['gameId'],r['playId'])
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[k]=r['nflId']
  if r.get('wasInitialPassRusher') in ('1','TRUE','True'): rush.add((k,r['nflId']))
DEF={'CB','SS','FS','S','ILB','OLB','MLB','LB','DB'}; ELIG={'WR','TE','RB','FB'}
A=collections.defaultdict(list)
for w in weeks:
  P=collections.defaultdict(dict); th={}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    if r['event']=='pass_forward' and k not in th: th[k]=f
    if r['nflId'] in ('','NA'): continue
    s,dg=float(r['s']),math.radians(float(r['dir']) if r['dir'] not in ('','NA') else 0)
    P[k][(r['nflId'],f)]=(float(r['x']),float(r['y']),s*math.sin(dg),s*math.cos(dg))
  for k,T in P.items():
    t0=th.get(k)
    if t0 is None: continue
    ids={i for i,_ in T}; defs=[i for i in ids if pos.get(i) in DEF and (k,i) not in rush and (i,t0) in T]; recs=[i for i in ids if pos.get(i) in ELIG and (i,t0) in T]
    for d in defs:
      dx,dy=T[(d,t0)][:2]
      near=min(recs,key=lambda i:math.hypot(T[(i,t0)][0]-dx,T[(i,t0)][1]-dy),default=None)
      if near is None or math.hypot(T[(near,t0)][0]-dx,T[(near,t0)][1]-dy)>7: continue
      grp='target' if tgt.get(k)==near else 'not target'
      row={}
      for kk in (-8,-6,-4,-2,0):
        f=t0+kk
        if (d,f) not in T or (near,f) not in T: continue
        x,y,vx,vy=T[(d,f)]; rx,ry=T[(near,f)][:2]; L=math.hypot(rx-x,ry-y) or 1
        row[kk]=((vx*(rx-x)+vy*(ry-y))/L, L, math.hypot(vx,vy))
      A[grp].append(row)
def q(v,p): v=sorted(v); return v[int(p*(len(v)-1))] if v else float('nan')
for g in ('target','not target'):
  L=A[g]; print(f"NFL zone {g:10s} n {len(L):5d} | toward / distance / speed: "+' | '.join(f"{kk/10:+.1f}s {q([r[kk][0] for r in L if kk in r],.5):.2f}/{q([r[kk][1] for r in L if kk in r],.5):.2f}/{q([r[kk][2] for r in L if kk in r],.5):.2f}" for kk in (-8,-6,-4,-2,0)))
