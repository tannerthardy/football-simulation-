import {describe,expect,it} from 'vitest';
import {nativeTraceSetup} from '../scripts/diag/command-trace.js';
import {PlaySim} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';

describe('kick fit against an end who sets',()=>{
 it('loads the original end before the runner passes him on native power',()=>{
  const sim=new PlaySim(nativeTraceSetup({coverage:'cover3_buzz',concept:'power',seed:9,roster:7,formation:'ace_11',flip:false}));
  const lg=sim.slot('LG')!,end=(lg.behavior as RunBlocker).plan.target!;
  expect(end.slot).toBe('DE_S');
  let load:number|null=null,pass:number|null=null,near:number|null=null;
  const tick=sim.tick.bind(sim);
  sim.tick=()=>{tick();
   if(near===null&&Math.hypot(lg.pos.x-end.pos.x,lg.pos.y-end.pos.y)<1.2)near=sim.t;
   if(load===null&&sim.world.joints.some(j=>j.kind==='hands'
    &&((j.a===lg.body&&j.b===end.body)||(j.b===lg.body&&j.a===end.body))
    &&Math.hypot(j.normalForce??0,j.tangentForce??0)>1e-8))load=sim.t;
   if(pass===null&&sim.carrier&&sim.carrier!==sim.qb&&sim.carrier.pos.x>=end.pos.x)pass=sim.t;
  };
  sim.run();
  expect(load,'actual hand load on the original end').not.toBeNull();
  expect(pass).not.toBeNull();
  expect(load!).toBeLessThan(pass!);
  expect(near!).toBeLessThan(pass!);
 });
});

describe('acquired kick motion forecast',()=>{
 function stage() {
  const sim=new PlaySim(nativeTraceSetup({coverage:'cover3_buzz',concept:'power',seed:9,roster:7,formation:'ace_11',flip:false}));
  const a=sim.slot('LG')!,block=a.behavior as RunBlocker,target=block.plan.target!;
  return {sim,a,block,target};
 }
 it('keeps steady motion interception and counts sample age only once',()=>{
  const {sim,a,block,target}=stage();
  sim.t=1;
  const see=sim.see.bind(sim);
  sim.see=(actor,man,...rest)=>actor===a&&man===target
   ? {pos:{x:40,y:20},vel:{x:-2,y:1},age:.25,facing:0,stance:null}:see(actor,man,...rest);
  block['readPull'](a,sim,target);
  sim.t=1.1;
  const p=block['kickPicture'](sim,.6);
  expect(p.pos.x).toBeCloseTo(38.6,12);
  expect(p.pos.y).toBeCloseTo(20.7,12);
  expect(p.vel).toEqual({x:-2,y:1});
 });
 it('stops a braking forecast without reversing, and resets on a new target',()=>{
  const {sim,a,block,target}=stage();
  let speed=-4,age=.25;
  const see=sim.see.bind(sim);
  sim.see=(actor,man,...rest)=>actor===a
   ? {pos:{x:40,y:20},vel:{x:speed,y:0},age,facing:0,stance:null}:see(actor,man,...rest);
  sim.t=1;block['readPull'](a,sim,target);
  speed=-2;sim.t=1.4;block['readPull'](a,sim,target);
  // Sample x is 40.5; braking at 5 yd/s² stops .4 yd later.
  expect(block['kickPicture'](sim,1).pos.x).toBeCloseTo(40.1,12);
  expect(block['kickPicture'](sim,1).vel.x).toBeCloseTo(0,12);
  // A repeat of that same sample must not replace the measured braking.
  sim.t=1.8;age=.65;block['readPull'](a,sim,target);
  expect(block['pullRead']!.braking.x).toBeCloseTo(5,12);
  const other=sim.slot('DE_W')!;
  block['readPull'](a,sim,other);
  expect(block['pullRead']!.braking).toEqual({x:0,y:0});
 });
});
