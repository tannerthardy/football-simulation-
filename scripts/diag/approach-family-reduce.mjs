/** Saved-only adjudication of the one rejected gather/interception trial.
 * INPUT_DIRECTORY OUTPUT.json. No simulator tick or movement preview.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {FIELD_WIDTH} from '../../src/core/field.ts';
import {clamp} from '../../src/core/vec.ts';
import {gatheringApproach,leverage} from '../../src/sim/behaviors/common.ts';
const [dir,out]=process.argv.slice(2),began=performance.now(),
 hash=v=>createHash('sha256').update(v).digest('hex'),
 read=name=>{const b=readFileSync(`${dir}/${name}`);return JSON.parse(name.endsWith('.gz')?gunzipSync(b):b);},
 idx=(d,t)=>d.frames.findIndex(f=>f.t===t),
 oldNative=r=>({frames:r.result.frames,states:r.result.telemetry.frames}),
 result={schema:'approach-family-verdict-v1',operatorSha256:hash(readFileSync(import.meta.filename)),
  accepted:'86250bb4f0c6f421878c204161864d523c3e30b6',referenceSource:'dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3',
  trial:'3bc12ffcda220f883beebb80596ae7b0a5f8468b',trialSource:'16c87ec2fd7e7855877a84e311c7ff97c7496a8e916bf205115e68b109fbad65',
  verdict:'Reject for promotion: forecast improvement did not become useful first-contact improvement.',nativeExecutions:0,cases:[]};
assert.ok(!existsSync(out));
for(const name of ['A020','A042','A008','A032']){
 const raw=read(`${name}.json`),candidate=read(`${name}-candidate.json.gz`),
  ref=name==='A042'?read('A042-reference-extended.json.gz'):null,
  baseline=ref?.native??oldNative(raw),now=candidate.native,
  fork=baseline.states.find((s,i)=>s.t<=now.states.at(-1).t&&JSON.stringify(s.agents)!==JSON.stringify(now.states[i].agents)),
  actors=fork?fork.agents.map((a,i)=>JSON.stringify(a)!==JSON.stringify(now.states[idx(now,fork.t)].agents[i])?i:-1).filter(i=>i>=0):[],
  events=ref?.events??raw.result.events;
 assert.equal(candidate.inputNativeSha256,hash(readFileSync(`${dir}/${name}.json`)));
 assert.ok(candidate.observerNeutral);
 for(const [key,value]of Object.entries(ref?.flags??candidate.flags))assert.equal(candidate.flags[key],value);
 const row={case:name,actors:candidate.actors,baselineKind:ref?'new accepted-source reference':'saved accepted7eb2554 pass; #85 changes Duo only',
  inputNativeSha256:candidate.inputNativeSha256,firstChangedRecordedState:fork?{t:fork.t,actors}:null,
  candidateEnd:{t:candidate.end,censored:candidate.censored},arms:[]};
 const runner=candidate.target,first=candidate.actor;
 function geometry(native,t){const j=idx(native,t);assert.ok(j>=0);const f=native.frames[j],s=native.states[j],
   r={x:f.agents[runner*3],y:f.agents[runner*3+1]},d={x:f.agents[first*3],y:f.agents[first*3+1]};
  return{runner:r,defender:d,runnerVelocity:s.agents[runner].body.velocity,defenderVelocity:s.agents[first].body.velocity,
   gapFromRoundedPositions:Math.hypot(r.x-d.x,r.y-d.y)};}
 for(const [arm,es,native]of [['reference',events,baseline],['candidate',candidate.events,now]]){
  const contact=es.find(e=>e.type==='carrier_contact'),wrap=es.find(e=>e.type==='tackle_wrap'&&e.note==='initial'),
   broken=es.find(e=>e.type==='broken_tackle'&&e.b===first),finish=es.find(e=>e.type==='tackle');
  assert.equal(contact.b,first);
  row.arms.push({arm,firstGrasp:contact.t,eventBodySeparation:Math.hypot(contact.pos.x-wrap.pos.x,contact.pos.y-wrap.pos.y),
   geometryAtFirstGrasp:geometry(native,contact.t),firstGripBreak:broken?.t??null,
   recordedFirstGripSurvival:broken?broken.t-contact.t:finish&&finish.t<=native.frames.at(-1).t?finish.t-contact.t:null,
   completedTackle:finish&&finish.t<=native.frames.at(-1).t?finish.t:null,
   relevantEvents:es.filter(e=>['catch','handoff','carrier_contact','tackle_wrap','broken_tackle','fall','tackle'].includes(e.type)
    &&e.t<=candidate.end),
   firstOpportunityDecisions:(ref&&arm==='reference'?ref.native.decisions:arm==='reference'?raw.result.telemetry.decisions:now.decisions)
    .filter(e=>e.a===first&&e.kind==='tackle-opportunity'&&e.t>=contact.t-.2&&e.t<=contact.t+.05)});
 }
 if(name==='A020'||name==='A042'){
  const t=fork.t,referenceCapture=read(`${name}-capture.json.gz`),f=read(`${name}-intercept.json`),
   before=referenceCapture.rows.find(r=>r.t===t),at=candidate.rows.find(r=>r.t===t),
   forecast=f.rows.find(r=>r.t===t).options.momentumIntercept,
   endRow=candidate.rows.find(r=>Math.abs(r.t-(t+forecast.best.t-.05))<1e-7);
  assert.deepEqual(before.body,at.body);assert.deepEqual(before.cues,at.cues);
  assert.deepEqual(forecast.first.pos,at.worldAfter.pos);assert.deepEqual(forecast.first.vel,at.worldAfter.vel);
  row.firstIntervention={t,sameIncomingBodyAndAcquiredCues:true,first50msPositionAndVelocityExact:true,
   request:at.command,forecastBest:forecast.best,actualAtForecastBoundary:{pos:endRow.worldAfter.pos,vel:endRow.worldAfter.vel},
   nextRequests:candidate.rows.filter(r=>r.t>=t&&r.t<=t+.2+1e-7).map(r=>{
    const seen=r.cues.find(c=>c.caller.includes('at chase ')).picture,
     a={body:r.body,pos:r.body.pos,vel:r.body.vel,profile:r.body.profile,speedScale:r.speedScale,r:k=>r.ratings[k]},
     contact=a.profile.radius+raw.initialBodies[runner].body.profile.radius+a.profile.reach*.65,
     distance=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y),
     offset=leverage(a,seen.pos.y)*clamp((distance-contact)/6,0,1);
    return{t:r.t,gather:gatheringApproach(a,seen,contact,offset).gather,seen,command:r.command};})};
 }
 row.firstRunnerRecordedStateDifference=now.states.find((s,j)=>JSON.stringify(s.agents[runner])!==JSON.stringify(baseline.states[j].agents[runner]))?.t??null;
 row.sameRunnerRecordedState=now.states.every((s,j)=>JSON.stringify(s.agents[runner])===JSON.stringify(baseline.states[j].agents[runner]));
 row.sameRunnerAndTacklerRoundedPositions=now.frames.every((s,j)=>[runner,first].every(i=>
  JSON.stringify(s.agents.slice(3*i,3*i+3))===JSON.stringify(baseline.frames[j].agents.slice(3*i,3*i+3))));
 result.cases.push(row);
}
result.seconds=(performance.now()-began)/1000;
writeFileSync(out,JSON.stringify(result));
console.log(JSON.stringify({out,seconds:result.seconds,nativeExecutions:0,cases:result.cases.map(r=>({case:r.case,fork:r.firstChangedRecordedState,
 entryDistances:r.arms.map(a=>a.eventBodySeparation),grasp:r.arms.map(a=>a.firstGrasp),breaks:r.arms.map(a=>a.firstGripBreak)}))}));
