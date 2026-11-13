"""Compare sustained run-line displacement in a bounded NFL/native pilot.

Requires numpy and pandas. Reads BDB2025 tracking week1 and eight native
recorded games. Motion near blockers does not establish physical push.
Output: pilot.json (aggregates and input pins), details.json (observations).
"""
import argparse
import gzip
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

DEFAULT_SOURCE = "8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--bdb-dir", type=Path, required=True,
                    help="BDB2025 directory containing players, plays and tracking_week_1 CSVs")
parser.add_argument("--native-dir", type=Path, required=True,
                    help="Directory containing game-1.json.gz through game-8.json.gz")
parser.add_argument("--out", type=Path, required=True,
                    help="Output directory; generated files should stay outside tracked evidence")
parser.add_argument("--native-source", default=DEFAULT_SOURCE,
                    help="Required native source SHA256 (default: frozen 8f8 baseline)")
args = parser.parse_args()
D = args.bdb_dir.resolve()
NATIVE = args.native_dir.resolve()
OUT = args.out.resolve()
required = [D / name for name in ("players.csv", "plays.csv", "tracking_week_1.csv")]
required += [NATIVE / f"game-{g}.json.gz" for g in range(1, 9)]
missing = [str(path) for path in required if not path.is_file()]
if missing:
    parser.error("missing input file(s): " + ", ".join(missing))
if len(args.native_source) != 64 or any(c not in "0123456789abcdef" for c in args.native_source):
    parser.error("--native-source must be a lowercase SHA256")
try:
    import numpy as np
    import pandas as pd
except ImportError as error:
    parser.error(f"requires numpy and pandas: {error}")
OUT.mkdir(parents=True, exist_ok=True)
DL={'DE','DT','NT','EDGE'};LB={'LB','OLB','ILB','MLB'};OL={'T','G','C','OT','OG','OC'}
END={'tackle','out_of_bounds','touchdown','fumble','qb_slide'}
SLICES=(10,20,30)
metrics=defaultdict(list);counts=Counter();details=[]
def rounded(v):return round(float(v),1)
def summary(v):
 a=np.array(v,dtype=float)
 return {'n':len(v),'mean':round(float(a.mean()),3),'p10':round(float(np.quantile(a,.1)),3),'median':round(float(np.median(a)),3),'p90':round(float(np.quantile(a,.9)),3),'p95':round(float(np.quantile(a,.95)),3)} if len(v) else {'n':0}
def record(source,p):
 counts[source+':plays']+=1
 snap=p['frames'].get(0,{})
 off=p['off'];los=p['los'];sgn=p['sign']
 ol=[i for i in off if p['pos'][i] in OL and i in snap and -2 <= sgn*(snap[i][0]-los)<=.7]
 if len(ol)!=5:counts[source+':excludedNot5OL']+=1;return
 yl,yh=min(snap[i][1] for i in ol),max(snap[i][1] for i in ol)
 dl=[i for i in p['def'] if i in snap and -.5<=sgn*(snap[i][0]-los)<=2 and (p['pos'][i] in DL or p['pos'][i] in LB)]
 tes=[i for i in off if i in snap and p['pos'][i]=='TE' and -2<=sgn*(snap[i][0]-los)<=.7 and yl-2<=snap[i][1]<=yh+2]
 counts[source+':qualifiedPlays']+=1
 counts[source+':qualifiedLinePlayers']+=len(dl)
 for d in dl:
  role='interior' if yl<snap[d][1]<yh else 'edge'
  five=p['frames'].get(5,{});four=p['frames'].get(4,{})
  entry=math.dist(five[d],four[d])*10 if d in five and d in four else None
  entrybin='slowEntry' if entry is not None and entry<2 else 'fastEntry'
  survive30=p['end']>30 and all(f in p['frames'] and d in p['frames'][f] for f in range(5,31))
  if survive30:
   near3=[sum(d in p['frames'][q] and i in p['frames'][q] and math.dist(p['frames'][q][d],p['frames'][q][i])<=1.5 for i in ol) for q in range(5,31)]
   if near3[-1]>0 and sum(n>0 for n in near3)/26>=.8:
    terminal='one' if near3[-1]==1 else 'twoPlus'
    for tt in SLICES:
     disp3=sgn*(p['frames'][tt][d][0]-snap[d][0])
     metrics[(source,'fixedOLnear3s:'+terminal,tt)].append(disp3)
  for t in SLICES:
   if p['end']<=t:counts[f'{source}:censoredDL@{t/10:g}s']+=1;continue
   f=p['frames'].get(t,{})
   if d not in f:counts[f'{source}:missingDL@{t/10:g}s']+=1;continue
   disp=sgn*(f[d][0]-snap[d][0]);metrics[(source,'allLive',t)].append(disp)
   if survive30:metrics[(source,'commonLive3s',t)].append(disp)
   for threshold in (1.,1.5):
    for blockers,bset in (('OL',ol),('OLTE',ol+tes)):
     near=[]
     for q in range(5,t+1):
      fq=p['frames'].get(q,{})
      near.append(sum(d in fq and i in fq and math.dist(fq[d],fq[i])<=threshold for i in bset))
     last=near[-1]
     minSep=min((math.dist(f[d],f[i]) for i in bset if i in f),default=math.inf)
     # Persistent proximity to at least one line blocker, not same named blocker.
     eligible=last>0 and sum(n>0 for n in near)/len(near)>=.8
     if not eligible:continue
     group='one' if last==1 else 'twoPlus'
     label=f'{blockers}@{threshold:g}:{group}'
     metrics[(source,label,t)].append(disp)
     if threshold==1.5 and blockers=='OL':
      metrics[(source,label+':'+role,t)].append(disp)
      metrics[(source,label+':'+entrybin,t)].append(disp)
      if minSep>=.35:metrics[(source,label+':noSevereOverlap',t)].append(disp)
      counts[f'{source}:OLnear@{t/10:g}s']+=1
      if minSep<.35:counts[f'{source}:OLseparationBelow0p35yd@{t/10:g}s']+=1
      if role=='interior' and entry is not None and entry<2 and .25<=sgn*(snap[d][0]-los)<=1.75 and p['down'] in (1,2) and 5<=p['distance']<=12 and p['concept'] in ('insideZone','outsideZone'):
       metrics[(source,'matched:'+p['concept']+':'+group,t)].append(disp)
      if source=='engine' or len(details)<4000:
       details.append({'source':source,'id':p['id'],'defender':d,'rosterPosition':p['pos'][d],'role':role,'t':t/10,'displacementYd':disp,'entrySpeedYdPerS':entry,'terminalNearOL':last,'nearFraction':sum(n>0 for n in near)/len(near),'initialDepthYd':sgn*(snap[d][0]-los)})
# Native replay positions already normalized; every retained handoff, not cherry-picked.
pins=[]
for g in range(1,9):
 path=NATIVE/f'game-{g}.json.gz';pins.append({'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 a=json.load(gzip.open(path,'rt'))
 if a.get('sourceBefore') != args.native_source or a.get('sourceAfter') != args.native_source:
  parser.error(f'{path}: native source does not match --native-source {args.native_source}')
 for r in a['log']:
  if r.get('kind')!='run' or r.get('nullified'):continue
  rp=r['replay'];ev=rp['events']
  if not any(e['type']=='handoff' for e in ev):continue
  ps=rp['players'];frames={int(round(f['t']*10)):{i:(rounded(f['agents'][i*3]),rounded(f['agents'][i*3+1])) for i in range(len(ps))} for f in rp['frames']}
  record('engine',{'id':f'G{g}-P{r["index"]:03}','frames':frames,'off':[i for i,p in enumerate(ps) if p['team']=='O'],'def':[i for i,p in enumerate(ps) if p['team']=='D'],'pos':{i:p['pos'] for i,p in enumerate(ps)},'los':rounded(rp['los']),'sign':1,'end':r['duration']*10,'concept':r['plan']['concept'],'down':r['down'],'distance':r['distance']})
print('native complete',dict(counts),flush=True)
players=pd.read_csv(D/'players.csv').set_index('nflId')['position'].to_dict()
plays=pd.read_csv(D/'plays.csv',keep_default_na=False,dtype=str)
runs=plays[(plays.isDropback!='TRUE')&(plays.playNullifiedByPenalty!='Y')&(plays.qbKneel.isin(['0','FALSE','NA','']))&(plays.qbSneak!='TRUE')]
met={(int(r.gameId),int(r.playId)):r for r in runs.itertuples()}
# One week only; chunks retain just line player/football rows for eligible runs.
path=D/'tracking_week_1.csv';parts=[]
cols=['gameId','playId','nflId','frameId','frameType','club','playDirection','x','y','event']
for c in pd.read_csv(path,usecols=cols,chunksize=400000,keep_default_na=False):
 keys=list(zip(c.gameId,c.playId));mask=np.array([k in met for k in keys])&(c.frameType!='BEFORE_SNAP')
 c=c.loc[mask]
 c=c[c.nflId.eq('NA')|c.nflId.map(lambda x:players.get(int(x),'') if x!='NA' else 'football').isin(DL|LB|OL|{'TE'})]
 parts.append(c)
print('NFL retained rows',sum(len(c) for c in parts),flush=True)
track=pd.concat(parts,ignore_index=True)
for key,c in track.groupby(['gameId','playId'],sort=False):
 row=met[key];football=c[c.club=='football'];snap=c[c.event=='ball_snap'];snaps=snap.frameId.unique()
 if len(snaps)!=1:counts['nfl:excludedMissingOrMultipleSnap']+=1;continue
 s=int(snaps[0]);after=c[c.frameId>=s]
 if not any(after.event=='handoff'):counts['nfl:excludedNoHandoff']+=1;continue
 if any(after.event.isin(['pass_forward','pass_shovel'])):counts['nfl:excludedPass']+=1;continue
 ends=after.loc[after.event.isin(END),'frameId'];end=int(ends.min())-s if len(ends) else math.inf
 ball=football[football.frameId==s]
 if len(ball)!=1:counts['nfl:excludedMissingBall']+=1;continue
 sign=1 if ball.iloc[0].playDirection=='right' else -1
 pos={};off=set();df=set();frames=defaultdict(dict)
 for z in c[(c.frameId>=s)&(c.frameId<=s+30)&(c.club!='football')].itertuples():
  i=int(z.nflId);pos[i]=players.get(i,'');(off if z.club==row.possessionTeam else df).add(i)
  frames[int(z.frameId)-s][i]=(rounded(z.x),rounded(z.y))
 record('nfl',{'id':f'{key[0]}:{key[1]}','frames':frames,'off':off,'def':df,'pos':pos,'los':rounded(ball.iloc[0].x),'sign':sign,'end':end,'concept':{'INSIDE ZONE':'insideZone','OUTSIDE ZONE':'outsideZone'}.get(row.pff_runConceptPrimary,'other'),'down':int(row.down),'distance':float(row.yardsToGo)})
output={'schema':'run-displacement-proximity-pilot-v1','sourceSha256':args.native_source,'pilot':'BDB2025 tracking week1 (NFL2022 week1) versus eight pinned native games. Descriptive pilot, not a population estimate or calibration.','operator':'10Hz centers rounded to0.1yd. Signed displacement from snap; positive toward the defensive end zone. Line players use roster position and snap depth[-0.5,2]yd; five OL use depth[-2,0.7]yd. Persistence requires proximity to any OL for80% of frames from0.5s through the slice and at the slice. Thresholds:1/1.5yd. OLTE includes attached TE.','censoring':'Slices strictly precede the ending event: native duration or NFL tackle/out/TD/fumble/slide. Missing tracking rows are excluded. CommonLive3s retains the same players through0.5–3s.','counts':dict(counts),'metrics':{f'{s}|{g}|{t/10:g}s':summary(v) for (s,g,t),v in metrics.items()},'inputPins':pins+[{'path':str(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}],'metadataPins':[{'path':str(D/n),'sha256':hashlib.sha256((D/n).read_bytes()).hexdigest()} for n in ('players.csv','plays.csv')],'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'limits':['Motion near OL can include pursuit, shedding, gap exchanges and voluntary retreat. Proximity to two OL does not establish a double team.','Rosters, fronts, skill, effort, context and concepts differ. Entry-speed and role sensitivities do not remove these differences.','One NFL week; line-player observations are clustered within plays. Do not infer league frequencies or fit force parameters.','Displacement starts at the snap, not initial contact. Rounding reduces precision differences and adds noise.','NFL ending labels can miss downing; native endings include falls. The fixed3s cohort controls changing eligibility, not every censoring bias.']}
(OUT/'pilot.json').write_text(json.dumps(output,indent=1)+'\n')
(OUT/'details.json').write_text(json.dumps(details)+'\n')
print('complete',dict(counts),flush=True)
print({k:v for k,v in output['metrics'].items() if '@1.5:' in k and k.count(':')==1},flush=True)
