import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import type { Intent } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import { predictCalledMotion } from '../src/sim/called-motion.js';
import { spaceTeammates } from '../src/sim/spacing.js';
const saved=JSON.parse(readFileSync(new URL('./fixtures/announced-motion.json',import.meta.url),'utf8'));
const center=saved.spacingInputs.find((p:any)=>p.peer==='C');
const profile=center.profile;
const picture=(overrides:Partial<Perceived>={}):Perceived=>({pos:{x:10,y:20},vel:{x:1,y:0},facing:0,age:.05,pose:'up',stance:'low',carrying:false,...overrides});
function select(mode:'old'|'candidate',fast=false){
 const body=structuredClone(saved.actorBody);
 const a={idx:0,team:'O',profile:body.profile,body,get pos(){return body.pos;},get vel(){return body.vel;},speedScale:1,engagement:{},behavior:{kind:'runblocker'},isDown(){return false;}} as unknown as Agent;
 const pictures=new Map<number,Perceived>();
 const peers=saved.spacingInputs.map((p:any,i:number)=>{
  const seen=structuredClone(p.seen),called=p.called;
  if(fast&&called)seen.vel={...called};
  const predicted=mode==='candidate'?predictCalledMotion(seen,called,p.profile):called?{...seen,pos:{x:seen.pos.x+(called.x-seen.vel.x)*seen.age,y:seen.pos.y+(called.y-seen.vel.y)*seen.age},vel:called}:seen;
  pictures.set(i+1,predicted);
  return{idx:i+1,team:'O',profile:p.profile,get body(){throw Error('Private support/body');},get pos(){throw Error('Private position');},get vel(){throw Error('Private velocity');}} as unknown as Agent;
 });
 const commands:Intent[]=[structuredClone(saved.before),...peers.map(()=>({free:true,vel:{x:0,y:0}}))];
 spaceTeammates([a,...peers],commands,(_a,p)=>pictures.get(p.idx)!,{now:saved.t});
 return commands[0];
}
describe('announced teammate target stays distinct from achieved motion',()=>{
 it('has no acceleration displacement or velocity jump at zero age and preserves absent/equal calls',()=>{
  const seen=picture({age:0});expect(predictCalledMotion(seen,{x:3,y:0},profile)).toBe(seen);
  expect(predictCalledMotion(seen,null,profile)).toBe(seen);
  expect(predictCalledMotion(seen,undefined,profile)).toBe(seen);
  const moving=picture({vel:{x:3,y:0}});expect(predictCalledMotion(moving,{x:3,y:0},profile)).toBe(moving);
 });
 it('adds exactly one fresh free first-step acceleration, without re-advancing the CV position',()=>{
  const seen=picture(),before=structuredClone(seen),p0=structuredClone(profile),target={x:3,y:0};
  // Start law (#336): full start force falling to zero at the wanted 3 yd/s,
  // a=(vmax/tau)(1-1/3) (the old law's (3-1)/tau scaled by vmax/3).
  const predicted=predictCalledMotion(seen,target,profile),a=profile.vmax/profile.tau*(1-1/3);
  expect(predicted.vel.x).toBeCloseTo(1+a*.05,12);
  expect(predicted.pos.x).toBeCloseTo(10+.5*a*.05**2,12);
  expect(predicted.pos.y).toBe(20);expect(seen).toEqual(before);expect(profile).toEqual(p0);
  expect({...predicted,pos:seen.pos,vel:seen.vel}).toEqual(seen);
 });
 it('keeps first-step finite and within traction for startup and deliberate reversal',()=>{
  for(const v of [0,1,6])for(const target of [-100,100]){
   const seen=picture({vel:{x:v,y:0}}),predicted=predictCalledMotion(seen,{x:target,y:0},profile);
   const acceleration=Math.hypot(predicted.vel.x-v,predicted.vel.y)/.05;
   expect(acceleration).toBeLessThanOrEqual(supportParams(profile).traction/profile.massKg+1e-10);
   expect(predicted.pos.x-seen.pos.x).toBeCloseTo(.5*(predicted.vel.x-v)*.05,12);
   expect(Object.values(predicted.vel).every(Number.isFinite)).toBe(true);
  }
 });
 it('advances the same held gait request for subtick and subnormal positive ages',()=>{
  const full=picture({vel:{x:1,y:0}}),held=predictCalledMotion(full,{x:0,y:3},profile);
  for(const age of [.025,1e-6,Number.MIN_VALUE]){
   const seen={...full,age},predicted=predictCalledMotion(seen,{x:0,y:3},profile);
   expect([...Object.values(predicted.pos),...Object.values(predicted.vel)].every(Number.isFinite)).toBe(true);
   if(age>1e-12){expect((predicted.vel.x-seen.vel.x)/age).toBeCloseTo((held.vel.x-full.vel.x)/.05,9);expect((predicted.vel.y-seen.vel.y)/age).toBeCloseTo((held.vel.y-full.vel.y)/.05,9);}
  }
 });
 it('retains ordinary prediction for unknown/down pose, missing heading and unsupported age',()=>{
  for(const overrides of [{pose:null},{pose:'down'},{pose:'rising'},{age:undefined},{age:-.01},{age:.1},{facing:undefined}] as Partial<Perceived>[]){
   const seen=picture(overrides);expect(predictCalledMotion(seen,{x:3,y:0},profile)).toBe(seen);
  }
 });
 it('uses only the acquired picture and public profile',()=>{
  const peer={profile,get body(){throw Error('Private support/body');},get pos(){throw Error('Private position');},get vel(){throw Error('Private velocity');}};
  const out=predictCalledMotion(center.seen,center.called,peer.profile);
  expect(out.age).toBe(center.seen.age);expect(out.carrying).toBe(center.seen.carrying);
  expect(out.vel.y).toBeLessThan(center.seen.vel.y);expect(out.vel.y).toBeGreaterThan(center.called.y);
 });
 it('mirrors the acquired picture and announced track through the same movement law',()=>{
  const seen=structuredClone(center.seen),called=center.called;
  const a=predictCalledMotion(seen,called,profile);
  const b=predictCalledMotion({...seen,pos:{x:seen.pos.x,y:-seen.pos.y},vel:{x:seen.vel.x,y:-seen.vel.y},facing:-seen.facing}, {x:called.x,y:-called.y},profile);
  expect(a.pos.x).toBeCloseTo(b.pos.x,12);expect(a.pos.y).toBeCloseTo(-b.pos.y,12);
  expect(a.vel.x).toBeCloseTo(b.vel.x,12);expect(a.vel.y).toBeCloseTo(-b.vel.y,12);
 });
 it('does not invent an instantaneous fast center in the saved WZ handoff',()=>{
  // The saved command was recorded under the old fatigue curve. The actor's
  // energy (0.9965) now gives a slightly different braking capacity, so the
  // old selection reproduces the record to within 1e-4 yd/s (it moves
  // 2.4e-5), not bit for bit. A fast center would be off by about 0.5 yd/s.
  const old=select('old').vel;
  expect(old.x).toBeCloseTo(saved.finalCommand.vel.x,4);expect(old.y).toBeCloseTo(saved.finalCommand.vel.y,4);
  expect(select('candidate')).toEqual(saved.before);
 });
 it('preserves avoidance when the teammate is actually acquired moving at the fast called speed',()=>{
  const old=select('old',true),candidate=select('candidate',true);
  expect(candidate).toEqual(old);expect(candidate.vel.y).toBeLessThan(-1.8);
 });
});
