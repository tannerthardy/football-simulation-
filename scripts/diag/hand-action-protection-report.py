"""Validate native receipts; retain adverse endings and exact source/profile inputs.

The committed digests came from an actual 4ded6b6 checkout. A fresh candidate
run can prove complete parity against them without changing its checkout.
"""
import json,gzip,hashlib,sys
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else 'out/hand-action-protection')
def fingerprint(value):
 return hashlib.sha256(json.dumps(value,separators=(',',':'),sort_keys=True).encode()).hexdigest()
def load(name):return json.loads(gzip.decompress((root/f'{name}.json.gz').read_bytes()))
def contact(p):
 rb=next(a['id'] for a in p['players'] if a['slot']=='RB');seats={a['id']:a['slot'] for a in p['players']}
 e=next((e for e in p['events'] if e['type']=='carrier_contact' and rb in [e.get('a'),e.get('b')]),None)
 crossing=next((f['after'] for f in p['frames'] if f.get('carrier')==rb and f['agents'][rb]['pos']['x']>=40),None)
 if crossing is None:state='ended-unreached' if not p['live'] else 'live-unreached'
 elif not e or e['t']>crossing:state='clean'
 elif e['t']>=crossing-.05-1e-8:state='same-step-uncertain'
 else:state='interrupted'
 return {'firstContact':e['t'] if e else None,'firstContactOpponent':seats[e['b'] if e['a']==rb else e['a']] if e else None,'crossingBoundary':crossing,'approach':state}
frozen=json.loads(Path('docs/reviews/hand-action-protection-baseline.json').read_text())
assert frozen['comparisonCommit']=='4ded6b600fd3785e65034aa5623d7a9f8f3c5db1'
default=load('default'); frozenById={r['id']:r for r in frozen['inputs']}
assert len(default['panel'])==len(frozenById)==20
for p in default['panel']:
 f=frozenById[p['input']['id']]
 for key,value in [('inputSha256',p['input']),('initialSha256',p['initial']),
                   ('profilesSha256',[a['profile'] for a in p['players']]),('stateRngHistorySha256',p['hashes'])]:
  assert fingerprint(value)==f[key], (p['input']['id'],key)
 assert len(p['hashes'])==f['ticks'] and p['outcome']==f['outcome'] and p['endTime']==f['endTime'] and p['gain']==f['gain'] and p['live']==f['censored']
hasBaseline=(root/'baseline.json.gz').exists()
base=load('baseline') if hasBaseline else default
byid={r['input']['id']:r for r in base['panel']}
if hasBaseline:
 assert base['provenance']['commit']==frozen['comparisonCommit']
 assert all(p['hashes']==byid[p['input']['id']]['hashes'] for p in default['panel'])
manifest=json.loads(Path('docs/reviews/hand-action-protection-inputs.json').read_text())
names=list(dict.fromkeys((['baseline'] if hasBaseline else [])+['default']+[a['name'] for a in json.loads((root/'arms.json').read_text())['arms']]+[a['name'] for a in json.loads((root/'ablations.json').read_text())]+[a['name'] for a in json.loads((root/'more-ablations.json').read_text())]+['trace-default','trace-combined','trace-offense-remove-Y']))
summary={'protocol':'native-hand-action-protection-receipt-v1','comparisonCommit':frozen['comparisonCommit'],'candidateStartCommit':default['provenance']['commit'],'candidateSourceSha256':default['provenance']['sourceSha256'],'manifestSha256':hashlib.sha256(Path('docs/reviews/hand-action-protection-inputs.json').read_bytes()).hexdigest(),'window':25,'completeDefaultParity':'20/20 complete state/RNG histories exact','arms':[],'causalFrames':[]}
for name in names:
 d=load(name);r=json.loads((root/f'{name}-receipt.json').read_text())
 assert r['exitCode']==0 and r['inputsUnchanged']
 assert r['flags'].get('RUN_CONTACT_TRACK')=='0'
 assert d['provenance']['flags']==r['flags']
 rows=[];arm=0;work=0;support=0;residual=0
 for p in d['panel']:
  assert p['observerNeutral'] and p['input']==byid[p['input']['id']]['input']
  assert p['initial']==byid[p['input']['id']]['initial']
  assert [a['profile'] for a in p['players']]==[a['profile'] for a in byid[p['input']['id']]['players']]
  for f in p['frames']:
   q=f['physicsInput']['report'];residual=max(residual,abs(q['work']['residual']))
   arm=max(arm,*[a-b for a,b in zip(q['armImpulse'],q['armImpulseLimit'])]);work=max(work,*[a-b for a,b in zip(q['armWork'],q['armWorkLimit'])]);support=max(support,*[a-b for a,b in zip(q['supportMotorWork'],q['supportMotorWorkLimit'])])
  cues={a['slot']:next(f['t'] for f in p['frames'] if 'fit-pull-runner-cue' in f['agents'][a['id']]['tags']) for a in p['players'] if any('fit-pull-runner-cue' in f['agents'][a['id']]['tags'] for f in p['frames'])}
  rows.append({'id':p['input']['id'],'outcome':p['outcome'],'endTime':p['endTime'],'gain':p['gain'],'censored':p['live'],'censoring':p['censoring'],'handoverCueTimes':cues,**contact(p)})
 summary['arms'].append({'name':name,'flags':r['flags'],'intervention':d['provenance']['intervention'],'collectorSha256':d['provenance']['probeSha256'],'observedPlainPairs':len(rows),'limits':{'armImpulseExcess':arm,'armWorkExcess':work,'supportWorkExcess':support,'workResidual':residual},'rows':rows})
 print(name,len(rows),'ended',sum(not p['censored'] for p in rows),'arm/work excess',arm,work,flush=True)
trace=load('trace-combined')
assert all(p['hashes']==byid[p['input']['id']]['hashes'] for p in load('trace-default')['panel'])
combined=load('combined')
assert all(p['hashes']==q['hashes'] for p,q in zip(trace['panel'],combined['panel']))
for key,t,slots in [('wz_strong-s3-mirror',2,['LG','DT_S']),('wz_strong-s7-mirror',2,['RG','DT_W']),('oz_strong-s19-mirror-fresh',2.05,['Y','DE_S']),('new-wz_strong-s23',2.25,['RG','DT_S'])]:
 p=next(p for p in trace['panel'] if p['input']['id']==key);f=next(f for f in p['frames'] if f['t']==t);pi=f['physicsInput'];ids={a['slot']:a['id'] for a in p['players']}
 j=next(j for j in pi['jointInputs'] if j['kind']=='hands' and j['a']==ids[slots[0]] and j['b']==ids[slots[1]])
 out=next(j for j in pi['jointOutputs'] if j['kind']=='hands' and j['a']==ids[slots[0]] and j['b']==ids[slots[1]])
 rep=next(r for r in pi['reps'] if r['blocker']==j['a'] and r['defender']==j['b'])
 decision=next((s for s in reversed(p['shedDecisions']) if s['defender']==j['b'] and s['t']<=t),None)
 summary['causalFrames'].append({'id':key,'t':t,'slots':slots,'handRequest':j,'handDelivery':out,'rep':rep,'shedDecision':decision,'consumedCues':[c for c in f['cues'] if c['defender'] in [j['a'],j['b']] and c['opponent']==ids['RB']],
  'bodies':[{'slot':s,'before':pi['beforeBodies'][ids[s]],'after':pi['afterBodies'][ids[s]],'intent':pi['intents'][ids[s]],'armImpulse':pi['report']['armImpulse'][ids[s]],'armImpulseLimit':pi['report']['armImpulseLimit'][ids[s]],'armWork':pi['report']['armWork'][ids[s]],'armWorkLimit':pi['report']['armWorkLimit'][ids[s]],'groundImpulse':pi['report']['groundImpulse'][ids[s]]} for s in slots+['RB']]})
summary['observedPlainPairs']=sum(a['observedPlainPairs'] for a in summary['arms']);summary['censored']=sum(r['censored'] for a in summary['arms'] for r in a['rows'])
summary['gapAssessment']=[]
for p in load('handover')['panel']:
 b=byid[p['input']['id']]; beforeFrames={f['t']:f for f in b['frames']}; first=None
 for f in p['frames']:
  if f['t'] not in beforeFrames: break
  for a in p['players']:
   if a['team']!='D': continue
   old=beforeFrames[f['t']]['agents'][a['id']]['requested']; new=f['agents'][a['id']]['requested']
   if old==new: continue
   rb=next(a['id'] for a in p['players'] if a['slot']=='RB')
   cue=next((c['seen'] for c in reversed(f['cues']) if c['defender']==a['id'] and c['opponent']==rb),None)
   first={'t':f['t'],'defender':a['slot'],'before':old,'after':new,'cue':cue,
     'aims':[q for q in f['aims'] if q['defender']==a['id']]}
   break
  if first: break
 summary['gapAssessment'].append({'id':p['input']['id'],'baselineGain':b['gain'],'candidateGain':p['gain'],
   'difference':p['gain']-b['gain'],'baselineEnd':b['endTime'],'candidateEnd':p['endTime'],
   'outcome':p['outcome'],'live':p['live'],'first':first})

# A global first changed body is not sufficient evidence that it causes an
# approach loss. These onsets are paired with single-joint interventions above.
summary['firstHandDifferences']=[]
for arm,parent in [('offense','components'),('defense','handover-hand-controls'),('combined','controllers')]:
 old={p['input']['id']:p for p in load(parent)['panel']}
 for p in load(arm)['panel']:
  if p['input']['id'] not in manifest['handCases']: continue
  record={'arm':arm,'parent':parent,'id':p['input']['id'],'firstNonzeroRequest':None,'firstChangedDelivery':None,'firstChangedPose':None}
  oldFrames={f['t']:f for f in old[p['input']['id']]['frames']}
  seats={a['id']:a['slot'] for a in p['players']}
  for f in p['frames']:
   if f['t'] not in oldFrames: break
   q=oldFrames[f['t']]; pi=f['physicsInput']; oldPi=q['physicsInput']
   if record['firstNonzeroRequest'] is None:
    active=[j for j in pi['jointRequests'] if j['kind']=='hands' and abs(j.get('drive',0))>1e-10]
    if active: record['firstNonzeroRequest']={'t':f['t'],'requests':[{'pair':[seats[j['a']],seats[j['b']]],'actor':seats[j.get('actor',j['a'])],'drive':j['drive']} for j in active]}
   if record['firstChangedDelivery'] is None:
    prior={(j['kind'],j['a'],j['b']):j for j in oldPi['jointOutputs']}
    changed=[]
    for j in pi['jointOutputs']:
     k=(j['kind'],j['a'],j['b']); prev=prior.get(k)
     if j['kind']=='hands' and (prev is None or any(abs(j.get(field,0)-prev.get(field,0))>1e-8 for field in ['normalForce','tangentForce'])):
      changed.append({'pair':[seats[j['a']],seats[j['b']]],'normal':j.get('normalForce'),'tangent':j.get('tangentForce')})
    if changed: record['firstChangedDelivery']={'t':f['t'],'after':f['after'],'joints':changed}
   if record['firstChangedPose'] is None:
    changed=[seats[i] for i,(a,b) in enumerate(zip(pi['afterBodies'],oldPi['afterBodies'])) if any(abs(a[x][v]-b[x][v])>1e-9 for x in ['pos','vel'] for v in ['x','y']) or abs(a['facing']-b['facing'])>1e-9 or abs(a.get('spin',0)-b.get('spin',0))>1e-9]
    if changed: record['firstChangedPose']={'t':f['t'],'after':f['after'],'slots':changed}
  summary['firstHandDifferences'].append(record)
(root/'diagnosis.json').write_text(json.dumps(summary,indent=2)+'\n')

# Keep complete reduced rows and exact profiles; full body profiles/poses and
# contact graphs belong in the small portable witnesses and ignored raw traces.
compact={k:v for k,v in summary.items() if k not in ['arms','causalFrames']}
compact['profiles']={'frozenPin':frozen['flags'],'candidate':default['provenance']['flags']}
compact['arms']=[]
for a in summary['arms']:
 profile='frozenPin' if a['name']=='baseline' else 'candidate'
 flags={k:v for k,v in a['flags'].items() if compact['profiles'][profile].get(k)!=v}
 compact['arms'].append({k:v for k,v in a.items() if k!='flags'}|{'profile':profile,'flagOverrides':flags})
compact['causalFrames']=[]
for f in summary['causalFrames']:
 c={k:v for k,v in f.items() if k!='bodies'}
 c['bodies']=[{k:({key:value for key,value in v.items() if key!='profile'} if k in ['before','after'] else v) for k,v in b.items()} for b in f['bodies']]
 compact['causalFrames'].append(c)
(root/'compact-receipt.json').write_text(json.dumps(compact,indent=2)+'\n')
print('Pairs',summary['observedPlainPairs'],'censored',summary['censored'],flush=True)
