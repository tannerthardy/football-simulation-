/** Saved-interval feasibility screen. Refinement is numerical consistency,
 * not an independent physical force oracle or a helper/football verdict. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {World,type HandJoint,type StepReport} from '../../../src/physics/world.js';
import {supportParams} from '../../../src/physics/support.js';
import {replayKeeper,stateError,type KeeperWitness} from './keeper-contact-law.js';
import {sourceVersion} from '../../source-version.js';
const inputPath='config/current-contact-first-interval.json',root='out/coupled-yaw';mkdirSync(root,{recursive:true});
const packet=JSON.parse(readFileSync(inputPath,'utf8')),input:KeeperWitness=packet.witness;
const priorPath='data/reviews/current/current-contact-yaw.json',prior=JSON.parse(readFileSync(priorPath,'utf8')),reference=prior.refinement.at(-1);
const source=sourceVersion(),began=performance.now(),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(sha(inputPath),prior.input.sha256);
type Mode='split'|'hands';
const run=(mode:Mode,n:number,w=input)=>replayKeeper(w,'patch',{groundMovement:'legacy',groundYawCoupling:mode,substeps:n});
const errors=(bs:any[])=>({facing:Math.max(...bs.map((b,i)=>Math.abs(b.facing-reference.facing[i]))),spin:Math.max(...bs.map((b,i)=>Math.abs(b.spin-reference.spin[i])))});
const motion=(a:any[],b:any[])=>({position:Math.max(...a.map((q,i)=>Math.hypot(q.pos.x-b[i].pos.x,q.pos.y-b[i].pos.y))),
 velocity:Math.max(...a.map((q,i)=>Math.hypot(q.vel.x-b[i].vel.x,q.vel.y-b[i].vel.y))),
 facing:Math.max(...a.map((q,i)=>Math.abs(q.facing-b[i].facing))),spin:Math.max(...a.map((q,i)=>Math.abs(q.spin-b[i].spin)))});
function observe(n:number,mode:Mode){
 const bodies=structuredClone(input.beforeBodies),world=new World(bodies,{handContact:'patch',groundMovement:'legacy',groundYawCoupling:mode,substeps:n});world.time=input.t;
 world.joints=input.jointInputs.map(({a,b,actor,holder,...rest})=>({...rest,a:bodies[a],b:bodies[b],drive:0,
  ...(actor===undefined?{}:{actor:bodies[actor]}),...(holder===undefined?{}:{holder:bodies[holder]})} as HandJoint));
 const host=world as any,integrate=host.integrateSubstep,rows=host.jointRows,couple=host.coupleGroundHandYaw;
 let frame:any[]=[],used=false,count=0,maxTorqueExcess=0,maxMotorResidual=0,maxWorkIdentityResidual=0;const tape:any[]=[];
 const ledger=bodies.map(()=>({gx:0,gy:0,hx:0,hy:0,gmx:0,gmy:0,hmx:0,hmy:0,gyaw:0,hyaw:0,gm:0,hm:0}));
 host.jointRows=function(h:number){frame=rows.call(this,h);return frame;};
 host.coupleGroundHandYaw=function(...args:any[]){used=couple.apply(this,args);if(used)count++;return used;};
 host.integrateSubstep=function(ids:number[],intents:any,plans:any,h:number,remaining:number,report:StepReport,...args:any[]){
  frame=[];used=false;const g=report.groundImpulse.map(p=>({...p})),y=[...report.groundYawImpulse],before=bodies.map(b=>({vel:{...b.vel},spin:b.spin??0})),oldHandWork=report.work.hands;
  const out=integrate.call(this,ids,intents,plans,h,remaining,report,...args),weight=remaining-.5*h;
  for(const i of ids){const l=ledger[i],x=report.groundImpulse[i].x-g[i].x,dy=report.groundImpulse[i].y-g[i].y,dj=report.groundYawImpulse[i]-y[i];
   l.gx+=x;l.gy+=dy;l.gmx+=weight*x;l.gmy+=weight*dy;l.gyaw+=dj;l.gm+=weight*dj;
   if(used){const state=this.handYaw[i],r=frame[0],arm=r.i===i?r.ri:r.rj,
    requested=Math.max(-state.limit,Math.min(state.limit,state.demand+arm*r.lt));
    maxTorqueExcess=Math.max(maxTorqueExcess,Math.abs(dj)-state.limit);maxMotorResidual=Math.max(maxMotorResidual,Math.abs(dj-requested));}
  }
  for(const r of frame){assert.equal(r.ln,0);assert(Math.abs(r.lt)<=r.steerLim+1e-10);
   const x=r.nx*r.ln-r.ny*r.lt,dy=r.ny*r.ln+r.nx*r.lt;let cross=0;
   for(const [i,sign,moment] of [[r.i,-1,-r.ri*r.lt],[r.j,1,-r.rj*r.lt]]){const l=ledger[i];l.hx+=sign*x;l.hy+=sign*dy;l.hmx+=weight*sign*x;l.hmy+=weight*sign*dy;l.hyaw+=moment;l.hm+=weight*moment;
    cross+=.5*(((report.groundImpulse[i].x-g[i].x)*sign*x+(report.groundImpulse[i].y-g[i].y)*sign*dy)/bodies[i].profile.massKg
     +(report.groundYawImpulse[i]-y[i])*moment/supportParams(bodies[i].profile).yawInertia);
   }
   // Independent constant-force work on this frozen row. This diagnoses the
   // ordered-work cross term; it is not a replacement work law or budget.
   const slip=(v:any[])=> (v[r.j].vel.x-v[r.i].vel.x)*-r.ny+(v[r.j].vel.y-v[r.i].vel.y)*r.nx-r.ri*(v[r.i].spin??0)-r.rj*(v[r.j].spin??0),
    startSlip=slip(before),endSlip=slip(bodies),finiteWork=.5*r.lt*(startSlip+endSlip),orderedWork=report.work.hands-oldHandWork;
   maxWorkIdentityResidual=Math.max(maxWorkIdentityResidual,Math.abs(orderedWork-finiteWork-cross));
   tape.push({elapsed:input.dt-remaining,h,coupled:used,tangent:r.lt,ground:report.groundYawImpulse.map((v,i)=>v-y[i]),startSlip,endSlip,orderedWork,finiteWork,orderedWorkCrossTerm:cross});
  }return out;
 };
 const report=world.step(input.intents,input.dt),plain=run(mode,n);
 assert.equal(hash(bodies),hash(plain.bodies));assert.equal(hash(report),hash(plain.reports[0]));assert.equal(count,mode==='hands'?n:0);
 assert(maxWorkIdentityResidual<1e-9);
 assert(maxTorqueExcess<1e-10&&maxMotorResidual<1e-9);assert(Math.abs(report.work.residual)<1e-8);assert(report.work.hands<=1e-9);
 report.armImpulse.forEach((j,i)=>assert(j<=report.armImpulseLimit[i]+1e-9));report.armWork.forEach((j,i)=>assert(j<=report.armWorkLimit[i]+1e-9));
 const residuals=bodies.map((b,i)=>{const l=ledger[i],b0=input.beforeBodies[i],m=b.profile.massKg,I=supportParams(b.profile).yawInertia,T=input.dt,
  expected={x:b0.pos.x+b0.vel.x*T+(l.gmx+l.hmx)/m,y:b0.pos.y+b0.vel.y*T+(l.gmy+l.hmy)/m,
   vx:b0.vel.x+(l.gx+l.hx)/m,vy:b0.vel.y+(l.gy+l.hy)/m,spin:(b0.spin??0)+(l.gyaw+l.hyaw)/I,facing:b0.facing+(b0.spin??0)*T+(l.gm+l.hm)/I},
  residual={position:Math.hypot(b.pos.x-expected.x,b.pos.y-expected.y),velocity:Math.hypot(b.vel.x-expected.vx,b.vel.y-expected.vy),spin:Math.abs((b.spin??0)-expected.spin),facing:Math.abs(b.facing-expected.facing)};
  assert(Math.max(...Object.values(residual))<1e-8);return {slot:input.slots[i],...residual};});
 return {mode,n,count,maxTorqueExcess,maxMotorResidual,residuals,workResidual:report.work.residual,passiveHandWork:report.work.hands,
  maxWorkIdentityResidual,frozenFrameHandWork:tape.reduce((s,r)=>s+r.finiteWork,0),orderedWorkCrossTerm:tape.reduce((s,r)=>s+r.orderedWorkCrossTerm,0),
  positiveFrozenFrameIntervals:tape.filter(r=>r.finiteWork>1e-10).length,
  armImpulse:report.armImpulse,armImpulseLimit:report.armImpulseLimit,armWork:report.armWork,armWorkLimit:report.armWorkLimit,tape};
}
assert.equal(stateError(run('split',12).bodies,packet.expectedIsolated),0);
// A cheap full-motion reference checks that better yaw does not trade for
// worse translation. Its angular/velocity tail remains separately declared.
const motionReference=run('split',12288);
const coupledWorkReference=run('hands',12288).reports[0].work.hands;
const grid=[];
for(const n of [12,48,192,768,3072])for(const mode of ['split','hands'] as const){const r=run(mode,n);
 grid.push({mode,n,errors:errors(r.bodies),motionVs12288:motion(r.bodies,motionReference.bodies),bodies:r.bodies,joint:r.joints[0],workResidual:r.reports[0].work.residual,
  work:{hands:r.reports[0].work.hands,groundYaw:r.reports[0].groundYawWork,ground:r.reports[0].groundWork,kineticAfter:r.reports[0].work.after}});}
const off=grid.find(r=>r.mode==='split'&&r.n===12)!,on=grid.find(r=>r.mode==='hands'&&r.n===12)!;
assert(on.errors.facing<off.errors.facing/4&&on.errors.spin<off.errors.spin/4);
assert(on.motionVs12288.position<off.motionVs12288.position&&on.motionVs12288.velocity<off.motionVs12288.velocity);
const local={split:motion(off.bodies,grid.find(r=>r.mode==='split'&&r.n===48)!.bodies),hands:motion(on.bodies,grid.find(r=>r.mode==='hands'&&r.n===48)!.bodies)};
assert(local.hands.facing<local.split.facing/4&&local.hands.spin<local.split.spin/4);
const opposing=[];
for(const control of ['no-hand','free']){const w=structuredClone(input);if(control==='no-hand')for(const j of w.jointInputs)j.push=j.hold=j.steer=0;
 else w.intents=w.beforeBodies.map(()=>({vel:{x:0,y:0},free:true}));
 for(const n of [12,48]){const a=run('split',n,w),b=run('hands',n,w);assert.equal(hash(a.bodies),hash(b.bodies));assert.equal(hash(a.reports),hash(b.reports));opposing.push({control,n,bodyAndReportExact:true});}}
const ledgers=(['split','hands'] as const).flatMap(mode=>[12,48].map(n=>observe(n,mode))),cost:any[]=[];
const settings=[{mode:'split' as const,n:12},{mode:'hands' as const,n:12},{mode:'split' as const,n:48}];
for(let k=0;k<20;k++)for(const s of settings)run(s.mode,s.n);
const samples=settings.map(()=>[] as number[]);
for(let pass=0;pass<2;pass++){
 samples.forEach(a=>a.length=0);
 for(let k=0;k<31;k++)for(const i of k%2?[2,1,0]:[0,1,2]){const s=settings[i],t=performance.now();run(s.mode,s.n);samples[i].push(performance.now()-t);}
 cost.push({pass,settings:settings.map((s,i)=>{const a=samples[i].sort((x,y)=>x-y);return {...s,samples:31,medianMs:a[15],p95Ms:a[29],maxMs:a[30]};})});
}
const costRatios=cost.map(p=>p.settings[1].medianMs/p.settings[0].medianMs);
assert.equal(sourceVersion(),source);
const result={protocol:'coupled-ground-yaw-v1',source,input:{path:inputPath,sha256:sha(inputPath),t:input.t,dt:input.dt},reference:{path:priorPath,sha256:sha(priorPath),source:prior.source,substeps:reference.n,
 remainingTail:prior.lastRefinement,scope:'Retained World refinement, not independent physical truth. Same input and force laws. Split native exactly matches its saved endpoint.'},
 settings:{groundMovement:'legacy',handContact:'patch',groundYawCoupling:'split versus hands',components:process.env.RUN_CONTACT_COMPONENTS},
 criteria:{facingAndSpinImprovement:4,medianCostRatioTarget:2,physicalLedgerTolerance:1e-8},
 improvements:{facing:off.errors.facing/on.errors.facing,spin:off.errors.spin/on.errors.spin},local12to48:local,
 workTradeoff:{referenceSplit12288:motionReference.reports[0].work.hands,referenceCoupled12288:coupledWorkReference,
  native:{split:off.work.hands,hands:on.work.hands},change12to48:{split:Math.abs(off.work.hands-grid.find(r=>r.mode==='split'&&r.n===48)!.work.hands),hands:Math.abs(on.work.hands-grid.find(r=>r.mode==='hands'&&r.n===48)!.work.hands)},
  decision:'Do not adopt as a complete numerical correction: native hand-work convergence worsens despite improved pose/cost and a balanced ledger. Joint endpoint selection still uses ordered ground-then-hand work; the measured cross term explains that accounting sensitivity. No work-law relabeling, clipping bypass or third solver method is installed.'},
 motionReference:{substeps:12288,bodies:motionReference.bodies,scope:'Same-law self-refinement only; older196608 motion/yaw tail stays explicit.'},grid,opposing,ledgers,cost,costRatios,
 costTargetMet:costRatios.every(r=>r<=2),elapsedSeconds:(performance.now()-began)/1000,
 scope:'One passive non-material upper-hands row, no compressive/tensile force capacity active, no torso contacts/strikes, legacy ground/support, no acquired foot. Unsupported cases retain split execution; no new default or football verdict.'};
writeFileSync(`${root}/candidate.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({improvements:result.improvements,local12to48:local,workTradeoff:result.workTradeoff,grid:grid.map(r=>({mode:r.mode,n:r.n,errors:r.errors})),opposing,
 ledgers:ledgers.map(({tape,...r})=>r),cost,costRatios,costTargetMet:result.costTargetMet,elapsedSeconds:result.elapsedSeconds}));
