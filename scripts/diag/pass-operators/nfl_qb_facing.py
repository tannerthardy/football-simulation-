# How long before pass_forward the QB's orientation (o) has been within 20 deg of the direction to the target (continuously).
import csv, sys, collections, math
D=sys.argv[1]; weeks=sys.argv[2].split(',')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays={(r['gameId'],r['playId']) for r in csv.DictReader(open(f'{D}/plays.csv')) if r['passResult'] in ('C','I','IN') and r['isDropback'] in ('TRUE','True','1')}
tgt={}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[(r['gameId'],r['playId'])]=r['nflId']
H=[]; H30=[]
for w in weeks:
  P=collections.defaultdict(dict); th={}; qb={}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    if r['event']=='pass_forward' and k not in th: th[k]=f
    if r['nflId'] in ('','NA'): continue
    if pos.get(r['nflId'])=='QB': qb[k]=r['nflId']
    if pos.get(r['nflId'])=='QB' or r['nflId']==tgt.get(k):
      P[k][(r['nflId'],f)]=(float(r['x']),float(r['y']),float(r['o']) if r['o'] not in ('','NA') else None)
  for k,T in P.items():
    t0=th.get(k); q=qb.get(k); t=tgt.get(k)
    if t0 is None or q is None or t is None: continue
    for lim,out in ((20,H),(30,H30)):
      h=0
      for f in range(t0,t0-40,-1):
        if (q,f) not in T or (t,f) not in T or T[(q,f)][2] is None: break
        qx,qy,o=T[(q,f)]; tx,ty,_=T[(t,f)]
        ang=math.degrees(math.atan2(tx-qx,ty-qy))  # NGS: 0 = +y, clockwise toward +x
        d=abs((o-ang+180)%360-180)
        if d>lim: break
        h=(t0-f)/10
      out.append(h)
def q(v,p): v=sorted(v); return v[int(p*(len(v)-1))]
print('NFL QB squared to the target before release (20 deg) p25/50/75', q(H,.25),q(H,.5),q(H,.75),'n',len(H))
print('NFL (30 deg) p25/50/75', q(H30,.25),q(H30,.5),q(H30,.75))
