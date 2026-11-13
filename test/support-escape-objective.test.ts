import {describe,expect,it} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import type {Intent} from '../src/physics/world.js';
import {contactCommands,contactFixture} from '../scripts/diag/run-contact-technique.js';
import {traits} from '../src/sim/engagement.js';
import type {Perceived} from '../src/sim/perception.js';

/** Synthetic controller island, not a reconstructed native snap or a claim
 * that every DB wins. Actual fixture hands remain; the imposed previous load
 * supplies the local tactile channel separately from the acquired picture.
 */
function scene(options:{front?:boolean;loaded?:boolean;kind?:'alley'|'force'|'interior'}={}){
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,seed:11});
 const {sim,blocker,defender,engagement}=f;
 sim.t=1.5;engagement.nextMoveAt=0;defender.recog!.read='run';
 defender.runFit={gap:'D',side:1,kind:options.kind??'alley',edge:'box',technique:'attack',pace:'stack'};
 defender.body.pos={x:43,y:CENTER_Y};defender.body.vel={x:0,y:0};
 blocker.body.pos={x:43+(options.front?.75:-.75),y:CENTER_Y};
 blocker.body.vel={x:0,y:0};
 blocker.body.facing=Math.atan2(defender.pos.y-blocker.pos.y,defender.pos.x-blocker.pos.x);
 defender.body.facing=Math.PI;
 engagement.hands!.normalForce=options.loaded===false?0:60;
 engagement.hands!.tangentForce=0;
 const back=sim.slot('RB')!;sim.ball={kind:'held',carrier:back};
 let runner:Perceived={pos:{x:44.5,y:CENTER_Y+2},vel:{x:3,y:0},facing:0,
  stance:null,pose:'up',carrying:true,age:.2};
 let qb:Perceived={pos:{x:35,y:CENTER_Y},vel:{x:0,y:0},facing:0,
  stance:null,pose:'up',carrying:false,age:.2};
 let blockerPicture:Perceived={pos:{...blocker.pos},vel:{x:0,y:0},facing:blocker.facing,
  stance:'low',pose:'up',carrying:false,age:.2};
 const see=sim.see.bind(sim);
 sim.see=(a,b,scale=1)=>a===defender&&b===back?structuredClone(runner)
  :a===defender&&b===sim.qb?structuredClone(qb)
   :a===defender&&b===blocker?structuredClone(blockerPicture):see(a,b,scale);
 return {...f,back,goal:()=>({...runner.pos}),
  setRunner:(change:Partial<Perceived>)=>{runner={...runner,...change};},
  setQB:(change:Partial<Perceived>)=>{qb={...qb,...change};},
  setBlockerPicture:(change:Partial<Perceived>)=>{blockerPicture={...blockerPicture,...change};},
  commands:()=>contactCommands(f),command:()=>contactCommands(f)[defender.idx]};
}

type Fixture=ReturnType<typeof scene>;
const speed=(command:Intent)=>Math.hypot(command.vel.x,command.vel.y);
function toward(command:Intent,f:Fixture,point=f.goal()){
 const dx=point.x-f.defender.pos.x,dy=point.y-f.defender.pos.y;
 return (command.vel.x*dx+command.vel.y*dy)/(Math.hypot(dx,dy)*speed(command));
}
function handRequest(f:Fixture){
 const h=f.engagement.hands!;
 return {push:h.push,hold:h.hold,steer:h.steer,extension:h.extension,actor:h.actor===f.blocker.body?'blocker':'defender'};
}

describe('qualified support can leave toward its held runner objective',()=>{
 it('uses an already clear exit toward the runner at the existing work-off speed, without freeing the rep',()=>{
  const f=scene(),before=structuredClone([f.blocker.body,f.defender.body]);
  const command=f.command();
  expect(toward(command,f)).toBeCloseTo(1,12);
  expect(speed(command)).toBeCloseTo(Math.hypot(traits(f.defender,'run').lateral,.6),12);
  expect(command.facing).toBeCloseTo(Math.PI,12);
  expect(command.posture).toBe(.85);expect(command.push).toBe(1);
  expect([f.blocker.body,f.defender.body]).toEqual(before);
  expect(f.defender.engagement).toBe(f.engagement);
  expect(f.sim.events.some(e=>e.type==='shed')).toBe(false);
 });

 it('does not choose its clear exit from hidden offensive drive or seal metadata',()=>{
  const a=scene(),b=scene();
  b.engagement.drive={x:0,y:1};b.engagement.surfaceAxis={x:Math.SQRT1_2,y:-Math.SQRT1_2};
  b.engagement.sealTarget=.45;
  const ca=a.command(),cb=b.command();
  expect(cb).toEqual(ca);
  expect(a.engagement.nextMoveAt).toBe(b.engagement.nextMoveAt);
  expect(a.sim.rng.nextU32()).toBe(b.sim.rng.nextU32());
 });

 it('keeps across-face work when the felt blocker is in front, with the same hands and effort',()=>{
  const clear=scene(),blocked=scene({front:true});
  const direct=clear.command(),across=blocked.command();
  expect(toward(direct,clear)).toBeCloseTo(1,12);
  expect(toward(across,blocked)).toBeLessThan(.95);
  expect(speed(across)).toBeCloseTo(speed(direct),12);
  expect(handRequest(blocked)).toEqual(handRequest(clear));
  expect(blocked.defender.engagement).toBe(blocked.engagement);
 });

 it('responds to a changed acquired blocker picture when no tactile load is available',()=>{
  const clear=scene({loaded:false}),blocked=scene({loaded:false});
  blocked.setBlockerPicture({pos:{x:43.75,y:CENTER_Y},facing:Math.PI});
  expect(toward(clear.command(),clear)).toBeCloseTo(1,12);
  expect(toward(blocked.command(),blocked)).toBeLessThan(.95);
 });

 it('cannot learn a hidden blocker relocation through a stale unloaded picture',()=>{
  const a=scene({loaded:false}),b=scene({loaded:false});
  a.setBlockerPicture({age:.5});b.setBlockerPicture({age:.5});
  b.blocker.body.pos={x:43.75,y:CENTER_Y};b.blocker.body.facing=Math.PI;
  for(let i=0;i<3;i++){
   a.sim.perception.record(a.sim.agents,a.back.idx);
   b.sim.perception.record(b.sim.agents,b.back.idx);
  }
  // Existing contact-facing policy is outside this request-only correction.
  expect(b.command().vel).toEqual(a.command().vel);
  expect(a.sim.rng.nextU32()).toBe(b.sim.rng.nextU32());
 });

 it('preserves a fresh visual exit and lets actual transmitted touch oppose that visual picture',()=>{
  const visual=scene({loaded:false}),touch=scene({loaded:true});
  visual.setBlockerPicture({age:0});
  touch.blocker.body.pos={x:43.75,y:CENTER_Y};touch.blocker.body.facing=Math.PI;
  // The old visual sample still places him behind. Only the loaded contact
  // supplies the conflicting current local surface in this opposing control.
  expect(toward(visual.command(),visual)).toBeCloseTo(1,12);
  expect(toward(touch.command(),touch)).toBeLessThan(.95);
 });

 it('holds the selected exit through the existing attempt, then readopts a newly acquired runner direction',()=>{
  const f=scene(),firstGoal=f.goal(),first=f.command(),until=f.engagement.nextMoveAt;
  f.setRunner({pos:{x:44,y:CENTER_Y-3},vel:{x:2,y:-2}});f.sim.t+=.01;
  expect(f.command().vel).toEqual(first.vel);
  expect(f.engagement.nextMoveAt).toBe(until);
  f.sim.t=until+.01;const next=f.command();
  expect(toward(next,f)).toBeCloseTo(1,12);
  expect(toward(next,f,firstGoal)).toBeLessThan(.5);
  expect(f.engagement.nextMoveAt).toBeGreaterThan(f.sim.t);
 });

 it('follows the owning runner read when it refreshes before the work-off attempt expires',()=>{
  const f=scene(),firstGoal=f.goal(),first=f.command(),until=f.engagement.nextMoveAt;
  f.setRunner({pos:{x:44,y:CENTER_Y-3},vel:{x:2,y:-2}});
  f.sim.t+=f.defender.mind.decisionInterval+.01;
  expect(f.sim.t).toBeLessThan(until);
  const refreshed=f.command();
  expect(f.engagement.nextMoveAt).toBe(until);
  expect(toward(refreshed,f)).toBeCloseTo(1,12);
  expect(toward(refreshed,f,firstGoal)).toBeLessThan(.5);
  expect(speed(refreshed)).toBeCloseTo(speed(first),12);
 });

 it('does not turn an unadvanced force picture into permission for the new exit',()=>{
  const f=scene({kind:'force'});f.setRunner({pos:{x:39,y:CENTER_Y+6}});
  f.command();
  expect(f.defender.tags.has('shed-attempt')).toBe(false);
  expect(f.engagement.nextMoveAt).toBe(0);
 });

 it('leaves first-level close-threat work on its existing across-face policy',()=>{
  const f=scene({kind:'interior'}),command=f.command();
  expect(f.defender.tags.has('shed-attempt')).toBe(true);
  expect(toward(command,f)).toBeLessThan(.95);
  expect(f.defender.engagement).toBe(f.engagement);
 });

 it.each(['unknown','contradictory'] as const)('does not infer the direct support exit from %s possession',condition=>{
  const f=scene();
  if(condition==='unknown')f.setRunner({carrying:undefined});
  else f.setQB({carrying:true});
  const command=f.command();
  // Existing close-threat work-off may still occur; new direct support
  // eligibility must not come from the hidden holder as a fallback.
  expect(toward(command,f)).toBeLessThan(.95);
  expect(f.defender.engagement).toBe(f.engagement);
 });

 it('executes the attempted exit through unchanged real hand and support budgets',()=>{
  const f=scene(),commands=f.commands();
  expect(toward(commands[f.defender.idx],f)).toBeCloseTo(1,12);
  const report=f.sim.world.step(commands,f.sim.dt);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for(const a of [f.blocker,f.defender]){
   expect(report.armImpulse[a.idx]-report.armImpulseLimit[a.idx]).toBeLessThan(1e-8);
   expect(report.armWork[a.idx]-report.armWorkLimit[a.idx]).toBeLessThan(1e-8);
   expect(report.supportMotorWork[a.idx]-report.supportMotorWorkLimit[a.idx]).toBeLessThan(1e-8);
  }
 });
});
