"""Inspect saved inputs/traces only; zero simulations. Run from research host."""
import gzip
import hashlib
import json
from pathlib import Path

raw=Path('out/backside-wall/trace.json.gz')
candidate=json.loads(gzip.decompress(raw.read_bytes()))
reference_path=Path('/workspace/football-mesh-admission-review/out/zone-access/reference/trace.json.gz')
reference=json.loads(gzip.decompress(reference_path.read_bytes()))
panel=Path('/workspace/shared/run-panel-bb6d4c7/accepted-broad-audit/cases')
out=Path('data/reviews/current/zone-backside-wall');out.mkdir(parents=True,exist_ok=True)
rows=[]
for r in candidate['rows']:
    old=json.loads((panel/f'{r["id"]}.json').read_text())
    item={'id':r['id'],'inputSha256':r['inputSha256'],'censor':r['censor'],
          'referenceInputMatches':r['inputSha256']==old['inputSha256'],
          'referencePanelSha256':hashlib.sha256((panel/f'{r["id"]}.json').read_bytes()).hexdigest(),
          'referenceLtEvents':[e for e in old['result']['events'] if e['type']=='block_contact' and e['a']==1],
          'candidateLtEvents':[e for e in r['events'] if e['type']=='block_contact' and e['a']==1],
          'referenceFirstRunnerContact':next((e for e in old['result']['events'] if e['type']=='carrier_contact'),None),
          'candidateFirstRunnerContact':next((e for e in r['events'] if e['type']=='carrier_contact'),None),
          'candidatePeerImpacts':[{'t':f['t'],**c} for f in r['frames'] for c in f['report']['contacts'] if c['i']<11 and c['j']<11 and c['impulse']>1e-8],
          'candidateKeyframes':[]}
    for t in (.3,.8,1.4,1.5,2.5,2.8):
        f=next(f for f in r['frames'] if f['t']==t)
        item['candidateKeyframes'].append({'t':t,'entering':[{'a':i,'pos':f['before'][i]['pos'],'vel':f['before'][i]['vel'],'raw':f['raw'][i],'final':f['final'][i]} for i in (1,6,11,15)],
          'reps':[e for e in f['afterReps'] if e['b']==1 or 1 in e['helpers']],
          'workResidual':f['report']['work']['residual']})
    if r['id']=='A027':
        ref=next(x for x in reference['rows'] if x['id']==r['id'])
        assert ref['inputSha256']==r['inputSha256']
        i=next(i for i,(a,b) in enumerate(zip(ref['frames'],r['frames'])) if a['raw']!=b['raw'])
        item['firstFork']={'t':r['frames'][i]['t'],'enteringBodiesExact':ref['frames'][i]['before']==r['frames'][i]['before'],'previousRngExact':ref['frames'][i-1]['rng']==r['frames'][i-1]['rng']}
        item['firstActorRawDifferences']={}
        for actor in (1,6,11,15):
            pair=next(((a,b) for a,b in zip(ref['frames'],r['frames']) if a['raw'][actor]!=b['raw'][actor]),None)
            item['firstActorRawDifferences'][actor]=None if pair is None else {'t':pair[0]['t'],'reference':pair[0]['raw'][actor],'candidate':pair[1]['raw'][actor]}
        item['referenceKeyframes']=[{'t':t,'bodies':[{'a':i,'pos':f['before'][i]['pos'],'vel':f['before'][i]['vel']} for i in (1,6,11,15)]}
          for t in (.3,.8,1.4,1.5,2.5,2.8) for f in ref['frames'] if f['t']==t]
    rows.append(item)
launchers=[json.loads(p.read_text()) for p in Path('out/baseline').glob('*.json')]
result={'disposition':'PARKED: changed assignment approach, but no demonstrated net useful-protection improvement; no production promotion.',
        'accepted':'bb6d4c73948d53ba841dd9338dd240146c739f8c','tested':'9147ccab26d3e52c122efec31248c38b0d9b7810',
        'receipt':candidate['receipt'],'rawCandidateSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),
        'rawReferenceSha256':hashlib.sha256(reference_path.read_bytes()).hexdigest(),'cases':rows,'launchers':launchers,
        'newLauncherSeconds':sum(c['elapsedSeconds'] for r in launchers for c in r['commands']),
        'limits':'Only3.05 prefixes, all22 native. No terminal gains inferred. No unit/typecheck or Ace12 expansion for this rejected proposal; shared production stays unchanged. A027 first contact actor/time unchanged; baseline hit/fumble and candidate grasp are different executions, not a proven ball-security benefit. End request differs before LT hands, so a changed end route does not isolate block force.'}
(out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'disposition':result['disposition'],'newLauncherSeconds':result['newLauncherSeconds']}))
