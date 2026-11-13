#!/usr/bin/env python3
"""Saved96 passing guard comparison; no replay regeneration or simulation."""
import json,gzip,hashlib,statistics,math,sys
from pathlib import Path
BP=Path('data/reviews/helper-fit-and-coverage/passing/final.json.gz')
FP=Path(sys.argv[1] if len(sys.argv)>1 else 'out/helper-fit/passing-final.json.gz')
OP=Path(sys.argv[2] if len(sys.argv)>2 else 'out/coverage-continuation/passing-comparison.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.load(gzip.open(p))
def cleancomp(r):return r['stats'].get('completed',False) and not r['stats'].get('interceptedBy')
def measure(rows,field,selector=lambda r:True):
 values=[r['stats'][field] for r in rows if selector(r) and isinstance(r['stats'].get(field),(int,float)) and math.isfinite(r['stats'][field])]
 return {'n':len(values),'mean':statistics.mean(values) if values else None,'median':statistics.median(values) if values else None,'sum':sum(values)}
def summary(rows):
 return {'snaps':len(rows),'attempts':sum(bool(r['stats'].get('attempted')) for r in rows),'completions':sum(cleancomp(r) for r in rows),'sacks':sum(bool(r['stats'].get('sacked')) for r in rows),'interceptions':sum(bool(r['stats'].get('interceptedBy')) for r in rows),'meanOffenseYards':statistics.mean(r['offenseYards'] for r in rows),'gain20plus':sum(r['offenseYards']>=20 for r in rows),'physicalTimeouts':sum(r['outcome']=='timeout' for r in rows),'QBpressureFlag':sum(bool(r['stats'].get('pressured')) for r in rows),'drops':sum(bool(r['stats'].get('dropped')) for r in rows),'scrambles':sum(bool(r['stats'].get('scramble')) for r in rows),'missed':sum(r['stats']['missedTackles'] for r in rows),'broken':sum(r['stats']['brokenTackles'] for r in rows),'separationAttemptNonThrowaway':measure(rows,'separation',lambda r:r['stats'].get('attempted',False) and not r['stats'].get('throwaway',False)),'YACcleanCompletions':measure(rows,'yac',cleancomp),'airYardsAttemptsNonThrowaway':measure(rows,'airYards',lambda r:r['stats'].get('attempted',False) and not r['stats'].get('throwaway',False)),'timeToThrow':measure(rows,'timeToThrow')}
b=load(BP);f=load(FP)
for key in ['schema','node','toolSha256','sharedWorldSha256','cohort','rostersSha256','definitions']:assert b[key]==f[key],key
assert b['sourceBefore']==b['sourceAfter'];assert f['sourceBefore']==f['sourceAfter'];assert len(b['rows'])==len(f['rows'])==96
pairs=[]
for rb,rf in zip(b['rows'],f['rows']):
 for key in ['id','roster','formation','concept','coverage','flip','profilesSha256']:assert rb[key]==rf[key],(rb['id'],key)
 assert rb['observerVerified'] and rf['observerVerified'];assert rb['samples'][0]==rf['samples'][0],(rb['id'],'initial stored sample')
 equalstats=rb['stats']==rf['stats'];eqrow=rb==rf
 pair={k:rb[k] for k in ['id','formation','concept','coverage','flip','profilesSha256']}
 pair.update({'wholeExecutionUnchanged':rb['executionSha256']==rf['executionSha256'],'allRawFieldsUnchanged':eqrow,'equalStats':equalstats,'gainDelta':rf['offenseYards']-rb['offenseYards'],'unchangedQBReport':rb['qbReport']==rf['qbReport'],'baseline':{k:rb[k] for k in ['outcome','offenseYards','duration','stats','qbReport','maxStress','minFocus','executionSha256','events']},'candidate':{k:rf[k] for k in ['outcome','offenseYards','duration','stats','qbReport','maxStress','minFocus','executionSha256','events']}})
 if not eqrow:
  bs={s['t']:s for s in rb['samples']};fs={s['t']:s for s in rf['samples']};t=next((t for t in sorted(bs.keys()&fs.keys()) if bs[t]!=fs[t]),None)
  pair['firstRetainedSampleFork']=None if t is None else {'t':t,'baseline':bs[t],'candidate':fs[t]}
 pairs.append(pair)
report={'schema':'saved-passing-comparison-v1','sourceBaseline':b['sourceBefore'],'sourceCandidate':f['sourceBefore'],'inputs':{str(p):sha(p) for p in [BP,FP]},'analysisToolSha256':sha(Path(__file__)),'matchedToolSha256':f['toolSha256'],'unchangedWorld':f['sharedWorldSha256'],'matchedProfiles96':True,'matchedInitialStoredSamples96':True,'observerVerified96EachPhase':True,'counts':{'wholeExecutionUnchanged':sum(p['wholeExecutionUnchanged'] for p in pairs),'allRawFieldsUnchanged':sum(p['allRawFieldsUnchanged'] for p in pairs),'sameGain':sum(p['gainDelta']==0 for p in pairs),'higherGain':sum(p['gainDelta']>0 for p in pairs),'lowerGain':sum(p['gainDelta']<0 for p in pairs),'sameStats':sum(p['equalStats'] for p in pairs),'sameQBReport':sum(p['unchangedQBReport'] for p in pairs)},'baseline':summary(b['rows']),'candidate':summary(f['rows']),'byCoverage':{c:{'baseline':summary([r for r in b['rows'] if r['coverage']==c]),'candidate':summary([r for r in f['rows'] if r['coverage']==c])} for c in sorted({r['coverage'] for r in b['rows']})},'pairs':pairs,'limits':['96 fixed balanced passing calls from generated rosters, not NFL coverage/call frequencies or a league sample.','First stored initial picture matches, not a complete exported hidden-state snapshot; full profile hashes and construction inputs remain exactly matched.','ObserverVerified comes from each native collector comparing complete endpoint signature with its plain run; this comparison does not perform new runs.','Separation uses field-bearing attempted nonthrowaway rows; not certified NFL charting. Each field retains its own denominator.','YAC uses only field-bearing completed throws without interceptedBy; absent YAC is not zero.','Passing outcome changes combine controllers and any live run contact after catch/scramble; mean gain is not direct physics calibration.','First retained QB/corner sample fork may occur after an unrecorded earlier decision. No universal oracle or first-action claim.']}
OP.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['sourceBaseline','sourceCandidate','counts','baseline','candidate']},indent=2)); print('Changed execution or raw rows:')
for p in pairs:
 if not p['allRawFieldsUnchanged']:print(p['id'],'gain',p['baseline']['offenseYards'],p['candidate']['offenseYards'],'executionequal',p['wholeExecutionUnchanged'],'statsequal',p['equalStats'])
