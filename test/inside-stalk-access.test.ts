import {describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {goTo,stand} from '../src/sim/behaviors/common.js';
import {PlaySim} from '../src/sim/playsim.js';

const offense=generateTeam(new Rng(31),'O','O',{strength:.55});
const defense=generateTeam(new Rng(32),'D','D',{strength:.55});
function stage(marked=true) {
 const formation=FORMATION_BY_ID.ace_11;
 const sim=new PlaySim({offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.oz_strong,label:'inside stalk'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:3});
 const a=sim.slot('H')!,d=sim.slot('LB_W')!;
 const installed={h:a.behavior as RunBlocker,x:sim.slot('X')!.behavior as RunBlocker};
 for(const p of sim.agents){p.body.pos={x:70+(p.idx%6)*3,y:3+Math.floor(p.idx/6)*3};p.body.vel={x:0,y:0};}
 a.body.pos={x:40,y:CENTER_Y};a.body.vel={x:0,y:0};a.body.facing=0;
 d.body.pos={x:41.2,y:CENTER_Y};d.body.vel={x:0,y:0};d.body.facing=Math.PI;
 const controller=new RunBlocker({kind:'stalk',target:d,drive:{x:1,y:0},insideStalk:marked?d:undefined});
 a.behavior=controller;sim.t=1;sim.world.time=1;
 for(let k=0;k<24;k++)sim.perception.record(sim.agents);
 return {sim,a,d,controller,installed};
}

describe('inside stalk responsibility and actual strike access',()=>{
 it('marks the installed inside job independently of the installed perimeter job',()=>{
  const {installed:{h,x}}=stage();
  expect(h.plan.insideStalk).toBe(h.target);
  expect(h.plan.insideStalk?.slot.startsWith('LB')).toBe(true);
  expect(h.plan.perimeterStalk).toBeUndefined();expect(x.plan.insideStalk).toBeUndefined();
  expect(x.plan.perimeterStalk).toBe(x.target);
 });

 it('closes a waiting backer without acquiring hands outside the existing range',()=>{
  const {sim,a,d,controller}=stage(),before=structuredClone(a.body),rng=JSON.stringify(sim.rng);
  const engage=vi.spyOn(sim,'engage'),request=controller.update(a,sim);
  expect(request.vel.x).toBeGreaterThan(0);expect(request.vel.y).toBe(0);
  expect(Math.hypot(request.vel.x,request.vel.y)).toBeLessThanOrEqual(a.profile.vmax*.85);
  expect(request.posture).toBeUndefined();expect(a.body).toEqual(before);
  expect(engage).not.toHaveBeenCalled();expect(JSON.stringify(sim.rng)).toBe(rng);
  let reached=false;
  // Controlled two-participant encounter inside the real all22 World. Other
  // bodies are separated; the backer stands. This is not a native play ending.
  for(let k=0;k<30&&!a.engagement;k++){
   const command=controller.update(a,sim);
   if(a.engagement){reached=true;break;}
   const commands=sim.agents.map(()=>stand());commands[a.idx]=command;
   sim.world.step(commands,.05);sim.t=Math.round((sim.t+.05)*100)/100;
   sim.perception.record(sim.agents);
  }
  expect(reached).toBe(true);expect(a.engagement?.defender).toBe(d);
  expect(Math.hypot(d.pos.x-a.pos.x,d.pos.y-a.pos.y)).toBeLessThan(a.profile.radius+d.profile.radius+.3);
  expect(sim.world.joints).toContain(a.engagement!.hands);
  engage.mockRestore();
 });

 it('does not inspect hidden foreign engagement ownership to abandon a named stalk',()=>{
  const {sim,a,d,controller}=stage();
  const old=Object.getOwnPropertyDescriptor(d,'engagement')!;
  const before=controller.update(a,sim),rng=JSON.stringify(sim.rng);
  Object.defineProperty(d,'engagement',{configurable:true,get(){throw new Error('unacquired engagement ownership');}});
  try{expect(controller.update(a,sim)).toEqual(before);expect(controller.target).toBe(d);
   expect(JSON.stringify(sim.rng)).toBe(rng);
  }finally{Object.defineProperty(d,'engagement',old);}
 });

 it('keeps the inside request invariant to hidden far motion and responds to delivered motion',()=>{
  const {sim,a,d,controller}=stage(),first=controller.update(a,sim),seen=sim.see(a,d);
  d.body.pos.y+=.4;sim.perception.record(sim.agents);
  const delayed=controller.update(a,sim);expect(delayed).toEqual(first);
  const spy=vi.spyOn(sim,'see').mockReturnValue({...seen,pos:{x:seen.pos.x,y:seen.pos.y+.4}});
  expect(controller.update(a,sim).vel.y).toBeGreaterThan(first.vel.y);spy.mockRestore();
 });

 it('does not transfer the installed inside objective to an unrelated retarget',()=>{
  const {sim,a,d,controller}=stage();controller.plan.insideStalk=sim.slot('LB_M')!;
  const seen=sim.see(a,d);
  expect(controller.update(a,sim)).toEqual(goTo(a,{x:Math.max(seen.pos.x-1.2,a.pos.x),y:seen.pos.y},{speed:.85,through:1}));
 });
});
