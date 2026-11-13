#!/usr/bin/env python3
"""Saved-data audit only: no engine imports, requests, decisions or simulations."""
import gzip,json,math,hashlib,statistics
from pathlib import Path
BASE=Path('data/reviews/run-fit-and-recovery')
OUT=Path('out/helper-fit/early-contact')
def load(p):return json.load(gzip.open(p))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def vlen(v):return math.hypot(v['x'],v['y'])
def slim(a,intents):
 return {'slot':a['slot'],'pos':a['pos'],'vel':a['vel'],'request':intents[a['idx']], 'plan':a['plan'],'engagement':a['engagement'],'support':a['support']}
rows=load(BASE/'targeted/final.json.gz')['rows']; traces=load(BASE/'targeted/final-traces.json.gz')['trials']
results=[]; bad=[]
for r,t in zip(rows,traces):
 assert r['id']==t['id']
 initial=t['ticks'][0]['agents']; slots={a['idx']:a['slot'] for a in initial}
 s05=next(x for x in t['ticks'] if x['t']==.5)
 dl05=[vlen(a['vel']) for a in s05['after'] if a['slot'] in ['DE_S','DE_W','DT_S','DT_W']]
 first=next(e for e in r['result']['events'] if e['type']=='carrier_contact')
 body=next(x for x in t['ticks'] if x['t']==first['t'])
 d=next(a for a in body['after'] if a['idx']==first['b'])
 b=next(a for a in body['after'] if a['idx']==first['a'])
 prior=[e for e in r['result']['events'] if e['t']<=first['t'] and e['type'] in ['block_contact','block_climb','shed','block_abandon','block_collect'] and (e.get('a')==d['idx'] or e.get('b')==d['idx'])]
 geo=[]
 for tick in t['ticks']:
  if tick['t']>first['t']:break
  byslot={a['slot']:a for a in tick['agents']}
  for h in tick['agents']:
   eng=h.get('engagement')
   if not eng or h['slot'] not in eng['helpers']:continue
   owner=byslot[eng['blocker']]; defender=byslot[eng['defender']]; plan=owner['plan']
   # Keep a demonstrably straight run surface; don't invent the acquired
   # axis for reach/cutoff/zone-surface installations.
   if not plan or plan.get('kind') not in ['drive','draw','combo']:continue
   drive=plan['drive']; dlen=vlen(drive)
   if not dlen:continue
   drive={'x':drive['x']/dlen,'y':drive['y']/dlen}
   odx=owner['pos']['x']-defender['pos']['x'];ody=owner['pos']['y']-defender['pos']['y']
   # The saved actual phi independently verifies this is the acquired axis.
   phi=math.atan2(-odx*drive['y']+ody*drive['x'],-odx*drive['x']-ody*drive['y'])/(math.pi/2)
   if abs(phi-eng['phi'])>1e-6:continue
   delta={'x':h['pos']['x']-defender['pos']['x'],'y':h['pos']['y']-defender['pos']['y']}; sep=vlen(delta)
   angle=max(0,min(1,-(delta['x']*drive['x']+delta['y']*drive['y'])/sep)) if sep else 0
   if angle<.05:
    key=(r['id'],h['slot'])
    if not any(x['key']==key for x in bad):
     cmd=tick['intents'][h['idx']]
     q={'key':key,'id':r['id'],'t':tick['t'],'helper':h['slot'],'owner':owner['slot'],'defender':defender['slot'],'angle':angle,'verifiedAxis':{'x':-drive['x'],'y':-drive['y']},'ownerPhi':phi,'helper':slim(h,tick['intents']), 'ownerState':slim(owner,tick['intents']),'defenderState':slim(defender,tick['intents'])}
     bad.append(q);geo.append({'t':tick['t'],'helper':h['slot'],'owner':owner['slot'],'defender':defender['slot'],'angle':angle,'request':cmd})
 results.append({'id':r['id'],'gain':r['result']['offenseYards'],'ybc':r['result']['stats']['yardsBeforeContact'],'handoff':next(e['t'] for e in r['result']['events'] if e['type']=='handoff'),'firstContact':first,'firstContactSlot':d['slot'],'contactEventAfterWorldBodies':{'runner':b['pos'],'defender':d['pos']},'contactEventAfterWorldDistance':math.hypot(b['pos']['x']-d['pos']['x'],b['pos']['y']-d['pos']['y']),'priorRelevantEvents':prior,'dlSpeed05':dl05,'nearZeroDirectionalHelper':geo})
panel=load(BASE/'runs/final.json.gz'); natural=panel['trials']; assert len(natural)==160
summary={'targeted':{'n':len(results),'stuff':sum(r['gain']<=0 for r in results),'negativeYBC':sum(r['ybc']<0 for r in results),'byFamily':{}},'ordinaryRunPanel':{'n':len(natural),'meanGain':statistics.mean(r['result']['offenseYards'] for r in natural),'stuff':sum(r['result']['offenseYards']<=0 for r in natural),'meanYBC':statistics.mean(r['result']['stats']['yardsBeforeContact'] for r in natural)}}
for fam in ['draw','back-man']:
 selected=[x for x in results if ('-draw-' in x['id'])==(fam=='draw')]
 speeds=[v for r in selected for v in r['dlSpeed05']]
 summary['targeted']['byFamily'][fam]={'n':len(selected),'negativeYBC':sum(r['ybc']<0 for r in selected),'stuff':sum(r['gain']<=0 for r in selected),'firstContactDL':sum(r['firstContactSlot'] in ['DE_S','DE_W','DT_S','DT_W'] for r in selected),'firstContactLB':sum(r['firstContactSlot'] in ['LB_M','LB_W','LB_S'] for r in selected),'medianDLspeed05':statistics.median(speeds),'meanYBC':statistics.mean(r['ybc'] for r in selected)}
output={'schema':'saved-early-contact-v1','source':panel['sourceBefore'],'inputs':{str(p):sha(p) for p in [BASE/'targeted/final.json.gz',BASE/'targeted/final-traces.json.gz',BASE/'runs/final.json.gz']},'summary':summary,'trials':results,'nearZeroDirectionalHelpers':bad,'limits':['Saved existing targeted 24 and160 ordinary fixtures; no new simulation or decision calls.','DLspeed05 uses achieved after-state at native tick .50; cohort/computation differs from NFL tracking, so not direct matched inference.','Near-zero angle is source-implied directional helper-support geometry with source-implied acquired axis independently verified against recorded owner phi, not a measured individual helper hand force; establishment may further reduce capacity.','First-contact uses exact engine carrier_contact operator and stats, not NFL charted first contact.','Fixture stuff/scheme/front frequencies are not NFL call frequencies; full generated games later diverge.']}
(OUT/'audit.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps(summary,indent=2)); print('Near-zero helpers',[(x['id'],x['t'],x['helper']['slot'],x['owner'],x['defender'],x['helper']['request']['vel']) for x in bad])
selected=[
 ('RFT-R1-draw-under-cover3-L-S3',['C','LG','DT_S','RB'],.8,2.5),
 ('RFT-R1-draw-under-cover3-R-S3',['RG','RT','DE_S','RB'],2.2,2.7),
 ('RFT-R2-iz_strong-over-cover1_off-L-S11',['LG','C','RG','DT_S','DT_W','RB'],.45,2.35),
 ('RFT-R2-iz_strong-over-cover0-L-S11',['C','RG','DT_W','RB'],.85,1.2)]
timelines=[]
for tid,wanted,lo,hi in selected:
 t=next(t for t in traces if t['id']==tid);r=next(r for r in rows if r['id']==tid)
 timelines.append({'id':tid,'inputSha256':t['inputSha256'],'profilesSha256':t['profilesSha256'],'result':r['result'],'ticks':[{k:x[k] for k in ['t','worldTime','carrier','ball','contacts','firstContactX']}|{'before':[slim(a,x['intents']) for a in x['agents'] if a['slot'] in wanted],'after':[slim(a,x['intents']) for a in x['after'] if a['slot'] in wanted]} for x in t['ticks'] if lo<=x['t']<=hi]})
with gzip.open(OUT/'native-timelines.json.gz','wt') as f:json.dump({'source':panel['sourceBefore'],'inputs':output['inputs'],'savedOnly':True,'witnesses':timelines},f)
ordinary=[]
for r in natural:
 for slot,m in r['olMetrics'].items():
  for c in m['firstContacts']:
   e=c.get('engagement')
   if not e:continue
   mem=next((a for a in e['members'] if a['slot']==slot and a['helperSupport'] is not None),None)
   if mem and mem['helperSupport']<.05:
    ordinary.append({'id':r['id'],'gain':r['result']['offenseYards'],'helper':slot,'actualCollisionTarget':c['other'],'intendedEngagementDefender':e['defender'],'collisionWithIntendedDefender':c['other']==e['defender'],'sample':c})
(OUT/'ordinary-helper-load-screen.json').write_text(json.dumps({'source':panel['sourceBefore'],'inputSha256':sha(BASE/'runs/final.json.gz'),'savedOnly':True,'records':ordinary,'limits':['Per-helper contact snapshots are not a whole-play frequency denominator.','A zero helper-support value can mean establishment delay, bad direction, out-of-reach or falling; these causes must be traced.','Other-player collision does not prove the helper contacted its engagement defender.','Held joint force snapshots can be from the preceding solve; do not infer impossible new force from newly evaluated eligibility alone.']},indent=2)+'\n')
