import {Rng} from '../src/core/rng.js';import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';import {PlaySim} from '../src/sim/playsim.js';import {RunBlocker} from '../src/sim/behaviors/blocking.js';import {RUN_BY_ID} from '../src/playbook/concepts.js';import {FORMATION_BY_ID} from '../src/playbook/formations.js';import {FRONT_BY_ID,COVERAGE_BY_ID} from '../src/playbook/defense.js';import {CENTER_Y} from '../src/core/field.js';import {goTo,stand} from '../src/sim/behaviors/common.js';

import {describe,it,expect,vi} from 'vitest';
import * as preview from '../src/physics/movement-preview.js';
import {assessClimbAccess} from '../src/sim/climb-access.js';
function stage(side=1){
const off=generateTeam(new Rng(31),'O','O',{strength:.55}),def=generateTeam(new Rng(32),'D','D',{strength:.55}),formation=FORMATION_BY_ID.ace_11;
const sim:any=new PlaySim({offense:pickOffense(off,formation.personnel),defense:pickDefense(def,'base43'),offCall:{formation,flip:side>0,kind:'run',run:RUN_BY_ID.oz_strong,label:'constructed released C'},defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},los:40,ballY:CENTER_Y,firstDownX:50,seed:3,record:true,recordLevel:'full'});
for(const a of sim.agents){a.body.pos={x:70+(a.idx%5)*3,y:3+Math.floor(a.idx/5)*3};a.body.vel={x:0,y:0};a.behavior={kind:'idle',update:()=>stand(a.facing)};}
sim.t=1;sim.world.time=1;const c=sim.slot('C'),g=sim.slot('RG'),d=sim.slot('DT_S'),b=sim.slot('LB_M'),rb=sim.slot('RB');
c.body.pos={x:40,y:CENTER_Y+side*.85};g.body.pos={x:40,y:CENTER_Y-side*.5};d.body.pos={x:40.7,y:CENTER_Y};b.body.pos={x:43,y:CENTER_Y-side};rb.body.pos={x:36,y:CENTER_Y+side*1.2};
c.body.facing=g.body.facing=0;d.body.facing=b.body.facing=Math.PI;
g.behavior=new RunBlocker({kind:'drive',target:d,drive:{x:1,y:0}});c.behavior=new RunBlocker({kind:'climb',target:b,drive:{x:1,y:0}});
d.behavior={kind:'idle',update:()=>stand(Math.PI)};b.behavior={kind:'idle',update:()=>goTo(b,{x:38,y:CENTER_Y+side*1.2},{speed:.5})};rb.behavior={kind:'idle',update:()=>goTo(rb,{x:48,y:CENTER_Y+side*1.2},{speed:.65})};sim.ball={kind:'held',carrier:rb};
for(let i=0;i<24;i++)sim.perception.record(sim.agents,rb.idx);const e=sim.engage(g,d,'run',{x:1,y:0});if(!e)throw new Error('no keeper contact');
const seen=sim.see(c,b);c.behavior.startDeparture(c,sim,d,g,b,{exit:{x:40.35,y:CENTER_Y+side*.97},flow:{x:0,y:0},backer:seen});
return {sim,c,g,d,b,rb};
}

describe('released combination access prototype',()=>{
 it.each([-1,1])('retains a real first-level defensive win in an unsafe post-release state, side %s',side=>{
  // This state did not earn release: real keeper hands alone do not prove
  // first-level protection. The earlier prototype's backer-load-only proxy
  // mislabeled it as a positive. Preserve it as the costly opposing case.
  // Under SEAL_HOLD the keeper holds the down man on his caught leverage, so
  // the climber's exit is no longer obstructed (his access reads direct and
  // he reaches the backer), but the down man still beats the keeper to the
  // runner. The unvalidated label itself is covered by the next test.
  const {sim,c,g,d,b}=stage(side);const access=new Set<string>();
  while(sim.phase==='live'&&sim.t<4){
   sim.tick();const report=sim.lastStep;
   expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
   for(const a of [c,g,d,b])expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx]+1e-8);
   const kind=(c.behavior as any).departureAccess?.kind;if(kind)access.add(kind);
  }
  expect(access.size).toBeGreaterThan(0);
  const first=sim.events.find((e:any)=>e.type==='carrier_contact');
  expect(first?.b).toBe(d.idx);
 });
 it('distinguishes an unobstructed request from an unvalidated momentum-constrained exit',()=>{
  const {sim,c,d,b}=stage();c.body.vel={x:4,y:0};
  const backer=sim.see(c,b), original={vel:{x:c.profile.vmax,y:0},facing:0};
  const seen={...sim.see(c,d),pos:{x:c.pos.x+.7,y:c.pos.y},vel:{x:0,y:0}};
  const before=structuredClone(c.body),rng=JSON.stringify(sim.rng);
  const blocked=assessClimbAccess(c,backer,[{key:d.idx,radius:d.profile.radius,seen}],original,sim.t,c.mind.decisionInterval,sim.world.handContact,true);
  expect(blocked.kind).toBe('unvalidated');
  const clear=assessClimbAccess(c,backer,[],original,sim.t,c.mind.decisionInterval,sim.world.handContact,true);
  expect(clear.kind).toBe('direct');
  expect(c.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
 });
 it('records why each route was rejected without changing the result',()=>{
  const {sim,c,d,b}=stage();c.body.vel={x:4,y:0};
  const backer=sim.see(c,b), original={vel:{x:c.profile.vmax,y:0},facing:0};
  const surfaces=[{key:d.idx,radius:d.profile.radius,seen:{...sim.see(c,d),pos:{x:c.pos.x+.7,y:c.pos.y},vel:{x:0,y:0}}}];
  const rng=JSON.stringify(sim.rng),records:any[]=[];
  const plain=assessClimbAccess(c,backer,surfaces,original,sim.t,c.mind.decisionInterval,sim.world.handContact,true);
  const logged=assessClimbAccess(c,backer,surfaces,original,sim.t,c.mind.decisionInterval,sim.world.handContact,true,original,null,r=>records.push(r));
  expect(logged).toEqual(plain);expect(JSON.stringify(sim.rng)).toBe(rng);
  expect(records).toHaveLength(1);const r=records[0];
  expect(r.result).toBe('unvalidated');expect(r.obstacle).toBe(d.idx);
  expect(r.candidates.length).toBeGreaterThan(0);
  for(const k of r.candidates){expect(k.rejected).not.toBeNull();if(k.rejected==='clearance')expect(k.failed).toEqual([d.idx]);}
  expect(r.fallback.chose).toBe(plain.kind==='unvalidated'&&plain.command===original?'original':'braking');
 });
 it('holds the chosen responsibility and access read without previewing on every tick',()=>{
  const {sim,c,b}=stage(),ctrl=c.behavior as any;
  const calls=vi.spyOn(preview,'previewFreeMovement');
  const before=structuredClone(c.body),rng=JSON.stringify(sim.rng);
  ctrl.update(c,sim);const held=ctrl.climbRead,count=calls.mock.calls.length;
  const again=ctrl.update(c,sim);
  expect(ctrl.climbRead).toBe(held);expect(calls.mock.calls.length).toBe(count);
  expect(count).toBeGreaterThan(0);expect(ctrl.target).toBe(b);
  expect(again.vel).toBeDefined();expect(c.body).toEqual(before);
  expect(JSON.stringify(sim.rng)).toBe(rng);calls.mockRestore();
 });
 it('uses acquired moving surfaces in the released production approach, not their hidden live state',()=>{
  const decision=(hidden:boolean)=>{
   const {sim,c,d,b}=stage(),ctrl=c.behavior as RunBlocker;
   const pictures=new Map(sim.agents.map((a:any)=>[a,structuredClone(sim.see(c,a))]));
   if(hidden){
    d.body.pos={x:d.pos.x+10,y:d.pos.y-12};d.body.vel={x:-7,y:4};
    d.body.support.state='down';d.engagement=null;
   }
   const see=vi.spyOn(sim,'see').mockImplementation((a,b)=>{
    expect(a===c).toBe(true);return structuredClone(pictures.get(b)) as ReturnType<PlaySim['see']>;
   });
   const before=structuredClone(c.body),rng=JSON.stringify(sim.rng);
   const command=ctrl.update(c,sim),access=structuredClone(Reflect.get(ctrl,'departureAccess'));
   expect(c.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
   expect(ctrl.target===b).toBe(true);
   expect(see.mock.calls.some(([,target])=>target===d)).toBe(true);see.mockRestore();
   return {command,access};
  };
  expect(decision(true)).toEqual(decision(false));
 });
 it('retires departure access when an intervening job does not consume the old plan',()=>{
  const {sim,c,d}=stage(),ctrl=c.behavior as any;
  ctrl.update(c,sim);expect(ctrl.climbRead).not.toBeNull();
  ctrl.plan.kind='stalk';ctrl.plan.target=d;
  ctrl.update(c,sim);
  expect(ctrl.plan.departure).toBeUndefined();expect(ctrl.climbRead).toBeNull();
  expect(ctrl.climbAccess).toBeNull();expect(ctrl.departureAccess).toBeNull();
 });

});
