"""Compare verified NFL week-one run lines with saved accepted Ace snapshots.
No simulation. Provider tracking stays local; output contains aggregates only.
"""
import argparse
import csv
import gzip
import hashlib
import json
from collections import Counter,defaultdict
from pathlib import Path
import subprocess
import time
import numpy as np
import pandas as pd
from run_line_geometry import normalize,measure

TIMES=(0.,.4,1.2,1.6,2.,2.4)
OL={'T','G','C','OT','OG','OC'}
END={'tackle','out_of_bounds','touchdown','fumble','qb_slide','safety'}
BASE='a1b16e666a9ee7d1bc1d2aecba141fc535863b24'
SOURCE='e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--bdb-dir',type=Path,default=Path('data/raw/bdb2025-line-audit/big-data-bowl-data'))
parser.add_argument('--out',type=Path,default=Path('out/run-nfl-line-audit'))
args=parser.parse_args();start=time.perf_counter()
sha=lambda b:hashlib.sha256(b).hexdigest()
def runtime_hash():
    h=hashlib.sha256()
    for p in sorted((p for p in Path('src').rglob('*') if p.is_file()),key=str):
        h.update(str(p).encode());h.update(b'\0');h.update(p.read_bytes());h.update(b'\0')
    return h.hexdigest()
assert runtime_hash()==SOURCE
acquisition=json.loads((args.out/'acquisition.json').read_text())
assert acquisition['selectedMembersIndividuallyVerified'] and len(acquisition['members'])==4
for pin in acquisition['members']:
    p=args.bdb_dir/pin['file'];assert p.stat().st_size==pin['bytes']
    h=hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda:f.read(1<<20),b''):h.update(block)
    assert h.hexdigest()==pin['sha256']
with (args.bdb_dir/'players.csv').open() as f:position={r['nflId']:r['position'] for r in csv.DictReader(f)}
def key(g,p):
    assert int(p)<10000
    return int(g)*10000+int(p)
rushers=defaultdict(list)
with (args.bdb_dir/'player_play.csv').open() as f:
    for r in csv.DictReader(f):
        if r['hadRushAttempt'] in ('1','TRUE'):rushers[key(r['gameId'],r['playId'])].append(r['nflId'])
counts=Counter();meta={}
with (args.bdb_dir/'plays.csv').open() as f:
    for r in csv.DictReader(f):
        if r['playNullifiedByPenalty']!='N' or r['isDropback']!='FALSE' or r['rushLocationType'] in ('','NA'):continue
        if any(r.get(k) in ('1','TRUE') for k in ['qbKneel','qbSpike','qbSneak']) or r['pff_runConceptPrimary']=='SNEAK':continue
        counts['eligibleMetadataAllNineWeeks']+=1;k=key(r['gameId'],r['playId']);rs=rushers[k]
        if len(rs)!=1 or position.get(rs[0])!='RB':counts['metadataExcludedNonSingleRBRusherAllNineWeeks']+=1;continue
        meta[k]=r
offense={k:r['possessionTeam'] for k,r in meta.items()}
columns=['gameId','playId','nflId','frameId','frameType','club','playDirection','x','y','event']
parts=[];read_rows=0
for chunk in pd.read_csv(args.bdb_dir/'tracking_week_1.csv',usecols=columns,chunksize=300000,keep_default_na=False,
        dtype={'nflId':str,'club':str,'frameType':str,'event':str}):
    read_rows+=len(chunk);keys=chunk.gameId*10000+chunk.playId
    relevant=keys.isin(meta)&chunk.frameType.ne('BEFORE_SNAP')
    c=chunk.loc[relevant].copy();k=c.gameId*10000+c.playId
    c=c.loc[c.club.eq('football')|c.club.eq(k.map(offense))]
    parts.append(c)
    if len(parts)%5==0:print('tracking rows read',read_rows,'retained',sum(len(c) for c in parts),flush=True)
track=pd.concat(parts,ignore_index=True);print('tracking retained',len(track),flush=True)
cohorts=['allRBHandoffs','outsideZone','outsideZoneUnderCenter','outsideZoneUnderCenter12','outsideZoneUnderCenter12TwoAttached']
values={c:defaultdict(lambda:defaultdict(list)) for c in cohorts};cohort_counts=Counter({co:0 for co in cohorts});censor=Counter()
attachment_diagnostic=Counter()
for (gid,pid),c in track.groupby(['gameId','playId'],sort=False):
    r=meta[key(gid,pid)];counts['week1TrackedRBCandidates']+=1
    snap=c.loc[c.frameType.eq('SNAP'),'frameId'].unique()
    if len(snap)!=1:counts['excludedMissingOrMultipleSnap']+=1;continue
    snap=int(snap[0]);c=c.loc[c.frameId>=snap]
    events={name:int(frame) for name,frame in c.groupby('event').frameId.min().items()}
    if 'handoff' not in events:counts['excludedNoHandoff']+=1;continue
    if 'pass_forward' in events or 'pass_shovel' in events:counts['excludedPassAfterSnap']+=1;continue
    ball=c.loc[c.club.eq('football')&c.frameId.eq(snap)]
    if len(ball)!=1:counts['excludedMissingSnapBall']+=1;continue
    ball=ball.iloc[0];attack=1 if ball.playDirection=='right' else -1
    assert ball.playDirection in ('right','left')
    players=c.loc[c.club.ne('football')];sn=players.loc[players.frameId.eq(snap)]
    snap_points={str(z.nflId):(float(z.x),float(z.y)) for z in sn.itertuples()}
    initial=normalize(snap_points,float(ball.x),float(ball.y),attack)
    ol=[i for i in initial if position.get(i) in OL and -2<=initial[i][0]<=.7]
    if len(ol)!=5:counts['excludedNotFiveIdentifiedLineOL']+=1;continue
    counts['qualifiedWeek1RBHandoffs']+=1
    initial_positions=Counter(position.get(i,'unknown') for i in initial)
    qb=[i for i in initial if position.get(i)=='QB'];center=[i for i in ol if position.get(i) in {'C','OC'}]
    uc=None
    if len(qb)==len(center)==1:
        gap=initial[center[0]][0]-initial[qb[0]][0]
        uc=0<=gap<=2.5 and abs(initial[center[0]][1]-initial[qb[0]][1])<=1
    else:counts['underCenterProxyUnknown']+=1
    twelve=len(initial)==11 and initial_positions['TE']==2 and initial_positions['RB']==1 and initial_positions['WR']==2 and initial_positions['QB']==1 and initial_positions['FB']==0
    te=[i for i in initial if position.get(i)=='TE'];lo=min(initial[i][1] for i in ol);hi=max(initial[i][1] for i in ol)
    attached=[i for i in te if -1.2<=initial[i][0]<=.7 and ((lo-2<=initial[i][1]<lo) or (hi<initial[i][1]<=hi+2))]
    both_attached=len(attached)==2 and min(initial[i][1] for i in attached)<lo and max(initial[i][1] for i in attached)>hi
    selected=['allRBHandoffs']
    if r['pff_runConceptPrimary']=='OUTSIDE ZONE':
        selected.append('outsideZone')
        if uc:
            selected.append('outsideZoneUnderCenter')
            if twelve:
                selected.append('outsideZoneUnderCenter12')
                if both_attached:selected.append('outsideZoneUnderCenter12TwoAttached')
    if 'outsideZoneUnderCenter12' in selected:
        attachment_diagnostic['plays']+=1
        attachment_diagnostic['officialFormation:'+r['offenseFormation']]+=1
        attachment_diagnostic['twoTEOppositeOLSides']+=int(min(initial[i][1] for i in te)<lo and max(initial[i][1] for i in te)>hi)
        attachment_diagnostic['twoTEWithin2ydOutsideOLEnds']+=int(all(lo-2<=initial[i][1]<lo or hi<initial[i][1]<=hi+2 for i in te))
        attachment_diagnostic['twoTEAtDeclaredAbsoluteLineDepth']+=int(all(-1.2<=initial[i][0]<=.7 for i in te))
    for co in selected:cohort_counts[co]+=1
    ends=[frame for name,frame in events.items() if name in END]
    end=min(ends) if ends else int(c.frameId.max())
    if not ends:counts['missingTerminalEventUseTrackingBoundary']+=1
    for label,frame in [(f'{t:g}s',snap+int(round(t*10))) for t in TIMES]+[('handoff',events['handoff'])]:
        if frame>=end:
            for co in selected:censor[f'{co}|{label}|endedOrCensored']+=1
            continue
        f=players.loc[players.frameId.eq(frame)]
        current=normalize({str(z.nflId):(float(z.x),float(z.y)) for z in f.itertuples()},float(ball.x),float(ball.y),attack)
        measured=measure(initial,current,ol)
        if measured is None:
            for co in selected:censor[f'{co}|{label}|missingOLTracking']+=1
            continue
        for co in selected:
            for metric,value in measured.items():values[co][label][metric].append(value)
    for co in selected:
        values[co]['timing']['handoff_s'].append((events['handoff']-snap)/10)

def summary(v):
    a=np.asarray(v,dtype=float)
    return {'n':len(v),'mean':float(a.mean()),**{f'p{int(q*100)}':float(np.quantile(a,q)) for q in [.1,.25,.5,.75,.9,.95]}} if len(v) else {'n':0}
nfl={co:{t:{m:summary(v) for m,v in ms.items()} for t,ms in times.items()} for co,times in values.items()}
shared=Path('data/reviews/current/ace-production-observations.json.gz')
assert sha(shared.read_bytes())=='ad462904b23c6864d902107f6a0aa3a876b4e35d3247db8dfaebb835276ae10b'
saved=json.loads(gzip.decompress(shared.read_bytes()));assert saved['provenance']['sourceSha256']==SOURCE
sim=[]
for r in saved['panel']:
    actors={a['idx']:a for a in r['actors']};ol=[i for i,a in actors.items() if a['slot'] in ['LT','LG','C','RG','RT']]
    los=r['setup']['los'];by=r['setup']['ballY'];initial=normalize({i:tuple(a['initialBody']['pos'][k] for k in ['x','y']) for i,a in actors.items()},los,by,1)
    snapshots={};support={}
    for f in r['detailedFrames']:
        for field,t in [('afterBodies',f['after']),('before',f['t'])]:
            snapshots[round(t,8)]={a['idx']:(a['pos']['x'],a['pos']['y']) for a in f[field]}
            support[round(t,8)]={a['idx']:a.get('support',{}).get('state') for a in f[field]}
    observations={};handoff=next(e['t'] for e in r['summary']['result']['events'] if e['type']=='handoff')
    for label,t in [(f'{t:g}s',t) for t in TIMES]+[('handoff',handoff)]:
        assert t<r['summary']['duration']
        exact={i:tuple(a['initialBody']['pos'][k] for k in ['x','y']) for i,a in actors.items()} if t==0 else snapshots[round(t,8)]
        current=normalize(exact,los,by,1)
        measurements=measure(initial,current,ol);assert measurements is not None
        observations[label]={'t':t,'metrics':measurements,'perOL':{
            actors[i]['slot']:{'depthPastLOS':current[i][0],'forwardFromSnap':current[i][0]-initial[i][0],
                'lateralFromSnap':current[i][1]-initial[i][1],'exactDepthPastLOS':exact[i][0]-los,
                'exactForwardFromSnap':exact[i][0]-actors[i]['initialBody']['pos']['x'],
                'support':actors[i].get('initialBody',{}).get('support',{}).get('state') if t==0 else support[round(t,8)][i]} for i in ol}}
    late=[]
    for t,points in sorted(snapshots.items()):
        if t>=r['summary']['duration']:continue
        initial_exact={i:actors[i]['initialBody']['pos']['x'] for i in ol}
        worst=max(ol,key=lambda i:initial_exact[i]-points[i][0])
        late.append({'t':t,'worstSlot':actors[worst]['slot'],'maxRetreatFromSnapExact':max(0,initial_exact[worst]-points[worst][0]),
            'deepestDepthPastLOSExact':min(points[i][0]-los for i in ol)})
    sim.append({'input':r['input'],'nativeSummary':r['summary'],'observations':observations,
        'handoff_s':handoff,'lateSampleMaximumRetreat':max(late,key=lambda p:p['maxRetreatFromSnapExact']),
        'lateSampleLimit':'Maximum over captured live snapshots, not a complete maximum or NFL percentile comparison.',
        'initialJobs':{actors[i]['slot']:actors[i]['initialBehavior'] for i in ol}})
assert runtime_hash()==SOURCE
result={'protocol':'run-nfl-line-position-audit-v1','testedRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    'acceptedDevelop':BASE,'runtimeSourceSha256':SOURCE,'historicalComparison':'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
    'settings':saved['provenance'],'sourcePacketSha256':sha(shared.read_bytes()),'NFL':{
        'source':'Big Data Bowl2025 / NFL2022 week1, PFF primary run labels; verified original provider members.',
        'counts':dict(counts),'cohortCounts':dict(cohort_counts),'attachmentDiagnostic':dict(attachment_diagnostic),'censoring':dict(censor),'cohorts':nfl,
        'inputPins':acquisition['members'],'trackingRowsRead':read_rows},'native':sim,
    'operator':{'path':'scripts/diag/zone/run_line_geometry.py','sha256':sha(Path('scripts/diag/zone/run_line_geometry.py').read_bytes()),
        'times':TIMES,'coordinates':'Both sources: x toward offense goal from snap-ball/declared LOS, y rotated with attack and centered on snap ball; positions rounded0.1yd.',
        'retreat':'Largest negative individual OL movement from snap, clipped at0; distinct from depth behind LOS.',
        'aggregation':'One five-OL observation per play at each slice; group percentiles are descriptive, not confidence intervals.',
        'censoring':'Exact snapshot with all five OL and slice strictly before ending/recording boundary; no interpolation/forward filling.',
        'underCenter':'Snap QB-C longitudinal gap0–2.5yd and lateral gap<=1yd; alignment proxy, not verified coaching classification.',
        '12':'Exactly11 offensive players including five identified OL, oneQB, oneRB, twoWR, twoTE, noFB; roster-position proxy.',
        'twoAttached':'Both TE snap depth[-1.2,.7]yd, one just outside each OL end within2yd; geometry proxy.',
        'limits':['NFL OUTSIDE ZONE does not separately label wide zone/toss or actual block assignments.',
            'NFL has no requested actions/forces; retreat can be voluntary, not a measured push.',
            'Three selected Ace calls share one roster/seed/front; no current engine population claim.',
            'Old broad simulation cohorts are historical and not evidence of current frequency.',
            'Known center-hand angular-law limitation is unchanged.']},
    'newWorldSteps':0,'newSimulationPlays':0,'newGames':0,'candidateAwarenessEvaluated':False,
    'collectorSha256':sha(Path(__file__).read_bytes()),'elapsedSeconds':time.perf_counter()-start}
args.out.mkdir(parents=True,exist_ok=True);(args.out/'audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'qualifiedNFLPlays':counts['qualifiedWeek1RBHandoffs'],'cohortCounts':dict(cohort_counts),'savedSimCases':len(sim),'newSimulationPlays':0,'elapsedSeconds':result['elapsedSeconds']}))
