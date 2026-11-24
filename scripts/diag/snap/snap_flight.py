"""Gun snap flight from the football's own track (BDB 2025, weeks 1-3). Tools/Physics, 2026-11-24 (docs/reviews/2026-11-24-snap-flight.md).
usage: python3 -I scripts/diag/snap/snap_flight.py   (reads data/raw/bdb2025/big-data-bowl-data; edit D below for another path)"""
import pandas as pd, numpy as np
D='data/raw/bdb2025/big-data-bowl-data/'
plays=pd.read_csv(D+'plays.csv',usecols=['gameId','playId','offenseFormation','playAction','possessionTeam'])
pl=pd.read_csv(D+'players.csv',usecols=['nflId','position'])
pos=dict(zip(pl.nflId,pl.position))
res=[]
for wk in (1,2,3):
    t=pd.read_csv(D+f'tracking_week_{wk}.csv',usecols=['gameId','playId','nflId','frameId','x','y','event','club','displayName'])
    t=t.merge(plays,on=['gameId','playId'])
    g=t[t.offenseFormation.isin(['SHOTGUN','PISTOL'])&(t.playAction==False)]
    for (gid,pid),p in g.groupby(['gameId','playId']):
        fb=p[p.displayName=='football'].sort_values('frameId')
        if fb.empty: continue
        snapf=fb[fb.event=='ball_snap'].frameId
        if snapf.empty: continue
        sf=int(snapf.iloc[0])
        qb=p[p.nflId.map(pos)=='QB']
        if qb.empty: continue
        qid=qb.nflId.iloc[0]; q=qb[qb.nflId==qid].set_index('frameId')
        f=fb.set_index('frameId')
        fr=[k for k in f.index if k>=sf-3 and k<=sf+20 and k in q.index]
        if len(fr)<8: continue
        bx=f.loc[fr,'x'].values; by=f.loc[fr,'y'].values; qx=q.loc[fr,'x'].values; qy=q.loc[fr,'y'].values
        sp=np.hypot(np.diff(bx),np.diff(by))*10
        d=np.hypot(bx-qx,by-qy)
        if d[fr.index(sf) if sf in fr else 0]<2.5: continue
        # first frame ball moves > 2 yd/s after snap event (frame index relative)
        i0=fr.index(sf) if sf in fr else 0
        mv=next((i for i in range(i0,len(sp)) if sp[i]>2.0),None)
        if mv is None: continue
        near=next((i for i in range(i0,len(d)) if d[i]<0.75),None)
        if near is None: continue
        res.append(dict(lag=(mv-i0)/10,flight=(near-mv)/10,tot=(near-i0)/10,d0=d[i0],vmax=sp[mv:near].max() if near>mv else np.nan))
r=pd.DataFrame(res); print(len(r))
for c in ['lag','flight','tot','d0','vmax']: print(c, r[c].quantile([.25,.5,.75]).round(2).tolist())
