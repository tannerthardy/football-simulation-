import {describe,it,expect} from 'vitest';
import {mixedSpanInputs} from '../scripts/diag/physics/grip-mixed-span-inputs.js';
import {mixedSpanModel,mixedSpanDifference} from '../scripts/diag/physics/grip-mixed-span-model.js';
import {spanForce} from '../scripts/diag/physics/grip-mixed-span-force.js';
import {spanEventForce} from '../scripts/diag/physics/grip-span-event-force.js';
import {spanEventInterval} from '../scripts/diag/physics/grip-span-event-interval.js';
import {spanEventReference} from '../scripts/diag/physics/grip-span-event-reference.js';
const cases=mixedSpanInputs(),H=.05/12,norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
describe('event/local mixed-span integration, isolated diagnostic',()=>{
  it.each(cases)('passes an ordinary interval against a converged independent reference: $id',c=>{
    const input={...c.input,duration:H},saved=structuredClone(input),a=spanEventInterval(input),lo=spanEventReference(input,2048),hi=spanEventReference(input,4096);
    expect(mixedSpanDifference(lo,hi)).toBeLessThanOrEqual(1/16);expect(mixedSpanDifference(a,hi)).toBeLessThanOrEqual(1/16);
    expect(input).toEqual(saved);expect(a.error).toBeLessThanOrEqual(1/32);expect(a.evaluations).toBeLessThanOrEqual(4096);
    expect(Math.abs(a.workResidual)).toBeLessThan(1e-8);expect(Math.abs(a.energyResidual)).toBeLessThan(1e-8);
    expect(Math.abs(a.spanResidual)).toBeLessThan(1e-9);expect(Math.abs(a.motorCompositionResidual)).toBeLessThan(1e-10);
    expect(Math.abs(a.angularResidual)).toBeLessThan(1e-7);expect(a.representationError).toBeLessThan(1e-10);
    expect(a.maximumCapacityRatio).toBeLessThan(.98);expect(a.dose).toBeLessThanOrEqual(input.capacity*H+1e-12);
    expect(a.legs).toBe(input.legs);expect(a.hold).toBe(input.hold);
    expect(a.events).toHaveLength(c.id==='curved-return'?1:0);expect(hi.events).toHaveLength(a.events.length);
    if(a.events.length){expect(Math.abs(a.events[0].time-hi.events[0].time)).toBeLessThan(1e-10);
      expect(a.events[0].time).toBeGreaterThan(.000805);expect(a.events[0].time).toBeLessThan(.000807);}
  });
  it('prepares the same force algebra while retaining the model cap/target/power guard',()=>{
    for(const c of cases){const m=mixedSpanModel(c.input,spanForce),g=m.frame(m.initial),q={vn:g.vn,vt:g.vt,nn:g.nn,nt:g.nt,tt:g.tt,
      inverseMass:1/c.input.a.mass+1/c.input.b.mass,extension:g.e,capacity:c.input.capacity},f=spanEventForce(q.inverseMass),a=spanForce(q),b=f(q);
      expect(b.normal).toBe(a.normal);expect(b.tangent).toBe(a.tangent);
      expect(()=>f({...q,tt:0})).toThrow('force input');expect(()=>f({...q,vn:NaN})).toThrow('force input');
      if(a.total>=.98)expect(()=>mixedSpanModel({...c.input,capacity:1},f)).toThrow('cap/target/power scope');
      else expect(()=>mixedSpanModel({...c.input,capacity:1},f)).not.toThrow();}
  });
  it('preserves mirrors and rotations through the reversal, including absolute channel doses',()=>{
    const input={...cases.find(c=>c.id==='curved-return')!.input,duration:H},a=spanEventInterval(input),angle=.7,
      rotate=(p:{x:number;y:number})=>({x:Math.cos(angle)*p.x-Math.sin(angle)*p.y,y:Math.sin(angle)*p.x+Math.cos(angle)*p.y}),
      b=spanEventInterval({...input,a:{...input.a,pos:rotate(input.a.pos),vel:rotate(input.a.vel),facing:input.a.facing+angle},
        b:{...input.b,pos:rotate(input.b.pos),vel:rotate(input.b.vel),facing:input.b.facing+angle},footOffset:rotate(input.footOffset)}),
      mirror=(p:{x:number;y:number})=>({x:p.x,y:-p.y}),c=spanEventInterval({...input,
        a:{...input.a,pos:mirror(input.a.pos),vel:mirror(input.a.vel),facing:-input.a.facing,spin:-input.a.spin},
        b:{...input.b,pos:mirror(input.b.pos),vel:mirror(input.b.vel),facing:-input.b.facing,spin:-input.b.spin},material:mirror(input.material),footOffset:mirror(input.footOffset)});
    for(const p of ['a','b'] as const){expect(norm(rotate(a[p].pos),b[p].pos)).toBeLessThan(5e-10/16);expect(norm(mirror(a[p].pos),c[p].pos)).toBeLessThan(5e-10/16);
      expect(Math.abs(a[p].spin+c[p].spin)).toBeLessThan(2.5e-7/16);expect(Math.abs(a[p].facing+angle-b[p].facing)).toBeLessThan(2.5e-9/16);}
    expect(norm(a.material,b.material)).toBeLessThan(5e-10/16);expect(norm(mirror(a.material),c.material)).toBeLessThan(5e-10/16);
    for(const p of ['footOffset','point','impulse','moment'] as const){expect(norm(rotate(a[p]),b[p])).toBeLessThan(5e-10/16);expect(norm(mirror(a[p]),c[p])).toBeLessThan(5e-10/16);}
    for(const p of ['bodyWork','motorWork','springWork','dampingLoss','dose','normalDose','tangentDose'] as const){
      expect(Math.abs(a[p]-b[p])).toBeLessThan(1e-9/16);expect(Math.abs(a[p]-c[p])).toBeLessThan(1e-9/16);}
    expect(b.events).toHaveLength(1);expect(c.events).toHaveLength(1);
    expect(Math.abs(a.events[0].time-b.events[0].time)).toBeLessThan(1e-10);expect(Math.abs(a.events[0].time-c.events[0].time)).toBeLessThan(1e-10);
  });
  it('composes unequal intervals on opposite sides of reversal without duplicating energy, work or effort',()=>{
    const input={...cases.find(c=>c.id==='curved-return')!.input,duration:H},h=.0007,a=spanEventInterval(input),first=spanEventInterval({...input,duration:h}),
      last=spanEventInterval({...input,duration:H-h,a:first.a,b:first.b,material:first.material,footOffset:first.footOffset}),
      add=(x:{x:number;y:number},y:{x:number;y:number})=>({x:x.x+y.x,y:x.y+y.y}),
      composed={...last,impulse:add(first.impulse,last.impulse),moment:{x:first.moment.x+(H-h)*first.impulse.x+last.moment.x,y:first.moment.y+(H-h)*first.impulse.y+last.moment.y},
        angularImpulse:first.angularImpulse.map((v,k)=>v+last.angularImpulse[k]),angularMoment:first.angularMoment.map((v,k)=>v+(H-h)*first.angularImpulse[k]+last.angularMoment[k])};
    for(const p of ['bodyWork','motorWork','passiveWork','motorCrossWork','separateMotorWork','springWork','dampingLoss','dose','normalImpulse','tangentImpulse','normalDose','tangentDose'] as const)
      composed[p]=first[p]+last[p];
    expect(mixedSpanDifference(a,composed)).toBeLessThanOrEqual(1/16);expect(first.springEnergy).toBeCloseTo(last.initialSpringEnergy,12);
    expect(first.events).toHaveLength(0);expect(last.events).toHaveLength(1);
    expect(Math.abs(a.events[0].time-h-last.events[0].time)).toBeLessThan(1e-10);
  });
  it('keeps zero and tiny loads finite without manufacturing reversal events',()=>{
    const input={...cases.find(c=>c.id==='zero-span-control')!.input,duration:H},m=mixedSpanModel(input,spanForce),g=m.frame(m.initial),
      tiny={...input,b:{...input.b,pos:{x:input.b.pos.x+1e-10*g.nx,y:input.b.pos.y+1e-10*g.ny}}},a=spanEventInterval(tiny),lo=spanEventReference(tiny,32),hi=spanEventReference(tiny,64);
    expect(mixedSpanDifference(lo,hi)).toBeLessThanOrEqual(1/16);expect(mixedSpanDifference(a,hi)).toBeLessThanOrEqual(1/16);
    expect(a.events).toHaveLength(0);expect(Number.isFinite(a.energyResidual)).toBe(true);expect(a.dose).toBeGreaterThan(0);
    const zero=spanEventInterval(input);expect(zero.dose).toBe(0);expect(zero.bodyWork).toBe(0);expect(zero.events).toHaveLength(0);
  });
  it('refuses unsupported active, cap/slip, rest and time scopes without mutating input',()=>{
    const input=cases[0].input,saved=structuredClone(input);
    expect(()=>spanEventInterval({...input,capacity:1})).toThrow('scope');expect(()=>spanEventInterval({...input,pullSpeed:1})).toThrow('active');
    expect(()=>spanEventInterval({...input,desired:{x:1,y:0}})).toThrow('active');expect(()=>spanEventInterval({...input,hold:1.3})).toThrow('rest event');
    expect(()=>spanEventInterval({...input,duration:.05})).toThrow('input scope');expect(()=>spanEventInterval({...input,a:{...input.a,mass:NaN}})).toThrow('force input');
    expect(input).toEqual(saved);
  });
});
