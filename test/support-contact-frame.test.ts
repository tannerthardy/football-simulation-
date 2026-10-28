import {describe,expect,it} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {norm} from '../src/core/vec.js';
import type {Perceived} from '../src/sim/perception.js';
import {traits} from '../src/sim/engagement.js';
import {contactFixture,contactCommands} from '../scripts/diag/run-contact-technique.js';

/** Synthetic frontal contact with a diagonal old drive, not a native snap.
 * H is personally acquired behind the blocker; the block has not been won. */
function scene(side=1,loaded=true){
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,seed:11});
 const {sim,blocker,defender,engagement}=f;
 sim.t=1.5;engagement.nextMoveAt=0;defender.recog!.read='pass';
 defender.runFit={gap:'D',side,kind:'alley',edge:'box',technique:'attack',pace:'stack'};
 defender.body.pos={x:48,y:CENTER_Y};defender.body.vel={x:0,y:0};defender.body.facing=Math.PI;
 blocker.body.pos={x:47.25,y:CENTER_Y};blocker.body.vel={x:0,y:0};blocker.body.facing=0;
 engagement.drive=norm({x:1,y:side});
 engagement.hands!.normalForce=loaded?60:0;engagement.hands!.tangentForce=0;
 let runner:Perceived={pos:{x:43,y:CENTER_Y-side*6},vel:{x:3,y:0},facing:0,
  stance:null,pose:'up',carrying:true,age:.25};
 let picture:Perceived={pos:{...blocker.pos},vel:{x:0,y:0},facing:0,
  stance:'low',pose:'up',carrying:false,age:.25};
 const see=sim.see.bind(sim);
 sim.see=(a,b,s=1)=>a===defender&&b===sim.slot('H')?structuredClone(runner)
  :a===defender&&b===blocker?structuredClone(picture)
   :a===defender&&b.team==='O'?{...see(a,b,s),carrying:false}:see(a,b,s);
 return {...f,command:()=>contactCommands(f)[defender.idx],commands:()=>contactCommands(f),
  setPicture:(delta:Partial<Perceived>)=>{picture={...picture,...delta};},
  setRunner:(delta:Partial<Perceived>)=>{runner={...runner,...delta};}};
}

describe('support work-off crosses its acquired contact face',()=>{
 it.each([-1,1])('works toward the ball-side shoulder at the same budget, side %s',side=>{
  const f=scene(side),before=structuredClone([f.blocker.body,f.defender.body]);
  const request=f.command(),lateral=traits(f.defender,'run').lateral;
  expect(request.vel.x).toBeCloseTo(-.6,12);
  expect(request.vel.y).toBeCloseTo(-side*lateral,12);
  expect(Math.hypot(request.vel.x,request.vel.y)).toBeCloseTo(Math.hypot(lateral,.6),12);
  expect([f.blocker.body,f.defender.body]).toEqual(before);
  expect(f.defender.engagement).toBe(f.engagement);
  expect(f.sim.events.some(e=>e.type==='shed')).toBe(false);
 });

 it('does not use private offensive drive or seal metadata for the support escape frame',()=>{
  const a=scene(),b=scene();
  b.engagement.drive=norm({x:1,y:-1});b.engagement.surfaceAxis={x:0,y:1};b.engagement.sealTarget=.4;
  expect(b.command().vel).toEqual(a.command().vel);
 });

 it('uses acquired position rather than hidden relocation when no hand load exists',()=>{
  const a=scene(1,false),b=scene(1,false);
  a.setPicture({age:.5});b.setPicture({age:.5});
  b.blocker.body.pos={x:47.25,y:CENTER_Y+1};
  expect(b.command().vel).toEqual(a.command().vel);
 });

 it('responds to a changed acquired face without changing the body or drive',()=>{
  const a=scene(1,false),b=scene(1,false);
  b.setPicture({pos:{x:47.25,y:CENTER_Y+.4}});
  expect(b.command().vel).not.toEqual(a.command().vel);
  expect(b.blocker.body.pos).toEqual(a.blocker.body.pos);
 });

 it('uses transmitted touch to update the local face despite a stale picture',()=>{
  const a=scene(1,false),b=scene(1,true);
  for(const f of[a,b])f.blocker.body.pos={x:47.25,y:CENTER_Y+.4};
  expect(b.command().vel).not.toEqual(a.command().vel);
 });

 it('holds the chosen shoulder until the ordinary attempt is renewed',()=>{
  const f=scene(),first=f.command(),until=f.engagement.nextMoveAt;
  f.setRunner({pos:{x:43,y:CENTER_Y+6}});
  f.sim.t+=f.defender.mind.decisionInterval+.01;
  expect(f.sim.t).toBeLessThan(until);
  expect(f.command().vel).toEqual(first.vel);
  expect(f.engagement.nextMoveAt).toBe(until);
  f.sim.t=until+.01;
  expect(f.command().vel.y).toBeGreaterThan(0);
 });

 it('preserves the existing force shoulder before an advanced acquired runner',()=>{
  const f=scene();f.defender.recog!.read='run';f.defender.runFit!.kind='force';
  f.setRunner({pos:{x:39,y:CENTER_Y-6}});f.command();
  expect(f.defender.tags.has('shed-attempt')).toBe(false);
 });

 it('keeps real frontal resistance and physical budgets rather than awarding separation',()=>{
  const f=scene(),commands=f.commands(),report=f.sim.world.step(commands,f.sim.dt);
  expect(f.defender.engagement).toBe(f.engagement);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for(const a of[f.blocker,f.defender]){
   expect(report.armImpulse[a.idx]-report.armImpulseLimit[a.idx]).toBeLessThan(1e-8);
   expect(report.armWork[a.idx]-report.armWorkLimit[a.idx]).toBeLessThan(1e-8);
   expect(report.supportMotorWork[a.idx]-report.supportMotorWorkLimit[a.idx]).toBeLessThan(1e-8);
  }
 });
});
