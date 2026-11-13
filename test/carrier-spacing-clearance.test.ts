import {describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import * as Preview from '../src/physics/movement-preview.js';
import {newSupport} from '../src/physics/support.js';
import {World,type Intent} from '../src/physics/world.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import type {Agent} from '../src/sim/agent.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim} from '../src/sim/playsim.js';
import {spaceTeammates} from '../src/sim/spacing.js';

function scene(side:number,obstructed=false){
 const formation=FORMATION_BY_ID.ace_11;
 const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(11),'O','OFF',{strength:.55}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(12),'D','DEF',{strength:.55}),'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.counter,label:'counter'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'c3'},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:77});
 const a=sim.slot('RB')!,b=sim.slot('QB')!;
 a.behavior={kind:'carrier',update:()=>{throw Error('No decision reevaluation');}};
 a.body.pos={x:40,y:CENTER_Y};a.body.vel={x:3.24,y:side*1.24};a.body.facing=side*.37;
 a.body.support=newSupport();a.body.energy=.98;
 b.body.pos={x:41.12,y:CENTER_Y+side*(obstructed?.1:-.43)};b.body.vel={x:0,y:0};b.body.support=newSupport();
 const request:Intent={vel:{x:6.08,y:-side*.22},cutSkill:1.15};
 const peers=[b];
 const seen=new Map<Agent,Perceived>();
 const observe=(p:Agent)=>({pos:{...p.pos},vel:{...p.vel},stance:null,facing:p.facing,pose:'up' as const,age:.05});
 const refresh=()=>{for(const p of peers)seen.set(p,observe(p));};refresh();
 const run=(options:{constrained?:boolean;unknownAge?:boolean;now?:number}={})=>{
  if(options.unknownAge)for(const p of seen.values())delete p.age;
  const intents:Intent[]=[request,...peers.map(()=>({vel:{x:0,y:0},free:true}))];
  spaceTeammates([a,...peers],intents,(_a,p)=>seen.get(p)!,{now:options.now??2,constrained:options.constrained?new Set([a.body]):undefined});
  return intents[0];
 };
 return {sim,a,b,peers,request,seen,refresh,run};
}
function clearance(a:Agent,b:Agent,request:Intent):number{
 const samples=Preview.previewFreeMovement(a.body,request,2,12),touch=.9*(a.profile.radius+b.profile.radius);
 let px=a.pos.x-b.pos.x,py=a.pos.y-b.pos.y,least=Math.hypot(px,py)-touch;
 for(const sample of samples){
  const x=sample.pos.x-b.pos.x-b.vel.x*sample.t,y=sample.pos.y-b.pos.y-b.vel.y*sample.t,dx=x-px,dy=y-py;
  const along=Math.max(0,Math.min(1,-(px*dx+py*dy)/Math.max(1e-12,dx*dx+dy*dy)));
  least=Math.min(least,Math.hypot(px+along*dx,py+along*dy)-touch);px=x;py=y;
 }
 return least;
}
describe('free carrier spacing follows attainable clearance',()=>{
 it.each([-1,1])('retains a full request whose curved execution clears the acquired teammate, mirror %s',side=>{
  const s=scene(side),before=structuredClone(s.a.body),pictures=structuredClone([...s.seen.values()]);
  // Requested straight travel crosses QB; actual momentum clears him. The
  // claim is the swept physical preview, not distance to the requested ray.
  expect(clearance(s.a,s.b,s.request)).toBeGreaterThan(0);
  expect(s.run()).toEqual(s.request);
  expect(s.a.body).toEqual(before);expect([...s.seen.values()]).toEqual(pictures);
 });
 it.each([-1,1])('still yields when the attainable path hits a real obstruction, mirror %s',side=>{
  const s=scene(side,true);expect(clearance(s.a,s.b,s.request)).toBeLessThan(0);
  expect(s.run().vel).not.toEqual(s.request.vel);
 });
 it('retains necessary braking even when a straight closing path is clear inside the preview horizon',()=>{
  const s=scene(1);
  s.a.body.vel={x:s.a.profile.vmax*.95,y:0};s.a.body.facing=0;
  s.b.body.pos={x:s.a.pos.x+7,y:s.a.pos.y};s.request.vel={x:s.a.profile.vmax,y:0};s.refresh();
  // A clear prefix is not proof that the runner can postpone braking. This
  // opposing case has no curved pass: the QB remains ahead of the runner.
  expect(clearance(s.a,s.b,s.request)).toBeGreaterThan(0);
  expect(s.run().vel.x).toBeLessThan(s.request.vel.x);
  const world=new World([s.a.body,s.b.body]);world.time=2;
  for(let k=0;k<30;k++){
   s.refresh();const command=s.run({now:world.time});
   const report=world.step([command,{vel:{x:0,y:0}}],.05);
   expect(report.contacts).toHaveLength(0);
   expect(s.a.body.support!.state).toBe('up');
  }
 });
 it('checks every acquired teammate, not only the QB who restricted the straight request',()=>{
  const s=scene(1),other=s.sim.slot('LG')!;
  other.body.pos={x:42,y:CENTER_Y+.7};other.body.vel={x:0,y:0};s.peers.push(other);s.refresh();
  expect(clearance(s.a,s.b,s.request)).toBeGreaterThan(0);
  expect(clearance(s.a,other,s.request)).toBeLessThan(0);
  expect(s.run().vel).not.toEqual(s.request.vel);
 });
 it('retains the ordinary response for a constrained carrier or unknown observation age',()=>{
  for(const options of [{constrained:true},{unknownAge:true}]){
   const s=scene(1);expect(clearance(s.a,s.b,s.request)).toBeGreaterThan(0);
   expect(s.run(options).vel).not.toEqual(s.request.vel);
  }
 });
 it('does not extend the new preview path to another role or an unrestricted request',()=>{
  const other=scene(1);other.a.behavior={kind:'mesh',update:()=>{throw Error('No decision reevaluation');}};
  expect(other.run().vel).not.toEqual(other.request.vel);
  const clear=scene(1);clear.b.body.pos.x+=20;clear.refresh();
  const preview=vi.spyOn(Preview,'previewFreeMovement');
  try{expect(clear.run()).toEqual(clear.request);expect(preview).not.toHaveBeenCalled();}finally{preview.mockRestore();}
 });
 it('reuses one preview of the selected request and preserves every nonvelocity action field',()=>{
  const s=scene(1),preview=vi.spyOn(Preview,'previewFreeMovement');
  try{
   const next=s.run();expect(next).toEqual(s.request);
   expect(preview.mock.calls.filter(call=>call[1]===s.request)).toHaveLength(1);
  }finally{preview.mockRestore();}
 });
 it('uses acquired pictures rather than a teammate\'s private current motion',()=>{
  const s=scene(1),first=s.run();s.b.body.pos={x:40.1,y:CENTER_Y};s.b.body.vel={x:-5,y:0};
  expect(s.run()).toEqual(first);expect(first).toEqual(s.request);
 });
});
