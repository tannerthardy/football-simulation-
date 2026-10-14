import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {sharedGripForce,type SharedGripFrame} from '../scripts/diag/physics/grip-shared-law.js';
import {tangentBoxReference} from '../scripts/diag/physics/grip-shared-work-reference.js';
import {sharedWorkFrames,sharedWorkInput} from '../scripts/diag/physics/grip-shared-work-scene.js';
import {sharedWorkMotion} from '../scripts/diag/physics/grip-shared-work-motion.js';
const cases=[...JSON.parse(readFileSync(new URL('../config/grip-shared-reference.json',import.meta.url),'utf8')).cases,
  ...JSON.parse(readFileSync(new URL('../config/grip-shared-fresh-reference.json',import.meta.url),'utf8')).cases],
  paired=cases.filter(c=>c.input.grips.length===2),norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
function checkMotion(a:ReturnType<typeof sharedWorkMotion>,b:ReturnType<typeof sharedWorkMotion>){
  for(let k=0;k<a.bodies.length;k++){
    expect(norm(a.bodies[k].pos,b.bodies[k].pos)).toBeLessThan(5e-10);expect(norm(a.bodies[k].vel,b.bodies[k].vel)).toBeLessThan(2.5e-8);
    expect(Math.abs(a.bodies[k].facing-b.bodies[k].facing)).toBeLessThan(2.5e-9);expect(Math.abs(a.bodies[k].spin-b.bodies[k].spin)).toBeLessThan(2.5e-7);
  }
  expect(norm(a.footOffset,b.footOffset)).toBeLessThan(5e-10);
  for(let k=0;k<a.grips.length;k++){
    const x=a.grips[k],y=b.grips[k];for(const key of ['material','point','impulse','moment'] as const)expect(norm(x[key],y[key])).toBeLessThan(5e-10);
    for(const key of ['legs','dose','bodyWork','normalImpulse','tangentImpulse'] as const)expect(Math.abs(x[key]-y[key])).toBeLessThan(1e-9);
    for(let i=0;i<2;i++)for(const key of ['angularImpulse','angularMoment'] as const)expect(Math.abs(x[key][i]-y[key][i])).toBeLessThan(1e-9);
    expect(x.slipping).toBe(y.slipping);
  }
  for(const key of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(a[key]-b[key])).toBeLessThan(1e-9);
}
describe('bounded shared passive work correction; no World insertion',()=>{
  it('retains the first order-dependent sub-cap sticking failure, even at 256 passes',()=>{
    const {input}=paired[0],g=sharedWorkFrames(input),forward=sharedGripForce(g,input.mobility),back=sharedGripForce([...g].reverse(),input.mobility),
      long=sharedGripForce(g,input.mobility,'channel',256),longBack=sharedGripForce([...g].reverse(),input.mobility,'channel',256);
    expect(forward.rows[0].tangent).toBeCloseTo(252.73379290618823,9);expect(back.rows[1].tangent).toBe(0);
    expect(long.rows.map(r=>r.tangent)).toEqual(forward.rows.map(r=>r.tangent));expect(longBack.rows.map(r=>r.tangent)).toEqual(back.rows.map(r=>r.tangent));
    expect(forward.targetResidual).toBeGreaterThan(.1);expect(back.targetResidual).toBeGreaterThan(.1);
    expect(forward.passivePower).toBeLessThanOrEqual(1e-8);expect(back.passivePower).toBeLessThanOrEqual(1e-8);
  });
  it.each(paired)('satisfies independent force/slide conditions in both orders: $id',(c:any)=>{
    const frames=sharedWorkFrames(c.input),saved=structuredClone(frames);
    for(const g of [frames,[...frames].reverse()]){
      const a=sharedGripForce(g,c.input.mobility,'coupled'),b=tangentBoxReference(g,c.input.mobility);
      expect(a.passes).toBeLessThanOrEqual(256);expect(a.targetResidual).toBeLessThanOrEqual(1e-10);expect(a.passivePower).toBeLessThanOrEqual(1e-8);
      expect(a.graphFraction).toBe(1);expect(norm(a.load,b.load)).toBeLessThan(1e-9);
      for(let k=0;k<g.length;k++){
        const r=a.rows[k];expect(r.normal).toBe(0);expect(Math.abs(r.tangent-b.force[k])).toBeLessThan(1e-9);expect(Math.abs(r.tangent)).toBeLessThanOrEqual(g[k].capacity);
        if(Math.abs(r.tangent)<g[k].capacity-1e-9)expect(Math.abs(b.slip[k])).toBeLessThan(1e-10);
        else expect(r.tangent*b.slip[k]).toBeLessThanOrEqual(1e-9);
      }
    }
    expect(frames).toEqual(saved);
  });
  it('keeps isolated tangent, normal-only and noninteracting contacts unchanged',()=>{
    const tangent=sharedWorkFrames(cases.find(c=>c.id.endsWith('-single')).input),mu=cases[0].input.mobility,
      simple:SharedGripFrame={nx:1,ny:0,vn:.2,vt:0,xx:.6,xy:0,yy:.6,capacity:500,inverseMass:.02},
      orthogonal=[{...simple,vn:-1,vt:-.2},{...simple,nx:0,ny:1,vn:-1,vt:.1}];
    for(const g of [tangent,[simple],orthogonal]){
      const a=sharedGripForce(g,mu),b=sharedGripForce(g,mu,'coupled');
      expect(norm(a.load,b.load)).toBeLessThan(1e-9);expect(Math.abs(a.passivePower-b.passivePower)).toBeLessThan(1e-9);
      for(let k=0;k<g.length;k++){expect(Math.abs(a.rows[k].normal-b.rows[k].normal)).toBeLessThan(1e-9);expect(Math.abs(a.rows[k].tangent-b.rows[k].tangent)).toBeLessThan(1e-9);}
    }
  });
  it('handles zero and tiny capacities without creating force or work',()=>{
    const mu=cases[0].input.mobility;
    for(const capacity of [0,1e-12,1e-6]){
      const g=sharedWorkFrames(cases[0].input).map(v=>({...v,capacity})),a=sharedGripForce(g,mu,'coupled'),b=tangentBoxReference(g,mu);
      for(let k=0;k<g.length;k++){expect(Number.isFinite(a.rows[k].tangent)).toBe(true);expect(Math.abs(a.rows[k].tangent)).toBeLessThanOrEqual(capacity);
        expect(Math.abs(a.rows[k].tangent-b.force[k])).toBeLessThan(1e-11);}
      expect(a.passivePower).toBeLessThanOrEqual(1e-12);
    }
  });
  it('refuses nonzero stored-span bias, unconverged targets and a degenerate reference',()=>{
    const g=sharedWorkFrames(cases[0].input),mu=cases[0].input.mobility,saved=structuredClone(g);
    expect(()=>sharedGripForce(g.map(v=>({...v,normalBias:.1})),mu,'coupled')).toThrow('zero span bias');
    expect(()=>sharedGripForce(g,mu,'coupled',1)).toThrow('constitutive budget');
    expect(()=>sharedGripForce(g,mu,'coupled',257)).toThrow('iteration budget');
    expect(()=>tangentBoxReference([g[0],g[0]],mu)).toThrow('Non-unique');
    expect(g).toEqual(saved);
  });
  it.each(cases)('carries the correction through short moving geometry: $id',(c:any)=>{
    // The unequal-share witness changes phase before 100 us; keep that
    // refusal below and use a predeclared 20-us in-scope interval here.
    const input=sharedWorkInput(c.input,c.id.endsWith('-unequal')?.00002:.0001),saved=structuredClone(input),
      a=sharedWorkMotion(input,'coupled',2,'rk8'),b=sharedWorkMotion(input,'reference',128,'rk4'),fine=sharedWorkMotion(input,'reference',256,'rk4');
    checkMotion(a,b);checkMotion(b,fine);expect(input).toEqual(saved);
    expect(a.maximumForceError).toBeLessThan(1e-9);expect(a.maximumTargetResidual).toBeLessThanOrEqual(1e-10);
    expect(a.maximumCapacityExcess).toBe(0);expect(a.maximumPassivePower).toBeLessThanOrEqual(1e-8);
    expect(Math.abs(a.workResidual)).toBeLessThan(1e-8);expect(Math.abs(a.angularResidual)).toBeLessThan(1e-7);
    expect(a.representationError).toBeLessThan(1e-10);expect(a.linearResidual).toBeLessThan(1e-10);
    for(let k=0;k<a.grips.length;k++)expect(a.grips[k].dose).toBeLessThanOrEqual(input.grips[k].capacity*input.duration+1e-12);
  });
  it('preserves row reversal, reflection and unequal partitions on the moving witness',()=>{
    const input=sharedWorkInput(cases[0].input),a=sharedWorkMotion(input,'coupled',2,'rk8'),
      reversed=sharedWorkMotion({...input,grips:[...input.grips].reverse()},'coupled',2,'rk8');
    checkMotion(a,{...reversed,grips:[...reversed.grips].reverse()});
    const mirrored=sharedWorkMotion(sharedWorkInput(cases[1].input),'coupled',2,'rk8');
    for(let k=0;k<a.bodies.length;k++){expect(a.bodies[k].pos.x).toBeCloseTo(mirrored.bodies[k].pos.x,12);
      expect(a.bodies[k].pos.y).toBeCloseTo(-mirrored.bodies[k].pos.y,12);expect(a.bodies[k].spin).toBeCloseTo(-mirrored.bodies[k].spin,12);}
    const h=.000037,first=sharedWorkMotion({...input,duration:h},'coupled',2,'rk8'),
      last=sharedWorkMotion({...input,duration:input.duration-h,bodies:first.bodies,grips:first.grips,footOffset:first.footOffset},'coupled',2,'rk8');
    for(let k=0;k<a.bodies.length;k++){expect(norm(a.bodies[k].pos,last.bodies[k].pos)).toBeLessThan(5e-10);
      expect(Math.abs(a.bodies[k].spin-last.bodies[k].spin)).toBeLessThan(2.5e-7);}
    expect(norm(a.footOffset,last.footOffset)).toBeLessThan(5e-10);
    for(let k=0;k<a.grips.length;k++){
      const x=a.grips[k],y=first.grips[k],z=last.grips[k];expect(norm(x.material,z.material)).toBeLessThan(5e-10);
      expect(Math.abs(x.legs-z.legs)).toBeLessThan(1e-9);expect(Math.abs(x.dose-y.dose-z.dose)).toBeLessThan(1e-9);
      for(const axis of ['x','y'] as const){expect(Math.abs(x.impulse[axis]-y.impulse[axis]-z.impulse[axis])).toBeLessThan(1e-9);
        expect(Math.abs(x.moment[axis]-y.moment[axis]-(input.duration-h)*y.impulse[axis]-z.moment[axis])).toBeLessThan(1e-9);}
      for(let j=0;j<2;j++){expect(Math.abs(x.angularImpulse[j]-y.angularImpulse[j]-z.angularImpulse[j])).toBeLessThan(1e-9);
        expect(Math.abs(x.angularMoment[j]-y.angularMoment[j]-(input.duration-h)*y.angularImpulse[j]-z.angularMoment[j])).toBeLessThan(1e-9);}
    }
    for(const key of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(a[key]-first[key]-last[key])).toBeLessThan(1e-9);
  });
  it('retains the 100-us unequal-share phase refusal without changing inputs',()=>{
    const input=sharedWorkInput(cases.find(c=>c.id.endsWith('-unequal')).input),saved=structuredClone(input);
    for(const mode of ['coupled','reference'] as const)expect(()=>sharedWorkMotion(input,mode,128,'rk4')).toThrow('motion phase');
    expect(input).toEqual(saved);
  });
});
