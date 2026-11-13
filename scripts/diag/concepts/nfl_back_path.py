import csv,statistics as st
from collections import defaultdict
root='/home/user/football-simulation-/data/raw/bdb2025/big-data-bowl-data'
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{root}/players.csv'))}
plays={(r['gameId'],r['playId']):r for r in csv.DictReader(open(f'{root}/plays.csv')) if r['isDropback'] in ('TRUE','True','1') and r['playAction'] not in ('TRUE','True','1')}
who={}
for r in csv.DictReader(open(f'{root}/player_play.csv')):
  k=(r['gameId'],r['playId'])
  if k in plays and pos.get(r['nflId']) in ('RB','FB') and r['routeRan'] in ('FLAT','ANGLE','OUT','SCREEN'): who[(k,r['nflId'])]=r['routeRan']
keys={k for k,_ in who}
tr=defaultdict(dict); snap={}
for w in (1,2,3):
  for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
    k=(r['gameId'],r['playId'])
    if k not in keys: continue
    if r['displayName']=='football':
      if r['event']=='ball_snap': snap[k]=(float(r['x']),float(r['y']),int(r['frameId']),1 if r['playDirection']=='right' else -1)
      continue
    if (k,r['nflId']) in who: tr[(k,r['nflId'])][int(r['frameId'])]=(float(r['x']),float(r['y']))
out=defaultdict(lambda: defaultdict(list))
for (k,pid),fr in tr.items():
  if k not in snap: continue
  sx,sy,sf,d=snap[k]
  for t in (1.0,1.5,2.0,2.5):
    f=sf+int(t*10)
    if f in fr: out[who[(k,pid)]][t].append(((fr[f][0]-sx)*d, abs(fr[f][1]-sy)))
q=lambda xs,p: round(sorted(xs)[int(p*(len(xs)-1))],1)
for rt,T in out.items():
  print(rt, ' | '.join(f"{t}s: depth {q([a for a,_ in v],.25)}/{q([a for a,_ in v],.5)}/{q([a for a,_ in v],.75)} width p50 {q([b for _,b in v],.5)} (n {len(v)})" for t,v in sorted(T.items())))
