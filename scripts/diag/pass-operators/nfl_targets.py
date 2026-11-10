# Targeted throws (BDB 2025): air yards of the target at arrival (pass_arrived, else the outcome frame), result, separation
# (nearest defender to the target at that frame), and defenders deeper than him.
import csv, sys, json, math, collections
D=sys.argv[1]; weeks=sys.argv[2].split(','); out=open(sys.argv[3],'w')
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['passResult'] in ('C','I','IN')}
tgt={}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  if r['wasTargettedReceiver'] in ('1','TRUE','True'): tgt[(r['gameId'],r['playId'])]=r['nflId']
for w in weeks:
  P=collections.defaultdict(dict); ev={}; dirn={}; club={}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in plays or r['nflId'] in ('','NA'):
      if k in plays and r['event'] not in ('','NA'): ev.setdefault(k,{}).setdefault(r['event'],int(r['frameId']))
      continue
    f=int(r['frameId']); dirn[k]=r['playDirection']; club[(k,r['nflId'])]=r['club']
    if r['event'] not in ('','NA'): ev.setdefault(k,{}).setdefault(r['event'],f)
    P[k][(r['nflId'],f)]=(float(r['x']),float(r['y']))
  for k,T in P.items():
    e=ev.get(k,{}); rid=tgt.get(k); p=plays[k]
    f=e.get('pass_arrived') or e.get('pass_outcome_caught') or e.get('pass_outcome_incomplete') or e.get('pass_outcome_interception')
    if f is None or rid is None or (rid,f) not in T: continue
    sg=1 if dirn[k]=='right' else -1; off=p['possessionTeam']; los=float(p['absoluteYardlineNumber'])
    rx,ry=T[(rid,f)]; air=(rx-los)*sg
    ds=[(math.hypot(x-rx,y-ry),(x-rx)*sg) for (i,ff),(x,y) in T.items() if ff==f and club.get((k,i))!=off]
    if not ds: continue
    out.write(json.dumps({'air':air,'res':p['passResult'],'sep':min(d for d,_ in ds),'deeper':sum(1 for _,dx in ds if dx>0),'yds':float(p['yardsGained'] or 0)})+'\n')
