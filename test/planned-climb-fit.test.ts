import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import type {Intent} from '../src/physics/world.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import type {Perceived} from '../src/sim/perception.js';
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
  for(const [at,near] of [[1.4,false],[1.45,true]] as const){
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

 it('maintains acquired Mike load and the keeper until reachable runner contact with ordinary World limits',()=>{
  // With the inline Y on the line's base, this native climb engages a beat
  // earlier; the Mike works under the RT's hands and goes down while still
  // blocked, before the runner arrives, and never reaches him.
  const {sim,rt}=stage(1.45),y=sim.slot('Y')!,mike=sim.slot('LB_M')!,end=sim.slot('DE_S')!;
  expect(y.engagement?.defender).toBe(end);const keeperHands=y.engagement!.hands;
  let mikeDown=false,keeperLoaded=false,legitimateRelease=false;
  while(sim.phase==='live'&&sim.t<2.95){
   sim.tick();const report=sim.lastStep!;
   expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
   for(const actor of [rt,y,mike])expect(report.armImpulse[actor.idx]).toBeLessThanOrEqual(report.armImpulseLimit[actor.idx]+1e-8);
   if(y.engagement?.defender===end){
    expect(y.engagement.hands).toBe(keeperHands);expect(sim.world.joints).toContain(keeperHands);
    if(Math.hypot(keeperHands!.normalForce??0,keeperHands!.tangentForce??0)>0)keeperLoaded=true;
   }else if(!legitimateRelease){
    // TKL-5 no longer consumes a whiff/cooldown at the old, unreachable
    // blocked-arm distance at 2.70. At 2.75 the runner actually collides
    // with this end (0.588yd); releasing the keeper to wrap is legitimate.
    // Keep the loaded-block contract up to that physical opportunity.
    expect(keeperLoaded).toBe(true);expect(sim.firstContactX).not.toBeNull();
    expect(sim.bond?.tacklers).toContain(end);
    const hold=sim.bond!.holds!.get(end)!;
    expect(hold.origin).toBe('block');
    expect(Math.hypot(end.pos.x-sim.bond!.carrier.pos.x,end.pos.y-sim.bond!.carrier.pos.y))
     .toBeLessThanOrEqual(end.profile.reach*.4+sim.bond!.carrier.profile.radius);
    expect(sim.world.joints).not.toContain(keeperHands);legitimateRelease=true;
   }
   if(!mikeDown&&sim.events.some(e=>e.type==='fall'&&e.a===mike.idx)){
    mikeDown=true;
    expect(sim.events.some(e=>e.type==='carrier_contact')).toBe(false);
    expect(rt.engagement?.defender).toBe(mike);
    expect(sim.world.joints).toContain(rt.engagement!.hands);
   }
  }
  expect(mikeDown).toBe(true);
  expect(sim.events.some(e=>e.type==='carrier_contact'&&(e.a===mike.idx||e.b===mike.idx))).toBe(false);
  expect(keeperLoaded).toBe(true);expect(legitimateRelease).toBe(true);
 });
});
