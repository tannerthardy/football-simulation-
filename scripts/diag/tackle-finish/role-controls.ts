/** Constructed acquired RB, QB, receiver, weak and assisted holds. Weak-grip controls do not stand in for the pending one-arm/block-retention mechanism.
 * Run with Node22.23.3: node --import tsx scripts/diag/tackle-finish/role-controls.ts > out/tackle-finish/role-controls.json
 * Current-vs-height arms are explicit counterfactuals; production is unchanged.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { bytesHash, executionIdentity } from '../saved-play.js';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam,pickDefense,pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID,RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID,FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { gripForce,updateBond,afterStep } from '../../../src/sim/tackle.js';
import type {GraspJoint,Intent} from '../../../src/physics/world.js';
import { createHash } from 'node:crypto';
const cases=[
 {name:'backfield-low-wrap',slot:'RB',x:37,v:3,role:'run',q:.8,legs:.8,holders:[{x:.7,y:.1,vx:0,vy:0}]},
 {name:'near-line-square-wrap',slot:'RB',x:40,v:6,role:'run',q:.8,legs:.5,holders:[{x:.7,y:.1,vx:-1,vy:0}]},
 {name:'caught-Y-side',slot:'Y',x:50,v:6,role:'catch',q:.8,legs:.5,holders:[{x:0,y:.7,vx:3,vy:-2}]},
 {name:'pocket-QB',slot:'QB',x:37,v:0,role:'qb',q:.8,legs:.5,holders:[{x:.7,y:.1,vx:0,vy:0}]},
 {name:'gang-front-side',slot:'RB',x:39,v:4,role:'run',q:.8,legs:.5,holders:[{x:.7,y:.1,vx:-1,vy:0},{x:0,y:-.7,vx:3,vy:2}]},
 {name:'weak-extended-grip',slot:'RB',x:37,v:6,role:'run',q:.15,legs:.15,holders:[{x:-1.5,y:.1,vx:3,vy:0}]},
];
function run(cfg:typeof cases[number],mode:'current'|'height',substeps:number){
 const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O'),'11'),defense:pickDefense(generateTeam(new Rng(32),'D','D'),'nickel'),offCall:cfg.role==='run'?{formation:FORMATION_BY_ID.gun_trips_11,flip:false,kind:'run',run:RUN_BY_ID.iz_strong,label:'acquired role controls'}:{formation:FORMATION_BY_ID.gun_trips_11,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:'acquired role controls'},defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover6,pressure:null,label:'acquired role controls'},los:40,ballY:CENTER_Y,firstDownX:50,seed:3});
 const c=sim.slot(cfg.slot as any)!, ds=cfg.holders.map((_,i)=>sim.slot(i?'FS':'SS')!);
 for(const a of sim.agents){a.body.pos={x:5+Math.floor(a.idx/12)*2,y:2+a.idx%12*4};a.body.vel={x:0,y:0};}
 c.body.pos={x:cfg.x,y:CENTER_Y};c.body.vel={x:cfg.v,y:0};c.body.facing=0;
 for(let i=0;i<ds.length;i++){const s=cfg.holders[i],d=ds[i];d.body.pos={x:cfg.x+s.x,y:CENTER_Y+s.y};d.body.vel={x:s.vx,y:s.vy};d.body.facing=Math.atan2(-s.y,-s.x);}
 sim.t=sim.world.time=2;sim.ball={kind:'held',carrier:c};if(cfg.role==='catch')sim.catchAt=1;if(cfg.role==='run')sim.handoffAt=1;sim.world.substeps=substeps;
 const js:GraspJoint[]=ds.map(d=>{const dist=Math.hypot(c.pos.x-d.pos.x,c.pos.y-d.pos.y);return {kind:'grasp',a:d.body,b:c.body,hold:dist,reach:1.7,capacity:gripForce(d,cfg.q),legs:cfg.legs,pull:2,origin:'constructed'};});
 sim.world.joints.push(...js);sim.bond={carrier:c,tacklers:ds,start:2,progressX:cfg.x,down:false,grip:new Map(ds.map(d=>[d,cfg.q])),holds:new Map(ds.map((d,i)=>[d,js[i]])),execution:new Map(ds.map(d=>[d,1]))};
 const initial=JSON.stringify({bodies:sim.agents.map(a=>a.body),grips:js.map(({a,b,...j})=>j),rng:sim.rng});
 const budget={workResidual:0,passivePositive:0,armImpulseExcess:0,armWorkExcess:0,motorWorkExcess:0,momentumResidual:0};const rows=[];
 for(let k=0;k<60&&sim.phase==='live'&&sim.bond;k++){
 const intents:Intent[]=sim.agents.map(()=>({vel:{x:0,y:0}}));intents[c.idx]={vel:{x:cfg.role==='qb'?0:8,y:0},facing:0};for(const d of ds)intents[d.idx]={vel:{...d.vel}};
 updateBond(sim,sim.bond,intents);if(!sim.bond||sim.phase!=='live')break;
 for(const j of js)if(mode==='height')j.recoveryCoupling=j.legs;
 const before=sim.agents.reduce((a,b)=>({x:a.x+b.profile.massKg*b.vel.x,y:a.y+b.profile.massKg*b.vel.y}),{x:0,y:0});
 const report=sim.world.step(intents,.05);sim.t+=.05;afterStep(sim);
 const after=sim.agents.reduce((a,b)=>({x:a.x+b.profile.massKg*b.vel.x,y:a.y+b.profile.massKg*b.vel.y}),{x:0,y:0});const ground=report.groundImpulse.reduce((a,b)=>({x:a.x+b.x,y:a.y+b.y}),{x:0,y:0});
 budget.momentumResidual=Math.max(budget.momentumResidual,Math.hypot(after.x-before.x-ground.x,after.y-before.y-ground.y));budget.workResidual=Math.max(budget.workResidual,Math.abs(report.work.residual));budget.passivePositive=Math.max(budget.passivePositive,report.passiveGraspWork);
 for(const a of [c,...ds]){budget.armImpulseExcess=Math.max(budget.armImpulseExcess,report.armImpulse[a.idx]-report.armImpulseLimit[a.idx]);budget.armWorkExcess=Math.max(budget.armWorkExcess,report.armWork[a.idx]-report.armWorkLimit[a.idx]);budget.motorWorkExcess=Math.max(budget.motorWorkExcess,report.supportMotorWork[a.idx]-report.supportMotorWorkLimit[a.idx]);}
 rows.push({t:sim.t-2,cx:c.pos.x,cv:c.vel.x,xi:{...c.body.support!.xi},state:c.body.support!.state,cause:c.body.support!.cause,bond:!!sim.bond,stalled:sim.bond?.stalled,holders:js.map(j=>({force:j.force??0,broken:j.broken??false,legs:j.legs,coupling:j.recoveryCoupling,capacity:j.capacity,hold:j.hold})),requested:intents[c.idx]});
 }
 for(const [metric,value] of Object.entries(budget)) assert(Number.isFinite(value)&&value<=1e-8, `${metric}: ${value}`);
 return {name:cfg.name,mode,substeps,initialHash:createHash('sha256').update(initial).digest('hex'),budget,rows,end:{t:sim.t-2,x:c.pos.x,phase:sim.phase,bond:!!sim.bond,sacked:sim.stats.sacked,brokenTackles:sim.stats.brokenTackles,events:sim.events}};
}
const start=performance.now();
console.log(JSON.stringify({identity:executionIdentity(),operatorSha256:bytesHash(readFileSync(import.meta.filename)),recordedSingleStream:PlaySim.recordedSingleStream,rows:cases.flatMap(c=>['current','height'].flatMap(m=>[12,48].map(n=>run(c,m as any,n)))),elapsedMs:performance.now()-start},null,2));
