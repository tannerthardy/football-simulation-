"""Package the saved pass-cutoff comparisons. Zero new simulations."""
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'out/pass-loaded-objective')
out=Path('data/reviews/current/pass-cutoff-approach')
out.mkdir(parents=True,exist_ok=True)
names=['axis-lt','cutoff-through','cutoff-through-ends','punch-baseline',
       'retained-punch','transfer-baseline','transfer-candidate',
       'production-controls','production-transfer']
packets={n:json.loads(gzip.decompress((root/n/'trace.json.gz').read_bytes())) for n in names}
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
write=lambda name,value:(out/name).write_text(json.dumps(value,indent=2)+'\n')
distance=lambda a,b:math.hypot(a['x']-b['x'],a['y']-b['y'])
def phi(frame,blocker,defender):
    a=frame['before'];q,b,d=(a[i]['pos'] for i in [0,blocker,defender])
    ax,ay=q['x']-d['x'],q['y']-d['y'];bx,by=b['x']-d['x'],b['y']-d['y']
    return math.atan2(-(-bx*ay+by*ax),bx*ax+by*ay)/(math.pi/2)
def at(row,t):
    return min(row['frames'],key=lambda f:abs(f['t']-t))
def events(row):
    return row.get('observedEvents',row.get('events',[]))
def case(name,index):
    return next(r for r in packets[name]['rows'] if r['index']==index)

summaries=[]
for name,p in packets.items():
    for row in p['rows']:
        contacts=[dict(t=e['t'],b=e['a'],d=e['b'],phi=phi(at(row,e['t']),e['a'],e['b']))
                  for e in events(row) if e['type']=='block_contact' and e['a'] in [1,2,5]]
        cutoff=3.0 if row['index']==18 else 2.0
        impacts=[c for c in row['teammateImpacts'] if c['t']<=cutoff+1e-8]
        summaries.append(dict(name=name,index=row['index'],play=row['play'],arm=row['arm'],
            endTime=row['endTime'],censoring=row['censoring'],contacts=contacts,
            events=[e for e in events(row) if e['type'] in ['shed','pressure','throw','catch','sack','incomplete']],
            openingImpactWindow=cutoff,openingImpactCount=len(impacts),
            openingImpactImpulse=sum(c['impulse'] for c in impacts),
            elapsedSeconds=row['elapsedSeconds']))

# Actual runtime patch must reproduce every physical frame/event and observed
# contact choice of the earlier single-mechanism diagnostic, including harms.
parity=[]
for production,prototype in [('production-controls','cutoff-through-ends'),
                             ('production-transfer','transfer-candidate')]:
    for a,b in zip(packets[production]['rows'],packets[prototype]['rows']):
        checks={k:a[k]==b[k] for k in ['frames','observedEvents','engagementStarts','telemetry','initialization']}
        assert all(checks.values()),(production,a['index'],checks)
        parity.append(dict(index=a['index'],checks=checks))
for name in ['punch-baseline','transfer-baseline']:
    assert all(r['nativeFilmParity'] and r['nativeEventParity'] for r in packets[name]['rows'])
assert all(len(p['receipt']['flags'])==44 for p in packets.values())
assert all(p['receipt']['flags']==packets['production-controls']['receipt']['flags'] for p in packets.values())

timeline=[]
for name in ['punch-baseline','production-controls']:
    row=case(name,39)
    for t in [.05,.2,.4,.6,.8,1.,1.2]:
        f=at(row,t)
        for i,slot in [(1,'LT'),(2,'RT')]:
            timeline.append(dict(name=name,t=t,slot=slot,position=f['before'][i]['pos'],
                entryVelocity=f['before'][i]['vel'],raw=f['raw'][i],final=f['final'][i],
                achievedVelocity=f['after'][i]['vel'],achievedPosition=f['after'][i]['pos'],
                outsideProgress=abs(f['before'][i]['pos']['y']-row['initialization']['ballY'])-2.6))
access=[]
for name in ['punch-baseline','production-controls','retained-punch']:
    f=at(case(name,39),2.4)
    access.append(dict(name=name,t=f['t'],qb=f['before'][0]['pos'],
        deW=f['before'][11]['pos'],deS=f['before'][12]['pos'],
        deWDistanceToQb=distance(f['before'][11]['pos'],f['before'][0]['pos']),
        deSDistanceToQb=distance(f['before'][12]['pos'],f['before'][0]['pos'])))
write('summary.json',dict(schema='pass-cutoff-approach-v1',
    testedCommit='81b908586416070145b5b89ee9517380c4fe09fe',
    sourceSha256=packets['production-controls']['receipt']['sourceSha256'],
    decision='Recommend review of this bounded approach correction; preserve adverse and execution-sensitive outcomes. No baseline promotion.',
    fullGames=0,rows=summaries,actualAccessAt2p4=access))
write('opening-timeline.json',timeline)
write('prototype-parity.json',parity)

receipts=root/'launchers' if (root/'launchers').exists() else root
attempts=[]
for path in sorted(set(receipts.glob('*launcher.json'))|set(receipts.glob('focused.json'))|set(receipts.glob('typecheck.json'))):
    x=json.loads(path.read_text())
    attempts.append(dict(file=path.name,exitCode=x['exitCode'],commands=x['commands'],
        startedAt=x['startedAt'],finishedAt=x['finishedAt'],inputsUnchanged=x.get('inputsUnchanged')))
write('cost.json',dict(fullGames=0,prefixReplays=0,newRosters=0,
    completedCollectorSegments=sum(len(p['rows']) for p in packets.values()),
    uniqueNativeInputs=3,failedHarnessStarts=2,
    commandWallSeconds=sum(c['elapsedSeconds'] for a in attempts for c in a['commands']),
    nativeCollectorCommandSeconds=sum(c['elapsedSeconds'] for a in attempts if a['file'] not in ['focused.json','typecheck.json'] for c in a['commands']),
    nativeLoopSeconds=sum(r['elapsedSeconds'] for p in packets.values() for r in p['rows']),
    focusedChecks=17,attempts=attempts))

if root.resolve()!=out.resolve():
    for n in names:
        (out/n).mkdir(exist_ok=True)
        for f in ['trace.json.gz','receipt.json']:shutil.copyfile(root/n/f,out/n/f)
    (out/'launchers').mkdir(exist_ok=True)
    for a in attempts:shutil.copyfile(receipts/a['file'],out/'launchers'/a['file'])
    shutil.copyfile(root/'accounting.json',out/'accounting.json')
(out/'pass-cutoff.patch').write_bytes(subprocess.check_output(['git','diff','db77674b0e2493017d8778c5cdc5dd1420e68002','81b908586416070145b5b89ee9517380c4fe09fe','--','src/sim/behaviors/blocking.ts']))

os.environ.setdefault('MPLCONFIGDIR','/tmp/football-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10})
fig,axs=plt.subplots(2,2,figsize=(11,6.7),layout='constrained')
old=case('punch-baseline',39);new=case('production-controls',39)
for row,color,label in [(old,'#2563eb','Recorded'),(new,'#c2410c','Approach')]:
    fs=[f for f in row['frames'] if f['t']<=1.5]
    axs[0,0].plot([f['t'] for f in fs],[f['before'][1]['pos']['y']-row['initialization']['ballY']-2.6 for f in fs],color=color,label=label,lw=2)
    fs=[f for f in row['frames'] if .8<=f['t']<=2.8]
    for i,d,style,role in [(1,11,'-','LT'),(2,12,'--','RT')]:
        axs[0,1].plot([f['t'] for f in fs],[abs(phi(f,i,d)) for f in fs],style,color=color,label=label+' '+role,lw=1.8)
for name,color,label in [('punch-baseline','#2563eb','Recorded'),('production-controls','#c2410c','Approach')]:
    r=case(name,18);fs=[f for f in r['frames'] if f['t']<=3.15]
    axs[1,0].plot([f['t'] for f in fs],[distance(f['before'][11]['pos'],f['before'][0]['pos']) for f in fs],color=color,label=label,lw=2)
    axs[1,1].plot([f['t'] for f in fs],[abs(phi(f,5,13)) for f in fs],color=color,label=label,lw=2)
axs[0,0].set(title='P040: real LT lateral progress',ylabel='Outside progress from snap (yd)')
axs[0,1].set(title='P040: LT improves; RT loses earlier',ylabel='Absolute QB-relative angle / 90°')
axs[1,0].set(title='P019: useful left-edge protection remains',ylabel='DE_W distance to QB (yd)')
axs[1,1].set(title='P019: adverse interior access remains',ylabel='Absolute RG/DT_S angle / 90°')
for ax in [axs[0,1],axs[1,1]]:ax.axhline(1,color='#64748b',lw=1,alpha=.7)
for ax in axs.flat:ax.set_xlabel('Seconds after snap');ax.grid(alpha=.18);ax.legend(fontsize=8)
fig.suptitle('Approaching the cutoff changes real protection · adverse results retained',fontsize=13)
fig.savefig(out/'comparison.png',dpi=150)

measurement=['scripts/diag/pass-set-opening.mjs','scripts/diag/saved-native-play.mjs',
    'scripts/diag/pass-loaded-accounting.py','scripts/diag/pass-loaded-objective.mjs',
    'scripts/diag/pass-cutoff-report.py','test/pass-cutoff-approach.test.ts',
    'test/fixtures/pass-cutoff-inputs.json.gz','package-lock.json','config/baseline.json']
write('source-manifest.json',dict(schema='pass-cutoff-portable-v1',
    testedCommit='81b908586416070145b5b89ee9517380c4fe09fe',
    parent='db77674b0e2493017d8778c5cdc5dd1420e68002',
    sourceSha256=packets['production-controls']['receipt']['sourceSha256'],
    historicalComparatorSource='1ee8610175f7f9e7ebafcbdddfe2c2aab2162e945a7668cbd54579e4d5fb6309',
    node='22.23.3',flags=packets['production-controls']['receipt']['flags'],
    worldDefaults=packets['production-controls']['receipt']['worldDefaults'],
    originalManifest='data/reviews/current/experimental-game-inputs.json',
    originalManifestSha256=sha('data/reviews/current/experimental-game-inputs.json'),
    measurementFiles={f:sha(f) for f in measurement},
    evidenceFiles={str(p.relative_to(out)):sha(p) for p in sorted(out.rglob('*')) if p.is_file() and p.name!='source-manifest.json'}))
print(json.dumps({'nativeSimulations':0,'cases':len(summaries),'prototypeParity':parity,
    'cost':json.loads((out/'cost.json').read_text())['commandWallSeconds']}))
