import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {mixedGripInterval,mixedSupportForce} from '../scripts/diag/physics/grip-force-mixed.js';
import {boundedGripInterval,type BoundedGripInput} from '../scripts/diag/physics/grip-force-bounded.js';
const fixture:{cases:Array<{id:string;input:BoundedGripInput;reference:Record<string,any>;
  physical:boolean;convergence:{converged:boolean}}>}=
  JSON.parse(readFileSync(new URL('../config/grip-mixed-reference.json',import.meta.url),'utf8')),
  tangent:{cases:Array<{id:string;input:BoundedGripInput}>}=
  JSON.parse(readFileSync(new URL('../config/grip-bounded-reference.json',import.meta.url),'utf8'));
const norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
describe('bounded changing-share mixed grip, diagnostic only',()=>{
  it.each(fixture.cases.flatMap(c=>(['uniform','adaptive'] as const).map(integration=>({...c,integration}))))
    ('matches independent World motion, shared budget, attachments and work: $id / $integration',({input,reference:z,physical,convergence,integration})=>{
      const saved=structuredClone(input),r=mixedGripInterval(input,integration);
      expect(input).toEqual(saved);expect(physical&&convergence.converged).toBe(true);expect(r.method).toBe('mixed-rk4');
      for(const k of ['a','b'] as const){expect(norm(r[k].pos,z[k].pos)).toBeLessThan(5e-7);
        expect(norm(r[k].vel,z[k].vel)).toBeLessThan(2.5e-5);expect(Math.abs(r[k].facing-z[k].facing)).toBeLessThan(2.5e-6);
        expect(Math.abs(r[k].spin-z[k].spin)).toBeLessThan(2.5e-4);}
      for(const k of ['point','material','footOffset','impulse','moment'] as const)
        expect(norm(r[k],z[k])).toBeLessThan(k==='impulse'?.002:k==='moment'?.00005:5e-7);
      for(const k of ['angularImpulse','angularMoment'] as const)for(const i of [0,1])
        expect(Math.abs(r[k][i]-z[k][i])).toBeLessThan(k==='angularImpulse'?.0005:.000005);
      expect(Math.abs(r.legs-z.legs)).toBeLessThan(1e-6);expect(Math.abs(r.hold-z.hold)).toBeLessThan(5e-7);
      expect(r.slipping).toBe(true);expect(r.legs).toBeCloseTo(1-(1-input.legs)*Math.exp(-input.duration/.3),10);
      expect(r.normalImpulse).toBeLessThan(0);expect(Math.abs(r.tangentImpulse??0)).toBeCloseTo(Math.abs(z.tangentImpulse),3);
      for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(r[k]-z[k])).toBeLessThan(.01);
      expect(Math.abs(r.workResidual)).toBeLessThanOrEqual(1e-8);expect(Math.abs(r.angularResidual)).toBeLessThanOrEqual(1e-7);
      expect(r.representationError).toBeLessThan(1e-10);expect(r.passiveWork).toBeLessThanOrEqual(1e-9);
      expect(r.dose).toBeLessThanOrEqual(input.capacity*input.duration+1e-9);
      if(r.method==='mixed-rk4'){
        expect(r.maximumCapacityExcess).toBeLessThan(1e-9);
        if(r.adaptiveAccounting){expect(r.adaptiveAccounting.estimatedErrorSum).toBeLessThanOrEqual(1/(16*r.partitions));
          expect(r.adaptiveAccounting.absoluteWorkDriftSum).toBeLessThanOrEqual(1e-8/(8*r.partitions));}}
    });
  it('preserves a shared vector cap and the analytic unsaturated coupled channels',()=>{
    const K=.02,C=2000,mu=.002,d=2*.8*2*Math.PI*6/K,vn=.6*C*(1+d*mu)/d,
      saturated=mixedSupportForce(vn,100,mu,0,mu,K,C);
    expect(saturated.normal).toBeCloseTo(-.6*C,10);expect(saturated.tangent).toBeCloseTo(-.8*C,10);
    expect(Math.hypot(saturated.normal,saturated.tangent)).toBeCloseTo(C,10);
    const nn=.002,nt=.0003,tt=.001,a00=nn+1/d,det=a00*tt-nt*nt,
      expected={normal:(-tt+nt*.5)/det,tangent:(nt-a00*.5)/det},r=mixedSupportForce(1,.5,nn,nt,tt,K,C);
    expect(Math.abs(r.normal-expected.normal)).toBeLessThan(1e-8);expect(Math.abs(r.tangent-expected.tangent)).toBeLessThan(1e-8);
    expect(Math.hypot(r.normal,r.tangent)).toBeLessThan(C);
    expect(r.normal*(1+nn*r.normal+nt*r.tangent)+r.tangent*(.5+nt*r.normal+tt*r.tangent)).toBeLessThan(0);
  });
  it.each(tangent.cases)('retains the complete existing tangent result: $id',({input})=>{
    const {method,normalImpulse,tangentImpulse,...r}=mixedGripInterval(input,'adaptive');
    expect(method).toBe('existing-tangent');expect(normalImpulse).toBe(0);expect(tangentImpulse).toBeUndefined();
    expect(r).toEqual(boundedGripInterval(input,'capped'));
  });
  it.each(['uniform','adaptive'] as const)('composes unequal intervals through moving arms and work: %s',(integration)=>{
    const input=fixture.cases.find(c=>c.id.endsWith('mixed-0.3'))!.input,h=.0013,whole=mixedGripInterval(input,integration),
      first=mixedGripInterval({...input,duration:h},integration),second=mixedGripInterval({...input,a:first.a,b:first.b,
        material:first.material,footOffset:first.footOffset,hold:first.hold,legs:first.legs,duration:input.duration-h},integration);
    for(const k of ['a','b'] as const){expect(norm(whole[k].pos,second[k].pos)).toBeLessThan(5e-7);
      expect(norm(whole[k].vel,second[k].vel)).toBeLessThan(2.5e-5);expect(Math.abs(whole[k].facing-second[k].facing)).toBeLessThan(2.5e-6);
      expect(Math.abs(whole[k].spin-second[k].spin)).toBeLessThan(2.5e-4);}
    for(const k of ['point','material','footOffset'] as const)expect(norm(whole[k],second[k])).toBeLessThan(5e-7);
    expect(Math.abs(whole.legs-second.legs)).toBeLessThan(1e-6);
    for(const k of ['x','y'] as const){expect(Math.abs(whole.impulse[k]-first.impulse[k]-second.impulse[k])).toBeLessThan(.002);
      expect(Math.abs(whole.moment[k]-first.moment[k]-(input.duration-h)*first.impulse[k]-second.moment[k])).toBeLessThan(.00005);}
    for(const i of [0,1]){
      expect(Math.abs(whole.angularImpulse[i]-first.angularImpulse[i]-second.angularImpulse[i])).toBeLessThan(.0005);
      expect(Math.abs(whole.angularMoment[i]-first.angularMoment[i]-(input.duration-h)*first.angularImpulse[i]-second.angularMoment[i])).toBeLessThan(.000005);}
    for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(whole[k]-first[k]-second[k])).toBeLessThan(.01);
  });
  it.each(['uniform','adaptive'] as const)('rotates both mobility directions and the moving material point: %s',(integration)=>{
    const input=fixture.cases[1].input,angle=.7,
      rotate=(v:{x:number;y:number})=>({x:Math.cos(angle)*v.x-Math.sin(angle)*v.y,y:Math.sin(angle)*v.x+Math.cos(angle)*v.y}),
      particle=(p:typeof input.a)=>({...p,pos:rotate(p.pos),vel:rotate(p.vel),facing:p.facing+angle}),
      r=mixedGripInterval(input,integration),z=mixedGripInterval({...input,a:particle(input.a),b:particle(input.b),footOffset:rotate(input.footOffset)},integration);
    for(const k of ['a','b'] as const){expect(norm(z[k].pos,rotate(r[k].pos))).toBeLessThan(5e-7);
      expect(norm(z[k].vel,rotate(r[k].vel))).toBeLessThan(2.5e-5);expect(Math.abs(z[k].facing-r[k].facing-angle)).toBeLessThan(2.5e-6);
      expect(Math.abs(z[k].spin-r[k].spin)).toBeLessThan(2.5e-4);}
    for(const k of ['point','footOffset','impulse','moment'] as const)expect(norm(z[k],rotate(r[k]))).toBeLessThan(k==='impulse'?.002:k==='moment'?.00005:5e-7);
    expect(norm(z.material,r.material)).toBeLessThan(5e-7);
    for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(z[k]-r[k])).toBeLessThan(.01);
  });
  it.each(['uniform','adaptive'] as const)('keeps zero/tiny budgets finite without manufactured force: %s',(integration)=>{
    for(const capacity of [0,1e-12,1e-9]){const input={...fixture.cases[1].input,capacity},r=mixedGripInterval(input,integration);
      expect(r.dose).toBeLessThanOrEqual(capacity*input.duration+1e-20);expect(norm(r.impulse,{x:0,y:0})).toBeLessThanOrEqual(r.dose+1e-20);
      expect(Number.isFinite(r.motorWork)).toBe(true);expect(r.passiveWork).toBeLessThanOrEqual(1e-12);}
  });
  it('refuses unsupported allocation inputs, motors, reels and slip transitions without mutating input',()=>{
    const input=fixture.cases[1].input,saved=structuredClone(input);
    expect(()=>mixedSupportForce(1,2,.001,.01,.001,.02,100)).toThrow('Invalid mixed mobility');
    expect(()=>mixedGripInterval({...input,desired:{x:1,y:0}})).toThrow('Active motor/reel');
    expect(()=>mixedGripInterval({...input,pullSpeed:20})).toThrow('Active motor/reel');
    expect(()=>mixedGripInterval({...input,capacity:10000},'adaptive')).toThrow('scope/refinement');
    expect(input).toEqual(saved);
  });
});
