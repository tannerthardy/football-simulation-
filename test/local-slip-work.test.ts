import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {integrateLocalSlip,type SlipField} from '../src/physics/local-slip-work.js';
const packet=JSON.parse(readFileSync('config/local-slip-work.json','utf8'));
const reference=JSON.parse(readFileSync('config/local-slip-work-reference.json','utf8'));
const numeric=(x:any):any=>typeof x==='string'?Number(x):Array.isArray(x)?x.map(numeric):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,numeric(v)])):x;
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(1e-11);
function solve(f:SlipField){const r=integrateLocalSlip(f);if(!r.ok)throw Error(r.reason);return r;}
function compareBodies(a:any[],b:any[]){for(let i=0;i<2;i++){for(const c of ['x','y']){near(a[i].position[c],b[i].position[c]);near(a[i].velocity[c],b[i].velocity[c]);}near(a[i].facing,b[i].facing);near(a[i].spin,b[i].spin);}}

describe('first saved zero-slip event, fixed force frame and saturated motors',()=>{
 it.each(['selected','slidingControl'])('matches independent70-digit motion/impulse/work reference for %s',key=>{
  const f:SlipField=packet[key].field,before=JSON.stringify(f),r=solve(f),expected=numeric(reference.cases[key]);
  for(const k of ['impulse','temporalMoment','absoluteImpulse','handWork','energyChange'] as const)near(r[k],expected[k]);
  near(r.groundWork[0]+r.groundWork[1],expected.groundWork);compareBodies(r.bodies,expected.after);
  expect(JSON.stringify(f)).toBe(before);expect(Math.abs(r.workResidual)).toBeLessThan(1e-11);
  expect(r.handWork).toBeLessThanOrEqual(1e-14);
  for(const p of r.phases){expect(Math.abs(p.force)).toBeLessThanOrEqual(f.forceLimit);expect(p.work).toBeLessThanOrEqual(1e-14);}
  expect(r.absoluteImpulse).toBeLessThanOrEqual(f.forceLimit*f.duration+1e-14);
 });
 it('changes force at the physical zero, preserving net impulse but correcting moment and work',()=>{
  const f:SlipField=packet.selected.field,r=solve(f);expect(r.phases).toHaveLength(2);
  expect(r.phases[0].force).toBe(-f.forceLimit);expect(r.phases[1].force).toBeGreaterThan(0);
  near(r.phases[0].duration,Number(reference.cases.selected.zeroTime));near(r.impulse,packet.selected.native.selectedImpulse);
  expect(r.handWork).toBeLessThan(0);expect(packet.selected.native.frozenFrameWork).toBeGreaterThan(0);
  expect(r.temporalMoment).not.toBeCloseTo(r.impulse*f.duration/2,7);
  expect(r.absoluteImpulse).toBeGreaterThan(Math.abs(r.impulse));
 });
 it('keeps a genuinely sliding control at the existing cap throughout',()=>{
  const f:SlipField=packet.slidingControl.field,r=solve(f);expect(r.phases).toHaveLength(1);
  near(r.impulse,packet.slidingControl.native.selectedImpulse);near(r.handWork,packet.slidingControl.native.frozenFrameWork);
 });
 it.each([[.23,.41,.36],[.5,.5],[.01,.09,.9]].map(parts=>({parts})))('retains motion, work, first moment and force amount under unequal partitions %j',({parts})=>{
  const f:SlipField=structuredClone(packet.selected.field),one=solve(f),T=f.duration;let elapsed=0,J=0,M=0,A=0,W=0,G=0;
  for(const fraction of parts){const dt=fraction*T,r=solve({...f,duration:dt,remaining:f.remaining-elapsed});
   M+=r.temporalMoment+(T-elapsed-dt)*r.impulse;J+=r.impulse;A+=r.absoluteImpulse;W+=r.handWork;G+=r.groundWork[0]+r.groundWork[1];f.bodies=r.bodies;elapsed+=dt;}
  compareBodies(f.bodies,one.bodies);near(J,one.impulse);near(M,one.temporalMoment);near(A,one.absoluteImpulse);near(W,one.handWork);near(G,one.groundWork[0]+one.groundWork[1]);
 });
 it('reflects a true mirror including tangent orientation and angular quantities',()=>{
  const f:SlipField=structuredClone(packet.selected.field),original=solve(f);f.tangent.x=-f.tangent.x;
  for(const b of f.bodies){b.position.y=-b.position.y;b.velocity.y=-b.velocity.y;b.groundAcceleration.y=-b.groundAcceleration.y;b.facing=-b.facing;b.spin=-b.spin;b.groundYawAcceleration=-b.groundYawAcceleration;if(b.yaw)b.yaw.targetHeading=-b.yaw.targetHeading;}
  const r=solve(f);near(r.impulse,-original.impulse);near(r.temporalMoment,-original.temporalMoment);near(r.handWork,original.handWork);near(r.absoluteImpulse,original.absoluteImpulse);
  for(const b of r.bodies){b.position.y=-b.position.y;b.velocity.y=-b.velocity.y;b.facing=-b.facing;b.spin=-b.spin;}compareBodies(r.bodies,original.bodies);
 });
 it('leaves zero-time and zero-force work and effort at zero without projecting state',()=>{
  const f:SlipField=structuredClone(packet.selected.field),zero=solve({...f,duration:0});expect(zero.bodies).toEqual(f.bodies);expect(zero.phases).toHaveLength(0);
  f.forceLimit=0;const free=solve(f);expect(free.absoluteImpulse).toBe(0);expect(free.handWork).toBe(0);
  for(let i=0;i<2;i++){near(free.bodies[i].velocity.x,f.bodies[i].velocity.x+f.bodies[i].groundAcceleration.x*f.duration);near(free.bodies[i].spin,f.bodies[i].spin+f.bodies[i].groundYawAcceleration*f.duration);}
 });
 it('does not round a tiny force into extra capacity',()=>{
  const f:SlipField=structuredClone(packet.slidingControl.field);f.forceLimit=1e-20;const r=solve(f);
  expect(r.absoluteImpulse).toBeLessThanOrEqual(1e-20*f.duration*(1+1e-14));expect(r.handWork).toBeLessThanOrEqual(0);
 });
 it('rejects the saved next motor transition instead of freezing an unsupported request',()=>{
  const f:SlipField=packet.nextField.field,before=JSON.stringify(f),r=integrateLocalSlip(f);
  expect(r).toEqual({ok:false,reason:'ground-motor-transition'});expect(JSON.stringify(f)).toBe(before);
 });
});
