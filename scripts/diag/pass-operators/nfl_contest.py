# Targeted throws (BDB 2025 non-PA dropbacks): at pass_arrived and 0.3 s before, the defender nearest the target: distance,
# closing speed on the target, and whether his orientation faces back toward where the ball came from (cos > 0, i.e. he
# can see it). Outcome C / I / IN. Depth from the football at the snap.
import csv, sys, collections, math, json
D=sys.argv[1]; weeks=sys.argv[2].split(','); OUT=open(sys.argv[3],'w')
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] in ('FALSE','False','0') and r['passResult'] in ('C','I','IN')}
tgt={}; pd={}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k=(r['gameId'],r['playId'])
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[k]=r['nflId']
  if r['passDefensed'] in ('1','TRUE','True'): pd[k]=r['nflId']
for w in weeks:
  P=collections.defaultdict(dict); ev={}; dirn={}; ball={}; club={}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays: continue
    f=int(r['frameId'])
    if r['event'] not in ('','NA'): ev.setdefault(k,{}).setdefault(r['event'],f)
    if r['displayName']=='football': ball[(k,f)]=(float(r['x']),float(r['y'])); continue
    if r['nflId'] in ('','NA'): continue
    dirn[k]=r['playDirection']; club[(k,r['nflId'])]=r['club']
    P[k][(r['nflId'],f)]=(float(r['x']),float(r['y']),float(r['o']) if r['o'] not in ('','NA') else None)
  for k,T in P.items():
    e=ev.get(k,{}); s0=e.get('ball_snap'); th=e.get('pass_forward'); ar=e.get('pass_arrived') or e.get('pass_outcome_caught') or e.get('pass_outcome_incomplete') or e.get('pass_outcome_interception'); t=tgt.get(k)
    if None in (s0,th,ar,t) or (k,s0) not in ball or (t,ar) not in T or (k,th) not in ball: continue
    sg=1 if dirn[k]=='right' else -1; los=ball[(k,s0)][0]; off=plays[k]['possessionTeam']
    tp=T[(t,ar)]; depth=(tp[0]-los)*sg
    defs=[i for (i,f) in T if f==ar and club.get((k,i))!=off]
    if not defs: continue
    d=min(defs,key=lambda i:math.hypot(T[(i,ar)][0]-tp[0],T[(i,ar)][1]-tp[1]))
    dist=math.hypot(T[(d,ar)][0]-tp[0],T[(d,ar)][1]-tp[1])
    r3=T.get((t,ar-3)); d3=T.get((d,ar-3))
    dist3=math.hypot(d3[0]-r3[0],d3[1]-r3[1]) if r3 and d3 else None
    closing=(dist3-dist)/0.3 if dist3 is not None else None
    b0=ball[(k,th)]; o=T[(d,ar)][2]; face=None
    if o is not None:
      ox,oy=math.sin(math.radians(o)),math.cos(math.radians(o)); bx,by=b0[0]-T[(d,ar)][0],b0[1]-T[(d,ar)][1]; L=math.hypot(bx,by) or 1
      face=(ox*bx+oy*by)/L
    OUT.write(json.dumps({'depth':depth,'sep':dist,'sep3':dist3,'closing':closing,'face':face,'res':plays[k]['passResult'],'pd':pd.get(k)==d})+'\n')
