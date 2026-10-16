/** Saved-record reduction only. No new live football continuation. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {previewFreeMovement} from '../../../../src/physics/movement-preview.ts';
const root='data/reviews/current/mesh-short-adjustment',base='data/reviews/current/mesh-motion-admission/current-candidate';
const read=p=>JSON.parse(gunzipSync(readFileSync(p))),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const require=(x,m)=>{if(!x)throw Error(m);};
const start=performance.now(),a=read(`${base}/A044.json.gz`),b=read(`${root}/native-v2/A044.json.gz`),v1=read(`${root}/native/A044.json.gz`);
const control=read(`${base}/A008.json.gz`),c=read(`${root}/native-v2/A008.json.gz`);
const impacts=data=>data.ticks.flatMap(t=>t.contacts.filter(p=>p.i===15&&p.j===21||p.i===21&&p.j===15).map(p=>({t:t.t,...p})));
const before=impacts(a),after=impacts(b);require(before.length===1&&after.length===0,'Wrong conflict result');
const targetExactBeforeCatch=b.ticks.filter(t=>t.t<2.9).every(t=>hash(t.agents[10])===hash(a.ticks.find(p=>p.t===t.t).agents[10]));
require(targetExactBeforeCatch,'Offensive receiver changed before catch');
const usefulControl=c.ticks.every(t=>{const old=control.ticks.find(p=>p.t===t.t);return [7,19].every(i=>hash(old.agents[i])===hash(t.agents[i])&&hash(old.commands[i])===hash(t.commands[i]));});
require(usefulControl&&hash(c.events)===hash(control.events)&&hash(c.rng)===hash(control.rng),'Useful control changed');
let maxPositionError=0,maxVelocityError=0;const firstSteps=[];
for(const data of [b,c])for(const d of data.decisions.filter(d=>d.reason==='lateral')){
 const event=data.stages.find(e=>e.t===d.t&&e.actor===21&&e.stage==='world-input'),body=event.body;
 const alt=previewFreeMovement(body,d.detail.alternative,d.t,1)[0],old=previewFreeMovement(body,d.detail.chosen,d.t,1)[0];
 const actual=data.ticks.find(t=>t.t===d.t).agents[21];
 maxPositionError=Math.max(maxPositionError,Math.hypot(alt.pos.x-actual.pos.x,alt.pos.y-actual.pos.y));
 maxVelocityError=Math.max(maxVelocityError,Math.hypot(alt.vel.x-actual.vel.x,alt.vel.y-actual.vel.y));
 firstSteps.push({caseId:data.caseId,t:d.t,mode:d.detail.mode,predictedPosition:alt.pos,actualPosition:actual.pos,
  attainablePositionChange:Math.hypot(alt.pos.x-old.pos.x,alt.pos.y-old.pos.y),attainableVelocityChange:Math.hypot(alt.vel.x-old.vel.x,alt.vel.y-old.vel.y)});
}
require(maxPositionError<1e-12&&maxVelocityError<1e-12,'Unachievable first step');
const t=2.35,decision=b.decisions.find(e=>e.t===t),n=decision.passing.normal;
const own=b.stages.filter(e=>e.t===t&&e.actor===21),body=own.find(e=>e.stage==='world-input').body,raw=own.find(e=>e.stage==='behavior').command;
const meta=read('data/reviews/current/mesh-command-attribution/capture-v1/A044.json.gz');
const peers=own.filter(e=>e.stage==='spacing-picture').map(e=>({idx:e.peer,seen:e.used,touch:.9*(body.profile.radius+meta.actors[e.peer].profile.radius)}));require(peers.length===10,'Missing acquired peer');
function clearance(samples,p){let x=body.pos.x-p.seen.pos.x,y=body.pos.y-p.seen.pos.y,min=Math.hypot(x,y)-p.touch;
 for(const s of samples){const rx=s.pos.x-p.seen.pos.x-p.seen.vel.x*s.t,ry=s.pos.y-p.seen.pos.y-p.seen.vel.y*s.t,ex=rx-x,ey=ry-y;
  const u=Math.max(0,Math.min(1,-(x*ex+y*ey)/Math.max(1e-12,ex*ex+ey*ey)));min=Math.min(min,Math.hypot(x+u*ex,y+u*ey)-p.touch);x=rx;y=ry;}return min;}
const options=[['full',raw],['half',{...raw,vel:{x:raw.vel.x*.5,y:raw.vel.y*.5}}],['gather',{...raw,vel:{x:0,y:0}}],['half-plus-transverse',decision.detail.alternative]];
const sameState=options.map(([name,command])=>{const path=previewFreeMovement(body,command,t,12);return {name,command,allUp:path.every(s=>s.support==='up'),minimum:Math.min(...peers.map(p=>clearance(path,p))),last:path.at(-1)};});
require(sameState[3].minimum>.29&&sameState.slice(0,3).every(x=>x.minimum<0),'Same-state mechanism differs');
const tickAt=(data,t)=>data.ticks.find(x=>x.t===t);
const metrics=(data,t)=>{const p=tickAt(data,t).agents;return {SSSpeed:Math.hypot(p[21].vel.x,p[21].vel.y),SSReceiverDistance:Math.hypot(p[21].pos.x-p[10].pos.x,p[21].pos.y-p[10].pos.y),
 robberReceiverDistance:Math.hypot(p[15].pos.x-p[10].pos.x,p[15].pos.y-p[10].pos.y),pairDistance:Math.hypot(p[15].pos.x-p[21].pos.x,p[15].pos.y-p[21].pos.y),SS:p[21],robber:p[15]};};
const comparison=[2.2,2.35,2.55,2.75,2.85].map(t=>({commandTick:t,movementEndsAt:+(t+.05).toFixed(2),reference:metrics(a,t),candidate:metrics(b,t)}));
const firstRngDifference={available:false,reason:'These captures store terminal main RNG, not per-tick RNG; its first divergence cannot be located from them.'};
// Forecast error is measured afterward, never fed into the decision.
const uncertainty=[2.05,2.2,2.35].map(t=>{const peer=b.stages.find(e=>e.actor===21&&e.t===t&&e.stage==='spacing-picture'&&e.peer===15).used;
 const actual=tickAt(b,+(t+.55).toFixed(2)).agents[15].pos,predicted={x:peer.pos.x+peer.vel.x*.6,y:peer.pos.y+peer.vel.y*.6};
 return {t,age:peer.age,predicted,actual,error:Math.hypot(actual.x-predicted.x,actual.y-predicted.y)};});
const names=['offline','braking-offline','native','native-v2','typecheck','typecheck-v2'];
const receipts=names.map(name=>({name,receipt:JSON.parse(readFileSync(`${root}/${name}-launcher.json`))}));
const output={schema:'mesh-short-adjustment-review-v1',recommendation:'Mechanism-level local avoidance demonstrated; hold production policy for independent review/portable objective contract.',
 executedCandidate:'2219e8799254d1beec44d2118eaaee793c3ef3f8',firstTrial:'49352adffdb2948e2af917726e5641de04819d09',
 observationHost:'6e19ad2d4aac73e71ae57c1893a9b389074eeaa5',currentAccepted:'86250bb4f0c6f421878c204161864d523c3e30b6',engineSource:b.provenance.sourceSha256,
 costCandidateSeparate:'d80dcd3015358e604f91cb026f562f6f4f4781e5',baselineReused:true,newProductionEdits:0,
 impacts:{reference:before,firstTrial:impacts(v1),combined:after},firstSteps:{maxPositionError,maxVelocityError,rows:firstSteps},sameState:{t,bodySha256:hash(body),peersSha256:hash(peers),options:sameState},
 comparison,acquiredPeerForecastUncertainty:uncertainty,firstMainRngDifference:firstRngDifference,
 targetExactBeforeCatch,events:{reference:a.events,candidate:b.events},
 usefulDefense:{primaryReceiver7AndNB19BodiesAndCommandsExact:usefulControl,eventsAndRngExact:hash(c.events)===hash(control.events)&&hash(c.rng)===hash(control.rng),
 qualification:'All22 are not exact: SS support and some other actors react differently, but actual Y/NB defense remains exact through3.40.'},
 runtime:{newNativePrefixes:4,nativeLauncherSeconds:receipts.filter(r=>['native','native-v2'].includes(r.name)).reduce((s,r)=>s+r.receipt.commands[0].elapsedSeconds,0),
 allLauncherSecondsBeforeReduction:receipts.reduce((s,r)=>s+r.receipt.commands[0].elapsedSeconds,0),newFullGames:0,newFullSuites:0,reductionMilliseconds:performance.now()-start},
 limits:['A044 reference drops2.90, candidate naturally catches2.90; RNG/endings diverge. No postcatch or final-yardage causal claim.',
 'Historical later offensive Z/CB block remains separate; no force/catch/offensive route/body modification.',
 'Research consumes already computed observer-stage objectives. A production consumer must carry a legitimate objective explicitly; do not depend on an observer or substitute live receiver state.',
 'Single paired mesh witness/control, not broad traffic/coverage certification. Peer forecasts remain conditional and can miss real turns.']};
writeFileSync(`${root}/review.json`,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({impacts:output.impacts,firstStepError:output.firstSteps.maxPositionError,sameState:sameState.map(({name,minimum,allUp})=>({name,minimum,allUp})),firstRngDifference,usefulDefense:output.usefulDefense,runtime:output.runtime}));
