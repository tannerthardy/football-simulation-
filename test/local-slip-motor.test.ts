import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {integrateSlipMotor,type MotorField} from '../src/physics/local-slip-motor.js';
import {integrateLocalSlip} from '../src/physics/local-slip-work.js';
const input=JSON.parse(readFileSync('config/local-slip-work.json','utf8'));
const reference=JSON.parse(readFileSync('config/local-slip-motor-reference.json','utf8'));
const numeric=(v:any):any=>typeof v==='string'?Number(v):Array.isArray(v)?v.map(numeric):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,numeric(x)])):v;
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(1e-11);
function solve(f:MotorField){const r=integrateSlipMotor(f);if(!r.ok)throw Error(r.reason);return r;}
function bodies(a:any[],b:any[]){for(let i=0;i<2;i++){for(const c of ['x','y']){near(a[i].position[c],b[i].position[c]);near(a[i].velocity[c],b[i].velocity[c]);}near(a[i].facing,b[i].facing);near(a[i].spin,b[i].spin);}}
function scalars(a:any,b:any){for(const k of ['impulse','temporalMoment','absoluteImpulse','handWork','energyChange'])near(a[k],b[k]);for(const k of ['groundYawImpulse','groundYawTemporalMoment','absoluteGroundYawImpulse','groundYawWork','legWork'])for(let i=0;i<2;i++)near(a[k][i],b[k][i]);}
describe('saved local ground-motor transition, no World integration',()=>{
 it.each(['nextField','selected','slidingControl'])('matches independent bisection reference in %s',key=>{
  const f:MotorField=input[key].field,before=JSON.stringify(f),r=solve(f),ref=numeric(reference.cases[key]);
  bodies(r.bodies,ref.after);scalars(r,ref);expect(r.phases).toHaveLength(ref.phases.length);expect(JSON.stringify(f)).toBe(before);
  for(let j=0;j<r.phases.length;j++){const p=r.phases[j],e=ref.phases[j];near(p.duration,e.duration);near(p.force,e.force);near(p.work,e.work);
   expect(p.work).toBeLessThanOrEqual(1e-12);expect(Math.abs(p.force)).toBeLessThanOrEqual(f.forceLimit);
   for(let i=0;i<2;i++){near(p.groundAcceleration[i],e.groundAcceleration[i]);expect(Math.abs(p.groundAcceleration[i])).toBeLessThanOrEqual(f.bodies[i].yaw!.accelerationLimit);}}
  expect(Math.abs(r.workResidual)).toBeLessThan(1e-11);expect(r.absoluteImpulse).toBeLessThanOrEqual(f.forceLimit*f.duration+1e-14);
  for(let i=0;i<2;i++)expect(r.absoluteGroundYawImpulse[i]).toBeLessThanOrEqual(f.bodies[i].inertia*f.bodies[i].yaw!.accelerationLimit*f.duration+1e-14);
 });
 it('switches the NT torque and loses sticking under load without projecting spin',()=>{
  const r=solve(input.nextField.field);expect(r.phases).toHaveLength(3);expect(r.phases[1].force).toBeGreaterThan(0);
  expect(r.phases[2].force).toBe(input.nextField.field.forceLimit);expect(r.phases[1].groundAcceleration[1]).toBeLessThan(0);expect(r.phases[2].groundAcceleration[1]).toBeGreaterThan(0);
  expect(r.phases[2].slipAfter).toBeLessThan(0);expect(r.absoluteGroundYawImpulse[1]).toBeGreaterThan(Math.abs(r.groundYawImpulse[1]));
  expect(integrateLocalSlip(input.nextField.field)).toEqual({ok:false,reason:'ground-motor-transition'});
 });
 it.each(['selected','slidingControl'])('preserves PR70 local proof for %s',key=>{
  const a=solve(input[key].field),b=integrateLocalSlip(input[key].field);expect(b.ok).toBe(true);if(!b.ok)return;
  bodies(a.bodies,b.bodies);for(const k of ['impulse','temporalMoment','absoluteImpulse','handWork'])near(a[k as keyof typeof a] as number,b[k as keyof typeof b] as number);
 });
 it.each([[.23,.41,.36],[.5,.5],[.7,.2,.1]].map(parts=>({parts})))('composes unequal partitions %j without new effort or work',({parts})=>{
  const f:MotorField=structuredClone(input.nextField.field),one=solve(f),T=f.duration;let elapsed=0;const sum:any={impulse:0,temporalMoment:0,absoluteImpulse:0,handWork:0,energyChange:0,groundYawImpulse:[0,0],groundYawTemporalMoment:[0,0],absoluteGroundYawImpulse:[0,0],groundYawWork:[0,0],legWork:[0,0]};
  for(const w of parts){const dt=T*w,r=solve({...f,duration:dt,remaining:f.remaining-elapsed});sum.temporalMoment+=r.temporalMoment+(T-elapsed-dt)*r.impulse;
   for(const k of ['impulse','absoluteImpulse','handWork','energyChange'] as const)sum[k]+=r[k];
   for(let i=0;i<2;i++){sum.groundYawTemporalMoment[i]+=r.groundYawTemporalMoment[i]+(T-elapsed-dt)*r.groundYawImpulse[i];for(const k of ['groundYawImpulse','absoluteGroundYawImpulse','groundYawWork','legWork'] as const)sum[k][i]+=r[k][i];}
   elapsed+=dt;f.bodies=r.bodies;}
  bodies(f.bodies,one.bodies);scalars(sum,one);
 });
 it('mirrors force, ground torque, temporal moments, work and bodies',()=>{
  const f:MotorField=structuredClone(input.nextField.field),one=solve(f);f.tangent.x=-f.tangent.x;
  for(const b of f.bodies){b.position.y=-b.position.y;b.velocity.y=-b.velocity.y;b.groundAcceleration.y=-b.groundAcceleration.y;b.facing=-b.facing;b.spin=-b.spin;if(b.yaw)b.yaw.targetHeading=-b.yaw.targetHeading;}
  const r=solve(f);near(r.impulse,-one.impulse);near(r.temporalMoment,-one.temporalMoment);near(r.handWork,one.handWork);near(r.absoluteImpulse,one.absoluteImpulse);
  for(let i=0;i<2;i++){near(r.groundYawImpulse[i],-one.groundYawImpulse[i]);near(r.groundYawTemporalMoment[i],-one.groundYawTemporalMoment[i]);near(r.absoluteGroundYawImpulse[i],one.absoluteGroundYawImpulse[i]);near(r.groundYawWork[i],one.groundYawWork[i]);}
  for(const b of r.bodies){b.position.y=-b.position.y;b.velocity.y=-b.velocity.y;b.facing=-b.facing;b.spin=-b.spin;}bodies(r.bodies,one.bodies);
 });
 it('keeps equivalent heading representations equivalent and rejects a wrap crossing',()=>{
  const f:MotorField=structuredClone(input.nextField.field),one=solve(f);for(const b of f.bodies){b.facing+=4*Math.PI;b.yaw!.targetHeading+=4*Math.PI;}
  const r=solve(f);for(const b of r.bodies)b.facing-=4*Math.PI;bodies(r.bodies,one.bodies);scalars(r,one);
  f.bodies[0].yaw!.targetHeading=f.bodies[0].facing+Math.PI;expect(integrateSlipMotor(f)).toEqual({ok:false,reason:'heading-branch'});
 });
 it('lets an unloaded motor reach and retain the requested spin without extending torque',()=>{
  const f:MotorField=structuredClone(input.nextField.field);f.forceLimit=0;const r=solve(f),ref=numeric(reference.cases.noHandControl);
  bodies(r.bodies,ref.after);scalars(r,ref);expect(r.phases).toHaveLength(2);expect(r.phases[0].groundAcceleration[1]).toBeLessThan(0);expect(r.phases[1].groundAcceleration[1]).toBe(0);
  const b=r.bodies[1],target=(b.yaw!.targetHeading-b.facing)/(f.remaining-f.duration);near(b.spin,target);expect(r.handWork).toBe(0);expect(r.absoluteImpulse).toBe(0);
 });
 it('returns identity at zero time and rejects controller deadline without changing input',()=>{
  const f:MotorField=structuredClone(input.nextField.field),before=JSON.stringify(f),r=solve({...f,duration:0});expect(r.bodies).toEqual(f.bodies);expect(r.absoluteImpulse).toBe(0);expect(r.absoluteGroundYawImpulse).toEqual([0,0]);
  expect(integrateSlipMotor({...f,duration:f.remaining})).toEqual({ok:false,reason:'controller-deadline'});expect(JSON.stringify(f)).toBe(before);
 });
 it('does not invent effort at zero/tiny hand or ground capacity',()=>{
  const f:MotorField=structuredClone(input.nextField.field);f.forceLimit=0;for(const b of f.bodies)b.yaw!.accelerationLimit=0;
  const r=solve(f);expect(r.handWork).toBe(0);expect(r.absoluteImpulse).toBe(0);expect(r.absoluteGroundYawImpulse).toEqual([0,0]);
  f.forceLimit=1e-20;for(const b of f.bodies)b.yaw!.accelerationLimit=1e-20;
  const tiny=solve(f);expect(tiny.absoluteImpulse).toBeLessThanOrEqual(1e-20*f.duration*(1+1e-14));for(let i=0;i<2;i++)expect(tiny.absoluteGroundYawImpulse[i]).toBeLessThanOrEqual(f.bodies[i].inertia*1e-20*f.duration*(1+1e-14));
 });
});
