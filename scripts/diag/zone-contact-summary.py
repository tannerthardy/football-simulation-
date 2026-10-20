from pathlib import Path
import gzip,json,math,hashlib,subprocess
R=Path('out/zone-contact-execution');D=Path('data/reviews/current/zone-contact-execution');D.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
summary={'accepted':'2c98bed94adad8087c65f381d4090444ad283985','runtime':'859d0255fdaca7ceba26a56258c97890fe263009','cases':{},'receipts':[]}
for case in ['strong','weak','fresh-tite']:
 arms={arm:json.loads(gzip.decompress((R/(case+'-'+arm+'-extended.json.gz')).read_bytes())) for arm in ['baseline','candidate']}
 assert arms['baseline']['inputSha256']==arms['candidate']['inputSha256']
 assert arms['baseline']['profiles']==arms['candidate']['profiles']
 rows={}
 for arm,x in arms.items():
  maxima={k:0 for k in ['workResidual','armImpulseExcess','armWorkExcess','supportWorkExcess']};oo=[];frames=[]
  slots=x['slots'];primary=['RG','DT_S','LG','DT_W','C','Y','DE_S','H','DE_W','NT','RB']
  for f in x['frames']:
   r=f['report'];maxima['workResidual']=max(maxima['workResidual'],abs(r['work']['residual']))
   for key,a,b in [('armImpulseExcess','armImpulse','armImpulseLimit'),('armWorkExcess','armWork','armWorkLimit'),('supportWorkExcess','supportMotorWork','supportMotorWorkLimit')]:maxima[key]=max(maxima[key],max(v-w for v,w in zip(r[a],r[b])))
   oo.extend({'t':f['t'],'a':slots[c['i']],'b':slots[c['j']],'impulse':math.hypot(c['impulse']['x'],c['impulse']['y'])} for c in r['contacts'] if c['i']<11 and c['j']<11)
   compact=lambda a:{k:v for k,v in a.items() if k not in ('support','plan')}|{'support':a['support']['state'] if a['support'] else None,'plan':a['plan']}
   frames.append({**{k:f[k] for k in ['t','end','raw','final','handsAfter']},'before':[compact(a) for a in f['before']],'after':[compact(a) for a in f['after']],'contacts':r['contacts']})
  moves=[]
  for m in x['moves']:
   if m['kind']!='movement' and m['kind']!='end':continue
   data=dict(m['data']);s=data.get('support');
   if s:data['support']={k:s[k] for k in ['state','felt','load','posture']}
   moves.append({**m,'data':data})
  compact={k:v for k,v in x.items() if k not in ['frames','moves']};compact.update(frames=frames,moves=moves,budgetMaxima=maxima)
  out=D/(case+'-'+arm+'.json.gz');out.write_bytes(gzip.compress(json.dumps(compact,separators=(',',':')).encode(),mtime=0))
  phases={}
  for slot in ['RG','C','RT']:
   if slot not in slots:continue
   i=slots.index(slot);history=[];prior=None
   for f in x['frames']:
    plan=f['before'][i]['plan'];phase=(plan.get('zoneRead') or {}).get('phase') if plan else None
    if phase!=prior:history.append({'t':f['t'],'phase':phase});prior=phase
   phases[slot]=history
  contacts=[{**e,'a':slots[e['a']] if e.get('a') is not None else None,'b':slots[e['b']] if e.get('b') is not None else None} for e in x['events'] if e['type'] in ['carrier_contact','tackle','fumble']]
  sample={}
  for t in [1.5,2,2.5,2.75,3]:
   f=next((f for f in x['frames'] if abs(f['end']-t)<1e-8),None)
   if f:sample[str(t)]={a['slot']:{k:a[k] for k in ['pos','vel','facing']} for a in f['after'] if a['slot'] in primary}
  rows[arm]={'terminal':x['terminal'],'censoredAt':None if x['terminal'] else x['frames'][-1]['end'],'result':x['result'],'frames':len(x['frames']),'phaseHistory':phases,'contacts':contacts,'budgetMaxima':maxima,'teammateContacts':oo,'samples':sample,'compactSha256':sha(out.read_bytes()),'originalGzipSha256':sha((R/(case+'-'+arm+'-extended.json.gz')).read_bytes())}
 a,b=arms['baseline'],arms['candidate'];first=None
 for fa,fb in zip(a['frames'],b['frames']):
  changed=[a['slots'][i] for i,(ca,cb) in enumerate(zip(fa['final'],fb['final'])) if ca!=cb]
  if changed:first={'requestAt':fa['t'],'achievedEnd':fa['end'],'actors':changed};break
 summary['cases'][case]={'id':a['case'],'inputSha256':a['inputSha256'],'sameProfiles':True,'firstChangedRequest':first,'arms':rows}
# Preserve the additional, proven-passive read diagnostic without duplicating its full World ledger.
x=json.loads(gzip.decompress((R/'strong-runner-read.json.gz').read_bytes()));assert x['passiveObserverVerified']
(D/'strong-runner-read.json').write_text(json.dumps({k:x[k] for k in ['case','inputSha256','commit','flags','node','passiveObserverVerified','runnerReads']},indent=2)+'\n')
for p in sorted(list(R.glob('*receipt.json'))+list((R/'baseline/out').glob('*continuation-receipt.json'))):
 d=json.loads(p.read_text());summary['receipts'].append({'name':str(p),'sourceSha256':d['sourceSha256'],'exitCode':d['exitCode'],'seconds':sum(c['elapsedSeconds'] for c in d['commands'])})
for p in [R/'focused-final.json',R/'focused-exact.json',R/'typecheck.json',R/'contract-before.json',R/'contract-after.json',R/'contract-corrected-fixture.json',R/'baseline/out/contracts-corrected-before.json']:
 d=json.loads(p.read_text());summary['receipts'].append({'name':str(p),'sourceSha256':d['sourceSha256'],'exitCode':d['exitCode'],'seconds':sum(c['elapsedSeconds'] for c in d['commands'])})
summary['newCollectorInvocations']=11;summary['actualCollectorPrefixesIncludingObserverChecks']=13;summary['games']=0
summary['sourceReview']={'agent.ts':'54dd83cd7ecfa351937ac03e71d6f98521b38011','blocking.ts':'13a97d8f272959e90148e52ca121e9ba2262c0eb','engagement.ts':'0f592bd4edb41c8887a6d1db42b3ab6220d8089b','scope':'Read-only nonauthor source boundary; football consequences separately assessed.'}
(D/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'nativeReceipts':sum('receipt' in x['name'] for x in summary['receipts']),'receiptProcessSeconds':sum(x['seconds'] for x in summary['receipts']),'filesBytes':{p.name:p.stat().st_size for p in D.iterdir()}},indent=2))
