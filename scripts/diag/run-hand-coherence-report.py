"""Sharded native control comparison; all adverse/censored rows survive."""
import json,gzip,hashlib,sys
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else 'out/run-hand-coherence')
manifest=json.loads(Path('docs/reviews/run-hand-coherence-inputs.json').read_text())
arms=['baseline','default','hands','coherent-hands','seal-hands','components-hands','components-seal-hands','combined-hands','combined-seal-hands']
present=[name for name in arms if (root/f'{name}-index.json').exists()]
def load(path):return json.loads(gzip.decompress(Path(path).read_bytes()))
def metrics(p):
 rb=next(a['id'] for a in p['players'] if a['slot']=='RB');seats={a['id']:a['slot'] for a in p['players']}
 e=next((e for e in p['events'] if e['type']=='carrier_contact' and rb in [e.get('a'),e.get('b')]),None)
 crossing=next((f['after'] for f in p['frames'] if f.get('carrier')==rb and f['agents'][rb]['pos']['x']>=40),None)
 approach='ended-unreached' if crossing is None and not p['live'] else 'live-unreached' if crossing is None else 'clean' if not e or e['t']>crossing else 'same-step-uncertain' if e['t']>=crossing-.05-1e-8 else 'interrupted'
 requested=retained=0;suppressed=[]
 for f in p['frames']:
  for c in f['contactEvents']:
   if c['phase']!='movement':continue
   policy=c.get('handCoherence')
   if policy:
    requested+=1
    if policy['retained']:retained+=1
    elif not any(c['blocker']==old['blocker'] and c['defender']==old['defender'] for old in suppressed):
     suppressed.append({'t':f['t'],'blocker':c['blocker'],'defender':c['defender'],'slots':[seats[c['blocker']],seats[c['defender']]],'requested':policy['requested'],'retained':policy['retained'],'blockerCommand':c['command'],'defenderVelocity':c['defenderVel'],'surfaceTangent':c['lat']})
 return {'id':p['input']['id'],'outcome':p['outcome'],'gain':p['gain'],'endTime':p['endTime'],'censored':p['live'],'approach':approach,'firstContact':e['t'] if e else None,'crossingBoundary':crossing,'policyRequests':requested,'policyRetained':retained,'firstSuppressedPairs':suppressed}
summary={'protocol':'run-hand-coherence-results-v1','comparisonCommit':manifest['comparisonCommit'],'manifestSha256':hashlib.sha256(Path('docs/reviews/run-hand-coherence-inputs.json').read_bytes()).hexdigest(),'window':25,'arms':{name:{'rows':[],'receipts':[],'limits':{'armImpulseExcess':0,'armWorkExcess':0,'supportWorkExcess':0,'workResidual':0}} for name in present},'comparisons':[]}
for shard in range(6):
 base=load(root/f'baseline-{shard:02}.json.gz');byid={p['input']['id']:p for p in base['panel']}
 assert base['provenance']['commit']==manifest['comparisonCommit']
 for name in present:
  path=root/f'{name}-{shard:02}.json.gz'
  if not path.exists():continue
  d=base if name=='baseline' else load(path);receipt=json.loads((root/f'{name}-{shard:02}-receipt.json').read_text())
  assert receipt['exitCode']==0 and receipt['inputsUnchanged']
  assert receipt['flags']==d['provenance']['flags'] and receipt['flags']['RUN_CONTACT_TRACK']=='0'
  arm=summary['arms'][name];arm['receipts'].append({'flags':receipt['flags'],'sourceSha256':receipt['sourceSha256'],'validationSha256':receipt['validationSha256'],'collectorSha256':d['provenance']['probeSha256'],'commit':receipt['commit']})
  for p in d['panel']:
   b=byid[p['input']['id']]
   assert p['observerNeutral'] and p['input']==b['input'] and p['initial']==b['initial']
   assert [a['profile'] for a in p['players']]==[a['profile'] for a in b['players']]
   if name=='default':assert p['hashes']==b['hashes'],p['input']['id']
   for f in p['frames']:
    q=f['physicsInput']['report'];lim=arm['limits']
    for metric,limit,target in [('armImpulse','armImpulseLimit','armImpulseExcess'),('armWork','armWorkLimit','armWorkExcess'),('supportMotorWork','supportMotorWorkLimit','supportWorkExcess')]:lim[target]=max(lim[target],*[a-b for a,b in zip(q[metric],q[limit])])
    lim['workResidual']=max(lim['workResidual'],abs(q['work']['residual']))
   arm['rows'].append(metrics(p))
  print(name,shard,len(d['panel']),flush=True)
for old,new in [('hands','coherent-hands'),('hands','seal-hands'),('components-hands','components-seal-hands'),('combined-hands','combined-seal-hands')]:
 if old not in present or new not in present:continue
 before={r['id']:r for r in summary['arms'][old]['rows']};pairs=[]
 for r in summary['arms'][new]['rows']:
  b=before[r['id']];pairs.append({'id':r['id'],'before':b,'after':r,'gainDifference':r['gain']-b['gain'],'lostClean':b['approach']=='clean' and r['approach'] not in ['clean','same-step-uncertain'],'gainedClean':r['approach']=='clean' and b['approach'] not in ['clean','same-step-uncertain']})
 summary['comparisons'].append({'old':old,'new':new,'pairs':pairs,'lostClean':sum(p['lostClean'] for p in pairs),'gainedClean':sum(p['gainedClean'] for p in pairs)})
summary['observedPlainPairs']=sum(len(a['rows']) for a in summary['arms'].values());summary['completeDefaultParity']=len(summary['arms']['default']['rows'])
(root/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
print('stored pairs',summary['observedPlainPairs'],'default parity',summary['completeDefaultParity'],flush=True)
for c in summary['comparisons']:print(c['old'],c['new'],'lost',c['lostClean'],'gained',c['gainedClean'],flush=True)
