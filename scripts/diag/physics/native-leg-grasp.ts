/** Native acquired leg-grasp audit. No replacement solver or physics changes.
 * Expected body impulses come from actual scaled solver arguments; motor work
 * is independently telescoped from the aggregate support impulse potential. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {Rng} from '../../../src/core/rng.js';
import {CENTER_Y} from '../../../src/core/field.js';
import {generateTeam,pickOffense,pickDefense} from '../../../src/league/team.js';
import {FORMATION_BY_ID} from '../../../src/playbook/formations.js';
import {RUN_BY_ID} from '../../../src/playbook/concepts.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../../../src/playbook/defense.js';
import {PlaySim} from '../../../src/sim/playsim.js';
import {supportParams,baseRadiusAt} from '../../../src/physics/support.js';
import {sourceVersion} from '../../source-version.js';
const input='config/native-leg-grasp.json',cfg=JSON.parse(readFileSync(input,'utf8')),base=JSON.parse(readFileSync(cfg.parent,'utf8')),
 prior=JSON.parse(readFileSync('data/reviews/current/solver-value-study.json','utf8')),root='out/native-leg-grasp';mkdirSync(root,{recursive:true});
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x,(_,v)=>v instanceof Map?[...v]:v instanceof Set?[...v]:v)).digest('hex'),sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),source=sourceVersion(),began=performance.now();
assert.equal(source,prior.sourceSha256);
const snapshot=(b:any)=>({pos:{...b.pos},vel:{...b.vel},spin:b.spin??0,facing:b.facing,energy:b.energy,support:structuredClone(b.support)});
function run(v:any){
 const c=base.cases.find((c:any)=>c.id===v.case),start=cfg.cases.find((c:any)=>c.id===v.case).start,end=start+cfg.windowSeconds,
  formation=FORMATION_BY_ID[base.formation],sim=new PlaySim({
   offense:pickOffense(generateTeam(new Rng(base.offenseSeed),'Panel offense 1','O1',{strength:base.strength}),formation.personnel),
   defense:pickDefense(generateTeam(new Rng(base.defenseSeed),'Panel defense 1','D1',{strength:base.strength}),c.personnel),
   offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID[base.concept],label:'Split Zone'},
   defCall:{personnel:c.personnel,front:FRONT_BY_ID[c.front],coverage:COVERAGE_BY_ID[base.coverage],pressure:null,label:c.front},
   los:40,ballY:CENTER_Y,firstDownX:50,seed:base.playSeed,handContact:'patch',groundMovement:'legacy'}),w:any=sim.world;
 const flat=()=>w.joints.map((j:any)=>{const {a,b,actor,holder,...rest}=j;return {...rest,a:w.indexOf(a),b:w.indexOf(b),...(actor?{actor:w.indexOf(actor)}:{}),...(holder?{holder:w.indexOf(holder)}:{})};}),
  fingerprint=()=>hash({bodies:w.bodies,cmds:Reflect.get(sim,'cmds'),intents:sim.intents,minds:sim.agents.map(a=>a.mind),rng:sim.rng,events:sim.events,phase:sim.phase,t:sim.t,joints:flat(),lastStep:sim.lastStep});
 let target:any=null,ids:number[]=[],audit:any=null,phase:any=null,row:any=null,prefix:string|null=null,first:any=null;
 const steps:any[]=[],placement:any[]=[],allRows:any[]=[],ground:any[]=[];
 const add=(i:number,kind:string,x:number,y:number,l:number,before:any)=>{
  if(!audit||!ids.includes(i))return;const body=w.bodies[i],m=body.profile.massKg,I=supportParams(body.profile).yawInertia,p=audit.parts[i][kind]??={x:0,y:0,l:0,work:0};
  p.x+=x;p.y+=y;p.l+=l;p.work+=before.vel.x*x+before.vel.y*y+(x*x+y*y)/(2*m)+before.spin*l+l*l/(2*I);
 };
 for(const method of ['pairImpulse','supportImpulse']){const original=w[method];w[method]=function(...a:any[]){
  if(!audit)return original.apply(this,a);
  const supported=method==='supportImpulse',i=supported?this.indexOf(a[0].a):a[0],j=supported?this.indexOf(a[0].b):a[1],
   x=supported?a[1]:a[2],y=supported?a[2]:a[3],la=a[supported?6:8]??0,lb=a[supported?7:9]??0,
   active=supported?!!a[4]:a[6]!==false,kind=supported?'supported-grasp':a[5],name=kind+(kind==='grasps'||supported?(active?'-active':'-passive'):''),
   before=[i,j].map(k=>({vel:{...this.bodies[k].vel},spin:this.bodies[k].spin??0})),foot=supported?this.bodies[j].support.foot:null,
   p0=foot?{x:this.footImpulseX[j],y:this.footImpulseY[j]}:null,
   potential=(p:any)=>-p.x*foot.desired.x-p.y*foot.desired.y-foot.mobility/a[3]*(p.x*p.x+p.y*p.y),old=foot?potential(p0):0,
   f=original.apply(this,a);
  add(i,name,-x*f,-y*f,la*f,before[0]);add(j,name,x*f,y*f,lb*f,before[1]);
  if(row&&row.joint===target){const dose=phase.doses.get(row)??{x:0,y:0,active:{x:0,y:0},passive:{x:0,y:0}};dose.x+=x*f;dose.y+=y*f;dose[active?'active':'passive'].x+=x*f;dose[active?'active':'passive'].y+=y*f;phase.doses.set(row,dose);}
  if(foot&&ids.includes(j))phase.motor[j]=(phase.motor[j]??0)+potential({x:this.footImpulseX[j],y:this.footImpulseY[j]})-old;
  return f;
 };}
 const contact=w.solveContact;w.solveContact=function(c:any,...a:any[]){if(!audit)return contact.call(this,c,...a);
  const oldN=c.ln,oldT=c.lt,before=[c.i,c.j].map(i=>({vel:{...this.bodies[i].vel},spin:this.bodies[i].spin??0})),value=contact.call(this,c,...a),dn=c.ln-oldN,dt=c.lt-oldT,
   x=c.nx*dn-c.ny*dt,y=c.ny*dn+c.nx*dt;
  add(c.i,'body-contact',-x,-y,c.ni*dn-c.ri*dt,before[0]);add(c.j,'body-contact',x,y,c.nj*dn-c.rj*dt,before[1]);return value;
 };
 // Observe the actual stance motor, rather than treating a nonzero ground
 // impulse as proof that this athlete could supply it. Off-feet drag and a
 // finite dive launch have different laws, so retain their classifications.
 const feet=w.feet;w.feet=function(i:number,intent:any,plan:any,h:number,remaining:number,report:any){
  if(!audit||!ids.includes(i))return feet.call(this,i,intent,plan,h,remaining,report);
  const body=this.bodies[i],sp=supportParams(body.profile),before={...report.groundImpulse[i]},yaw=report.groundYawImpulse[i],
   state=body.support.state,mode=state!=='up'?'off-feet':plan.free?'free':plan.dive?'dive':'stance',
   result=feet.call(this,i,intent,plan,h,remaining,report),force={x:(report.groundImpulse[i].x-before.x)/h,y:(report.groundImpulse[i].y-before.y)/h},
   torque=(report.groundYawImpulse[i]-yaw)/h,radius=baseRadiusAt(sp,body.support.posture),
   demand=Math.hypot(force.x,force.y,torque/radius),capacity=sp.traction*this.alpha[i];
  ground.push({t:sim.t,time:phase.time,h,slot:sim.agents[i].slot,mode,stateBefore:state,stateAfter:body.support.state,
   force,torque,radius,availability:this.alpha[i],traction:sp.traction,capacity,demand,
   correctiveCapacity:body.support.foot?.capacity??0});
  if(mode==='stance')assert(demand<=capacity+cfg.checks.capacity,JSON.stringify({t:sim.t,i,demand,capacity}));
  return result;
 };
 for(const method of ['reelPatchGrasp','solveGrasp','solveHands']){const original=w[method];w[method]=function(r:any,...a:any[]){const previous=row;row=r;try{return original.call(this,r,...a);}finally{row=previous;}};}
 const rows=w.jointRows;w.jointRows=function(h:number){const result=rows.call(this,h);if(audit)phase.rows=result.filter((r:any)=>r.joint===target);return result;};
 const integrate=w.integrateSubstep;w.integrateSubstep=function(...args:any[]){
  if(!audit)return integrate.apply(this,args);const previous=phase,h=args[3],report=args[5],old=ids.map(i=>report.supportMotorWork[i]);
  phase={h,time:this.time,rows:[],doses:new Map(),motor:{}};const out=integrate.apply(this,args);
  for(const r of phase.rows){const dose=phase.doses.get(r)??{x:0,y:0,active:{x:0,y:0},passive:{x:0,y:0}},normal=r.ln-r.reel,
   residual=Math.hypot(dose.x-(r.nx*normal-r.ny*r.lt),dose.y-(r.ny*normal+r.nx*r.lt)),used=Math.hypot(normal,r.lt);
   const record={t:sim.t,time:phase.time,h,n:{x:r.nx,y:r.ny},reel:r.reel,passiveNormal:r.ln,tangent:r.lt,limit:r.limit,used,dose,residual,capacityExcess:used-r.limit,
    slipping:target.slipping,broken:!!target.broken,legs:target.legs,hold:target.hold,reach:target.reach,groundReach:target.ground};
   allRows.push(record);assert(residual<cfg.checks.rowDose);assert(used<=r.limit+cfg.checks.capacity);
  }
  for(let k=0;k<ids.length;k++){const i=ids[k],residual=report.supportMotorWork[i]-old[k]-(phase.motor[i]??0);audit.maxMotorWorkResidual=Math.max(audit.maxMotorWorkResidual,Math.abs(residual));assert(Math.abs(residual)<cfg.checks.work);
   const b=this.bodies[i],f=b.support.foot;
   if(f&&args[0].includes(i))placement.push({t:sim.t,time:phase.time+h,h,slot:sim.agents[i].slot,state:b.support.state,xi:{...b.support.xi},feetLock:b.support.feetLock,
    desired:{...f.desired},achieved:{...f.achieved},force:{...f.force},capacity:f.capacity,mobility:f.mobility,offset:{...f.offset},
    velocityResidual:Math.hypot(f.achieved.x-f.desired.x-f.mobility*f.force.x,f.achieved.y-f.desired.y-f.mobility*f.force.y)});
  }
  phase=previous;return out;
 };
 const step=w.step;w.step=function(intents:any[],dt:number){
  if(Math.abs(sim.t-start)<1e-9){const event=sim.events.find(e=>e.type==='carrier_contact');assert(event?.note==='grasp');target=sim.bond!.holds!.get(sim.agents[event.b!]);assert(target);ids=[this.indexOf(target.a),this.indexOf(target.b)];
   prefix=hash({bodies:this.bodies,intents,joints:flat()});assert.equal(prefix,cfg.cases.find((x:any)=>x.id===v.case).prefix);first={event,joint:{...flat().find((j:any)=>j.a===ids[0]&&j.b===ids[1])},bodies:ids.map(i=>snapshot(this.bodies[i])),profiles:ids.map(i=>({slot:sim.agents[i].slot,mass:this.mass[i],params:supportParams(this.bodies[i].profile)}))};
  }
  if(target&&sim.t>=start-1e-9){if(v.remove){target.broken=true;this.joints=this.joints.filter((j:any)=>j!==target);}else target.capacity*=v.scale;}
  const recording=target&&sim.t>=start-1e-9&&sim.t<start+cfg.weakContinuationSeconds-1e-9,saved=this.substeps;
  if(recording)audit={t:sim.t,before:ids.map(i=>snapshot(this.bodies[i])),parts:Object.fromEntries(ids.map(i=>[i,{}])),maxMotorWorkResidual:0,requests:ids.map(i=>structuredClone(intents[i]))};
  if(recording&&sim.t<end-1e-9&&v.substeps)this.substeps=v.substeps;
  let report:any;try{report=step.call(this,intents,dt);}finally{this.substeps=saved;}
  if(audit){audit.after=ids.map(i=>snapshot(this.bodies[i]));audit.ledger=ids.map((i,k)=>{const b=this.bodies[i],m=b.profile.massKg,I=supportParams(b.profile).yawInertia,parts=Object.values(audit.parts[i]) as any[],g=report.groundImpulse[i],before=audit.before[k],after=audit.after[k],
    total={x:g.x+parts.reduce((s,p)=>s+p.x,0),y:g.y+parts.reduce((s,p)=>s+p.y,0),l:report.groundYawImpulse[i]+parts.reduce((s,p)=>s+p.l,0)},
    momentum=Math.hypot(m*(after.vel.x-before.vel.x)-total.x,m*(after.vel.y-before.vel.y)-total.y),spin=Math.abs(I*(after.spin-before.spin)-total.l),
    kinetic=(q:any)=>.5*m*(q.vel.x**2+q.vel.y**2)+.5*I*q.spin**2,
    work=kinetic(after)-kinetic(before)-report.groundWork[i]-report.groundYawWork[i]-parts.reduce((s,p)=>s+p.work,0);
    assert(momentum<cfg.checks.momentum&&spin<cfg.checks.spinImpulse&&Math.abs(work)<cfg.checks.work,JSON.stringify({t:sim.t,i,momentum,spin,work}));
    for(const [used,limit] of [['armImpulse','armImpulseLimit'],['armWork','armWorkLimit'],['supportMotorWork','supportMotorWorkLimit']])
     assert(report[used][i]<=report[limit][i]+cfg.checks.work,JSON.stringify({t:sim.t,i,used:report[used][i],limit:report[limit][i]}));
    const stance=ground.filter(q=>q.t===sim.t&&q.slot===sim.agents[i].slot),
     groundResidual=Math.hypot(g.x-stance.reduce((sum,q)=>sum+q.force.x*q.h,0),g.y-stance.reduce((sum,q)=>sum+q.force.y*q.h,0),
      report.groundYawImpulse[i]-stance.reduce((sum,q)=>sum+q.torque*q.h,0));
    assert(groundResidual<cfg.checks.momentum);
    return {slot:sim.agents[i].slot,mass:m,ground:{...g},groundYaw:report.groundYawImpulse[i],groundWork:report.groundWork[i],groundYawWork:report.groundYawWork[i],momentumResidual:momentum,spinResidual:spin,workResidual:work,
     armImpulse:report.armImpulse[i],armImpulseLimit:report.armImpulseLimit[i],armWork:report.armWork[i],armWorkLimit:report.armWorkLimit[i],supportWork:report.supportMotorWork[i],supportWorkLimit:report.supportMotorWorkLimit[i],groundResidual};});
   audit.contactCount=report.contacts.filter((c:any)=>ids.includes(c.i)||ids.includes(c.j)).length;audit.grip={capacity:target.capacity,actualCapacity:this.gripCapacity(target),legs:target.legs,slipping:target.slipping,broken:!!target.broken,force:target.force};steps.push(audit);audit=null;
  }return report;
 };
 const stop=v.finish?8:start+cfg.weakContinuationSeconds;while(sim.phase!=='dead'&&sim.t<stop-1e-9)sim.tick();
 assert(prefix&&first);const fp=fingerprint(),expected=prior.cases.find((c:any)=>c.input.id===v.case).outcomes.find((x:any)=>x.arm.id==='native');if(v.finish)assert.equal(fp,expected.fingerprint,'Observer must preserve the saved native ending');
 return {variant:v,prefix,first,ids,steps,placement,ground,rows:allRows,fingerprint:fp,observerExact:v.finish??false,phase:sim.phase,t:sim.t,censored:sim.phase!=='dead',outcome:sim.outcome,endSpot:sim.endSpot,creditedYards:sim.phase==='dead'?sim.buildResult().yards:null};
}
const runs=cfg.variants.map(run),tite=runs.find((r:any)=>r.variant.id==='native')!;
for(const r of runs.filter((r:any)=>r.variant.case==='tite'))assert.equal(r.prefix,tite.prefix);
const zero=runs.find((r:any)=>r.variant.id==='zero')!,removed=runs.find((r:any)=>r.variant.id==='removed')!;assert.deepEqual(zero.steps.map((s:any)=>s.after),removed.steps.map((s:any)=>s.after));
assert.equal(sourceVersion(),source);
const result={protocol:'native-leg-grasp-v1',source,input:{path:input,sha256:sha(input),parent:cfg.parent,parentSha256:sha(cfg.parent)},toolSha256:sha('scripts/diag/physics/native-leg-grasp.ts'),runs,elapsedSeconds:(performance.now()-began)/1000,worldReplacement:'HOLD/parked',runtimeChanged:false};
writeFileSync(`${root}/result.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({source,elapsedSeconds:result.elapsedSeconds,runs:runs.map((r:any)=>({variant:r.variant,prefix:r.prefix,t:r.t,phase:r.phase,creditedYards:r.creditedYards,steps:r.steps.length,rows:r.rows.length,observerExact:r.observerExact}))}));
