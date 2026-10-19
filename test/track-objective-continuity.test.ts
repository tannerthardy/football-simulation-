import {describe,expect,it} from 'vitest';
import type {Body} from '../src/physics/kinematics.js';
import type {Agent} from '../src/sim/agent.js';
import {track} from '../src/sim/behaviors/common.js';
import {movementObjective} from '../src/sim/movement-objective.js';

const profile:Body['profile']={massKg:100,radius:.3,reach:1,heightYd:2.05,
  vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,
  maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5};
function actor(x=0,y=20):Agent {
 const body:Body={pos:{x,y},vel:{x:0,y:0},facing:0,energy:1,profile:{...profile}};
 return {body,pos:body.pos,profile:body.profile} as Agent;
}
const delta=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

// An unchanged moving responsibility must not turn sharply because its error
// crosses the old four-yard near/far classification by a millimetre.
describe('continuous moving station-keeping objective',()=>{
 it.each([-1,1])('responds continuously when own position crosses the old boundary (side %s)',side=>{
  const point={x:0,y:20},motion={x:0,y:side*3};
  const inner=track(actor(4-.001),point,motion,{gain:2});
  const outer=track(actor(4+.001),point,motion,{gain:2});
  expect(delta(inner.vel,outer.vel)).toBeLessThan(.01);
 });
 it.each([-1,1])('responds continuously when the acquired point crosses the old boundary (side %s)',side=>{
  const a=actor(),motion={x:0,y:side*3};
  const inner=track(a,{x:4-.001,y:20},motion,{gain:2});
  const outer=track(a,{x:4+.001,y:20},motion,{gain:2});
  expect(delta(inner.vel,outer.vel)).toBeLessThan(.01);
 });
 it('preserves ordinary stationary and collinear requests across that boundary',()=>{
  for(const d of [2,4,4.01,8,20]){
   const a=actor(),point={x:d,y:20};
   const stationary=track(a,point,{x:0,y:0},{gain:2});
   const moving=track(a,point,{x:3,y:0},{gain:2});
   const close=Math.min(2*d,Math.sqrt(6*Math.max(0,d-.3))+1);
   expect(stationary.vel).toEqual({x:Math.min(9,close),y:0});
   expect(moving.vel).toEqual({x:Math.min(9,3+close),y:0});
  }
 });
 it('retains bounded far leading and the target feed-forward velocity',()=>{
  const a=actor(),point={x:20,y:20},motion={x:0,y:3};
  const command=track(a,point,motion,{gain:2});
  // At long range the existing 1.2s lead is fully available. Its bearing is
  // (20,3.6), rather than a pure error bearing, before matching target motion.
  const correction=Math.min(9,Math.sqrt(6*19.7)+1),l=Math.hypot(20,3.6);
  const expected={x:20/l*correction,y:3+3.6/l*correction};
  const scale=Math.min(1,9/Math.hypot(expected.x,expected.y));
  expect(command.vel.x).toBeCloseTo(expected.x*scale,12);
  expect(command.vel.y).toBeCloseTo(expected.y*scale,12);
  expect(Math.hypot(command.vel.x,command.vel.y)).toBeLessThanOrEqual(9+1e-12);
  expect(track(a,a.pos,motion).vel).toEqual(motion);
 });
 it('responds immediately to a genuine changed objective without a held direction',()=>{
  const a=actor(),motion={x:0,y:0};
  const first=track(a,{x:5,y:20},motion),reverse=track(a,{x:-5,y:20},motion);
  expect(first.vel.x).toBeGreaterThan(0);expect(reverse.vel.x).toBeLessThan(0);
  expect(reverse.vel.x).toBe(-first.vel.x);expect(first.vel.y).toBe(0);expect(reverse.vel.y).toBe(0);
 });
 it('uses only the supplied own state and picture, preserving command modifiers and detached objective metadata',()=>{
  const a=actor(),point={x:4.01,y:22},motion={x:2,y:-1};
  Object.freeze(a.pos);Object.freeze(a.body.vel);Object.freeze(a.body.profile);Object.freeze(a.body);Object.freeze(a);
  const before=structuredClone({point,motion});
  const command=track(a,point,motion,{gain:2,facing:1.2,cutSkill:1.1,speed:.8});
  expect(track(a,point,motion,{gain:2,facing:1.2,cutSkill:1.1,speed:.8})).toEqual(command);
  expect({point,motion}).toEqual(before);
  expect(command.facing).toBe(1.2);expect(command.cutSkill).toBe(1.1);
  expect(movementObjective(command)).toEqual({kind:'moving',point,velocity:motion});
  point.x+=100;motion.y+=100;
  expect(movementObjective(command)).toEqual({kind:'moving',point:before.point,velocity:before.motion});
 });
});
