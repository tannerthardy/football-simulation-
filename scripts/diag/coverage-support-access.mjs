/** Saved evidence only: no controller update, sensing, RNG draw or World tick.
 * node --import tsx scripts/diag/coverage-support-access.mjs ROOT OUTPUT.json
 * ROOT contains current A020/A008 captures, restored inputs and two published
 * alley-flow captures. All source qualifications are preserved in the output.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {supportParams} from '../../src/physics/support.ts';
import {sourceVersion} from '../source-version.ts';

const [root,out]=process.argv.slice(2),started=performance.now();
assert.ok(root&&out&&!existsSync(out));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),inputs=[];
function read(path){const b=readFileSync(path);inputs.push({path,sha256:sha(b)});return JSON.parse(path.endsWith('.gz')?gunzipSync(b).toString():b.toString());}
const xy=(f,i)=>({x:f.agents[i*3],y:f.agents[i*3+1]});
const norm=v=>Math.hypot(v.x,v.y),minus=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const dot=(a,b)=>a.x*b.x+a.y*b.y;
function segmentDistance(first,last){const d=minus(last,first),u=Math.max(0,Math.min(1,-dot(first,d)/Math.max(1e-12,dot(d,d))));return norm({x:first.x+u*d.x,y:first.y+u*d.y});}
// Independent analytic controls for the reducer's straight swept geometry.
assert.equal(segmentDistance({x:-1,y:2},{x:1,y:2}),2);
assert.equal(segmentDistance({x:2,y:0},{x:3,y:0}),2);
const selected=[
 {id:'A020',file:'A020-current.json.gz',qualification:'Current accepted #91 runtime; new observed/plain pair.'},
 {id:'A008',file:'A008-current.json.gz',qualification:'Current accepted #91 runtime; new observed/plain successful opposing control.'},
 {id:'A006',file:'A006-current.json.gz',qualification:'Current accepted #91 runtime; new observed/plain fresh-player helper trace. This supersedes the old failed-hold ending for current-source claims.'},
 {id:'A042',file:'moving-cap-A042.json.gz',qualification:'Historical published #89 runtime only. Run later compared accepted9adb7b3 with the #87 composition; that is separate evidence and does not establish equality of either arm with this older capture. Do not label this ending current.'},
 {id:'A006',file:'moving-cap-A006.json.gz',qualification:'Published fresh-player #89 transfer, older runtime. No current #91 equivalence established.'},
];
const rows=[];
for(const spec of selected){
 const raw=read(join(root,`${spec.id}.json`)),c=read(join(root,spec.file));
 assert.equal(c.inputSha256,raw.inputSha256);assert.equal(c.observerNeutral,true);
 const first=c.events.find(e=>e.type==='tackle_wrap'&&e.note==='initial');assert.ok(first);
 const runner=first.b,tackler=first.a;
 const end=c.events.find(e=>e.t>=first.t&&((e.type==='broken_tackle'&&e.b===tackler)||e.type==='tackle'));
 assert.ok(end);
 const nearest=(seq,t)=>seq.reduce((a,b)=>Math.abs(a.t-t)<=Math.abs(b.t-t)?a:b);
 const frames=c.native.frames.filter(f=>f.t>=first.t-1e-8&&f.t<=end.t+1e-8);
 const firstState=nearest(c.native.states,first.t),base=frames[0];assert.ok(Math.abs(base.t-first.t)<1e-8);
 const runnerProfile=raw.initialBodies[runner].body.profile;
 const helpers=[];
 for(const actor of c.actors.filter(a=>a.team==='D'&&a.idx!==tackler)){
  const i=actor.idx,p=raw.initialBodies[i].body.profile,origin=xy(base,i),v=firstState.agents[i].body.velocity;
  // Allow the largest ordinary dive acquisition distance, even if its other
  // decision/occlusion/engagement conditions would prevent the attempt.
  const range=p.radius+runnerProfile.radius+p.reach+.75;
  const acceleration=supportParams(p).traction/p.massKg;
  let bound=Infinity;
  for(let k=1;k<frames.length;k++){
   const pair=[frames[k-1],frames[k]],relative=pair.map(f=>{
    const t=f.t-base.t,r=xy(f,runner);return{x:r.x-origin.x-v[0]*t,y:r.y-origin.y-v[1]*t};
   });
   // Any free COM path is inside the existing traction-limited tube about
   // its initial velocity. Use the segment END's larger radius throughout,
   // plus a full extra20Hz tick and .16yd recording/interpolation reserve.
   // This is an exclusion bound; a nonpositive value is inconclusive.
   const time=pair[1].t-base.t+.05,tube=.5*acceleration*time*time;
   bound=Math.min(bound,segmentDistance(...relative)-tube-range-.16);
  }
  helpers.push({idx:i,id:actor.id,slot:actor.slot,initialGap:norm(minus(origin,xy(base,runner))),
   velocity:{x:v[0],y:v[1]},range,acceleration,freeMovementExclusionMargin:bound,
   excludedWithoutExternalAssistance:bound>0});
 }
 helpers.sort((a,b)=>a.freeMovementExclusionMargin-b.freeMovementExclusionMargin);
 const velocity=i=>{const v=firstState.agents[i].body.velocity;return{x:v[0],y:v[1]};};
 const rvel=velocity(runner),dvel=velocity(tackler),delta=minus(xy(base,tackler),xy(base,runner)),speed=norm(rvel);
 const u={x:rvel.x/speed,y:rvel.y/speed};
 const degrees=Math.acos(Math.max(-1,Math.min(1,dot(dvel,rvel)/Math.max(1e-12,norm(dvel)*speed))))*180/Math.PI;
 const contactDecision=(c.native.decisions??[]).filter(d=>d.kind==='tackle-opportunity'&&d.a===tackler&&d.t<=first.t).at(-1);
 const parity={};
 if(spec.file.endsWith('-current.json.gz'))for(const i of [runner,tackler,...(spec.id==='A020'?[20,21]:[])]){
  const original=raw.result.telemetry.frames,of=raw.result.frames;
  parity[i]={id:c.actors[i].id,
   firstRecordedBodyDifference:c.native.states.find((f,k)=>JSON.stringify(f.agents[i].body)!==JSON.stringify(original[k]?.agents[i]?.body))?.t??null,
   firstRecordedRequestDifference:c.native.states.find((f,k)=>JSON.stringify(f.agents[i].intent)!==JSON.stringify(original[k]?.agents[i]?.intent))?.t??null,
   firstRoundedPositionDifference:c.native.frames.find((f,k)=>JSON.stringify(xy(f,i))!==JSON.stringify(of[k]&&xy(of[k],i)))?.t??null};
 }
 rows.push({case:spec.id,capture:spec.file,qualification:spec.qualification,inputSha256:c.inputSha256,sourceSha256:c.sourceSha256,
  runner:c.actors[runner],tackler:c.actors[tackler],firstGrasp:first.t,firstEnding:end,
  firstHoldInterval:end.t-first.t,entry:{roundedCenterSeparation:norm(delta),defenderVelocity:dvel,runnerVelocity:rvel,
   defenderSpeed:norm(dvel),travelHeadingDifferenceDegrees:degrees,aheadAlongRunner:dot(delta,u),
   transverseToRunner:-delta.x*u.y+delta.y*u.x},contactDecision:contactDecision??null,
  helpers,allOtherDefendersExcludedFromFreeArrival:helpers.every(h=>h.excludedWithoutExternalAssistance),recordedParityWithOriginalInput:parity,
  end:{t:c.end,censored:c.censored},events:c.events.filter(e=>['catch','tackle_wrap','broken_tackle','missed_tackle','tackle'].includes(e.type)),
 });
}
const report={schema:'coverage-support-access-v1',sourceSha256:sourceVersion(),operatorSha256:sha(readFileSync(import.meta.filename)),inputs,
 nativeExecutions:0,worldSteps:0,elapsedSeconds:(performance.now()-started)/1000,rows,
 limits:[
  'Oracle saved runner path is used only to rule out late free-movement repairs. It is never an input to a football controller.',
  'Positive tube margin excludes ground-driven arrival from the first-grasp state without external assistance; new contacts/holds could supply external impulses. Negative margin is inconclusive, not proof of a feasible approach or good choice.',
  '0.16yd reserve covers saved position/velocity precision and within-tick interpolation; an additional .05s of traction allowance is deliberately generous.',
  'Event and frame labels use the enclosing20Hz decision tick, after its physics; comparisons retain that same boundary throughout.',
  'No grasp forces, slip law, execution draws or terminal RNG equivalence are inferred from marginal entry or a shared event time.',
  'A020 is unfinished at5.10. Do not use its provisional buildResult YAC field as a completed result.',
 ]};
writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({out,seconds:report.elapsedSeconds,rows:rows.map(r=>({case:r.case,grasp:r.firstGrasp,
 hold:r.firstHoldInterval,entry:r.entry,allOtherDefendersExcluded:r.allOtherDefendersExcludedFromFreeArrival,
 closestBound:r.helpers[0]}))},null,2));
