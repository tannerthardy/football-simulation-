"""Compact evidence and performance distributions; full traces stay in out/."""
import json,math,hashlib
from collections import Counter
from pathlib import Path
root=Path('out/grip-fast')
read=lambda p:json.loads(Path(p).read_text())
result_fields=('ending','endWhy','finish','advanceAfterGrip','firstGrip','contactToEnd','carrierState')
compact_result=lambda r:{k:r[k] for k in result_fields}
hash_value=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True).encode()).hexdigest()
baseline=read('out/grip-timing/baseline.json');slow=read('out/grip-timing/candidate.json');fast=read(root/'matched-fast.json')
dist=lambda a,b:math.hypot(a['x']-b['x'],a['y']-b['y'])
native=[]
for i in fast['inputs']:
 if i['side']<0:continue
 row={'id':i['id'],'name':i['name'],'runs':[]}
 for n in (12,96):
  b=next(r for r in baseline['native'] if r['id']==i['id'] and r['n']==n)
  s=next(r for r in slow['native'] if r['id']==i['id'] and r['n']==n and r['timing']=='resolved')
  f=next(r for r in fast['rows'] if r['id']==i['id'] and r['n']==n)
  fields=('ending','finish','advanceAfterGrip','firstGrip','carrierState')
  row['runs'].append({'n':n,'baseline':{k:b['result'][k] for k in fields},'slow':{k:s['result'][k] for k in fields},
   'fast':{k:f['result'][k] for k in fields},'fastAccounting':f['stats'],
   'baselineToSlowAdvance':s['result']['advanceAfterGrip']-b['result']['advanceAfterGrip'],
   'slowToFastAdvance':f['result']['advanceAfterGrip']-s['result']['advanceAfterGrip']})
 native.append(row)
fresh_files={mode:read(root/f'fresh-{mode}.json') for mode in ('baseline','slow','fast')}
fresh=[]
for f in fresh_files['fast']['rows']:
 if f['id'].endswith('--1'):continue
 row={'id':f['id'],'n':f['n'],'fast':compact_result(f['result']),'accounting':f['stats']}
 for mode in ('baseline','slow'):
  r=next(r for r in fresh_files[mode]['rows'] if r['id']==f['id'] and r['n']==f['n']);row[mode]=compact_result(r['result'])
 fresh.append(row)
quantile=lambda xs,p:sorted(xs)[max(0,math.ceil(p*len(xs))-1)]
stats=lambda xs:{'p50':quantile(xs,.5),'p95':quantile(xs,.95),'maximum':max(xs),'samples':len(xs)}
bench={};inputs=None
for mode in ('baseline','slow','fast'):
 b=read(root/f'benchmark-{mode}.json')
 assert b['immutableInputs'] is True
 if inputs is None:inputs=b['inputHashes']
 assert inputs==b['inputHashes']
 ticks=[t*1000 for r in b['rows'] for s in r['samples'] for t in s['tickSeconds']]
 bench[mode]={'source':b['source'],'node':b['node'],'cpu':b['cpu'],'collector':b['collectors'],
  'api':{'handContact':'patch','gripTiming':b['mode'],'substeps':'12; dry-onset scene uses 1'},
  'tickMilliseconds':stats(ticks),'cases':[{'name':r['name'],'windowSeconds':stats([s['seconds'] for s in r['samples']]),
   'tickMilliseconds':stats([t*1000 for s in r['samples'] for t in s['tickSeconds']]),
   'endSha256':hash_value(r['samples'][0]['end']),'lastIntegration':r['samples'][0].get('lastIntegration')} for r in b['rows']],
  'sumCaseMedianSeconds':sum(quantile([s['seconds'] for s in r['samples']],.5) for r in b['rows'])}
assert len({v['cpu'] for v in bench.values()})==1 and len({v['node'] for v in bench.values()})==1
assert len({json.dumps(v['collector'],sort_keys=True) for v in bench.values()})==1
for mode in ('slow','fast'):
 bench[mode]['summedCaseMedianRatioToBaseline']=bench[mode]['sumCaseMedianSeconds']/bench['baseline']['sumCaseMedianSeconds']
gate=read(root/'fast-gate.json');oldgate=read(root/'prior-gate.json')
failures=lambda g:sorted(a['fullName'] for t in g['testResults'] for a in t['assertionResults'] if a['status']=='failed')
assert failures(gate)==failures(oldgate)
usage=[json.loads(x) for x in (root/'gate-usage.jsonl').read_text().splitlines()]
failed_usage=[r for r in usage if r['fullName'] in failures(gate)]
assert all(r['trials']==r['intervals']==r['limited']==0 for r in failed_usage)
late=read(root/'late-summary.json')
late_interval=read(root/'late-interval.json')
long={}
for control in (0,1):
 a=read(root/f'long-resolved-12-{control}.json')['rows'];b=read(root/f'long-resolved-96-{control}.json')['rows']
 long[str(control)]={'finalPositionGap':max(dist(x['pos'],y['pos']) for x,y in zip(a[-1]['bodies'],b[-1]['bodies'])),
  'firstMoreThan005Yd':next({'time':u['time'],'gap':max(dist(x['pos'],y['pos']) for x,y in zip(u['bodies'],v['bodies']))}
    for u,v in zip(a,b) if max(dist(x['pos'],y['pos']) for x,y in zip(u['bodies'],v['bodies']))>.005)}
raw=(root/'study/benchmark.ts').read_bytes();assert raw==Path('scripts/diag/physics/grip-fast-benchmark.ts').read_bytes()
sources={'baseline':baseline['source'],'slow':slow['source'],'fast':fast['source']}
assert all(bench[m]['source']==sources[m] for m in bench)
assert all(fresh_files[m]['source']==sources[m] for m in fresh_files)
assert all(fresh_files[m]['inputManifest']==fresh_files['fast']['inputManifest'] and fresh_files[m]['flags']==fast['flags'] for m in fresh_files)
def panel_summary(rows):
 return {'endingsByResolution':{str(n):dict(Counter(r['result']['ending'] for r in rows if r['n']==n)) for n in (12,96)},
  'accountingMaxima':{k:max(r['stats'][k] for r in rows) for k in rows[0]['stats']},
  'limited':[{k:r[k] for k in ('id','n','stats')} for r in rows if r['stats']['limited'] or r['stats']['fallbacks']]}
fresh_delta=max(abs(r['result']['advanceAfterGrip']-next(s['result']['advanceAfterGrip'] for s in fresh_files['slow']['rows'] if s['id']==r['id'] and s['n']==r['n'])) for r in fresh_files['fast']['rows'])
result={'baseline':baseline['baseline'],'baselineSource':baseline['source'],'slowReferenceCommit':'8e36cce80e138133acd6afc7aba0befc21d5a746',
 'slowReferenceSource':slow['source'],'source':fast['source'],'flags':fast['flags'],'inputManifest':fast['inputManifest'],
 'inputs':fast['inputs'],'nativePositive':native,'freshInputs':fresh_files['fast']['inputs'],
 'freshInputManifest':fresh_files['fast']['inputManifest'],'freshPositive':fresh,'benchmarks':bench,
 'panelSummary':{'matched':panel_summary(fast['rows']),'fresh':panel_summary(fresh_files['fast']['rows']),
  'freshMaximumSlowToFastAdvanceDifference':fresh_delta},
 'benchmarkInputs':inputs,'benchmarkCollectorSha256':hashlib.sha256(raw).hexdigest(),
 'gate':{'passed':gate['numPassedTests'],'failed':gate['numFailedTests'],'total':gate['numTotalTests'],'retained':failed_usage},
 'rejectedAttempts':{'capExitOnly':'64f5b40a4aaffabd0a45e7e4cdf1e51264374a7a','cachedSearch':'79551d2'},
 'lateSupport':{'timeline':late['timeline'],'heldControls':long,'nativeSelectedGap':.24216093123144,
  'identicalLateState':{'checkpointSha256':late_interval['checkpointSha'],'tapeSha256':late_interval['inputTapeSha'],
   'time':late_interval['startTime'],'runnerOutsideBaseHistory':[t['body'][0]['support']['out'] for t in late_interval['trials']],
   'runnerCapturePointDifference':dist(late_interval['trials'][0]['body'][0]['support']['xi'],late_interval['trials'][1]['body'][0]['support']['xi'])},
  'claim':'Partition-sensitive support-base/history response remains with held requests and fixed grip capacity; exact causal repair not established.'},
 'proposedBudget':{'tickMedianMs':5,'tickP95Ms':10,'tickObservedMaximumMs':50,'summedCaseMedianRatio':2},
 'recommendation':'Not ready for the next integration stage: practical cost and long-hold support consistency remain unresolved.',
 'limitations':['All comparisons use explicit patch API per input; production defaults and 4ded6b6 stay unchanged.',
  'Native policies are paired at initial inputs; held tapes additionally freeze issued controls.',
  'Observed maximum is not a universal worst-case guarantee; slow fallback remains bounded by piece count, not wall time.',
  'Slow dry-onset reference hits its convergence cap; fast is checked against the independently finer 65536-piece World.',
  'Both slow and fast exhaust their limits on the mirrored fresh 70-degree coarse run; fast falls back once per run. Tackles finish but these intervals are not converged.',
  'Fresh frontal fine-run advance differs by .004853 yd despite identical finishes; continuous support memory remains outside the inherited acceptance comparison.',
  'Nine historical patch failures are retained separately from this additional slow-reference limitation.']}
out=Path('data/reviews/current/grip-fast.json');out.write_text(json.dumps(result,indent=2)+'\n')
for mode,v in bench.items():print(mode,v['tickMilliseconds'])
