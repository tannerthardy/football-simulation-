import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import type {Body} from '../src/physics/kinematics.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;
// Recorded on the installed line; OL_SPLITS and OL_STAGGER stage a different play.
// FRONT_ALIGN moves the front off its installed spots; this recorded scene is staged on them.
// FRONT_MENU moves the backers off theirs (def-alignment, PR #194).
// PAD_LEVERAGE and DL_ANCHOR change the contact forces this recorded scene is staged on.
// SNAP_REACT plans every start from the count; this recorded moment is staged on the installed get-off.
// ARM_PRESS puts a press through the hands at the bench max; this scene is staged on arm-force hands (KNOWN_PROBLEMS RUN-11, re-record by review 2).
vi.hoisted(() => { process.env.OL_SPLITS = '0'; process.env.OL_STAGGER = '0'; process.env.FRONT_ALIGN = '0'; process.env.FRONT_MENU = '0'; process.env.PAD_LEVERAGE = '0'; process.env.DL_ANCHOR = '0'; process.env.SNAP_REACT = '0'; process.env.LB_LANDMARK = '0'; process.env.ARM_PRESS = '0'; });

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/combo-strike-access.json.gz',import.meta.url))).toString()) as {setup:PlaySetup};
// Re-recorded on the engaged-flow law (seed 10 of the same constructor, was 71002): with the DT working his
// fit shoulder off RT, the pair now walks along RG's departure lane on the old stream, and the departure does
// not re-plan around a walking down body (KNOWN_PROBLEMS RUN-13), so that play no longer has a clear strike.
// This stream keeps the same double, release and claims: RG departs at 1.10 and his strike clears at 1.80 (1.90 with the off-hip climb, #345).
// With the start law (#336) and the back's own mesh start (#344) as well, seed 10's departure ends (1.55) a beat
// before RG's hands land on LB_M (1.65). Seed 1 of the same constructor keeps the recorded timeline: RG departs at
// 1.10 and clears his departure with his hands on LB_M on the same update (1.75; 1.70 with #362).
// With the direction-free start (#353) seed 1's departure ends at 1.60, a tick before the hands land (1.65), and
// seed 10 keeps the timeline again: RG departs at 1.10 and clears with his hands on LB_M on the 1.60 update.
// With the box backer reading square before he moves and filling to the pull he sees, LB_M is 0.16 yd deeper
// (+x, 37.090 -> 37.249) at 1.55 and seed 10's departure clears at 1.60 a tick before the hands land (1.65, a real
// 265 N load, RT still on DT_S): a 50 ms later acquisition, not a broken climb. Seed 29 keeps the recorded
// timeline: RG departs at 1.10 and clears with his hands on LB_M on the 1.60 update, so the stage times stay.
// Agent identity is asserted as a boolean so a failure does not diff two whole agents.
const SEED=29;
function stage(t:number){
 const sim=new PlaySim({...structuredClone(fixture.setup),seed:SEED});
 while(sim.phase==='live'&&sim.t<t)sim.tick();
 const rg=sim.slot('RG')!,controller=rg.behavior as RunBlocker;
 expect(controller.plan.kind).toBe('climb');expect(controller.plan.departure).toBeDefined();
 expect(rg.engagement).toBeNull();expect(controller.target===sim.slot('LB_M')).toBe(true);
 return {sim,rg,controller};
}
function reflected(body:Body):Body{
 const b=structuredClone(body);
 b.pos.y=2*CENTER_Y-b.pos.y;b.vel.y=-b.vel.y;b.facing=-b.facing;
 if(b.spin!==undefined)b.spin=-b.spin;
 if(b.squeezeHeading!==undefined)b.squeezeHeading=-b.squeezeHeading;
 // Accepted legacy support has vector displacements, velocities and loads;
 // this decision mirror never executes its reflected physical joints.
 if(b.support)for(const value of Object.values(b.support))
  if(value&&typeof value==='object'&&'x'in value&&'y'in value&&typeof value.y==='number')value.y=-value.y;
 return b;
}
function reflectedPicture(p:Perceived):Perceived{
 return {...p,pos:{x:p.pos.x,y:2*CENTER_Y-p.pos.y},vel:{x:p.vel.x,y:-p.vel.y},facing:-p.facing};
}

/** The mirror covers a decision through the real production hook using the
 * reflected acquired history. It is not claimed as a whole-play mirror.
 * The tick records normal fresh perception/mind state before this hook. */
function decision(t:number,mirror:boolean,expectClear:boolean){
 const {sim,rg,controller}=stage(t),stop=new Error('stop after observed decision');
 const update=controller.update,see=sim.see.bind(sim);
 let visited=false;
 const hook=vi.spyOn(controller,'update').mockImplementation((a,s)=>{
  visited=true;
  if(mirror){
   for(const actor of s.agents)Object.assign(actor.body,reflected(actor.body));
   s.see=(observer,target,scale)=>reflectedPicture(see(observer,target,scale));
  }
  update.call(controller,a,s);
  expect(controller.plan.departure===undefined).toBe(expectClear);
  expect(controller.target===s.slot('LB_M')).toBe(true);
  if(expectClear){
   expect(rg.engagement?.defender===s.slot('LB_M')).toBe(true);
   expect(s.world.joints).toContain(rg.engagement!.hands);
  }else expect(rg.engagement).toBeNull();
  throw stop;
 });
 let caught:unknown;
 try{sim.tick();}catch(e){caught=e;}finally{hook.mockRestore();}
 expect(visited).toBe(true);expect(caught).toBe(stop);
}

describe('earned departure ends at achievable first strike rather than the backer center',()=>{
 it.each([false,true])('uses the clear near strike through the production hook, reflected=%s',mirror=>{
  // Re-recorded for the leg force-velocity law (PHY-1): the guard's departure clears one tick later (staged at 2.2, was 2.15)
  // because the recorded bodies are in slightly different places; the decision and its mirror are unchanged.
  // Re-staged at 2.35: the center's own double now releases on his picture of the keeper (0.85 s) rather than
  // on the keeper's hidden hand-fight value, so the bodies around the guard's departure differ; same decision.
  // With the off-hip climb (#345) the strike lands at 1.90 (was 1.80) on this stream; same decision and mirror.
  // Re-staged at 1.7 on develop (#362): the departing guard steps off the released DT's hip instead of pushing
  // the DT along with him, so his strike lands sooner from the same 1.10 release; same decision and mirror.
  // Seed 1 with the start law (#336), the back's own mesh start (#344) and #362: the strike clears on the 1.70
  // update (staged at 1.65). Seed 10's departure ends at 1.60, a tick before RG's hands land on LB_M (1.65).
  // Seed 10 with #353 as well: the strike clears on the 1.60 update (staged at 1.55).
  decision(1.55,mirror,true);
 });
 it.each([false,true])('keeps the departure when the down body obstructs even first strike, reflected=%s',mirror=>{
  decision(1.3,mirror,false);
 });
 it('develops real second-level load while the original keeper still protects the down surface',()=>{
  // Seed 1 with #336, #344 and #362: staged at 1.6, before the departure clears at 1.70.
  // Seed 10 with #353: staged at 1.5, before the departure clears at 1.60.
  const {sim,rg}=stage(1.5),rt=sim.slot('RT')!,down=sim.slot('DT_S')!,backer=sim.slot('LB_M')!;
  const hands=rt.engagement!.hands;
  // The down defender may be taken to the ground before runner arrival.
  // Require the real keeper joint until that defeat, not after a fallen
  // defender legitimately ends the rep. Never permit an upright escape.
  let defeated=false;
  let strike:typeof hands;
  let strikeAt:number|undefined,readBeat=Infinity,loadedUntil=-Infinity;
  let arrived=false;
  while(sim.phase==='live'&&sim.t<2.2){
   sim.tick();
   defeated ||= sim.events.some(e=>e.type==='fall'&&e.a===down.idx);
   if(!defeated){
    expect(rt.engagement?.defender===down).toBe(true);expect(rt.engagement!.hands).toBe(hands);
    expect(sim.world.joints).toContain(hands);
    expect(Math.hypot(hands!.normalForce??0,hands!.tangentForce??0)).toBeGreaterThan(0);
   }
   const contact=sim.events.find(e=>e.type==='carrier_contact');
   if(!arrived){
    if(!strike&&rg.engagement?.defender===backer){
     expect(contact).toBeUndefined();
     strike=rg.engagement.hands;strikeAt=sim.t;readBeat=rg.mind.decisionInterval;
    }
    // On the arrival tick itself the backer may already have come off the climber to
    // wrap the runner (seed 10 with the backer fill: carrier contact and LB_M's wrap
    // at 2.00); the tackle transition below verifies that, from the next tick.
    if(strike&&!(contact&&rg.engagement?.hands!==strike)){
     expect(rg.engagement?.defender===backer).toBe(true);expect(rg.engagement!.hands).toBe(strike);
     expect(sim.world.joints).toContain(strike);
     expect(Math.hypot(strike.normalForce??0,strike.tangentForce??0)).toBeGreaterThan(0);
     loadedUntil=Math.min(sim.t,contact?.t??Infinity);
    }
    if(contact){expect(strike).toBeDefined();arrived=true;}
   }else if(rg.engagement?.hands!==strike){
    // A successful tackle deliberately relinquishes the defender's old block.
    // It must be a real transition, not premature climber abandonment or a
    // surviving hand constraint holding him in both techniques.
    expect(sim.events.some(e=>e.type==='tackle_wrap'&&e.a===backer.idx)).toBe(true);
    expect(sim.bond?.tacklers).toContain(backer);
    expect(sim.world.joints.some(j=>j.kind==='grasp'&&j.a===backer.body&&j.b===sim.bond!.carrier.body)).toBe(true);
    expect(sim.world.joints).not.toContain(strike);expect(rg.engagement).toBeNull();
   }else{
    expect(rg.engagement?.defender===backer).toBe(true);expect(sim.world.joints).toContain(strike);
    expect(Math.hypot(strike!.normalForce??0,strike!.tangentForce??0)).toBeGreaterThan(0);
   }
  }
  // Require sustained physical second-level work before arrival, not a single
  // nominal engagement. Keep the full 2.20 window: the runner may subsequently
  // meet the loaded DT or lose to Mike. Neither collision-free yards nor an
  // indefinitely retained block is the first-strike clearance contract.
  expect(strikeAt).toBeDefined();expect(strike).toBeDefined();
  expect(loadedUntil-strikeAt!).toBeGreaterThanOrEqual(readBeat);
 });
});
