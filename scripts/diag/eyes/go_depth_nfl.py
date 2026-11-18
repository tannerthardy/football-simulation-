import pandas as pd
D='/home/user/football-simulation-/data/raw/bdb2025/big-data-bowl-data/'
pp=pd.read_csv(D+'player_play.csv',usecols=['gameId','playId','nflId','routeRan','wasRunningRoute'])
pp=pp[(pp.wasRunningRoute==1)&pp.routeRan.isin(['GO','POST'])]
pl=pd.read_csv(D+'plays.csv',usecols=['gameId','playId','playAction','dropbackType','pff_passCoverage' if False else 'playId'])
pl=pd.read_csv(D+'plays.csv'); cols=[c for c in pl.columns if 'overage' in c or 'Safet' in c.lower()]
pl=pl[(pl.playAction==False)&(pl.dropbackType=='TRADITIONAL')]
pp=pp.merge(pl[['gameId','playId']+cols])
pos=pd.read_csv(D+'players.csv',usecols=['nflId','position'])
pp=pp.merge(pos)
key=set(zip(pp.gameId,pp.playId,pp.nflId))
out=[]
for ch in pd.read_csv(D+'tracking_week_1.csv',usecols=['gameId','playId','nflId','frameId','frameType','x','y','playDirection'],chunksize=2_000_000):
  ch=ch.dropna(subset=['nflId']); ch=ch[[k in key for k in zip(ch.gameId,ch.playId,ch.nflId.astype(int))]]; out.append(ch)
t=pd.concat(out); rows=[]
for (g,p,n),d in t.groupby(['gameId','playId','nflId']):
  d=d.sort_values('frameId'); sn=d[d.frameType=='SNAP']
  if sn.empty: continue
  f0=sn.frameId.iloc[0]; x0=sn.x.iloc[0]; sgn=1 if d.playDirection.iloc[0]=='right' else -1
  r={}
  for T in (20,25,30):
    q=d[d.frameId==f0+T]
    if q.empty: break
    r[T]=(q.x.iloc[0]-x0)*sgn
  rows.append({**r,'gameId':g,'playId':p,'nflId':int(n)})
R=pd.DataFrame(rows).merge(pp,on=['gameId','playId','nflId'])
print('coverage cols',cols)
print(R.groupby(['routeRan','position'])[[20,25,30]].median().round(1).assign(n=R.groupby(['routeRan','position']).size()))
