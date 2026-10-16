"""Saved-only adjudication. No simulator execution."""
import gzip
import hashlib
import json
import sys
from pathlib import Path

root=Path('data/reviews/current/traffic-followup')
base=Path(sys.argv[1])
rows=[]
for name in ['A028','A018','A006']:
    before=json.loads(gzip.decompress((base/(name+'.json.gz')).read_bytes()))
    trial=json.loads(gzip.decompress((root/'trial'/(name+'.json.gz')).read_bytes()))
    differences=[a['t'] for a,b in zip(before['ticks'],trial['ticks']) if a['final']!=b['final']]
    first=differences[0] if differences else None
    incoming=next((t for t in before['ticks'] if t['t']==first),None)
    changed=next((t for t in trial['ticks'] if t['t']==first),None)
    hits=[dict(t=t['t'],**hit) for t in trial['ticks'] for hit in t['contacts']
          if hit['i']<11 and hit['j']<11 and hit['impulse']>1e-8]
    rows.append(dict(case=name,firstRequestDifference=first,
        incomingBodiesEqual=incoming['before']==changed['before'] if incoming else True,
        consumedPicturesEqual=incoming['pictures']==changed['pictures'] if incoming else True,
        stagesEqual=before['ticks']==trial['ticks'],eventsEqual=before['events']==trial['events'],
        beforePosition=before['ticks'][-1]['after'][6]['pos'],trialPosition=trial['ticks'][-1]['after'][6]['pos'],
        sampledImpacts=hits))
receipts=[]
for p in sorted((root/'receipts').glob('*.json')):
    r=json.loads(p.read_text());receipts.append(dict(file=p.name,commit=r['commit'],source=r['sourceSha256'],
        exitCode=r['exitCode'],seconds=sum(c['elapsedSeconds'] for c in r['commands'])))
result=dict(trial='bd765f061ee8a5e5e96405ae1607814cba3fbef6',
    source='551195eb7171a27734f0f209d2a394d4a990552b4e74cda7f5587e592d98972f',
    dependency='#94 runtime only, staged explicitly at1cee51b; not accepted development',
    baselineEvidence='4564a66c7b349975ad336ceb122a2aebba9863d1',
    decision='hold: sustained useful passage not established; collision alone is not rejection',
    cases=rows,receipts=receipts,totalLauncherSeconds=sum(r['seconds'] for r in receipts),
    newNativeContinuations=3,newSimulatedSeconds=10.7,newReferenceContinuations=0)
(root/'comparison.json').write_text(json.dumps(result,indent=2)+'\n')
manifest={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()
          for p in sorted(root.rglob('*')) if p.is_file() and p.name!='artifacts.json'}
(root/'artifacts.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(dict(cases=len(rows),launcherSeconds=result['totalLauncherSeconds'],payloads=len(manifest))))
