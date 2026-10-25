#!/usr/bin/env python3
"""Compare only saved, immutable full-run reports; no engine execution."""
import gzip,json,hashlib,statistics,math,sys
from pathlib import Path
BP=Path('data/reviews/run-fit-and-recovery/runs/final.json.gz')
FP=Path(sys.argv[1] if len(sys.argv)>1 else 'out/helper-fit/runs-final.json.gz')
OP=Path(sys.argv[2] if len(sys.argv)>2 else 'out/helper-fit/early-contact/runs-final-comparison.json')
def read(p):return json.load(gzip.open(p))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def eventrows(r,kind):return [e for e in r['result']['events'] if e['type']==kind]
def total(r,k):return sum(m[k] for m in r['olMetrics'].values())
def firstloads(r):
 found={}
 for u in r['updates']:
  owners={a['slot']:a for a in u.get('afterSolvedOwnership',[])}
  for load in u.get('deliveredStep',[]):
   found.setdefault((u['t'],load['slot']),{'t':u['t'],'load':load,'ownership':owners.get(load['slot'])})
 for slot,m in r['olMetrics'].items():
  for c in m['firstContacts']+m['firstHands']:
   found.setdefault((c['t'],slot),{'t':c['t'],'load':c['nativeLoad'],'ownership':{'slot':slot,'engagement':c['engagement'],'plan':{'kind':c['planKind'],'target':c['planTarget'],'drive':c['drive']}}})
 return found

def helpers(r):
 samples=[]
 for (t,slot),s in firstloads(r).items():
  e=(s['ownership'] or {}).get('engagement')
  if not e or slot not in e['helpers']:continue
  member=next(a for a in e['members'] if a['slot']==slot)
  h=member['hands']
  if not h or not h['live']:continue
  samples.append({'t':t,'slot':slot,'defender':e['defender'],'owner':e['blocker'],'helperSupport':member['helperSupport'],'supportAvailability':member['supportAvailability'],'joint':h,'normalForce':h.get('normalForce',0),'tangentForce':h.get('tangentForce',0),'armImpulse':s['load']['armImpulse'],'armWork':s['load']['armWork'],'appliedIntent':s['load']['appliedIntent'],'achievedPos':s['load']['achievedPos'],'achievedVel':s['load']['achievedVel']})
 first={}
 for x in sorted(samples,key=lambda x:(x['t'],x['slot'])):
  if x['helperSupport']>0 and x['joint'].get('actor') in [None,x['slot']] and (abs(x['normalForce'])>1e-6 or abs(x['tangentForce'])>1e-6) and x['armImpulse']>1e-6:
   first.setdefault((x['slot'],x['defender']),x)
 return {'retainedSamples':len(samples),'sampledPositiveEligibleLoadedPairs':[first[k] for k in sorted(first)],'nearZeroSurfaceLoadedSamples':sum(x['helperSupport']<.05 and (abs(x['normalForce'])>1e-6 or abs(x['tangentForce'])>1e-6) for x in samples)}

def contacts(r):
 out=[]
 for slot,m in r['olMetrics'].items():
  for kind in ['firstContacts','firstHands']:
   for c in m[kind]:
    e=c.get('engagement');member=next((x for x in e['members'] if x['slot']==slot),None) if e else None
    out.append({'slot':slot,'kind':kind,'t':c['t'],'other':c['other'],'otherTeam':c['otherTeam'],'intended':c['planTarget'],'alongDrive':c['alongDrive'],'lateralError':c['lateralErrorToDrive'],'helper':bool(e and slot in e['helpers']),'helperSupport':member['helperSupport'] if member else None,'handNormalForce':member['hands'].get('normalForce',0) if member and member['hands'] else None,'handTangentForce':member['hands'].get('tangentForce',0) if member and member['hands'] else None,'armImpulse':c['nativeLoad']['armImpulse'],'armWork':c['nativeLoad']['armWork'],'appliedIntent':c['nativeLoad']['appliedIntent'],'achievedPos':c['nativeLoad']['achievedPos'],'achievedVel':c['nativeLoad']['achievedVel']})
 return out

def dist(a,b):return math.hypot(a['x']-b['x'],a['y']-b['y'])
def fork(b,f):
 bl=firstloads(b);fl=firstloads(f)
 for key in sorted(bl.keys()&fl.keys()):
  b0=bl[key];f0=fl[key]
  if b0['load']!=f0['load']:
   return {'t':key[0],'slot':key[1],'requestChanged':b0['load']['appliedIntent']!=f0['load']['appliedIntent'],'positionDifference':dist(b0['load']['achievedPos'],f0['load']['achievedPos']),'baseline':b0,'candidate':f0}
 return None

b=read(BP);f=read(FP)
for key in ['collectorSha256','cohort','filmIds','definitions','limitations']:
 assert b[key]==f[key],key
assert b['sourceBefore']==b['sourceAfter']
assert f['sourceBefore']==f['sourceAfter']
assert b['moduleSha256']['src/physics/world.ts']==f['moduleSha256']['src/physics/world.ts']
pairs=[]
for collection in ['trials','supplementalTrials']:
 assert len(b[collection])==len(f[collection])
 for rb,rf in zip(b[collection],f[collection]):
  for key in ['id','initialSha256','initialProjection','profileSha256','run','front','formation','seed','flip','roster','supplemental']:
   assert rb[key]==rf[key],(rb['id'],key)
  assert rb['observerVerified'] and rf['observerVerified']
  assert rb['observedSignature']==rb['plainSignature'] and rf['observedSignature']==rf['plainSignature']
  p={'id':rb['id'],'run':rb['run'],'front':rb['front'],'flip':rb['flip'],'seed':rb['seed'],'supplemental':rb['supplemental'],'baselineGain':rb['result']['offenseYards'],'candidateGain':rf['result']['offenseYards'],'gainDelta':rf['result']['offenseYards']-rb['result']['offenseYards'],'wholeExecutionUnchanged':rb['observedSignature']==rf['observedSignature'],'sameResult':rb['result']==rf['result'],'naturallyEnds':[rb['naturalEnd'],rf['naturalEnd']]}
  for phase,r in [('baseline',rb),('candidate',rf)]:
   p[phase]={'result':r['result'],'targetTransitions':r['targetTransitions'],'earnedCommandLocalClimbs':r['earnedClimbs'],'wholePlayClimbs':eventrows(r,'block_climb'),'cancelledTransitions':r['cancelledTransitions'],'helperLoads':helpers(r),'contacts':contacts(r),'OLTotals':{k:total(r,k) for k in ['armImpulseSum','armWorkSum','groundImpulseMagnitudeSum','supportMotorWorkSum','deliveredStrikeCount','falls','downs']},'maxMomentumResidual':r['maxMomentumResidual'],'maxWorkResidual':r['maxWorkResidual'],'maxMotorWorkExcess':r['maxMotorWorkExcess']}
  if not p['wholeExecutionUnchanged']:p['firstRetainedNativeLoadFork']=fork(rb,rf)
  pairs.append(p)

def summary(ps):
 out={'n':len(ps),'unchangedWholeExecution':sum(p['wholeExecutionUnchanged'] for p in ps),'unchangedGain':sum(p['gainDelta']==0 for p in ps),'higherGain':sum(p['gainDelta']>0 for p in ps),'lowerGain':sum(p['gainDelta']<0 for p in ps),'newStuff':[p['id'] for p in ps if p['baselineGain']>0 and p['candidateGain']<=0],'resolvedStuff':[p['id'] for p in ps if p['baselineGain']<=0 and p['candidateGain']>0]}
 for phase in ['baseline','candidate']:
  out[phase]={'meanGain':statistics.mean(p[phase+'Gain'] for p in ps),'stuff':sum(p[phase+'Gain']<=0 for p in ps),'10plus':sum(p[phase+'Gain']>=10 for p in ps),'meanYBC':statistics.mean(p[phase]['result']['stats']['yardsBeforeContact'] for p in ps),'wholePlayClimbs':sum(len(p[phase]['wholePlayClimbs']) for p in ps),'sampledLoadedHelperPairs':sum(len(p[phase]['helperLoads']['sampledPositiveEligibleLoadedPairs']) for p in ps),'OLTotals':{k:sum(p[phase]['OLTotals'][k] for p in ps) for k in ps[0][phase]['OLTotals']},'censors':sum(not p['naturallyEnds'][phase=='candidate'] for p in ps),'maxMomentumResidual':max(p[phase]['maxMomentumResidual'] for p in ps),'maxWorkResidual':max(p[phase]['maxWorkResidual'] for p in ps),'maxMotorWorkExcess':max(p[phase]['maxMotorWorkExcess'] for p in ps)}
 return out
ordinary=[p for p in pairs if not p['supplemental']]
output={'schema':'saved-run-helper-comparison-v1','analysisToolSha256':sha(Path(__file__)),'sourceBaseline':b['sourceBefore'],'sourceCandidate':f['sourceBefore'],'inputs':{str(p):sha(p) for p in [BP,FP]},'matched162Inputs':True,'matchedCollector':b['collectorSha256'],'unchangedWorld':b['moduleSha256']['src/physics/world.ts'],'summary':summary(ordinary),'supplementalSummary':summary([p for p in pairs if p['supplemental']]),'byConcept':{kind:summary([p for p in ordinary if p['run']==kind]) for kind in sorted({p['run'] for p in ordinary})},'pairs':pairs,'limits':['All162 fixed native inputs, full profiles, tools/cohort and initial snapshots match exactly.','Observer/plain execution matches all162 within each phase.','Recorded live hand presence is not proof of a loaded block. Sampled loaded-helper pair requires helper role, live acquired hands,positive current support and measured nonzero hand force and arm impulse.','Actual normal/tangent hand force can push,pull or steer; nonzero alone does not establish desired displacement, winning contact or a useful lane.','Retained helper samples are lower bounds from existing first-contact and combination-read logs, not complete time series or population frequencies.','First retained load fork may occur after an unlogged earlier fork; it is not advertised as the first engine action.','Whole-play climbs come from native events; command-local counters are reported separately.','Natural ends and isolated censors cannot be pooled; all current native ordinary plays finish naturally.']}
OP.write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps({k:output[k] for k in ['sourceBaseline','sourceCandidate','summary','supplementalSummary']},indent=2));print('All changed gains:')
for p in pairs:
 if p['gainDelta']:
  print(p['id'],p['baselineGain'],p['candidateGain'],round(p['gainDelta'],3),'loadedhelperpairs',len(p['baseline']['helperLoads']['sampledPositiveEligibleLoadedPairs']),len(p['candidate']['helperLoads']['sampledPositiveEligibleLoadedPairs']),'climbs',len(p['baseline']['wholePlayClimbs']),len(p['candidate']['wholePlayClimbs']))
