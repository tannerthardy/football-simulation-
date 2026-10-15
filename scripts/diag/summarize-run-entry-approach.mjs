/** Reduce saved traces only. No simulation, controller queries or RNG. */
import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
const[infoPath,pacePath,joinedPath,outPath]=process.argv.slice(2),load=p=>JSON.parse(gunzipSync(readFileSync(p))),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const info=load(infoPath),pace=load(pacePath),joined=load(joinedPath);
for(const a of [pace,joined]){assert.deepEqual(a.flags,info.flags);assert.deepEqual(a.worldDefaults,info.worldDefaults);assert.equal(a.node,info.node);assert.equal(a.manifestSha256,info.manifestSha256);assert(a.earlierPrefixMatches&&a.matchedEarlierEntries===31&&!a.failure);}
function reduce(row){
 const impacts=row.frames.flatMap(f=>f.report.contacts.filter(c=>c.i<11&&c.j<11&&c.impulse>1e-8).map(c=>({step:f.t,...c})));
 const pairs=new Map();for(const f of row.frames)for(const j of f.joints){if(j.kind!=='hands'||j.a>=11||j.b<11)continue;const key=j.a+'>'+j.b;
  const p=pairs.get(key)??{blocker:j.a,defender:j.b,normalImpulse:0,absoluteTangentImpulse:0};p.normalImpulse+=(j.normalForce??0)*.05;p.absoluteTangentImpulse+=Math.abs(j.tangentForce??0)*.05;pairs.set(key,p);}
 const choices=row.reads.filter(e=>e.phase==='entry-approach'),durations={fast:0,slower:0,gather:0};for(const c of choices)durations[c.choice]+=.05;
 const los=row.frames.find(f=>f.after[6].pos.x>=row.los),last=row.frames.at(-1).after[6];
 return{nativePlay:row.nativePlay,role:row.role,los:row.los,capturedThrough:3,censored:row.censored,teammateImpacts:impacts,
  firstCarrierContact:row.events.find(e=>e.type==='carrier_contact')??null,losCrossing:los?Math.round((los.t+.05)*100)/100:null,
  rbAt3:{pos:last.pos,vel:last.vel,speed:Math.hypot(last.vel.x,last.vel.y)},approachSeconds:durations,
  blockingLoad:[...pairs.values()],events:row.events.filter(e=>['carrier_contact','fall','tackle','block_climb'].includes(e.type))};
}
const stages={informationOnly:info.rows.map(reduce),pacingOnly:pace.rows.map(reduce),entryAdmission:joined.rows.map(reduce)};
const control=joined.rows[0],oldControl=info.rows[0];
for(let i=0;i<60;i++){assert.deepEqual(control.frames[i].report,oldControl.frames[i].report);assert.deepEqual(control.frames[i].joints,oldControl.frames[i].joints);assert.deepEqual(control.frames[i].final,oldControl.frames[i].final);assert.deepEqual(control.frames[i].before,oldControl.frames[i].before);}
assert.deepEqual(control.completedResult,oldControl.completedResult);assert.deepEqual(control.events,oldControl.events);
const firstFinal=joined.rows[1].frames.find((f,i)=>JSON.stringify(f.final)!==JSON.stringify(info.rows[1].frames[i].final));
const result={schema:'run-entry-admission-review-v1',recommendation:'Advance information correction and entry admission separately for Integration review; gap fix independent. No baseline promotion.',
 informationClassification:'Private engagement/fatigue/down shortcuts are independently defective. Impact plus fragile forecast held complete navigation improvement; collision alone was not proof of bad football.',
 sources:{informationOnly:info.rootSourceSha256,pacingOnly:pace.rootSourceSha256,entryAdmission:joined.rootSourceSha256,isolatedPacing:pace.isolatedSourceSha256,isolatedEntryAdmission:joined.isolatedSourceSha256},
 inputs:{infoTraceSha256:hash(infoPath),pacingTraceSha256:hash(pacePath),entryTraceSha256:hash(joinedPath),manifestSha256:info.manifestSha256,originalGameSha256:info.originalGameSha256,witnessSha256:info.witnessSha256,node:info.node,flags:info.flags,worldDefaults:info.worldDefaults},
 method:'Same native Game prefix, exact original teams/RNG/calls/all22 initial bodies. Only selected P019/P032 use production changes through3s. Other plays original. Full opening policy starts before1.95; exact1.95 comparison is a separate saved-state probe, not the coupled intervention origin.',
 measurement:'Impacts are resolved World contacts >1e-8 kg*yd/s. Blocking loads integrate pre-step resolved hands normal and absolute tangent force at t0..2.95 by50ms. Carrier-contact events retain own timestamps. All target continuations censored at3s; no final yardage inferred.',
 stages,clearControl:{all60ReportsJointsFinalIntentsBodiesEqual:true,completedResultAndEventsEqual:true,legitimateCarrierContact:2.8,legitimateTackle:3.5},
 firstDivergence:{raw:joined.rows[1].comparison.firstChangedRequest,finalIntentAt:firstFinal?.t,body:joined.rows[1].comparison.firstChangedBody},
 cost:{nativePhysicalScrimmages:pace.physicalScrimmages+joined.physicalScrimmages,nativeCompletedGames:0,nativeSeconds:pace.elapsedSeconds+joined.elapsedSeconds,
  pacingSeconds:pace.elapsedSeconds,entryAdmissionSeconds:joined.elapsedSeconds,fullSuiteRuns:0,newRosterCases:0,finalFocusedTests:40,finalTypecheckPassed:true},
 limitations:['New approach prediction uses only observer-owned teammate pictures and public braking capability; it does not predict future contact or arbitrary teammate acceleration.',
  'The directed braking envelope is a declared controller uncertainty model, not NFL calibration or guaranteed bounds on externally forced motion.',
  'Only free entry approaches are covered. Own restraints/squeeze/lean/load bypass the unloaded forecast; installed-called/tactile pictures retain their existing handling.',
  'Existing legacy destination/squeeze/evaluate information callers outside this bounded approach predictor were not migrated or certified. No new hidden state is supplied to the predictor.',
  'Recorded engine includes Awareness interface absent from accepted develop and published bookkeeping review. Integration must combine that existing interface explicitly; do not import all recorded ancestry.',
  'No coupled accepted-base+gap+all-experiments run or transfer/roster screen. P032 remains unfinished. Integration owns combined verification.']};
writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({firstDivergence:result.firstDivergence,stages:Object.fromEntries(Object.entries(stages).map(([k,v])=>[k,v.map(r=>({play:r.nativePlay,impacts:r.teammateImpacts.length,los:r.losCrossing,gatherSeconds:r.approachSeconds.gather,rb3:r.rbAt3.pos}))])),cost:result.cost}));
