import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {angleDiff} from '../src/core/vec.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {executeRunFit,type RunFitJob} from '../src/sim/run-fits.js';
import type {Perceived} from '../src/sim/perception.js';
import {movementObjective} from '../src/sim/movement-objective.js';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/run-fit-crossover.json.gz',import.meta.url))).toString())as{setup:PlaySetup};
/** Explicit acquired-cue contract, not a midplay restoration. */
function stage(side=1,kind:RunFitJob['kind']='insert',technique:RunFitJob['technique']='attack',wide=true){
 const sim=new PlaySim(structuredClone(fixture.setup)),a=sim.slot('LB_M')!,back=sim.slot('RB')!;
 sim.t=1.5;sim.handoffAt=.5;sim.ball={kind:'held',carrier:back};a.recog!.read='run';
 a.body.pos={x:43,y:CENTER_Y+side};a.body.vel={x:-1,y:0};a.runFit={gap:'A',side,kind,technique,edge:'box',pace:'stack'};
 const picture=new Map(sim.agents.map(o=>[o,{pos:{...o.pos},vel:{x:0,y:0},facing:o.facing,pose:'up',stance:o.team==='O'?'low':null,carrying:false,age:.25}as Perceived]));
 picture.set(back,{pos:{x:35,y:CENTER_Y+(wide?side*7:0)},vel:{x:2,y:wide?side*3:0},facing:0,pose:'up',stance:null,carrying:true,age:.25});
 const see=vi.spyOn(sim,'see').mockImplementation((_observer,target)=>structuredClone(picture.get(target)!));
 return{sim,a,back,picture,see,command:()=>executeRunFit(a,sim,'A',side)};
}
afterEach(()=>vi.restoreAllMocks());
describe('free insertion uses crossover for acquired lateral run flow',()=>{
 it.each([-1,1])('turns toward the selected lateral run without changing its gap or body, side=%s',side=>{
  const f=stage(side),body=structuredClone(f.a.body),job=structuredClone(f.a.runFit),rng=JSON.stringify(f.sim.rng),cmd=f.command();
  expect(cmd.vel.y*side).toBeGreaterThan(Math.abs(cmd.vel.x));
  expect(Math.abs(angleDiff(cmd.facing!,Math.atan2(cmd.vel.y,cmd.vel.x)))).toBeLessThan(1e-12);
  expect(f.a.runFit).toEqual(job);expect(f.a.body).toEqual(body);expect(JSON.stringify(f.sim.rng)).toBe(rng);
  expect(movementObjective(cmd)).toMatchObject({kind:'moving',velocity:{x:0,y:0}});
 });
 it.each([-1,1])('does not acquire hidden runner movement or a private offensive direction, side=%s',side=>{
  const f=stage(side),first=f.command();f.back.body.pos={x:80,y:CENTER_Y-side*12};f.back.body.vel={x:8,y:-side*7};
  f.sim.offCall.run!.direction=side>0?'weak':'strong';f.sim.isPass=true;
  expect(f.command()).toEqual(first);expect(f.picture.get(f.back)!.vel.y).toBe(side*3);
 });
 it.each(['cutback','interior']as const)('keeps %s responsibility square',kind=>{
  const f=stage(1,kind),cmd=f.command();expect(cmd.facing).toBe(Math.PI);expect(f.a.runFit!.kind).toBe(kind);
 });
 it('retains a lag assignment and a patient stationary landmark',()=>{
  for(const f of [stage(1,'insert','lag'),stage(1,'insert','attack',false)])expect(f.command().facing).toBe(Math.PI);
 });
 it.each([-1,1])('lets an acquired widening force duty run laterally while a still force fit stays square, side=%s',side=>{
  const f=stage(side,'force'),cmd=f.command(),goal=movementObjective(cmd);
  expect(cmd.vel.y*side).toBeGreaterThan(Math.abs(cmd.vel.x));
  expect(Math.abs(angleDiff(cmd.facing!,Math.atan2(cmd.vel.y,cmd.vel.x)))).toBeLessThan(1e-12);
  expect(goal?.kind).toBe('moving');
  if(goal?.kind==='moving')expect(goal.velocity!.y).toBe(side*3);
  expect(f.a.runFit).toMatchObject({kind:'force',side,gap:'A'});
  const still=stage(side,'force');still.picture.get(still.back)!.vel={x:2,y:0};
  expect(still.command().facing).toBe(Math.PI);
 });
 it('still executes the original square fit when a picture does not call for lateral running',()=>{
  const f=stage(1,'insert','attack',false),first=f.command();
  f.sim.t+=.01;f.picture.get(f.back)!.vel={x:2,y:.2};
  expect(f.command()).toEqual(first);
 });
});
