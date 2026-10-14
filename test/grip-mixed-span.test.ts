import {describe,it,expect} from 'vitest';
import {mixedSpanInputs} from '../scripts/diag/physics/grip-mixed-span-inputs.js';
import {spanForce,orderedSpanTarget} from '../scripts/diag/physics/grip-mixed-span-force.js';
import {spanReferenceForce} from '../scripts/diag/physics/grip-mixed-span-reference-force.js';
import {mixedSpanModel,mixedSpanDifference} from '../scripts/diag/physics/grip-mixed-span-model.js';
import {mixedSpanInterval} from '../scripts/diag/physics/grip-mixed-span-interval.js';
import {mixedSpanReference} from '../scripts/diag/physics/grip-mixed-span-reference.js';
import {radialSpanReference} from '../scripts/diag/physics/grip-span-accounting.js';
const cases=mixedSpanInputs(),norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
describe('one passive mixed grip with stored span energy, diagnostic only',()=>{
  it.each(cases)('matches independent force/time reference and complete energy accounting: $id',(c)=>{
    const saved=structuredClone(c.input),a=mixedSpanInterval(c.input),b=mixedSpanReference(c.input,128),f=mixedSpanReference(c.input,256);
    expect(mixedSpanDifference(b,f)).toBeLessThanOrEqual(1/16);expect(mixedSpanDifference(a,f)).toBeLessThanOrEqual(1/16);expect(c.input).toEqual(saved);
    expect(a.error).toBeLessThanOrEqual(1/16);expect(Math.abs(a.workResidual)).toBeLessThan(1e-8);expect(Math.abs(a.spanResidual)).toBeLessThan(1e-9);
    expect(Math.abs(a.energyResidual)).toBeLessThan(1e-8);expect(Math.abs(a.motorCompositionResidual)).toBeLessThan(1e-10);
    expect(Math.abs(a.angularResidual)).toBeLessThan(1e-7);expect(a.representationError).toBeLessThan(1e-10);expect(a.maximumTargetResidual).toBeLessThan(1e-11);
    expect(a.maximumCapacityRatio).toBeLessThan(.98);expect(a.dose).toBeLessThanOrEqual(c.input.capacity*c.input.duration+1e-12);
    expect(a.evaluations).toBeLessThanOrEqual(4096);expect(a.hold).toBe(c.input.hold);expect(a.legs).toBe(c.input.legs);
  });
  it('keeps the existing eight-pass targets below cap, rather than choosing a new allocator',()=>{
    for(const c of cases){const m=mixedSpanModel(c.input,spanForce),g=m.frame(m.initial),q={vn:g.vn,vt:g.vt,nn:g.nn,nt:g.nt,tt:g.tt,
      inverseMass:1/c.input.a.mass+1/c.input.b.mass,extension:g.e,capacity:c.input.capacity},a=spanForce(q),b=orderedSpanTarget(q),f=spanReferenceForce(q);
      expect(a.normal).toBeCloseTo(b.normal,10);expect(a.tangent).toBeCloseTo(b.tangent,10);
      expect(a.normal).toBeCloseTo(f.normal,10);expect(a.tangent).toBeCloseTo(f.tangent,10);}
  });
  it('accounts for one common motor while both loading and returning spring energy',()=>{
    const load=mixedSpanInterval(cases.find(c=>c.id==='curved-mixed')!.input),release=mixedSpanInterval(cases.find(c=>c.id==='curved-return')!.input);
    expect(load.springEnergy).toBeGreaterThan(load.initialSpringEnergy);expect(load.motorCrossWork).toBeGreaterThan(0);
    expect(release.springEnergy).toBeLessThan(release.initialSpringEnergy);expect(release.motorCrossWork).toBeLessThan(0);expect(release.passiveWork).toBeGreaterThan(0);
    for(const a of [load,release]){expect(a.passiveWork+a.springWork+a.dampingLoss).toBeCloseTo(0,12);
      expect(a.motorWork-a.separateMotorWork).toBeCloseTo(a.motorCrossWork,12);}
    const zero=mixedSpanInterval(cases.find(c=>c.id==='zero-span-control')!.input);expect(zero.bodyWork).toBe(0);expect(zero.motorWork).toBe(0);expect(zero.dose).toBe(0);
  });
  it('independently matches PR38 radial spring/attachment/effort reference at 200us',()=>{
    const input=cases.find(c=>c.id==='radial-control')!.input,m=mixedSpanModel(input,spanForce),g=m.frame(m.initial),a=mixedSpanInterval(input),
      dot=(p:{x:number;y:number})=>p.x*g.nx+p.y*g.ny,
      r=radialSpanReference({massA:input.a.mass,massB:input.b.mass,capacity:input.capacity,share:input.legs,mobility:input.mobility,
        limit:input.attachmentReach,separation:dot({x:input.b.pos.x-input.a.pos.x,y:input.b.pos.y-input.a.pos.y}),
        material:dot({x:g.c*input.material.x-g.s*input.material.y,y:g.s*input.material.x+g.c*input.material.y}),hold:input.hold,velocity:0,duration:input.duration},256);
    expect(Math.abs(a.dose-r.dose)).toBeLessThan(1e-9/16);expect(Math.abs(a.moment.x*g.nx+a.moment.y*g.ny-r.moment)).toBeLessThan(5e-10/16);
    expect(Math.abs(a.bodyWork-r.bodyWork)).toBeLessThan(1e-9/16);expect(Math.abs(a.motorWork-r.motorWork)).toBeLessThan(1e-9/16);
    expect(Math.abs(a.springEnergy-r.energy)).toBeLessThan(1e-9/16);
  });
  it('preserves mirrors and proper rotations of loaded curved contact',()=>{
    const input=cases.find(c=>c.id==='curved-return')!.input,a=mixedSpanInterval(input),angle=.7,
      rotate=(p:{x:number;y:number})=>({x:Math.cos(angle)*p.x-Math.sin(angle)*p.y,y:Math.sin(angle)*p.x+Math.cos(angle)*p.y}),
      b=mixedSpanInterval({...input,a:{...input.a,pos:rotate(input.a.pos),vel:rotate(input.a.vel),facing:input.a.facing+angle},
        b:{...input.b,pos:rotate(input.b.pos),vel:rotate(input.b.vel),facing:input.b.facing+angle},footOffset:rotate(input.footOffset)}),
      mirror=(p:{x:number;y:number})=>({x:p.x,y:-p.y}),c=mixedSpanInterval({...input,
        a:{...input.a,pos:mirror(input.a.pos),vel:mirror(input.a.vel),facing:-input.a.facing,spin:-input.a.spin},
        b:{...input.b,pos:mirror(input.b.pos),vel:mirror(input.b.vel),facing:-input.b.facing,spin:-input.b.spin},material:mirror(input.material),footOffset:mirror(input.footOffset)});
    for(const p of ['a','b'] as const){expect(norm(rotate(a[p].pos),b[p].pos)).toBeLessThan(5e-10);expect(norm(mirror(a[p].pos),c[p].pos)).toBeLessThan(5e-10);
      expect(Math.abs(a[p].spin+c[p].spin)).toBeLessThan(2.5e-7);expect(Math.abs(a[p].facing+angle-b[p].facing)).toBeLessThan(2.5e-9);}
    for(const p of ['bodyWork','motorWork','springWork','dampingLoss','dose'] as const){expect(Math.abs(a[p]-b[p])).toBeLessThan(1e-9);expect(Math.abs(a[p]-c[p])).toBeLessThan(1e-9);}
  });
  it('composes unequal intervals without duplicating spring energy, dose or temporal moment',()=>{
    const input=cases.find(c=>c.id==='curved-mixed')!.input,H=input.duration,h=.000037,a=mixedSpanInterval(input),first=mixedSpanInterval({...input,duration:h}),
      last=mixedSpanInterval({...input,duration:H-h,a:first.a,b:first.b,material:first.material,footOffset:first.footOffset}),
      add=(x:{x:number;y:number},y:{x:number;y:number})=>({x:x.x+y.x,y:x.y+y.y}),
      composed={...last,impulse:add(first.impulse,last.impulse),moment:{x:first.moment.x+(H-h)*first.impulse.x+last.moment.x,y:first.moment.y+(H-h)*first.impulse.y+last.moment.y},
        angularImpulse:first.angularImpulse.map((v,k)=>v+last.angularImpulse[k]),angularMoment:first.angularMoment.map((v,k)=>v+(H-h)*first.angularImpulse[k]+last.angularMoment[k])};
    for(const p of ['bodyWork','motorWork','passiveWork','motorCrossWork','separateMotorWork','springWork','dampingLoss','dose','normalImpulse','tangentImpulse','normalDose','tangentDose'] as const)
      composed[p]=first[p]+last[p];
    expect(mixedSpanDifference(a,composed)).toBeLessThanOrEqual(1/16);expect(first.springEnergy).toBeCloseTo(last.initialSpringEnergy,12);
  });
  it('refuses cap/slip, active, rest-change, invalid and excessive-time scope without input mutation',()=>{
    const input=cases[0].input,saved=structuredClone(input);
    expect(()=>mixedSpanInterval({...input,capacity:1})).toThrow('scope');expect(()=>mixedSpanInterval({...input,pullSpeed:1})).toThrow('active');
    expect(()=>mixedSpanInterval({...input,desired:{x:1,y:0}})).toThrow('active');expect(()=>mixedSpanInterval({...input,hold:1.3})).toThrow('rest event');
    expect(()=>mixedSpanInterval({...input,duration:.05})).toThrow('input scope');expect(()=>mixedSpanInterval({...input,a:{...input.a,mass:NaN}})).toThrow('input scope');
    expect(input).toEqual(saved);
  });
});
