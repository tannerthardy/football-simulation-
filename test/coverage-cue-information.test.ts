import {describe,expect,it} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {ZoneCoverage} from '../src/sim/behaviors/defense.js';
import type {Agent} from '../src/sim/agent.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim} from '../src/sim/playsim.js';
const offense=generateTeam(new Rng(71),'O','O',{strength:.6}),defense=generateTeam(new Rng(91),'D','D',{strength:.6});
function scene(zone:'deep_mid'|'deep_half_s'|'quarter_s_in'|'hook_mid'='hook_mid',style:'match'|'spot'='match'){
 const sim=new PlaySim({offense:pickOffense(offense,'11'),defense:pickDefense(defense,'nickel'),seed:3,
  offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:''},
  defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover4,pressure:null,zoneStyle:style,label:''},
  los:40,ballY:CENTER_Y,firstDownX:50,audibles:false}),a=sim.slot(zone==='hook_mid'?'LB_M':'FS')!,pictures=new Map<Agent,Perceived>();
 for(const r of sim.agents)pictures.set(r,{pos:{x:35,y:1},vel:{x:0,y:0},facing:0,stance:null,pose:'up',age:.2,carrying:false});
 a.body.pos={x:55,y:CENTER_Y};a.body.vel={x:0,y:0};a.body.facing=Math.PI;a.recog!.read='pass';
 sim.qb.body.pos={x:35,y:CENTER_Y};pictures.set(sim.qb,{...pictures.get(sim.qb)!,pos:{x:35,y:CENTER_Y}});sim.t=1;
 sim.see=(_a,r)=>structuredClone(pictures.get(r)!);
 const make=()=>new ZoneCoverage(a,sim,zone,'B',1,style),landmark=make().recordedLandmark(),
  set=(r:Agent,x:number,y:number,vx=0)=>pictures.set(r,{...pictures.get(r)!,pos:{x,y},vel:{x:vx,y:0}}),
  run=()=>{const b=make(),command=b.update(a,sim);return {command,target:b.target?.idx??null};};
 return {sim,a,pictures,make,landmark,set,run,left:sim.slot('X')!,right:sim.slot('H')!};
}
describe('zone coverage uses observed routes without private QB read identity',()=>{
 it.each([['deep_mid','match'],['hook_mid','match'],['hook_mid','spot']] as const)(
  'retains %s %s decisions when private read and unseen receiver bodies change',(zone,style)=>{
   const f=scene(zone,style);if(style==='spot')f.a.body.pos={...f.landmark};
   f.set(f.left,48,CENTER_Y-3,zone==='deep_mid'?6:0);f.set(f.right,48,CENTER_Y+3,zone==='deep_mid'?6:0);
   f.sim.qbEyes=f.left;const first=f.run(),body=structuredClone(f.a.body),profile={...f.a.profile};
   f.sim.qbEyes=f.right;f.left.body.pos={x:95,y:4};f.right.body.pos={x:20,y:49};
   expect(f.run()).toEqual(first);f.sim.qbEyes=null;expect(f.run()).toEqual(first);
   expect(f.a.body).toEqual(body);expect(f.a.profile).toEqual(profile);
  });
 it.each([['deep_half_s','match'],['hook_mid','spot']] as const)(
  'holds the %s %s landmark without an observed threat',(zone,style)=>{
   const f=scene(zone,style);f.a.body.pos={...f.landmark};f.sim.qbEyes=f.left;
   expect(f.run().command.vel).toEqual({x:0,y:0});
  });
 it('splits equally advancing verticals while their private read remains unknown',()=>{
  const f=scene('deep_mid');f.set(f.left,48,CENTER_Y-3,6);f.set(f.right,48,CENTER_Y+3,6);
  f.sim.qbEyes=f.left;expect(f.run().command.vel.y).toBeCloseTo(0,10);
 });
 it('keeps the installed quarters #2 vertical ahead of another private read',()=>{
  const f=scene('quarter_s_in'),one=f.sim.slot(f.sim.offAlign.numbering.S1!)!,two=f.sim.slot(f.sim.offAlign.numbering.S2!)!;
  f.set(one,49,CENTER_Y+f.sim.offAlign.strongSign*10,6);f.set(two,48,CENTER_Y+f.sim.offAlign.strongSign*4,6);
  f.sim.qbEyes=one;expect(f.run().target).toBe(two.idx);
 });
 it('squeezes a newly observed spot lane, revising when the receiver picture changes',()=>{
  const f=scene('hook_mid','spot');f.a.body.pos={...f.landmark};const body=structuredClone(f.a.body),rng={...f.sim.rng};
  f.set(f.left,48,CENTER_Y-3);const left=f.run();f.set(f.left,48,CENTER_Y+3);const right=f.run();
  expect(left.command.vel.y).toBeLessThan(0);expect(right.command.vel.y).toBeGreaterThan(0);
  expect(f.a.body).toEqual(body);expect({...f.sim.rng}).toEqual(rng);
  expect(Math.hypot(right.command.vel.x,right.command.vel.y)).toBeLessThanOrEqual(f.a.profile.vmax);
 });
 it('preserves a single ordinary match threat without a privileged read',()=>{
  const f=scene();f.set(f.left,48,CENTER_Y-3);f.sim.qbEyes=null;expect(f.run().target).toBe(f.left.idx);
 });
});
