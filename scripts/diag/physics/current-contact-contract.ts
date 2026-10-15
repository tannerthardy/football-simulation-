/** One current Tite contract, with neutral observation and frozen requests.
 * Diagnose the first law/command divergence and zero-compression predicate;
 * this is not a whole-play outcome or a new controller. */
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
import {sourceVersion} from '../../source-version.js';
import {supportParams} from '../../../src/physics/support.js';
const root='out/contact-law-current',hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');mkdirSync(root,{recursive:true});
const source=sourceVersion(),start=performance.now();
function run(mode:'center'|'patch',observe:boolean){
 const formation=FORMATION_BY_ID.gun_wing_12,sim=new PlaySim({
  offense:pickOffense(generateTeam(new Rng(31),'Panel offense 1','O1',{strength:.55}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(32),'Panel defense 1','D1',{strength:.55}),'base34'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.split_zone,label:'Split Zone'},
  defCall:{personnel:'base34',front:FRONT_BY_ID.tite,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Tite Cover 3'},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:3,handContact:mode,groundMovement:'legacy'}),
  owner=sim.slot('Y')!,helper=sim.slot('RT')!,defender=sim.slot('DE_S')!,w:any=sim.world,
  combo=(helper.behavior as any).plan.combination,steps:any[]=[],predicates:any[]=[];
 if(observe){
  let active:number[]=[],frames:any[]=[];
  const integrate=w.integrateSubstep,rows=w.jointRows,step=w.step;
  w.integrateSubstep=function(ids:number[],...args:any[]){active=ids;return integrate.call(this,ids,...args);};
  w.jointRows=function(h:number){const result=rows.call(this,h);for(const r of result){
   if(!active.includes(r.i)||!active.includes(r.j)||r.joint.kind!=='hands')continue;
   const target=[r.joint.a,r.joint.b].includes(owner.body)&&[r.joint.a,r.joint.b].includes(defender.body);
   if(!target&&sim.t>=.5)continue;
   const a=this.bodies[r.i],b=this.bodies[r.j],com=(b.vel.x-a.vel.x)*-r.ny+(b.vel.y-a.vel.y)*r.nx,
    yaw=-(r.ri??0)*(a.spin??0)-(r.rj??0)*(b.spin??0);
   frames.push({row:r,slots:[sim.agents[r.i].slot,sim.agents[r.j].slot],target,h,mode:r.mode,c:r.c,comSlip:com,yawSlip:yaw,pointSlip:com+yaw,normalCapacity:r.pushLim,steerCapacity:r.steerLim});
  }return result;};
  w.step=function(intents:any[],dt:number){
   const inputHash=hash({bodies:this.bodies,intents,joints:this.joints.map((j:any)=>{const {a,b,actor,holder,...rest}=j;return {...rest,a:this.indexOf(a),b:this.indexOf(b),actor:actor?this.indexOf(actor):null,holder:holder?this.indexOf(holder):null};})}),
    beforeHash=hash(this.bodies),intentHash=hash(intents),before=structuredClone([owner.body,defender.body]),
    earlyBefore=sim.t<.5?structuredClone(this.bodies):undefined;frames=[];
   const report=step.call(this,intents,dt),joint=combo.defender.engagement?.hands;
   steps.push({t:sim.t,inputHash,beforeHash,intentHash,afterHash:hash(this.bodies),before,after:structuredClone([owner.body,defender.body]),
    requested:[intents[owner.idx],intents[defender.idx]],normal:joint?.normalForce??null,tangent:joint?.tangentForce??null,
    moments:joint?[joint.momentOnA,joint.momentOnB]:[],groundYaw:[report.groundYawImpulse[owner.idx],report.groundYawImpulse[defender.idx]],
    workResidual:report.work.residual,contacts:report.contacts,strikes:report.strikes,
    earlyBodies:earlyBefore?{before:earlyBefore,after:structuredClone(this.bodies),groundYaw:report.groundYawImpulse,
      joints:this.joints.map((j:any)=>({kind:j.kind,i:this.indexOf(j.a),j:this.indexOf(j.b),normal:j.normalForce,tangent:j.tangentForce,moments:[j.momentOnA??0,j.momentOnB??0]}))}:undefined,
    frames:frames.map(({row,...f})=>({...f,normalImpulse:row.ln,tangentImpulse:row.lt,normalWork:row.normalWork?.net??0,tangentWork:row.tangentWork?.net??0}))});
   return report;
  };
 }
 while(sim.t<2&&sim.phase!=='dead'){
  sim.tick();const e=combo.defender.engagement;
  if(e?.blocker===owner&&Math.abs(e.phi)>=1.1){
   const to=Math.atan2(e.defender.pos.y-owner.pos.y,e.defender.pos.x-owner.pos.x),off=Math.abs(Math.atan2(Math.sin(to-owner.facing),Math.cos(to-owner.facing)));
   predicates.push({t:sim.t,normal:e.hands?.normalForce??null,tangent:e.hands?.tangentForce??null,phi:e.phi,achievedOff:off,
    active:!!e.hands&&sim.world.joints.includes(e.hands),support:owner.body.support?.state,helperReleased:combo.released});
  }
 }
 return {fingerprint:hash({bodies:w.bodies,cmds:Reflect.get(sim,'cmds'),intents:sim.intents,minds:sim.agents.map(a=>a.mind),rng:sim.rng,events:sim.events,phase:sim.phase,t:sim.t}),
  steps,predicates,climbs:sim.events.filter(e=>e.type==='block_climb'&&e.a===helper.idx),tags:[...helper.tags],released:combo.released};
}
const runs=(['center','patch'] as const).map(mode=>{const plain=run(mode,false),recorded=run(mode,true);assert.equal(plain.fingerprint,recorded.fingerprint);return {mode,observerNeutral:true,...recorded};}),
 firstBody=runs[0].steps.findIndex((r,i)=>r.afterHash!==runs[1].steps[i]?.afterHash),
 firstCommand=runs[0].steps.findIndex((r,i)=>r.intentHash!==runs[1].steps[i]?.intentHash),
 firstZero=runs[1].predicates.find(r=>r.normal!==null&&r.normal<=0),
 earliest={time:runs[0].steps[firstBody]?.t,identicalInput:runs[0].steps[firstBody]?.inputHash===runs[1].steps[firstBody]?.inputHash,
  firstChangedCommandTime:runs[0].steps[firstCommand]?.t,zeroCompressionPredicate:firstZero};
const ledgers=runs.map(run=>{
 const step=run.steps[firstBody],early=step.earlyBodies;
 assert(early&&step.contacts.length===0&&step.strikes.length===0&&early.joints.every((j:any)=>j.kind==='hands'));
 const rows=early.after.map((body:any,i:number)=>{
  const spinImpulse=supportParams(body.profile).yawInertia*((body.spin??0)-(early.before[i].spin??0)),
   handImpulse=early.joints.reduce((sum:number,j:any)=>sum+(j.i===i?j.moments[0]:0)*.05+(j.j===i?j.moments[1]:0)*.05,0),
   groundImpulse=early.groundYaw[i],residual=spinImpulse-handImpulse-groundImpulse;
  // Center's omitted hand torque is the known defect. Test the isolated law.
  if(run.mode==='patch')assert(Math.abs(residual)<1e-10);
  return {slot:run.steps[firstBody].earlyBodies.after[i]&&i,spinImpulse,handImpulse,groundImpulse,residual};
 });return {mode:run.mode,time:step.t,joints:early.joints,rows};
});
assert.equal(sourceVersion(),source);
const result={source,toolSha256:createHash('sha256').update(readFileSync('scripts/diag/physics/current-contact-contract.ts')).digest('hex'),
 input:{O:31,D:32,strength:.55,seed:3,formation:'gun_wing_12',concept:'split_zone',front:'tite',coverage:'cover3',flip:false,windowSeconds:2},
 settings:{groundMovement:'legacy',handContact:'center versus patch',components:process.env.RUN_CONTACT_COMPONENTS,experimentalSolvers:'absent'},earliest,ledgers,runs,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync(`${root}/tite-contract.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({earliest,runs:runs.map(r=>({mode:r.mode,observerNeutral:r.observerNeutral,climbs:r.climbs,released:r.released})),elapsedSeconds:result.elapsedSeconds}));
