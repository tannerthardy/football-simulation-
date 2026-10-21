import {describe,expect,it} from 'vitest';
import {contactCommands,contactFixture} from '../scripts/diag/run-contact-technique.js';
import {CENTER_Y} from '../src/core/field.js';
import type {Perceived} from '../src/sim/perception.js';

/** Controller contract island; native Y/SS transfer is tested separately. */
function scene(kind:'force'|'insert'|'interior'='force',side=1){
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,side,seed:11});
 f.sim.t=1.5;f.engagement.nextMoveAt=0;f.defender.recog!.read='run';
 f.defender.runFit={gap:'D',side,kind,edge:'box',technique:'attack',pace:'stack'};
 f.sim.ball={kind:'held',carrier:f.sim.slot('RB')!};
 let cue:Perceived={pos:{x:kind==='force'?43:39,y:CENTER_Y+side*6},vel:{x:3,y:0},
  facing:0,stance:null,age:.25,pose:'up',carrying:true};
 let qbCue:Perceived={pos:{x:35,y:CENTER_Y},vel:{x:0,y:0},facing:0,stance:null,age:.25,pose:'up',carrying:false};
 const see=f.sim.see.bind(f.sim);
 f.sim.see=(a,b,s=1)=>a===f.defender&&b.slot==='RB'?structuredClone(cue)
  :a===f.defender&&b===f.sim.qb?structuredClone(qbCue):see(a,b,s);
 return {...f,setCue:(delta:Partial<Perceived>)=>{cue={...cue,...delta};},
  setQBCue:(delta:Partial<Perceived>)=>{qbCue={...qbCue,...delta};},
  command:()=>contactCommands(f)[f.defender.idx]};
}

describe('support players work off toward a personally declared carrier',()=>{
 it('does not restart a contact move wait after support has already declared the carrying runner',()=>{
  const f=scene();f.engagement.nextMoveAt=f.sim.t+.5;
  const bodies=structuredClone(f.sim.agents.map(a=>a.body));
  f.command();
  expect(f.defender.tags.has('shed-attempt')).toBe(true);
  expect(f.engagement.nextMoveAt).toBeCloseTo(f.sim.t+2*f.defender.mind.decisionInterval,12);
  expect(f.sim.agents.map(a=>a.body)).toEqual(bodies);
  expect(f.defender.engagement).toBe(f.engagement);
 });

 it('continues the acquired support response when real reachable contact is acquired again',()=>{
  const f=scene();f.command();
  f.sim.disengage(f.engagement);
  f.defender.tags.delete('shed-attempt');
  const next=f.sim.engage(f.blocker,f.defender,'run',f.engagement.drive)!;
  expect(next).not.toBeNull();
  expect(next.nextMoveAt).toBeGreaterThan(f.sim.t);
  f.command();
  expect(f.defender.tags.has('shed-attempt')).toBe(true);
  expect(next.nextMoveAt).toBeCloseTo(f.sim.t+2*f.defender.mind.decisionInterval,12);
  expect(f.defender.engagement).toBe(next);
  expect(f.sim.events.some(e=>e.type==='shed')).toBe(false);
 });

 it('does not restart a work-off choice every tick after the first support attempt',()=>{
  const f=scene();f.engagement.nextMoveAt=f.sim.t+.5;f.command();
  expect(f.defender.tags.has('shed-attempt')).toBe(true);
  const next=f.engagement.nextMoveAt;
  f.sim.t+=.01;f.setCue({pos:{x:43,y:CENTER_Y-6}});f.command();
  expect(f.engagement.nextMoveAt).toBe(next);
 });

 it.each([undefined,false])('retains the initial contact move wait without acquired carrying evidence %s',carrying=>{
  const f=scene();f.setCue({carrying});f.engagement.nextMoveAt=f.sim.t+.5;
  f.command();expect(f.defender.tags.has('shed-attempt')).toBe(false);
  expect(f.engagement.nextMoveAt).toBe(f.sim.t+.5);
 });

 it.each(['lost','contradictory','force-unadvanced'] as const)(
  'does not carry eligibility into a new contact after %s evidence',condition=>{
   const f=scene();f.command();f.sim.disengage(f.engagement);
   f.defender.tags.delete('shed-attempt');
   if(condition==='lost')f.setCue({carrying:false});
   if(condition==='contradictory')f.setQBCue({carrying:true});
   if(condition==='force-unadvanced')f.setCue({pos:{x:39,y:CENTER_Y+6}});
   f.sim.t+=f.defender.mind.decisionInterval+.01;
   const next=f.sim.engage(f.blocker,f.defender,'run',f.engagement.drive)!;
   expect(next).not.toBeNull();const pending=next.nextMoveAt;f.command();
   expect(f.defender.tags.has('shed-attempt')).toBe(false);
   expect(next.nextMoveAt).toBe(pending);
  });

 it('retains initial contact timing for a close first-level threat',()=>{
  const f=scene('interior');f.setCue({pos:{x:41,y:CENTER_Y+1}});
  f.engagement.nextMoveAt=f.sim.t+.5;f.command();
  expect(f.defender.tags.has('shed-attempt')).toBe(false);
  expect(f.engagement.nextMoveAt).toBe(f.sim.t+.5);
 });

 it.each([['force',-1],['force',1],['insert',-1],['insert',1]] as const)(
  '%s support can try beyond the old proximity trigger, side %s',(kind,side)=>{
   const f=scene(kind,side),before=structuredClone([f.blocker.body,f.defender.body]);
   const opposing=scene(kind,side);opposing.setCue({carrying:false});
   const oldRequest=opposing.command();
   const request=f.command();
   expect(f.defender.tags.has('shed-attempt')).toBe(true);
   expect(f.engagement.nextMoveAt).toBeGreaterThan(f.sim.t);
   expect(Math.hypot(request.vel.x,request.vel.y)).toBeGreaterThan(Math.hypot(oldRequest.vel.x,oldRequest.vel.y));
   expect(Math.hypot(request.vel.x,request.vel.y)).toBeLessThan(f.defender.profile.vmax);
   expect([f.blocker.body,f.defender.body]).toEqual(before);
   expect(f.defender.engagement).toBe(f.engagement);
   expect(f.sim.events.some(e=>e.type==='shed')).toBe(false);
  });

 it('retains the force shoulder before the existing advanced-carrier boundary',()=>{
  const f=scene();f.setCue({pos:{x:39,y:CENTER_Y+6}});f.command();
  expect(f.engagement.nextMoveAt).toBe(0);
  expect(f.defender.tags.has('shed-attempt')).toBe(false);
 });

 it.each([undefined,false])('does not expand work-off from uncertain/negative possession %s',carrying=>{
  const f=scene();f.setCue({carrying});f.command();
  expect(f.engagement.nextMoveAt).toBe(0);
  expect(f.defender.tags.has('shed-attempt')).toBe(false);
 });

 it.each(['unsure','pass'] as const)('an unadvanced picture does not erase %s belief',read=>{
  const f=scene('insert');f.defender.recog!.read=read;f.command();
  expect(f.engagement.nextMoveAt).toBe(0);
 });

 it('keeps first-level stack work until its existing close-threat trigger',()=>{
  const f=scene('interior');f.command();expect(f.engagement.nextMoveAt).toBe(0);
  expect(f.defender.engagement).toBe(f.engagement);
 });

 it('holds the target mode with the selected aim until the next ordinary read',()=>{
  const f=scene();f.setCue({pos:{x:39,y:CENTER_Y+6}});f.command();
  f.setCue({pos:{x:43,y:CENTER_Y+6}});f.sim.t+=.01;f.command();
  expect(f.engagement.nextMoveAt).toBe(0);
  f.sim.t+=f.defender.mind.decisionInterval+.01;f.command();
  expect(f.engagement.nextMoveAt).toBeGreaterThan(f.sim.t);
 });

 it('does not use a hidden change in carrier position or velocity with fixed acquired evidence',()=>{
  const a=scene(),b=scene();b.sim.slot('RB')!.body.pos={x:95,y:5};
  b.sim.slot('RB')!.body.vel={x:-8,y:4};
  expect(a.command()).toEqual(b.command());
  expect(a.engagement.nextMoveAt).toBe(b.engagement.nextMoveAt);
  expect(a.sim.rng.nextU32()).toBe(b.sim.rng.nextU32());
 });

 it('retains the acquired back target when hidden possession changes without a new picture',()=>{
  const a=scene(),b=scene();b.sim.ball={kind:'held',carrier:b.sim.qb};
  expect(a.command()).toEqual(b.command());
  expect(a.engagement.nextMoveAt).toBe(b.engagement.nextMoveAt);
  expect(a.sim.rng.nextU32()).toBe(b.sim.rng.nextU32());
 });

 it('does not expand work-off from contradictory QB and back possession pictures',()=>{
  const f=scene();f.setQBCue({carrying:true});f.command();
  expect(f.engagement.nextMoveAt).toBe(0);
 });

 it('retains an ordinary mesh or PA picture with a carrying QB deep and empty back',()=>{
  const f=scene();f.setCue({carrying:false});f.setQBCue({carrying:true});f.command();
  expect(f.engagement.nextMoveAt).toBe(0);
  expect(f.defender.tags.has('shed-attempt')).toBe(false);
 });

 it('can work off toward a personally acquired advanced QB despite opposite hidden possession',()=>{
  const f=scene();f.setCue({carrying:false});
  f.setQBCue({carrying:true,pos:{x:43,y:CENTER_Y+6},vel:{x:3,y:0}});f.command();
  expect(f.engagement.nextMoveAt).toBeGreaterThan(f.sim.t);
  expect(f.defender.tags.has('shed-attempt')).toBe(true);
 });

 it('executes attempted work-off through unchanged arm/support/work budgets',()=>{
  const f=scene(),intents=contactCommands(f);
  expect(f.defender.tags.has('shed-attempt')).toBe(true);
  const report=f.sim.world.step(intents,f.sim.dt);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for(const a of [f.blocker,f.defender]){
   expect(report.armImpulse[a.idx]-report.armImpulseLimit[a.idx]).toBeLessThan(1e-8);
   expect(report.armWork[a.idx]-report.armWorkLimit[a.idx]).toBeLessThan(1e-8);
   expect(report.supportMotorWork[a.idx]-report.supportMotorWorkLimit[a.idx]).toBeLessThan(1e-8);
  }
 });
});
