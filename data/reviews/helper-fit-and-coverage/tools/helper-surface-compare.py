#!/usr/bin/env python3
"""Saved-only first-request/physical-response comparison; never rescales forces."""
import gzip,json,sys,hashlib,math
from pathlib import Path
left,right=map(Path,sys.argv[1:3]); a,b=[json.load(gzip.open(p)) for p in [left,right]]
def hs(state):return {(h['helper'],h['defender']):h for h in state['helpers']}
rows=[]
for x,y in zip(a['rows'],b['rows']):
 if x['id']!=y['id'] or x['input']!=y['input'] or x['physicalInitialSha256']!=y['physicalInitialSha256']:raise RuntimeError('Native input/physical initial mismatch')
 first_request=None;first_checkpoint=None; first_actual=None
 for sa,sb in zip(x['steps'],y['steps']):
  if sa['t']!=sb['t']:raise RuntimeError('Time mismatch before first fork')
  if first_request is None:
   changes=[i for i,(ia,ib) in enumerate(zip(sa['executed'],sb['executed'])) if ia!=ib]
   if changes:
    first_request={'t':sa['t'],'actors':[{'idx':i,'slot':x['players'][i]['slot'],'before':sa['executed'][i],'after':sb['executed'][i]} for i in changes],'baselineHelpers':sa['helpers'],'candidateHelpers':sb['helpers'],'candidateActualAims':sb['aims'],'baselineActualAims':sa['aims'],'baselineConsumedCues':sa['consumed'],'candidateConsumedCues':sb['consumed']}
  if first_actual is None and sa['actualHandImpulses']!=sb['actualHandImpulses']:first_actual={'t':sa['t'],'baseline':sa['actualHandImpulses'],'candidate':sb['actualHandImpulses']}
 for ca,cb in zip(x['checkpoints'],y['checkpoints']):
  if ca['sha256']!=cb['sha256']:first_checkpoint={'t':ca['t'],'before':ca['sha256'],'after':cb['sha256']};break
 def summary(r):
  zero=[(s,h) for s in r['steps'] for h in s['helpers'] if h['helperSurfaceDot']<=0]
  loaded=[(s,h) for s in r['steps'] for h in s['helpers'] if h['helperSupport']>0 and any(p['i']==h['helper'] and p['j']==h['defender'] and math.hypot(p['onB']['x'],p['onB']['y'])>1e-9 for p in s['actualHandImpulses'])]
  return {'gain':r['result']['offenseYards'],'outcome':r['result']['outcome'],'wrongSurfaceTicks':len(zero),'achievedLoadedHelperTicks':len(loaded),'nativeResult':{k:v for k,v in r['result'].items() if k not in ['frames','telemetry']},'observerSignature':r['observed'],'plainSignature':r['plain'],'loadedHelperSamples':[{'t':s['t'],'helper':h['helperSlot'],'defender':h['defenderSlot'],'surfaceDot':h['helperSurfaceDot'],'functionalSupport':h['helperSupport'],'signedHandImpulse':next(p['onB'] for p in s['actualHandImpulses'] if p['i']==h['helper'] and p['j']==h['defender'])} for s,h in loaded]}
 rows.append({'id':x['id'],'input':x['input'],'physicalInitialSha256':x['physicalInitialSha256'],'baseline':summary(x),'candidate':summary(y),'firstRequestFork':first_request,'firstFullCheckpointFork':first_checkpoint,'firstActualHandImpulseFork':first_actual})
output={'schema':'native-helper-surface-comparison-v1','baselineSource':a['sourceBefore'],'candidateSource':b['sourceBefore'],'baselinePacketSha256':hashlib.sha256(left.read_bytes()).hexdigest(),'candidatePacketSha256':hashlib.sha256(right.read_bytes()).hexdigest(),'method':'Read-only aligned fixed-input native records. All initial body/profile/mind/cadence bytes match. First executed intent, first complete physical/controller checkpoint, and first achieved directional hand impulse difference retained. Natural outcomes and adverse mirrors retained; no counterfactual outcome attribution from aggregate alone.','rows':rows}
Path(sys.argv[3]).write_text(json.dumps(output,indent=2));print(json.dumps({'output':sys.argv[3],'rows':[{'id':r['id'],'gainBefore':r['baseline']['gain'],'gainAfter':r['candidate']['gain'],'firstRequest':r['firstRequestFork']['t'] if r['firstRequestFork'] else None,'wrongSurfaceBefore':r['baseline']['wrongSurfaceTicks'],'wrongSurfaceAfter':r['candidate']['wrongSurfaceTicks'],'loadedBefore':r['baseline']['achievedLoadedHelperTicks'],'loadedAfter':r['candidate']['achievedLoadedHelperTicks']} for r in rows]}))
