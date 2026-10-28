import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import type {Intent} from '../src/physics/world.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import type {Perceived} from '../src/sim/perception.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;
// Recorded on the installed line; OL_SPLITS and OL_STAGGER stage a different play.
// FRONT_ALIGN moves the front off its installed spots; this recorded scene is staged on them.
// PAD_LEVERAGE and DL_ANCHOR change the contact forces this recorded scene is staged on.
// SNAP_REACT plans every start from the count; this recorded moment is staged on the installed get-off.
// ARM_PRESS puts a press through the hands at the bench max; this scene is staged on arm-force hands (KNOWN_PROBLEMS RUN-11, re-record by review 2).
// RUN_FEEL: the blocker mirrors the defender's acquired motion; this scene is staged on true-velocity mirroring (KNOWN_PROBLEMS RUN-11, re-record by review 2).
vi.hoisted(() => { process.env.OL_SPLITS = '0'; process.env.OL_STAGGER = '0'; process.env.FRONT_ALIGN = '0'; process.env.PAD_LEVERAGE = '0'; process.env.DL_ANCHOR = '0'; process.env.SNAP_REACT = '0'; process.env.LB_LANDMARK = '0'; process.env.BLOCKED_REACH = '0'; process.env.ARM_PRESS = '0'; process.env.PASS_FIRST = '0'; process.env.RUN_FEEL = '0'; process.env.EDGE_CONTAIN = '0'; process.env.SEAL_HOLD = '0'; });
// SEAL_HOLD keeps a loaded run blocker's caught leverage; this scene is staged on the unbounded seal correction (re-record by review 2).
// EDGE_CONTAIN bounds a blocked edge's widening to what containing the back needs; this scene is staged on unbounded widening (re-record by review 2).
// BLOCKED_REACH lets the blocked Mike give up the block to grab a runner on his free side; this scene checks the block held through the runner's arrival.
// PASS_FIRST keeps the cover-4 corners on their receivers; the back reads that secondary and bends into the keeper's end, a different run than the one recorded.

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/planned-climb-fit.json.gz',import.meta.url))).toString()) as {setup:PlaySetup};
function stage(t:number){
 const sim=new PlaySim(structuredClone(fixture.setup));
 while(sim.phase==='live'&&sim.t<t)sim.tick();
 const rt=sim.slot('RT')!,controller=rt.behavior as RunBlocker;
 expect(controller.plan.kind).toBe('climb');expect(controller.target).toBe(sim.slot('LB_M'));
 expect(controller.plan.departure).toBeUndefined();expect(rt.engagement).toBeNull();
 return {sim,rt,controller};
}
function mirror(p:Perceived):Perceived{
 return {...p,pos:{x:p.pos.x,y:2*CENTER_Y-p.pos.y},vel:{x:p.vel.x,y:-p.vel.y},facing:-p.facing};
}

describe('planned climb acquires a useful near strike without running through the backer',()=>{
 it.each([false,true])('keeps the far forecast and gathers the near strike through the real hook, reflected=%s',reflect=>{
  // Only the decision is mirrored, using a reflected acquired history. The
  // native all22 continuation below owns physical-execution evidence.
  // The inline Y keeps the line's base on the double, so this native climb
  // reaches its near strike a beat earlier than on the original recording.
  // Feedback-consistent departure now reaches this fit earlier. Both
  // snapshots remain between reads; they exercise the same far/near contract.
  // Re-staged for the start law (#336) with develop 84af7d9e merged: the released RT now clears DE_S and
  // gathers one tick earlier (near strike at 1.25, far forecast still at 1.20); same far/near contract.
  for(const [at,near] of [[1.2,false],[1.25,true]] as const){
   const {sim,rt,controller}=stage(at),update=controller.update,see=sim.see.bind(sim),stop=new Error('observed decision');
   const planner=vi.spyOn(controller as unknown as {plannedClimb:(...args:unknown[])=>Intent},'plannedClimb');
   const hook=vi.spyOn(controller,'update').mockImplementation((a,s)=>{
    if(reflect){
     for(const actor of s.agents){actor.body.pos.y=2*CENTER_Y-actor.pos.y;actor.body.vel.y=-actor.vel.y;actor.body.facing=-actor.facing;
      if(actor.body.spin!==undefined)actor.body.spin=-actor.body.spin;
      if(actor.body.support)for(const value of Object.values(actor.body.support))
       if(value&&typeof value==='object'&&'x'in value&&'y'in value&&typeof value.y==='number')value.y=-value.y;
     }
     s.see=(observer,target,scale)=>mirror(see(observer,target,scale));
     const held=Reflect.get(controller,'climbRead');held.meet.y=2*CENTER_Y-held.meet.y;held.seenVel.y=-held.seenVel.y;
    }
    const before=structuredClone(a.body),rng=JSON.stringify(s.rng),held=Reflect.get(controller,'climbRead');
    const command=update.call(controller,a,s),forecast=planner.mock.results.at(-1)!.value as Intent;
    expect(planner).toHaveBeenCalledTimes(1);expect(Reflect.get(controller,'climbRead')).toBe(held);
    expect(a.body).toEqual(before);expect(JSON.stringify(s.rng)).toBe(rng);
    expect(a.engagement).toBeNull();expect(controller.target).toBe(s.slot('LB_M'));
    if(near){
     expect(command.posture).toBe(.7);expect(command.vel.x).toBeLessThan(forecast.vel.x);
     expect(command.vel.y*(reflect?-1:1)).toBeGreaterThan(0);
    }else expect(command).toEqual(forecast);
    throw stop;
   });
   let caught:unknown;try{sim.tick();}catch(e){caught=e;}finally{hook.mockRestore();planner.mockRestore();}
   expect(caught).toBe(stop);
  }
 });

 it('maintains acquired Mike load and the keeper through runner arrival with ordinary World limits',()=>{
  // The blocker must actually occupy Mike before arrival. Mike may remain
  // upright; a fall is not a blocking contract. The end can still win on the
  // runner's exposed side while Y carries load, so inspect through arrival,
  // rather than requiring a joint after that tackle drops the end.
  // Re-staged for the direction-free start (#353): RT's departure now clears on the 1.30 tick (was 1.05), so the
  // post-departure climb is staged at 1.35 (was 1.30); same Mike load, keeper and arrival.
  const {sim,rt}=stage(1.35),y=sim.slot('Y')!,mike=sim.slot('LB_M')!,end=sim.slot('DE_S')!;
  expect(y.engagement?.defender===end).toBe(true);const keeperHands=y.engagement!.hands;
  let loaded=false,arrived=false;
  while(sim.phase==='live'&&sim.t<2.95){
   // Validate the loaded joint entering the consumed interval. A successful
   // tackle may detach it after World executes that same interval.
   // The keeper owes the end until the runner is past him (with the off-hip
   // climb and the back's own mesh start, Y lets him go at 2.80 with the
   // runner already 1+ yd beyond the end).
   const runner=sim.carrier;
   if(!runner||runner===sim.qb||(runner.pos.x-end.pos.x)*sim.attackDir('O')<=1){
    expect(y.engagement?.defender===end).toBe(true);expect(y.engagement!.hands).toBe(keeperHands);
    expect(sim.world.joints).toContain(keeperHands);
    expect(Math.hypot(keeperHands!.normalForce??0,keeperHands!.tangentForce??0)).toBeGreaterThan(0);
   }
   sim.tick();const report=sim.lastStep!;
   expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
   for(const actor of [rt,y,mike])expect(report.armImpulse[actor.idx]).toBeLessThanOrEqual(report.armImpulseLimit[actor.idx]+1e-8);
   if(rt.engagement?.defender===mike && Math.hypot(rt.engagement.hands!.normalForce??0,
     rt.engagement.hands!.tangentForce??0)>1){
    loaded=true;
    expect(sim.world.joints).toContain(rt.engagement!.hands);
   }
   const first=sim.events.find(e=>e.type==='carrier_contact');
   if(first){arrived=true;break;}
  }
  // Re-recorded when the back began leaving the mesh on his own start: the
  // handoff moves 1.45 -> 1.40, Y keeps the end through 2.95 and nobody touches
  // the runner in this window (first contact 3.15, a corner). The end's win on
  // the exposed side was incidental to the recorded play. Mike must still be
  // loaded before arrival and must not be the man who meets the runner.
  // Re-recorded for the engaged-flow law: the end now works with Y instead of
  // beating him on the runner's exposed side, so nobody touches the runner in
  // this window (first contact 3.25, a corner). That ending was incidental to
  // the recorded play. Mike must still be loaded before arrival and must not
  // be the man who meets the runner.
  expect(loaded).toBe(true);
  if(!arrived)while(sim.phase==='live'&&sim.t<5&&!sim.events.some(e=>e.type==='carrier_contact'))sim.tick();
  expect(sim.events.some(e=>e.type==='carrier_contact')).toBe(true);
  expect(sim.events.some(e=>e.type==='carrier_contact'&&(e.a===mike.idx||e.b===mike.idx))).toBe(false);
 });
});
