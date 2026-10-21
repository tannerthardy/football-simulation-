"""Recompute paired panel from full raw files in INPUT/{before,after}/raw.json.gz.
Usage: python3 compare-panel.py INPUT
Outputs comparison.json and comparison-compact.json.gz into INPUT.
"""
import json,gzip,math,hashlib,sys
from pathlib import Path
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('out/ol-base-review')
B=json.load(gzip.open(base/'before/raw.json.gz'));A=json.load(gzip.open(base/'after/raw.json.gz'))
def stats(xs):
 xs=[x for x in xs if x is not None]
 return dict(n=len(xs),mean=sum(xs)/len(xs) if xs else None,min=min(xs) if xs else None,max=max(xs) if xs else None)
def mag(v):return math.hypot(v['x'],v['y'])
def metrics(r):
 first=[c for c in r['firstContacts'] if c['before']['firstLevel']]
 acquisitions=[c for c in r['firstAcquisitions'] if c['beforeA']['firstLevel']]
 initial=[x for x in r['initial'] if x['slot'] in ['LT','LG','C','RG','RT']];ol={x['idx'] for x in initial}
 row=r['rows'];deliveries=[(s,j) for s in row for j in s['deliveredHands'] if j['a'] in ol or j['b'] in ol]
 return dict(firstLevelLoads=len(first), firstLoadPosture=stats([c['before']['support']['posture'] for c in first]),
 firstLoadBaseRadius=stats([c['before']['support']['baseRadius'] for c in first]),
 firstLoadTime=stats([c['interval'][0] for c in first]),firstLoadSpeed=stats([c['before']['speed'] for c in first]),
 firstLoadAvailability=stats([c['before']['support']['availability'] for c in first]),
 acquisitionPhi=stats([abs(c['actualPhi']) for c in acquisitions]),acquisitionClosingSpeed=stats([c['relativeClosingSpeed'] for c in acquisitions]),
 firstAcquisitions=len(acquisitions),
 unengagedFirstLevelPosture=r['summary']['precontactFirstLevelPosture'],unengagedUnsetRequestBins=r['summary']['precontactUnsetPostureBins'],
 deliveredHandAbsoluteNetIntervalImpulse=sum(abs(j['normalImpulse'])+abs(j['tangentialImpulse']) for _,j in deliveries),
 olFalls=[dict(interval=[s['t'],s['end']],idx=i,slot=r['players'][i]['slot']) for s in row for i in s['report']['falls'] if i in ol],
 falls=[dict(interval=[s['t'],s['end']],idx=i,slot=r['players'][i]['slot']) for s in row for i in s['report']['falls']],
 work=dict(ground=sum(sum(s['report']['groundWork']) for s in row), hands=sum(s['report']['work']['hands'] for s in row),strikes=sum(s['report']['work']['strikes'] for s in row),contacts=sum(s['report']['work']['contacts'] for s in row)),
 end=r['end'],invariants=r['invariants'])
rows=[];loadpairs=[];acqpairs=[];firstdivergence=[]
for b,a in zip(B['rows'],A['rows']):
 assert b['id']==a['id'] and b['initialSignature']==a['initialSignature'] and b['profileSha256']==a['profileSha256']
 fb={c['before']['slot']:c for c in b['firstContacts'] if c['before']['firstLevel']};fa={c['before']['slot']:c for c in a['firstContacts'] if c['before']['firstLevel']}
 ab={c['beforeA']['slot']:c for c in b['firstAcquisitions'] if c['beforeA']['firstLevel']};aa={c['beforeA']['slot']:c for c in a['firstAcquisitions'] if c['beforeA']['firstLevel']}
 paired=[]
 for slot in sorted(set(fb)|set(fa)):
  x,y=fb.get(slot),fa.get(slot)
  def at(c):
   if not c:return None
   return dict(interval=c['interval'],pre=c['before'],after=c['after'],requested=c['requested'],bodyLoads=c['bodyLoads'],handLoads=c['handLoads'],strikes=c['strikes'])
  z=dict(id=b['id'],slot=slot,before=at(x),after=at(y));paired.append(z);loadpairs.append(z)
 for slot in sorted(set(ab)|set(aa)):
  acqpairs.append(dict(id=b['id'],slot=slot,before=ab.get(slot),after=aa.get(slot)))
 first=None
 for sb,sa in zip(b['rows'],a['rows']):
  for pb,pa in zip(sb['before'],sa['before']):
   i=pb['idx'];cb=sb['requested'][i];ca=sa['requested'][i]
   if cb!=ca:
    first=dict(t=sb['t'],idx=i,slot=pb['slot'],beforeRequested=cb,afterRequested=ca,beforePhysical=pb,afterPhysical=pa);break
  if first:break
 firstdivergence.append(dict(id=b['id'],firstChangedCommand=first))
 rows.append(dict(id=b['id'],input=b['input'],before=metrics(b),after=metrics(a),pairedFirstLoads=paired))
# Samples never imply independent players or durations; actual loaded metrics are interval witnesses.
full=dict(schema='ol-base-comparison-v1',sources=dict(before=B['sourceBefore'],after=A['sourceBefore']),tool=dict(before=B['scriptBefore'],after=A['scriptBefore']),
 pinsEqual={k:B[k]==A[k] for k in ['scriptBefore','scriptAfter','inputSha256','profileSha256']},inputSha256=B['inputSha256'],profileSha256=B['profileSha256'],modules=dict(before=B['moduleSha256'],after=A['moduleSha256']),
 definitions=dict(unengaged='Pooled active first-level OL samples with no engagement, including approach and reapproach after earlier force. Not strictly pre-first-contact.',
 load='First force in a 50ms decision interval, not precise force onset, established grip duration, or a block win.',
 impulses='Absolute net achieved hand-joint impulse in each 50ms interval, not absolute substep force or continuous sustain.',
 endpoint='3s inspection-censored endpoints. No play result, credited yards, efficiency or win-rate inference.',
 sample='24 controlled inputs with shared NFL-independent generated rosters. Left/right input controls are not strict physical mirrors.'),
 observer=dict(before=B['observerChecks'],after=A['observerChecks']),overall=dict(before=B['overall'],after=A['overall']),rows=rows,pairedFirstAcquisitions=acqpairs,firstCommandDivergences=firstdivergence)
(base/'comparison.json').write_text(json.dumps(full,indent=2)+'\n')
for label,R in [('before',B),('after',A)]:
 allfirst=[c for r in R['rows'] for c in r['firstContacts'] if c['before']['firstLevel']]
 allacq=[c for r in R['rows'] for c in r['firstAcquisitions'] if c['beforeA']['firstLevel']]
 print(label,'load posture/base/speed/availability/time',*[stats([c['before']['support'][x] for c in allfirst]) for x in ['posture','baseRadius','availability']],stats([c['before']['speed'] for c in allfirst]),stats([c['interval'][0] for c in allfirst]))
 print(label,'acquisitionphi/closing',stats([abs(c['actualPhi']) for c in allacq]),stats([c['relativeClosingSpeed'] for c in allacq]))
 print(label,'all OL falls',sum(len(metrics(r)['olFalls']) for r in R['rows']),'all falls',sum(len(metrics(r)['falls']) for r in R['rows']))
print('unalignedfirstloads',[(p['id'],p['slot'],bool(p['before']),bool(p['after'])) for p in loadpairs if not p['before'] or not p['after']])
print('firsttimechanges',[(p['id'],p['slot'],p['before']['interval'][0],p['after']['interval'][0]) for p in loadpairs if p['before'] and p['after'] and abs(p['before']['interval'][0]-p['after']['interval'][0])>1e-8])
print('acqtimechanges',[(p['id'],p['slot'],p['before']['t'] if p['before'] else None,p['after']['t'] if p['after'] else None) for p in acqpairs if not p['before'] or not p['after'] or abs(p['before']['t']-p['after']['t'])>1e-8])
print('adverseacqphi',[(p['id'],p['slot'],p['before']['actualPhi'],p['after']['actualPhi']) for p in acqpairs if p['before'] and p['after'] and abs(p['after']['actualPhi'])-abs(p['before']['actualPhi'])>.05])
print('ol-falls',[(r['id'],r['before']['olFalls'],r['after']['olFalls']) for r in rows if r['before']['olFalls']!=r['after']['olFalls']])
print('firstcommand changes',[(p['id'],p['firstChangedCommand']['t'],p['firstChangedCommand']['slot'],p['firstChangedCommand']['beforeRequested'],p['firstChangedCommand']['afterRequested']) for p in firstdivergence[:4]])

import json,gzip,hashlib
from pathlib import Path
p=base;c=json.load(open(p/'comparison.json'))
def state(s):
 if not s:return None
 return {k:s[k] for k in ['idx','slot','pos','vel','speed','facing','firstLevel','plan','engagement','support']}
def load(l):
 if not l:return None
 return dict(interval=l['interval'],pre=state(l['pre']),after=state(l['after']),requested=l['requested'],bodyLoads=l['bodyLoads'],handLoads=l['handLoads'],strikes=l['strikes'])
def acq(a):
 if not a:return None
 return {k:a[k] for k in ['t','blocker','defender','successful','distance','relativeClosingSpeed','actualPhi','engagement']} | {'beforeA':state(a['beforeA']),'beforeB':state(a['beforeB'])}
out={k:v for k,v in c.items() if k not in ['rows','pairedFirstAcquisitions','firstCommandDivergences']}
out['schema']='ol-base-comparison-compact-v1'
out['rawArtifactSha256']={n:hashlib.sha256((p/n/'raw.json.gz').read_bytes()).hexdigest() for n in ['before','after']}
out['rows']=[{k:r[k] for k in ['id','input','before','after']} | {'pairedFirstLoads':[dict(slot=l['slot'],before=load(l['before']),after=load(l['after'])) for l in r['pairedFirstLoads']]} for r in c['rows']]
out['pairedFirstAcquisitions']=[dict(id=a['id'],slot=a['slot'],before=acq(a['before']),after=acq(a['after'])) for a in c['pairedFirstAcquisitions']]
out['firstCommandDivergences']=[{k:d[k] for k in ['id']}| {'firstChangedCommand': {k:d['firstChangedCommand'][k] for k in ['t','idx','slot','beforeRequested','afterRequested']} } for d in c['firstCommandDivergences']]
out['adverseExamples']=[
 dict(id='OLB-R1-power-R-S3',finding='RG contact fall in candidate1.85–1.90, absent in baseline. Candidate block angle stayed around1.02 through1.45–1.85 while baseline improved .61→.37; a collision with LB_W occurs in both. Bounded posture connection does not fix side-fit/controller decisions and cannot imply universal blocking or fall improvement.'),
 dict(id='OLB-R2-oz_strong-R-S3',slot='C',finding='C acquires at0.60 in both, but baseline first actual body force2.45–2.50 becomes no delivered hand/body/strike within3s in candidate. The actual-load count stays95 only because R2 Trap RT enters with a strike at2.45–2.50. Acquisition is not physical load or sustain.'),
 dict(id='OLB-R2-trap-L-S3',slot='LG',finding='Acquisition delayed1.00→1.10; first load1.05→1.15. Not a guarantee of earlier or cleaner blocks.'),
 dict(id='OLB-R1-oz_strong-R-S3',slot='RT',finding='First load delayed.80→.85; max acquisitionabsphi~1.27 still exists elsewhere; preserving low base does not repair bad approach geometry.')]
out['aggregateFirstLoads']={}
for n in ['before','after']:
 loads=[l[n] for r in out['rows'] for l in r['pairedFirstLoads'] if l[n]]
 out['aggregateFirstLoads'][n]=dict(n=len(loads),meanPosture=sum(l['pre']['support']['posture'] for l in loads)/len(loads),meanBaseRadius=sum(l['pre']['support']['baseRadius'] for l in loads)/len(loads),meanSpeed=sum(l['pre']['speed'] for l in loads)/len(loads),meanAvailability=sum(l['pre']['support']['availability'] for l in loads)/len(loads),meanIntervalStart=sum(l['interval'][0] for l in loads)/len(loads))
for n in ['before','after']:
 R=json.load(gzip.open(p/n/'raw.json.gz'))
 r=next(r for r in R['rows'] if r['id']=='OLB-R1-power-R-S3')
 out.setdefault('powerRgContactWitness',{})[n]=[dict(interval=[q['t'],q['end']],before=state(q['before'][5]),after=state(q['afterPhysics'][5]),requested=q['requested'][5],bodyLoads=[x for x in q['report']['contacts'] if 5 in [x['i'],x['j']]],handLoads=[x for x in q['deliveredHands'] if 5 in [x['a'],x['b']]],strikes=[x for x in q['report']['strikes'] if 5 in [x['i'],x['j']]],workResidual=q['report']['work']['residual']) for q in r['rows'] if q['t'] in [1.45,1.8,1.85,1.9]]
(p/'comparison-compact.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
(p/'comparison-compact.json.gz').write_bytes(gzip.compress(json.dumps(out,separators=(',',':')).encode()+b'\n',compresslevel=9))
print('compact uncompressed', (p/'comparison-compact.json').stat().st_size,'gzip',(p/'comparison-compact.json.gz').stat().st_size)
