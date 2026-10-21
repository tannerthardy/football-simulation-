#!/usr/bin/env python3
"""Saved-only replay of the current catch resolver's geometric projection."""
from pathlib import Path
import gzip, hashlib, json, math, statistics
ROOT=Path.cwd()
BASE=ROOT/'out/catch-height-audit'
TRACE=ROOT/'out/catch-contact-census/baseline-traces'
QUERY=ROOT/'out/catch-contact-census/random-sample.json'
SOURCE='0398418c6e8b8d53a1517a17f7087c697230ac62f12dd37373af2b6548bd1df7'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
canonical=lambda v:json.dumps(v,sort_keys=True,separators=(',',':'))
def quantiles(v):
 a=sorted(v)
 def q(p):
  index=(len(a)-1)*p; lo=math.floor(index);hi=math.ceil(index)
  return a[lo]+(a[hi]-a[lo])*(index-lo)
 return {'n':len(a),'min':a[0],'mean':statistics.mean(a),'p50':q(.5),'p90':q(.9),'max':a[-1]} if a else None
query=json.loads(QUERY.read_text()); ids=query['selectedIds']
assert len(ids)==24 and len(set(ids))==24 and 'S105-P159' not in ids
manifestPins=[];manifestRows={}
for path in sorted(TRACE.glob('manifest-*.json')):
 m=json.loads(path.read_text())
 assert m['source']==m['sourceAfter']==SOURCE and m['prefixObserverPlainExact']
 assert m['selectionSha256']==sha(QUERY)
 manifestPins.append({'path':str(path.relative_to(ROOT)),'sha256':sha(path),'toolSha256':m['toolSha256']})
 for r in m['rows']:
  assert r['observerVerified'] and r['referenceExact'];manifestRows[r['id']]=r
rows=[]
for id in ids+['S105-P159']:
 path=TRACE/(id+'.json.gz');r=json.loads(gzip.decompress(path.read_bytes()));m=manifestRows[id]
 assert r['id']==id and r['source']==SOURCE and r['observerVerified'] and r['referenceExact']
 assert r['executionSha256']==r['plainExecutionSha256']==m['executionSha256']
 assert len(r['catches'])==1
 c=r['catches'][0];profile=c['profile'];a=c['previousAir'];b=c['currentAir'];pos=c['catcherPosition']
 assert canonical(profile)==canonical(c['bodyBefore']['profile'])
 dx=b['x']-a['x'];dy=b['y']-a['y'];length2=dx*dx+dy*dy
 s=max(0.,min(1.,((pos['x']-a['x'])*dx+(pos['y']-a['y'])*dy)/length2)) if length2>1e-9 else 0.
 px=a['x']+dx*s;py=a['y']+dy*s;z=a['z']+(b['z']-a['z'])*s
 dh=math.hypot(pos['x']-px,pos['y']-py)
 assert min(a['z'],b['z'])-1e-12<=z<=max(a['z'],b['z'])+1e-12
 assert z>=.1 and z<=profile['maxCatchHeight']+1e-12
 player=next(p for p in r['players'] if p['idx']==c['catcher'])
 assert player['team']=='O' and r['result']['stats']['completed'] and r['result']['stats']['receiver']==player['player']['id']
 event=next(e for e in r['result']['events'] if e['type']=='catch')
 assert event['a']==c['catcher'] and abs(event['t']-c['t'])<1e-9
 unchanged=canonical(c['bodyBefore'])==canonical(c['bodyAfter'])
 assert c['supportUnchanged'] and canonical(c['bodyBefore']['support'])==canonical(c['bodyAfter']['support'])
 v=c['bodyBefore']['vel'];bv=c['flight']['vel'];reach=profile['reach']+.3
 rows.append({'id':id,'population':'predeclared-ordinary-24' if id in ids else 'separate-retained-long-YAC-witness','packetSha256':sha(path),'toolSha256':r['toolSha256'],'initialSha256':r['initialSha256'],'observerVerified':True,'referenceExact':True,'catcherIndex':c['catcher'],'catcherId':player['player']['id'],'group':player['player']['position'],'catchTime':c['t'],'segmentFraction':s,'exactResolverHeightYd':z,'modeledUntimedReactReachYd':profile['reactReach'],'modeledMaxCatchHeightYd':profile['maxCatchHeight'],'heightAboveReactReachYd':max(0.,z-profile['reactReach']),'exceedsReactReach':z>profile['reactReach'],'exceedsMaxCatchHeight':z>profile['maxCatchHeight'],'closestHorizontalExtensionYd':dh,'unboostedHorizontalReachYd':profile['reach'],'usesExtraHorizontalReachAllowance':dh>profile['reach'],'receiverContestNormalizedExtension':dh/reach,'receiverContestSquaredStretch':(dh/reach)**2,'receiverEntryVelocityYdPerS':v,'receiverEntrySpeedYdPerS':math.hypot(v['x'],v['y']),'incomingBallSpeedAtSegmentEndYdPerS':math.sqrt(sum(bv[k]**2 for k in ['x','y','z'])),'supportStateBefore':c['bodyBefore']['support']['state'],'supportStateAfter':c['bodyAfter']['support']['state'],'bodyUnchangedAcrossPossession':unchanged,'supportUnchangedAcrossPossession':c['supportUnchanged'],'nativeOutcome':r['result']['outcome'],'nativeYacYd':r['result']['stats'].get('yac')})
ordinary=rows[:24];witness=rows[24]
report={'schema':'exact-catch-height-audit-v1','head':'cd25757','sourceSha256':SOURCE,'selection':{'path':str(QUERY.relative_to(ROOT)),'sha256':sha(QUERY),'seed':query['randomSeed'],'count':24,'method':query['method']},'analysisOnly':True,'newSimulations':0,'method':{'projection':'Exact catching.ts49–54: s=clamp(dot(catcherPos−previousAir,currentAir−previousAir)/|segmentXY|²,0,1), z=previousAir.z+(currentAir.z−previousAir.z)*s. Uses actual catcher after World, before ordinary possess(catch), not held-ball z or future catchSpot.','extension':'dh is actual resolver horizontal center-to-ball segment distance. Normalized stretch is dh/(profile.reach+.3), matching receiverContest. Not a measured anatomical arm extension.','entrySpeed':'Receiver actual body velocity at possess entry. Incoming ball speed is recorded cur-endpoint flight velocity, not an interpolated instantaneous velocity at opportunity fraction s.','support':'Exact decoded diagnostic JSON comparison around ordinary possess; excludes earlier World movement and later carrier control.'},'summary':{'ordinaryCatches':24,'exactHeightsAvailable':24,'missingExactHeights':0,'receiverGroups':{g:sum(r['group']==g for r in ordinary) for g in sorted(set(r['group']for r in ordinary))},'aboveReactReach':sum(r['exceedsReactReach']for r in ordinary),'aboveReactReachFraction':sum(r['exceedsReactReach']for r in ordinary)/24,'aboveReactReachIds':[r['id']for r in ordinary if r['exceedsReactReach']],'aboveMaxCatchHeight':sum(r['exceedsMaxCatchHeight']for r in ordinary),'usesExtraHorizontalReachAllowance':sum(r['usesExtraHorizontalReachAllowance']for r in ordinary),'uprightAtPossession':sum(r['supportStateBefore']=='up' for r in ordinary),'bodyUnchangedAcrossPossession':sum(r['bodyUnchangedAcrossPossession']for r in ordinary),'supportUnchangedAcrossPossession':sum(r['supportUnchangedAcrossPossession']for r in ordinary),'catchHeightYd':quantiles([r['exactResolverHeightYd']for r in ordinary]),'receiverEntrySpeedYdPerS':quantiles([r['receiverEntrySpeedYdPerS']for r in ordinary]),'normalizedExtension':quantiles([r['receiverContestNormalizedExtension']for r in ordinary]),'incomingBallSpeedAtSegmentEndYdPerS':quantiles([r['incomingBallSpeedAtSegmentEndYdPerS']for r in ordinary])},'separateLongYacWitness':witness,'ordinaryRows':ordinary,'manifestPins':manifestPins,'analyzerSha256':sha(__file__),'resolverSourceSha256':sha(ROOT/'src/sim/catching.ts'),'limits':['24 random completions from two generated-roster cohorts; one selected high-YAC witness is reported separately and excluded from prevalence.','reactReach includes .3 combine vertical, not literal measured standing reach. Above it establishes extra modeled height allowance, not a measured jump; below it does not prove no leap.','No achieved vertical state or actual landing exists in this baseline. Unchanged body/support confirms absence of catch-specific transfer, not that a real player should lose balance.','Native catch height/extension is exact to the existing segment solver; it is not empirical NFL biomechanics or evidence that high catch caused YAC.','No causal jump/YAC, grip, mandatory slowdown or fixed catch penalty claim. Conditional controller/World comparisons are required before implementing recovery.']}
BASE.mkdir(exist_ok=True);output=BASE/'exact-heights.json';output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'path':str(output.relative_to(ROOT)),'sha256':sha(output),'summary':report['summary'],'separateWitness':witness},indent=2))
