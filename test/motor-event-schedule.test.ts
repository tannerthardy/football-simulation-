import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {integrateSlipMotor,type MotorField} from '../src/physics/local-slip-motor.js';
import {selectMotorEvents,applyMotorEvents,integrateMotorEvents} from '../src/physics/motor-event-schedule.js';
const packet=JSON.parse(readFileSync('config/local-slip-work.json','utf8')),reference=JSON.parse(readFileSync('config/local-slip-motor-reference.json','utf8'));
const fields:Record<string,MotorField>={nextField:packet.nextField.field,selected:packet.selected.field,slidingControl:packet.slidingControl.field,noHandControl:{...packet.nextField.field,forceLimit:0}};
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(1e-11);
function solve(f:MotorField){const r=integrateMotorEvents(f);if(!r.ok)throw Error(r.reason);return r;}
function bodies(a:any[],b:any[]){for(let i=0;i<2;i++){for(const k of ['position','velocity'])for(const c of ['x','y'])near(a[i][k][c],Number(b[i][k][c]));near(a[i].facing,Number(b[i].facing));near(a[i].spin,Number(b[i].spin));}}
function compare(a:any,b:any){bodies(a.bodies,b.bodies);for(const k of ['impulse','temporalMoment','absoluteImpulse','handWork','energyChange'])near(a[k],Number(b[k]));for(const k of ['groundYawImpulse','groundYawTemporalMoment','absoluteGroundYawImpulse','groundYawWork','legWork'])for(let i=0;i<2;i++)near(a[k][i],Number(b[k][i]));}
describe('motor event schedule with one endpoint reconstruction',()=>{
 it.each(Object.keys(fields))('retains the independent reference, caps, work and PR71 result for %s',key=>{
  const f=fields[key],before=JSON.stringify(f),r=solve(f),ref=reference.cases[key],old=integrateSlipMotor(f);expect(old.ok).toBe(true);if(!old.ok)return;
  compare(r,{...ref,bodies:ref.after});compare(r,old);expect(JSON.stringify(f)).toBe(before);expect(Math.abs(r.workResidual)).toBeLessThan(1e-11);
  expect(r.phases).toHaveLength(old.phases.length);for(let j=0;j<r.phases.length;j++){const p=r.phases[j];near(p.duration,old.phases[j].duration);near(p.force,old.phases[j].force);expect(p.work).toBeLessThanOrEqual(1e-14);expect(Math.abs(p.force)).toBeLessThanOrEqual(f.forceLimit);for(let i=0;i<2;i++)expect(Math.abs(p.groundAcceleration[i])).toBeLessThanOrEqual(f.bodies[i].yaw!.accelerationLimit);}
 });
 it('owns its initial field and applies the same complete history without double accumulation',()=>{
  const f=structuredClone(fields.nextField),s=selectMotorEvents(f);expect(s.ok).toBe(true);if(!s.ok)return;const before=JSON.stringify(s),expected=solve(f);
  f.bodies[0].position.x+=10;f.bodies[1].yaw!.accelerationLimit=0;f.tangent.x=1;f.arms[0]=0;
  compare(applyMotorEvents(s),expected);expect(applyMotorEvents(s)).toEqual(applyMotorEvents(s));expect(JSON.stringify(s)).toBe(before);
 });
 it.each([[.23,.41,.36],[.5,.5],[.7,.2,.1]].map(parts=>({parts})))('composes unequal partitions %j',({parts})=>{
  const f=structuredClone(fields.nextField),one=solve(f),T=f.duration;let elapsed=0;const s:any={impulse:0,temporalMoment:0,absoluteImpulse:0,handWork:0,energyChange:0,groundYawImpulse:[0,0],groundYawTemporalMoment:[0,0],absoluteGroundYawImpulse:[0,0],groundYawWork:[0,0],legWork:[0,0]};
  for(const w of parts){const d=T*w,r=solve({...f,duration:d,remaining:f.remaining-elapsed});s.temporalMoment+=r.temporalMoment+(T-elapsed-d)*r.impulse;
   for(const k of ['impulse','absoluteImpulse','handWork','energyChange'] as const)s[k]+=r[k];for(let i=0;i<2;i++){s.groundYawTemporalMoment[i]+=r.groundYawTemporalMoment[i]+(T-elapsed-d)*r.groundYawImpulse[i];for(const k of ['groundYawImpulse','absoluteGroundYawImpulse','groundYawWork','legWork'] as const)s[k][i]+=r[k][i];}
   f.bodies=r.bodies;elapsed+=d;}
  compare({...s,bodies:f.bodies},one);
 });
 it('mirrors the attained motion, work and signed/absolute amounts',()=>{
  const f=structuredClone(fields.nextField),one=solve(f);f.tangent.x=-f.tangent.x;for(const b of f.bodies){b.position.y=-b.position.y;b.velocity.y=-b.velocity.y;b.groundAcceleration.y=-b.groundAcceleration.y;b.facing=-b.facing;b.spin=-b.spin;b.yaw!.targetHeading=-b.yaw!.targetHeading;}
  const r=solve(f);near(r.impulse,-one.impulse);near(r.temporalMoment,-one.temporalMoment);near(r.absoluteImpulse,one.absoluteImpulse);near(r.handWork,one.handWork);
  for(let i=0;i<2;i++){near(r.groundYawImpulse[i],-one.groundYawImpulse[i]);near(r.groundYawTemporalMoment[i],-one.groundYawTemporalMoment[i]);near(r.absoluteGroundYawImpulse[i],one.absoluteGroundYawImpulse[i]);}
  for(const b of r.bodies){b.position.y=-b.position.y;b.velocity.y=-b.velocity.y;b.facing=-b.facing;b.spin=-b.spin;}bodies(r.bodies,one.bodies);
 });
 it('preserves zero/tiny capacities, zero time and deadline rejection',()=>{
  const f=structuredClone(fields.nextField);expect(solve({...f,duration:0}).bodies).toEqual(f.bodies);expect(integrateMotorEvents({...f,duration:f.remaining})).toEqual({ok:false,reason:'controller-deadline'});
  f.forceLimit=0;for(const b of f.bodies)b.yaw!.accelerationLimit=0;const z=solve(f);expect(z.absoluteImpulse).toBe(0);expect(z.absoluteGroundYawImpulse).toEqual([0,0]);
  f.forceLimit=1e-20;for(const b of f.bodies)b.yaw!.accelerationLimit=1e-20;const tiny=solve(f);expect(tiny.absoluteImpulse).toBeLessThanOrEqual(1e-20*f.duration*(1+1e-14));for(let i=0;i<2;i++)expect(tiny.absoluteGroundYawImpulse[i]).toBeLessThanOrEqual(f.bodies[i].inertia*1e-20*f.duration*(1+1e-14));
 });
 it('retains equivalent headings and the interior-wrap guard',()=>{
  const f=structuredClone(fields.nextField),one=solve(f);for(const b of f.bodies){b.facing+=4*Math.PI;b.yaw!.targetHeading+=4*Math.PI;}const r=solve(f);for(const b of r.bodies)b.facing-=4*Math.PI;compare(r,one);
  f.duration=.05;f.remaining=1;f.forceLimit=0;for(const b of f.bodies){b.groundAcceleration={x:0,y:0};b.spin=0;b.yaw!.accelerationLimit=0;b.yaw!.targetHeading=b.facing;}
  Object.assign(f.bodies[0],{facing:Math.PI-.004,spin:1});f.bodies[0].yaw={targetHeading:0,turnRate:10,accelerationLimit:100};expect(integrateMotorEvents(f)).toEqual({ok:false,reason:'heading-branch'});
 });
});
