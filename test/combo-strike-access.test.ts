import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import type {Body} from '../src/physics/kinematics.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
// Recorded on the installed line; OL_SPLITS and OL_STAGGER stage a different play.
// FRONT_ALIGN moves the front off its installed spots; this recorded scene is staged on them.
// FRONT_MENU moves the backers off theirs (def-alignment, PR #194).
// PAD_LEVERAGE and DL_ANCHOR change the contact forces this recorded scene is staged on.
// SNAP_REACT plans every start from the count; this recorded moment is staged on the installed get-off.
// ARM_PRESS puts a press through the hands at the bench max; this scene is staged on arm-force hands (KNOWN_PROBLEMS RUN-11, re-record by review 2).
vi.hoisted(() => { process.env.OL_SPLITS = '0'; process.env.OL_STAGGER = '0'; process.env.FRONT_ALIGN = '0'; process.env.FRONT_MENU = '0'; process.env.PAD_LEVERAGE = '0'; process.env.DL_ANCHOR = '0'; process.env.SNAP_REACT = '0'; process.env.LB_LANDMARK = '0'; process.env.ARM_PRESS = '0'; });

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
  // The down defender may be taken to the ground before runner arrival.
  // Require the real keeper joint until that defeat, not after a fallen
  // defender legitimately ends the rep. Never permit an upright escape.
  let defeated=false;
  while(sim.phase==='live'&&sim.t<2.65){
   sim.tick();
   defeated ||= sim.events.some(e=>e.type==='fall'&&e.a===down.idx);
   if(!defeated){
    expect(rt.engagement?.defender===down).toBe(true);expect(rt.engagement!.hands).toBe(hands);
    expect(sim.world.joints).toContain(hands);
    expect(Math.hypot(hands!.normalForce??0,hands!.tangentForce??0)).toBeGreaterThan(0);
   }
  }
  expect(rg.engagement?.defender===backer).toBe(true);
  expect(Math.hypot(rg.engagement!.hands!.normalForce??0,rg.engagement!.hands!.tangentForce??0)).toBeGreaterThan(0);
  expect(sim.events.some(e=>e.type==='carrier_contact')).toBe(false);
 });
});
