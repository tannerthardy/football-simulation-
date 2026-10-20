import {describe,expect,it} from 'vitest';
import {contactCommands,contactFixture} from '../scripts/diag/run-contact-technique.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {traits} from '../src/sim/engagement.js';
import type {Perceived} from '../src/sim/perception.js';

/** Shared-controller contract island. No native protection/gain claim: both
 * actions must reach World through the existing hands and physical budgets. */
function scene(mode:'drive'|'runoff',side:1|-1,carrying:boolean){
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,side,seed:11});
 const {sim,blocker:b,defender:d,engagement:e}=f;
 sim.t=1.5;sim.world.time=sim.t;e.nextMoveAt=sim.t+.5;
 d.recog!.read='run';d.runFit={gap:'D',side,kind:'alley',edge:'box',technique:'attack',pace:'stack'};
 const y=b.pos.y,sep=b.profile.radius+d.profile.radius;
 d.body.pos={x:43,y};d.body.vel={x:-1.2,y:0};
 b.body.pos=mode==='drive'?{x:43,y:y-side*(sep+.05)}:{x:43-sep,y:y-side*.2};
 b.body.vel={x:0,y:0};b.body.facing=Math.atan2(d.pos.y-b.pos.y,d.pos.x-b.pos.x);
 e.hands!.normalForce=60;e.hands!.tangentForce=0;
 const drive=mode==='drive'?{x:1,y:0}:{x:.6726727939963124,y:side*.7399400733959437};
 e.drive=drive;e.surfaceAxis={x:-1,y:0};
 if(mode==='runoff'){
  sim.offCall.run={...sim.offCall.run!,scheme:'outsideZone',direction:sim.offAlign.strongSign===side?'strong':'weak'};
  e.sealTarget=-side*.3;
  const behavior=new RunBlocker({kind:'reach',target:d,drive});b.behavior=behavior;
  behavior.zoneRead={phase:'runoff',target:d.idx,side,t:1.4,nextRead:1.7,drive,
   sealTarget:e.sealTarget,aim:{x:d.pos.x-.3,y:d.pos.y-side*.6},horizon:.2,
   neededTravel:.5,availableTravel:.1,seen:{pos:{...d.pos},vel:{x:0,y:side*2},age:.2,carrying:null,stance:null,facing:Math.PI,pose:'up'}};
 }
 const goal={x:44.5,y:y+side*2},back=sim.slot('RB')!;
 back.body.pos={...goal};sim.ball={kind:'held',carrier:back};
 const see=sim.see.bind(sim);
 sim.see=(observer,other,scale=1):Perceived=>observer===d&&other===back
  ? {pos:{...goal},vel:{x:3,y:0},facing:0,stance:null,pose:'up',carrying,age:.2}
  :observer===d&&other===sim.qb
   ? {pos:{x:35,y},vel:{x:0,y:0},facing:0,stance:null,pose:'up',carrying:false,age:.2}
   :see(observer,other,scale);
 return {...f,goal};
}

describe('Run offensive work and Catching support exit share one contact rep',()=>{
 for(const mode of ['drive','runoff'] as const)it.each([-1,1] as const)(`${mode}: preserves both requests, cadence and physical execution, side=%s`,side=>{
  const active=scene(mode,side,true),opposing=scene(mode,side,false);
  const before=structuredClone(active.sim.agents.map(a=>a.body));
  const commands=contactCommands(active),ordinary=contactCommands(opposing);
  const b=commands[active.blocker.idx],d=commands[active.defender.idx];
  // Qualified defensive work cannot erase the offense's selected command.
  expect(b).toEqual(ordinary[opposing.blocker.idx]);
  if(mode==='runoff')expect(b.vel.y*side).toBeGreaterThan(1.5);
  else expect(b.vel.x).toBeLessThan(1); // Level man: connection, not fixed2.4 drive.
  const dx=active.goal.x-active.defender.pos.x,dy=active.goal.y-active.defender.pos.y;
  expect((d.vel.x*dx+d.vel.y*dy)/(Math.hypot(dx,dy)*Math.hypot(d.vel.x,d.vel.y))).toBeCloseTo(1,12);
  expect(Math.hypot(d.vel.x,d.vel.y)).toBeCloseTo(Math.hypot(traits(active.defender,'run').lateral,.6),12);
  expect(active.defender.tags.has('shed-attempt')).toBe(true);
  expect(opposing.defender.tags.has('shed-attempt')).toBe(false);
  expect(active.engagement.nextMoveAt).toBeCloseTo(active.sim.t+2*active.defender.mind.decisionInterval,12);
  expect(active.sim.rng.nextU32()).toBe(opposing.sim.rng.nextU32());
  expect(active.sim.agents.map(a=>a.body)).toEqual(before);
  expect(active.defender.engagement).toBe(active.engagement);
  const until=active.engagement.nextMoveAt;
  const report=active.sim.world.step(commands,active.sim.dt);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for(const a of [active.blocker,active.defender]){
   expect(report.armImpulse[a.idx]-report.armImpulseLimit[a.idx]).toBeLessThan(1e-8);
   expect(report.armWork[a.idx]-report.armWorkLimit[a.idx]).toBeLessThan(1e-8);
   expect(report.supportMotorWork[a.idx]-report.supportMotorWorkLimit[a.idx]).toBeLessThan(1e-8);
  }
  active.sim.t+=active.sim.dt;contactCommands(active);
  expect(active.engagement.nextMoveAt).toBe(until);
 });
});
