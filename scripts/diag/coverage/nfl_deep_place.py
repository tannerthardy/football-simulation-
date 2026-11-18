"""NFL deep-ball placement (BDB 2025): plays with passLength (PFF air yards, line to the target) >= 15, no play action,
passResult C / I / IN (throwaways with a targeted receiver are in), the receiver flagged wasTargettedReceiver; arrival = the
first frame tagged pass_arrived / pass_outcome_caught / pass_outcome_incomplete; error = 2D distance from the tracked
football to the targeted receiver at that frame.  python3 -I nfl_deep_place.py <bdb2025 dir> <weeks>"""
import csv,sys,math,statistics as st
from collections import defaultdict
src=sys.argv[1]
pos={r['nflId']:r['position'] for r in csv.DictReader(open(f'{src}/players.csv'))}
plays={(p['gameId'],p['playId']):p for p in csv.DictReader(open(f'{src}/plays.csv')) if p['playAction']=='FALSE' and p['passResult'] in ('C','I','IN') and p['passLength'] not in ('','NA') and float(p['passLength'])>=15 and p['targetX'] not in ('','NA')}
tg={}
for r in csv.DictReader(open(f'{src}/player_play.csv')):
    k=(r['gameId'],r['playId'])
    if k in plays and r['wasTargettedReceiver']=='1': tg[k]=r['nflId']
res=defaultdict(list)
for w in sys.argv[2].split(','):
    fr=defaultdict(dict)
    for f in csv.DictReader(open(f'{src}/tracking_week_{w}.csv')):
        k=(f['gameId'],f['playId'])
        if k in tg and (f['nflId']==tg[k] or f['displayName']=='football'): fr[k][(f['nflId'],int(f['frameId']))]=f
    for k,d in fr.items():
        arr=next((fid for (n,fid),f in d.items() if f['event'] in ('pass_arrived','pass_outcome_caught','pass_outcome_incomplete')),None)
        if arr is None or (tg[k],arr) not in d: continue
        f=d[(tg[k],arr)]; p=plays[k]
        b=d.get(('NA',arr))
        if not b: continue
        e=math.dist((float(b['x']),float(b['y'])),(float(f['x']),float(f['y'])))
        side=min(float(p['targetY']),53.3-float(p['targetY']))
        res['all'].append((e,p['passResult']=='C',side,p['pff_passCoverage']))
for name,v in (('all 15+ air',res['all']),('outside 1/3 (target <=12 yd from sideline)',[x for x in res['all'] if x[2]<=12]),('Cover-2',[x for x in res['all'] if x[3]=='Cover-2'])):
    e=[x[0] for x in v]; q=st.quantiles(e,n=4)
    print(name,'n',len(v),'placement error at arrival (target point to receiver) med %.2f IQR %.2f-%.2f; >2 yd %.2f; comp %.2f'%(st.median(e),q[0],q[2],sum(x>2 for x in e)/len(e),sum(x[1] for x in v)/len(v)))
