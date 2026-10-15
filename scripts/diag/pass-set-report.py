"""Reduce existing paired native openings. Zero new simulation."""
import gzip
import hashlib
import json
import math
import os
from pathlib import Path

import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'out/pass-set-opening')
out=Path('data/reviews/current/pass-set-opening')
out.mkdir(parents=True,exist_ok=True)
names=['baseline','accelerating-p040','accelerating-lt','stationary-p040',
       'installed-set-p040','baseline-p019','accelerating-p019',
       'contact-reach-p040','downfield-seed-p040','measured-speed-p040',
       'measured-speed-p019','measured-seed-pair']
packets={name:json.loads(gzip.decompress((root/name/'trace.json.gz').read_bytes())) for name in names}
rows={name+(f'-p{r["play"]:03}' if len(p['rows'])>1 else ''):r
      for name,p in packets.items() for r in p['rows']}
def distance(a,b):
    return math.hypot(a['x']-b['x'],a['y']-b['y'])
def nearest_frame(row,t):
    return min(row['frames'],key=lambda f:abs(f['t']-t))
def phi(frame,b,d):
    q=frame['before'][0]['pos']; b=frame['before'][b]['pos']; d=frame['before'][d]['pos']
    ax=q['x']-d['x'];ay=q['y']-d['y']; n=math.hypot(ax,ay);ax/=n;ay/=n
    bx=b['x']-d['x'];by=b['y']-d['y'];n=math.hypot(bx,by);bx/=n;by/=n
    return math.atan2(-(-bx*ay+by*ax),bx*ax+by*ay)/(math.pi/2)
summaries=[]
for name,row in rows.items():
    contacts=[]
    for e in row['observedEvents']:
        if e['type']=='block_contact' and e['a'] in [1,2]:
            f=nearest_frame(row,e['t'])
            contacts.append(dict(t=e['t'],blocker=e['a'],defender=e['b'],phi=phi(f,e['a'],e['b'])))
    final=row['frames'][-1]['after']
    impacts=row['teammateImpacts']
    first=next(d for d in row['decisions'] if d['slot']=='LT' and d.get('cutoff'))
    actual=nearest_frame(row,first['t']+first['cutoff']['tau'])['before'][first['target']]['pos']
    summaries.append(dict(name=name,play=row['play'],arm=row['arm'],endTime=row['endTime'],
                          censoring=row['censoring'],nativeFilmParity=row['nativeFilmParity'],
                          nativeEventParity=row['nativeEventParity'],contacts=contacts,
                          sheds=[e for e in row['observedEvents'] if e['type']=='shed'],
                          teammateImpactCount=len(impacts),
                          teammateImpactImpulse=sum(c['impulse'] for c in impacts),
                          firstLtCutoff=first['cutoff'],firstLtCommand=first['raw'],
                          firstForecastError=distance(first['cutoff']['rusherPoint'],actual),
                          edgeDistancesToQbAtEnd=[distance(final[i]['pos'],final[0]['pos']) for i in [11,12]],
                          elapsedSeconds=row['elapsedSeconds']))
row=rows['baseline']
first=next(d for d in row['decisions'] if d['slot']=='LT' and d.get('cutoff'))
deadline=first['t']+first['cutoff']['tau']
actual=nearest_frame(row,deadline)['before'][first['target']]['pos']
witness=dict(schema='pass-cutoff-first-request-v1',sourceSha256=packets['baseline']['receipt']['sourceSha256'],
             id='spread-air',index=39,play=40,firstRequest=first,
             actualRusherAtForecastDeadline=actual,
             rusherForecastError=distance(first['cutoff']['rusherPoint'],actual),
             initialization=row['initialization'],
             qualification='Diagnostic witness, not a serialized World restart. Reconstruct through saved-native-play.mjs with the original roster/input manifest. The free-body probe holds one request; it is not a reachable-set oracle.')
(out/'first-request-witness.json').write_text(json.dumps(witness,indent=2)+'\n')
(out/'summary.json').write_text(json.dumps(dict(schema='pass-set-opening-summary-v1',
    sourceSha256=packets['baseline']['receipt']['sourceSha256'],fullGames=0,
    retainedRuntimeChanges=0,decision='Reject the tested replacements; preserve the forecast witness',rows=summaries),indent=2)+'\n')

# Read-only command accounting at one loaded tick. Field-x give-ground and
# contact-tangent mirror are different axes. This flags a contract question,
# not a proven bug or a tested replacement for the loaded controller.
f=nearest_frame(rows['baseline'],1.4)
q,b,d=(f['before'][i]['pos'] for i in [0,1,11])
vx,vy=(f['final'][1]['vel'][k] for k in ['x','y'])
length=distance(q,d);axis=((q['x']-d['x'])/length,(q['y']-d['y'])/length)
lat=(-axis[1],axis[0]);vlat=vy/lat[1];kick=lat[0]*vlat-vx
loaded=dict(schema='pass-loaded-foot-accounting-v1',t=f['t'],
    qualification='Algebraic projection of an existing request. Not proof that field-x give-ground is wrong; no contact-controller change tested.',
    blocker=1,defender=11,qb=0,axis=axis,tangent=lat,
    requested=f['final'][1],entry=f['before'][1],achieved=f['after'][1],
    inferredMirrorTerm=vlat,inferredFieldXKick=kick,
    actualNormalRequest=vx*axis[0]+vy*axis[1],
    actualTangentRequest=vx*lat[0]+vy*lat[1],
    extraTangentFromFieldX=kick*axis[1],
    rawBehaviorRequest=f['raw'][1],
    finalIncludesTechniqueAndSpacing=True,
    source='src/sim/engagement.ts:stepPassRep',
    nextQuestion='Is field-x kick intentional under the contact-relative mirror budget? Review before any replacement; retain P019.')
(out/'loaded-foot-witness.json').write_text(json.dumps(loaded,indent=2)+'\n')

attempts=[]
launcher_dir=root/'launchers' if (root/'launchers').exists() else root
for path in sorted(launcher_dir.glob('*launcher.json')):
    x=json.loads(path.read_text())
    attempts.append(dict(file=path.name,exitCode=x['exitCode'],
        commands=x['commands'],inputsUnchanged=x.get('inputsUnchanged'),
        startedAt=x['startedAt'],finishedAt=x['finishedAt']))
(out/'cost.json').write_text(json.dumps(dict(schema='pass-set-cost-v1',
    fullGames=0,prefixReplays=0,newRosters=0,
    completedOpeningSegments=sum(len(p['rows']) for p in packets.values()),
    failedCompletedOpeningSegments=1,probeAttempts=2,
    commandWallSeconds=sum(c['elapsedSeconds'] for a in attempts for c in a['commands']),
    nativeLoopSeconds=sum(r['elapsedSeconds'] for r in rows.values()),
    attempts=attempts),indent=2)+'\n')

os.environ.setdefault('MPLCONFIGDIR','/tmp/football-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10})
fig,axes=plt.subplots(2,2,figsize=(11,6.4),layout='constrained')
game=json.loads(gzip.decompress(Path('data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz').read_bytes()))
for line,(old,new,label) in enumerate([('baseline','accelerating-p040','P040: failed outside set'),
                                     ('baseline-p019','accelerating-p019','P019: opposing useful block')]):
    los=game['log'][rows[old]['index']]['replay']['los']
    for name,color,legend in [(old,'#2563eb','Recorded controller'),(new,'#c2410c','Acceleration estimate')]:
        r=rows[name];ts=[f['t'] for f in r['frames']]
        depth=[los-f['before'][1]['pos']['x'] for f in r['frames']]
        separation=[distance(f['before'][11]['pos'],f['before'][0]['pos']) for f in r['frames']]
        axes[line,0].plot(ts,depth,color=color,label=legend,lw=2)
        axes[line,1].plot(ts,separation,color=color,label=legend,lw=2)
        shed=next((e for e in r['observedEvents'] if e['type']=='shed' and e.get('b')==1),None)
        if shed:
            f=nearest_frame(r,shed['t']);axes[line,1].scatter([shed['t']],[distance(f['before'][11]['pos'],f['before'][0]['pos'])],color=color,s=38,zorder=4)
    axes[line,0].set(title=label+' — LT depth',ylabel='Yards behind LOS',xlabel='Seconds after snap')
    axes[line,1].set(title=label+' — actual edge access',ylabel='DE_W distance to QB (yd)',xlabel='Seconds after snap')
    for ax in axes[line]:ax.grid(alpha=.18);ax.legend(fontsize=8)
fig.suptitle('More depth alone does not establish protection · dots mark LT sheds',fontsize=13)
fig.savefig(out/'protection-comparison.png',dpi=155)
print(json.dumps({'nativeSimulations':0,'files':['summary.json','first-request-witness.json','protection-comparison.png']}))
