/** Constructed, already-acquired front/side/rear contacts: geometric continuity and physical budgets. These are diagnostics, not NFL calibration or tackle-acquisition tests.
 * Run with Node22.23.3: node --import tsx scripts/diag/tackle-finish/contact-map-controls.ts > out/tackle-finish/contact-map-controls.json
 * Current-vs-height/WRAP arms are explicit counterfactuals; production is unchanged.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { bytesHash, executionIdentity } from '../saved-play.js';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam,pickDefense,pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID,FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { gripForce,updateBond,afterStep } from '../../../src/sim/tackle.js';
import {CONTACT_SCALE,GROUND_STRETCH,type GraspJoint,type Intent} from '../../../src/physics/world.js';
function run(legs:number, location:'front'|'rear'|'side', mode:'current'|'height'|'wrap', substeps:number, q=.8){
 const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O'),'11'),defense:pickDefense(generateTeam(new Rng(32),'D','D'),'nickel'),offCall:{formation:FORMATION_BY_ID.gun_trips_11,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:'continuity'},defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover6,pressure:null,label:'continuity'},los:40,ballY:CENTER_Y,firstDownX:50,seed:3});
 const c=sim.slot('Y')!, d=sim.slot('SS')!;
 for(const a of sim.agents){a.body.pos={x:5+Math.floor(a.idx/12)*2,y:2+a.idx%12*4};a.body.vel={x:0,y:0};}
 c.body.pos={x:50,y:CENTER_Y};c.body.vel={x:6,y:0};c.body.facing=0;
 d.body.pos=location==='side'?{x:50,y:CENTER_Y+.7}:{x:50+(location==='front'?.7:-.7),y:CENTER_Y+.1};d.body.vel=location==='front'?{x:-1,y:0}:location==='side'?{x:3,y:-2}:{x:6.5,y:0};d.body.facing=location==='front'?Math.PI:location==='side'?-Math.PI/2:0;
 sim.t=sim.world.time=2;sim.ball={kind:'held',carrier:c};sim.catchAt=0;sim.world.substeps=substeps;
 const dist=Math.hypot(c.pos.x-d.pos.x,c.pos.y-d.pos.y);
 const j:GraspJoint={kind:'grasp',a:d.body,b:c.body,hold:dist,reach:1.7,capacity:gripForce(d,q),legs,pull:2,origin:'constructed'};
 sim.world.joints.push(j);sim.bond={carrier:c,tacklers:[d],start:2,progressX:50,down:false,grip:new Map([[d,q]]),holds:new Map([[d,j]]),execution:new Map([[d,1]])};
 const out=[];const budget={workResidual:0,passivePositive:0,armImpulseExcess:0,armWorkExcess:0,motorWorkExcess:0,momentumResidual:0};
 const initial=JSON.stringify({carrier:c.body,defender:d.body,grip: {legs:j.legs,capacity:j.capacity,hold:j.hold,reach:j.reach},rng:sim.rng});
 for(let k=0;k<40&&sim.phase==='live'&&sim.bond;k++){
 const intents:Intent[]=sim.agents.map(()=>({vel:{x:0,y:0}}));intents[c.idx]={vel:{x:8,y:0},facing:0};intents[d.idx]={vel:{x:6,y:0}};
 updateBond(sim,sim.bond,intents);if(!sim.bond||sim.phase!=='live')break;
 if(mode!=='current') {
  const torso=c.profile.radius+d.profile.radius,dd=Math.hypot(c.pos.x-d.pos.x,c.pos.y-d.pos.y);
  const near=Math.min(dd,(j.hold??dd)+(1-CONTACT_SCALE)*torso);
  const stretched=d.body.support?.state!=='up'?GROUND_STRETCH:0;
  const quality=Math.max(0,Math.min(1,1-(near-stretched-torso-.25)/Math.max(.2,d.profile.reach-.25)));
  const secure=Math.max(0,Math.min(1,sim.bond.grip?.get(d)??0))*quality;
  j.recoveryCoupling=mode==='height'?j.legs:j.legs*secure;
 }
 const before=sim.agents.reduce((a,b)=>({x:a.x+b.profile.massKg*b.vel.x,y:a.y+b.profile.massKg*b.vel.y}),{x:0,y:0});
 const report=sim.world.step(intents,.05);sim.t+=.05;afterStep(sim);
 const after=sim.agents.reduce((a,b)=>({x:a.x+b.profile.massKg*b.vel.x,y:a.y+b.profile.massKg*b.vel.y}),{x:0,y:0});const ground=report.groundImpulse.reduce((a,b)=>({x:a.x+b.x,y:a.y+b.y}),{x:0,y:0});
 budget.momentumResidual=Math.max(budget.momentumResidual,Math.hypot(after.x-before.x-ground.x,after.y-before.y-ground.y));
 budget.workResidual=Math.max(budget.workResidual,Math.abs(report.work.residual));budget.passivePositive=Math.max(budget.passivePositive,report.passiveGraspWork);
 for(const a of [c,d]){budget.armImpulseExcess=Math.max(budget.armImpulseExcess,report.armImpulse[a.idx]-report.armImpulseLimit[a.idx]);budget.armWorkExcess=Math.max(budget.armWorkExcess,report.armWork[a.idx]-report.armWorkLimit[a.idx]);budget.motorWorkExcess=Math.max(budget.motorWorkExcess,report.supportMotorWork[a.idx]-report.supportMotorWorkLimit[a.idx]);}
 out.push({t:sim.t,cx:c.pos.x,cv:c.vel.x,dx:d.pos.x,xi:{...c.body.support!.xi},state:c.body.support!.state,cause:c.body.support!.cause,force:j.force,legs:j.legs,share:j.recoveryCoupling,foot:c.body.support!.foot?{desired:{...c.body.support!.foot.desired},achieved:{...c.body.support!.foot.achieved},offset:{...c.body.support!.foot.offset}}:null,work:report.work.residual});
 }
 for(const [metric,value] of Object.entries(budget)) assert(Number.isFinite(value)&&value<=1e-8, `${metric}: ${value}`);
 return {legs,location,mode,substeps,q,initial,budget,out};
}
const start=performance.now();
const rows=['front','side','rear'].flatMap(location=>[0,1e-9,.5].flatMap(l=>['current','height','wrap'].flatMap(mode=>[12,48].map(substeps=>run(l,location as any,mode as any,substeps)))));
console.log(JSON.stringify({elapsedMs:performance.now()-start,identity:executionIdentity(),operatorSha256:bytesHash(readFileSync(import.meta.filename)),recordedSingleStream:PlaySim.recordedSingleStream,rows},null,2));
