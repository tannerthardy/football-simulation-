import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
// Recorded on the installed flat line (1.3 yd splits, 0.55 yd depth): its
// saved geometry, landmarks and plans are that line's. The tracked line
// (OL_ALIGN, docs/reviews/presnap.md) moves every body; pin it off here.
vi.hoisted(() => { process.env.OL_ALIGN = '0'; });
// These witnesses predate the under-center exchange package (UC_MESH
// MESH_TEMPO QB_CARRYOUT PACE_LEAD) and are timed on the installed exchange;
// pin it off here. test/run-game-flags.test.ts covers the package itself.
vi.hoisted(() => { for (const k of ['UC_MESH', 'MESH_TEMPO', 'QB_CARRYOUT', 'PACE_LEAD']) process.env[k] = '0'; });
// Recorded under the default gait, pull and gun-exchange laws. GAIT_STEP,
// PULL_STEP and MESH_POINT (on in the pinned profile) change its timing or
// first command; pin them off here. test/gait-step.test.ts and
// test/pull-step.test.ts cover those laws.
vi.hoisted(() => { for (const k of ['GAIT_STEP', 'PULL_STEP', 'MESH_POINT']) process.env[k] = '0'; });
// Recorded before the gap-scheme first-level blocks (GAP_FIT GAP_OUT
// CUTOFF_SEAL, on in the pinned profile), which change when and where the
// line meets its men; pin them off here. test/gap-blocks.test.ts covers them.
vi.hoisted(() => { for (const k of ['GAP_FIT', 'GAP_OUT', 'CUTOFF_SEAL']) process.env[k] = '0'; });
// Recorded before SNAP_REACT (on in the pinned profile) changed every
// player's start; the trace stays on the fixed get-off.
vi.hoisted(() => { process.env.SNAP_REACT = '0'; });
import {CENTER_Y} from '../src/core/field.js';
import type {Body} from '../src/physics/kinematics.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
// PAD_LEVERAGE and DL_ANCHOR change the contact forces this recorded scene is staged on.
vi.hoisted(() => { process.env.PAD_LEVERAGE = '0'; process.env.DL_ANCHOR = '0'; });

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/combo-strike-access.json.gz',import.meta.url))).toString()) as {setup:PlaySetup};
function stage(t:number){
 const sim=new PlaySim(structuredClone(fixture.setup));
 while(sim.phase==='live'&&sim.t<t)sim.tick();
 const rg=sim.slot('RG')!,controller=rg.behavior as RunBlocker;
 expect(controller.plan.kind).toBe('climb');expect(controller.plan.departure).toBeDefined();
 expect(rg.engagement).toBeNull();expect(controller.target).toBe(sim.slot('LB_M'));
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
  expect(controller.target).toBe(s.slot('LB_M'));
  if(expectClear){
   expect(rg.engagement?.defender).toBe(s.slot('LB_M'));
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
  decision(2.3,mirror,true);
 });
 it.each([false,true])('keeps the departure when the down body obstructs even first strike, reflected=%s',mirror=>{
  decision(1.3,mirror,false);
 });
 it('develops real second-level load while the original keeper still protects the down surface',()=>{
  const {sim,rg}=stage(2.3),rt=sim.slot('RT')!,down=sim.slot('DT_S')!,backer=sim.slot('LB_M')!;
  const hands=rt.engagement!.hands;
  while(sim.phase==='live'&&sim.t<2.65)sim.tick();
  expect(rg.engagement?.defender).toBe(backer);
  expect(Math.hypot(rg.engagement!.hands!.normalForce??0,rg.engagement!.hands!.tangentForce??0)).toBeGreaterThan(0);
  expect(rt.engagement?.defender).toBe(down);expect(rt.engagement!.hands).toBe(hands);
  expect(sim.world.joints).toContain(hands);
  expect(Math.hypot(hands!.normalForce??0,hands!.tangentForce??0)).toBeGreaterThan(0);
  expect(sim.events.some(e=>e.type==='carrier_contact')).toBe(false);
 });
});
