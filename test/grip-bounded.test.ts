import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {boundedGripInterval,type BoundedGripInput} from '../scripts/diag/physics/grip-force-bounded.js';
const fixture:{cases:Array<{id:string;input:BoundedGripInput;reference:Record<string,any>;convergence:{converged:boolean}}>}=
  JSON.parse(readFileSync(new URL('../config/grip-bounded-reference.json',import.meta.url),'utf8'));
const norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
describe('acquired bounded partial-share tangent integration, diagnostic only',()=>{
  it.each(fixture.cases.flatMap(c=>(['uniform','adaptive','gauss','eliminated'] as const).map(integration=>({...c,integration}))))
    ('matches independent World motion, attachment and work: $id / $integration',({input,reference:z,convergence,integration})=>{
    const original=structuredClone(input),r=boundedGripInterval(input,integration);expect(input).toEqual(original);
    expect(convergence.converged).toBe(true);
    for(const k of ['a','b'] as const){expect(norm(r[k].pos,z[k].pos)).toBeLessThan(5e-7);
      expect(norm(r[k].vel,z[k].vel)).toBeLessThan(2.5e-5);expect(Math.abs(r[k].facing-z[k].facing)).toBeLessThan(2.5e-6);
      expect(Math.abs(r[k].spin-z[k].spin)).toBeLessThan(2.5e-4);}
    for(const k of ['point','material','footOffset','impulse','moment'] as const)
      expect(norm(r[k],z[k])).toBeLessThan(k==='impulse'?.002:k==='moment'?.00005:5e-7);
    for(const k of ['angularImpulse','angularMoment'] as const)for(const i of [0,1])
      expect(Math.abs(r[k][i]-z[k][i])).toBeLessThan(k==='angularImpulse'?.0005:.000005);
    expect(Math.abs(r.legs-z.legs)).toBeLessThan(1e-6);expect(Math.abs(r.hold-z.hold)).toBeLessThan(5e-7);
    expect(r.slipping).toBe(z.slipping);
    for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(r[k]-z[k])).toBeLessThan(.01);
    expect(Math.abs(r.workResidual)).toBeLessThanOrEqual(1e-8);expect(Math.abs(r.angularResidual)).toBeLessThanOrEqual(1e-7);
    expect(r.passiveWork).toBeLessThanOrEqual(1e-9);expect(r.dose).toBeLessThanOrEqual(input.capacity*input.duration+1e-9);
    expect(r.representationError).toBeLessThan(1e-10);
    expect(r.legs).toBeCloseTo(1-(1-input.legs)*Math.exp(-r.slidingUntil/.3),10);
  });
  it.each(['adaptive','gauss','eliminated'] as const)('composes unequal intervals across cap exit and the 98% slip marker: %s',(integration)=>{
    const input=fixture.cases[0].input,whole=boundedGripInterval(input,integration),h=.002315,
      first=boundedGripInterval({...input,duration:h},integration),second=boundedGripInterval({...input,a:first.a,b:first.b,
        material:first.material,footOffset:first.footOffset,legs:first.legs,hold:first.hold,duration:input.duration-h},integration);
    for(const k of ['a','b'] as const){expect(norm(whole[k].pos,second[k].pos)).toBeLessThan(5e-7);
      expect(norm(whole[k].vel,second[k].vel)).toBeLessThan(2.5e-5);expect(Math.abs(whole[k].facing-second[k].facing)).toBeLessThan(2.5e-6);
      expect(Math.abs(whole[k].spin-second[k].spin)).toBeLessThan(2.5e-4);}
    for(const k of ['x','y'] as const){expect(Math.abs(whole.impulse[k]-first.impulse[k]-second.impulse[k])).toBeLessThan(.002);
      expect(Math.abs(whole.moment[k]-first.moment[k]-(input.duration-h)*first.impulse[k]-second.moment[k])).toBeLessThan(.00005);}
    expect(norm(whole.point,second.point)).toBeLessThan(5e-7);expect(Math.abs(whole.legs-second.legs)).toBeLessThan(1e-6);
    for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(whole[k]-first[k]-second[k])).toBeLessThan(.01);
  });
  it.each(['adaptive','gauss','eliminated'] as const)('rotates the anisotropic material Jacobian with the body and the foot in world coordinates: %s',(integration)=>{
    const input=fixture.cases.find(c=>c.id.endsWith('1-offset'))!.input,angle=.7,
      rotate=(v:{x:number;y:number})=>({x:Math.cos(angle)*v.x-Math.sin(angle)*v.y,y:Math.sin(angle)*v.x+Math.cos(angle)*v.y}),
      particle=(p:typeof input.a)=>({...p,pos:rotate(p.pos),vel:rotate(p.vel),facing:p.facing+angle}),
      r=boundedGripInterval(input,integration),z=boundedGripInterval({...input,a:particle(input.a),b:particle(input.b),footOffset:rotate(input.footOffset)},integration);
    for(const k of ['a','b'] as const){expect(norm(z[k].pos,rotate(r[k].pos))).toBeLessThan(5e-7);
      expect(norm(z[k].vel,rotate(r[k].vel))).toBeLessThan(2.5e-5);expect(Math.abs(z[k].facing-r[k].facing-angle)).toBeLessThan(2.5e-6);
      expect(Math.abs(z[k].spin-r[k].spin)).toBeLessThan(2.5e-4);}
    expect(norm(z.material,r.material)).toBeLessThan(5e-7);expect(norm(z.footOffset,rotate(r.footOffset))).toBeLessThan(5e-7);
    expect(norm(z.point,rotate(r.point))).toBeLessThan(5e-7);
    for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(z[k]-r[k])).toBeLessThan(.01);
  });
  it.each(['adaptive','gauss','eliminated'] as const)('does not manufacture a reaction or lose finiteness for zero/tiny capacity: %s',(integration)=>{
    for(const capacity of [0,1e-12,1e-9]){const input={...fixture.cases[0].input,capacity},r=boundedGripInterval(input,integration);
      expect(r.dose).toBeLessThanOrEqual(capacity*input.duration+1e-20);expect(norm(r.impulse,{x:0,y:0})).toBeLessThanOrEqual(r.dose+1e-20);
      expect(Number.isFinite(r.motorWork)).toBe(true);expect(r.passiveWork).toBeLessThanOrEqual(1e-12);}
  });
  it.each(['adaptive','gauss','eliminated'] as const)('refuses new normal, reel, active motor and over-reach channels: %s',(integration)=>{
    const input=fixture.cases[0].input;
    expect(()=>boundedGripInterval({...input,pullSpeed:20},integration)).toThrow('Normal/reel channel');
    expect(()=>boundedGripInterval({...input,desired:{x:1,y:0}},integration)).toThrow('Active motor');
    expect(()=>boundedGripInterval({...input,hold:2},integration)).toThrow('Invalid bounded-grip');
    expect(()=>boundedGripInterval({...input,b:{...input.b,vel:{x:0,y:-10}}},integration)).toThrow('Normal/reel channel');
  });
});
