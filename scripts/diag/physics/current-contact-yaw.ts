/** Bounded C/NT yaw verdict. The independent ledger checks the timing of the
 * delivered force tape; World refinement checks force-selection sensitivity.
 * Neither turns a refined World endpoint into independent physical truth. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {angleDiff,clamp} from '../../../src/core/vec.js';
import {turnRateOf,type Body} from '../../../src/physics/kinematics.js';
import {supportParams} from '../../../src/physics/support.js';
import {World,type HandJoint,type Intent,type StepReport} from '../../../src/physics/world.js';
import {sourceVersion} from '../../source-version.js';
import {reflectWitness,replayKeeper,stateError,type KeeperWitness} from './keeper-contact-law.js';
const inputPath='config/current-contact-first-interval.json',root='out/contact-law-current/yaw-timing';
const packet=JSON.parse(readFileSync(inputPath,'utf8')),input:KeeperWitness=packet.witness;
const source=sourceVersion(),started=performance.now();mkdirSync(root,{recursive:true});
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const difference=(a:Body[],b:Body[])=>({
 position:Math.max(...a.map((q,i)=>Math.hypot(q.pos.x-b[i].pos.x,q.pos.y-b[i].pos.y))),
 velocity:Math.max(...a.map((q,i)=>Math.hypot(q.vel.x-b[i].vel.x,q.vel.y-b[i].vel.y))),
 spin:Math.max(...a.map((q,i)=>Math.abs((q.spin??0)-(b[i].spin??0)))),
 facing:Math.max(...a.map((q,i)=>Math.abs(q.facing-b[i].facing)))});
type Control='loaded'|'no-hand'|'free';
function controlInput(control:Control){const w=structuredClone(input);
 if(control==='no-hand')for(const j of w.jointInputs)j.push=j.hold=j.steer=0;
 if(control==='free')w.intents=w.beforeBodies.map(()=>({vel:{x:0,y:0},free:true}));return w;
}
function plain(w:KeeperWitness,n:number,mode:'center'|'patch'='patch'){
 return replayKeeper(w,mode,{groundMovement:'legacy',substeps:n});
}
function observed(w:KeeperWitness,n:number){
 const bodies=structuredClone(w.beforeBodies),world=new World(bodies,{handContact:'patch',groundMovement:'legacy',substeps:n});
 assert.equal(w.pending.length,0);assert(bodies.every(b=>!b.support?.foot));world.time=w.t;
 world.joints=w.jointInputs.map(({a,b,actor,holder,...rest})=>({...rest,a:bodies[a],b:bodies[b],drive:0,
  ...(actor===undefined?{}:{actor:bodies[actor]}),...(holder===undefined?{}:{holder:bodies[holder]})} as HandJoint));
 const ledger=bodies.map(()=>({gx:0,gy:0,hx:0,hy:0,gmx:0,gmy:0,hmx:0,hmy:0,gYaw:0,hYaw:0,gMoment:0,hMoment:0}));
 const phases={firstUnsaturated:null as number|null,firstPositive:null as number|null,firstPositiveSaturated:null as number|null,
  groundTracking:bodies.map(()=>({first:null as number|null,duration:0})),positiveForceTime:0};
 // Observe existing private methods without changing state, requests or solves.
 const host=world as any,integrate=host.integrateSubstep,feet=host.feet,jointRows=host.jointRows;
 let frame:any[]=[],feetRows:any[]=[],elapsed=0,weight=0;
 host.feet=function(i:number,intent:Intent,plan:any,h:number,remaining:number,...args:any[]){
  const b=bodies[i],targetSpin=clamp(angleDiff(b.facing,plan.facing)/Math.max(h,remaining),-turnRateOf(b),turnRateOf(b));
  const result=feet.call(this,i,intent,plan,h,remaining,...args);
  feetRows.push({i,targetSpin,spin:b.spin??0});return result;
 };
 host.jointRows=function(h:number){frame=jointRows.call(this,h);return frame;};
 host.integrateSubstep=function(ids:number[],intents:any,plans:any,h:number,remaining:number,report:StepReport,...args:any[]){
  elapsed=w.dt-remaining;weight=w.dt-elapsed-.5*h;frame=[];feetRows=[];
  const ground=report.groundImpulse.map(p=>({...p})),yaw=[...report.groundYawImpulse];
  const result=integrate.call(this,ids,intents,plans,h,remaining,report,...args);
  for(const i of ids){const l=ledger[i],dx=report.groundImpulse[i].x-ground[i].x,dy=report.groundImpulse[i].y-ground[i].y,
    dj=report.groundYawImpulse[i]-yaw[i];l.gx+=dx;l.gy+=dy;l.gmx+=weight*dx;l.gmy+=weight*dy;l.gYaw+=dj;l.gMoment+=weight*dj;}
  for(const f of feetRows)if(!intents[f.i]?.free&&Math.abs(f.spin-f.targetSpin)<1e-10){
   const p=phases.groundTracking[f.i];p.first??=elapsed;p.duration+=h;
  }
  for(const r of frame){assert.equal(r.joint.kind,'hands');const x=r.nx*r.ln-r.ny*r.lt,y=r.ny*r.ln+r.nx*r.lt;
   for(const [i,sign,moment] of [[r.i,-1,(r.ni??0)*r.ln-(r.ri??0)*r.lt],[r.j,1,(r.nj??0)*r.ln-(r.rj??0)*r.lt]]){
    const l=ledger[i];l.hx+=sign*x;l.hy+=sign*y;l.hmx+=weight*sign*x;l.hmy+=weight*sign*y;l.hYaw+=moment;l.hMoment+=weight*moment;
   }
   if(r.steerLim>0){if(Math.abs(r.lt)<r.steerLim*(1-1e-8))phases.firstUnsaturated??=elapsed;
    if(r.lt>1e-10){phases.firstPositive??=elapsed;phases.positiveForceTime+=h;
     if(r.lt>=r.steerLim*(1-1e-8))phases.firstPositiveSaturated??=elapsed;}}
  }return result;
 };
 const report=world.step(w.intents,w.dt);assert.equal(report.contacts.length,0);assert.equal(report.strikes.length,0);
 const rows=bodies.map((b,i)=>{
  const l=ledger[i],before=w.beforeBodies[i],m=b.profile.massKg,I=supportParams(b.profile).yawInertia,
   spin=(before.spin??0)+(l.gYaw+l.hYaw)/I,facing=before.facing+(before.spin??0)*w.dt+(l.gMoment+l.hMoment)/I,
   x=before.pos.x+before.vel.x*w.dt+(l.gmx+l.hmx)/m,y=before.pos.y+before.vel.y*w.dt+(l.gmy+l.hmy)/m,
   vx=before.vel.x+(l.gx+l.hx)/m,vy=before.vel.y+(l.gy+l.hy)/m;
  const residual={spin:(b.spin??0)-spin,facing:b.facing-facing,position:Math.hypot(b.pos.x-x,b.pos.y-y),velocity:Math.hypot(b.vel.x-vx,b.vel.y-vy)};
  assert(Math.max(...Object.values(residual))<1e-8,'Independent impulse/temporal-moment ledger');
  return {slot:w.slots[i],...l,residual};
 });
 assert(Math.abs(report.work.residual)<1e-8);report.armImpulse.forEach((j,i)=>assert(j<=report.armImpulseLimit[i]+1e-9));
 report.armWork.forEach((j,i)=>assert(j<=report.armWorkLimit[i]+1e-9));
 return {bodies,report,ledger:rows,phases};
}
const grid=[12,48,192,768,3072,12288,49152,196608],loaded:any[]=[],controls:any[]=[],mirrors:any[]=[];
for(const control of ['loaded','no-hand','free'] as const){
 const w=controlInput(control);let previous:Body[]|undefined;
 // The two opposing controls only need native and a refined endpoint; the
 // expensive tail answers whether the loaded NT endpoint is still wandering.
 for(const n of control==='loaded'?grid:[12,768,12288]){
  const t=performance.now(),r=plain(w,n),ms=performance.now()-t;
  const row={control,n,ms,bodies:r.bodies,joint:r.joints[0],reportHash:hash(r.reports[0]),groundYaw:r.reports[0].groundYawImpulse,
   refinement:previous?difference(r.bodies,previous):null,workResidual:r.reports[0].work.residual};
  assert(Math.abs(row.workResidual)<1e-8);(control==='loaded'?loaded:controls).push(row);previous=r.bodies;
 }
}
const native=loaded[0],fine=loaded.at(-1),centerNative=plain(input,12,'center'),centerFine=plain(input,grid.at(-1)!,'center');
assert.equal(stateError(native.bodies,packet.expectedIsolated),0);assert.equal(stateError(centerNative.bodies,input.expectedAfter),0);
const ledgers=[12,768,196608].map(n=>{
 const w=controlInput('loaded'),r=observed(w,n),unobserved=loaded.find(q=>q.n===n);
 assert.equal(hash(r.bodies),hash(unobserved.bodies),'Observation changes no complete body state');
 assert.equal(hash(r.report),unobserved.reportHash,'Observation changes no report');
 return {n,ledger:r.ledger,phases:r.phases};
});
for(const control of ['loaded','no-hand','free'] as const)for(const n of [12,768]){
 const w=controlInput(control),direct=plain(w,n),reflected=plain(reflectWitness(w),n),restored=reflectWitness({...w,beforeBodies:reflected.bodies}).beforeBodies;
 const error=stateError(direct.bodies,restored);assert(error<1e-9);mirrors.push({control,n,error});
}
const timing:any[]=[];
// Uninstrumented per-call wall cost includes constructing/cloning the same
// saved two-body input. No launcher/observer cost or whole-game extrapolation.
for(const n of [12,48,192,768]){
 for(let k=0;k<10;k++)plain(input,n);
 const samples=Array.from({length:31},()=>{const t=performance.now();plain(input,n);return performance.now()-t;}).sort((a,b)=>a-b);
 timing.push({n,samples:31,medianMs:samples[15],p95Ms:samples[Math.ceil(.95*samples.length)-1],maxMs:samples.at(-1)});
}
assert.equal(sourceVersion(),source);
const nativeLedger=ledgers[0].ledger,fineLedger=ledgers.at(-1)!.ledger;
const result={protocol:'current-contact-yaw-v1',source,input:{path:inputPath,sha256:createHash('sha256').update(readFileSync(inputPath)).digest('hex'),
 slots:input.slots,t:input.t,dt:input.dt},settings:{handContact:'patch',groundMovement:'legacy',components:process.env.RUN_CONTACT_COMPONENTS},
 decisionRule:'Balanced delivered impulses must also reproduce translation and yaw through their temporal moments. A sign-changing native-vs-refined law effect cannot certify the native causal yaw explanation or justify default promotion. Refinement is self-consistency evidence, not an independent force-law oracle.',
 nativeVsRefined:difference(native.bodies,fine.bodies),lastRefinement:fine.refinement,
 lawEffect:{native:difference(native.bodies,centerNative.bodies),refined:difference(fine.bodies,centerFine.bodies),
  signedFacing:input.slots.map((slot,i)=>({slot,native:native.bodies[i].facing-centerNative.bodies[i].facing,refined:fine.bodies[i].facing-centerFine.bodies[i].facing}))},
 forceHistoryDifference:input.slots.map((slot,i)=>({slot,
  spinFromGround:(nativeLedger[i].gYaw-fineLedger[i].gYaw)/supportParams(input.beforeBodies[i].profile).yawInertia,
  spinFromHands:(nativeLedger[i].hYaw-fineLedger[i].hYaw)/supportParams(input.beforeBodies[i].profile).yawInertia,
  facingFromGround:(nativeLedger[i].gMoment-fineLedger[i].gMoment)/supportParams(input.beforeBodies[i].profile).yawInertia,
  facingFromHands:(nativeLedger[i].hMoment-fineLedger[i].hMoment)/supportParams(input.beforeBodies[i].profile).yawInertia})),
 loaded,controls,ledgers,mirrors,timing,elapsedSeconds:(performance.now()-started)/1000,
 verdict:'Opt-in extraction remains reviewable; HOLD production promotion and native C/NT yaw causation. No demonstrated impulse application/timing defect: the independent ledger closes. Ground/hand force selection is timestep sensitive, especially reaching/switching the tangential constraint while legacy yaw tracks a remaining-tick target. Do not change recovery or substitute a different ground law. A future numerical correction must resolve that coupled force selection with unchanged laws and control its cost; this pass does not install one.'};
writeFileSync(`${root}/verdict.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({nativeVsRefined:result.nativeVsRefined,lastRefinement:result.lastRefinement,signedFacing:result.lawEffect.signedFacing,
 ledgers:result.ledgers,forceHistoryDifference:result.forceHistoryDifference,mirrors,timing,elapsedSeconds:result.elapsedSeconds}));
