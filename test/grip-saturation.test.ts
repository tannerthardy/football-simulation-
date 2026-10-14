import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {saturationGripInterval} from '../scripts/diag/physics/grip-force-saturation.js';
import {mixedGripInterval} from '../scripts/diag/physics/grip-force-mixed.js';
import {angleGripStep} from '../scripts/diag/physics/grip-angle-stages.js';
import {pressureGeometry,pressureRate} from '../scripts/diag/physics/grip-pressure-rate.js';
import {boundedGripInterval,type BoundedGripInput} from '../scripts/diag/physics/grip-force-bounded.js';
const fixture:{cases:Array<{id:string;input:BoundedGripInput;reference:Record<string,any>;
  physical:boolean;convergence:{converged:boolean}}>}=
  JSON.parse(readFileSync(new URL('../config/grip-mixed-reference.json',import.meta.url),'utf8')),
  fresh:typeof fixture=JSON.parse(readFileSync(new URL('../config/grip-saturation-reference.json',import.meta.url),'utf8')),
  tangent:{cases:Array<{id:string;input:BoundedGripInput}>}=
  JSON.parse(readFileSync(new URL('../config/grip-bounded-reference.json',import.meta.url),'utf8'));
const norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
describe('normal-saturation event integration, diagnostic only',()=>{
  it('carries the slipping clock and common-foot transport at collocated force-angle stages',()=>{
    const H=.0015,C=100,mu=.003,mA=100,mB=110,initial=Array(31).fill(0);
    initial[6]=1;initial[8]=2;initial[27]=.17;
    const derivative=(t:number,y:number[])=>{
      const d=Array(30).fill(0),l=y[27];
      d[0]=y[2];d[2]=C/mA;d[6]=y[8];d[8]=-C/mB;
      d[12]=-mu*C*l*l;d[14]=-mu*C*l;d[16]=-C;d[18]=-(H-t)*C;
      d[24]=-C*(y[8]-y[2]);d[25]=-mu*C*C*l*l;d[26]=C;d[27]=(1-l)/.3;d[28]=-C;return d;
    };
    for(const warped of [false,true]){
      let y=initial.slice();const stats={steps:0,iterations:0};
      for(let k=0;k<8;k++)y=angleGripStep(k/8,y,1/8,(s,z)=>{
        const rate=warped?2*H*(1-s):H;return [...derivative(z[30],z).map(v=>v*rate),rate];
      },stats);
      expect(y[30]).toBeCloseTo(H,14);
      const u=1-initial[27],expectedLegs=1-u*Math.exp(-H/.3),
        expectedFoot=-mu*C*(H-u*.3*(1-Math.exp(-H/.3))),
        expectedMaterial=-mu*C*(H-2*u*.3*(1-Math.exp(-H/.3))+u*u*.15*(1-Math.exp(-2*H/.3)));
      expect(y[27]).toBeCloseTo(expectedLegs,11);expect(Math.abs(y[14]-expectedFoot)).toBeLessThan(1e-11);
      expect(Math.abs(y[12]-expectedMaterial)).toBeLessThan(1e-11);
      expect(y[16]).toBeCloseTo(-C*H,12);expect(y[18]).toBeCloseTo(-C*H*H/2,12);
      expect(y[0]).toBeCloseTo(C*H*H/(2*mA),12);expect(y[6]).toBeCloseTo(1+2*H-C*H*H/(2*mB),12);
      expect(Math.abs(.5*mA*y[2]**2+.5*mB*y[8]**2-.5*mB*4-y[24])).toBeLessThan(1e-10);
    }
  });
  it('differentiates moving normal demand including rotation, material curvature and common-foot share',()=>{
    const input=fixture.cases[1].input;
    for(const material of [{x:0,y:0},{x:1e-8,y:-3e-8},input.material])for(const fixed of [false,true]){
      const q={...input,recoveryCoupling:fixed?.31:undefined},y=[q.a.pos.x,q.a.pos.y,q.a.vel.x,q.a.vel.y,q.a.spin,q.a.facing,
        q.b.pos.x,q.b.pos.y,q.b.vel.x,q.b.vel.y,q.b.spin,q.b.facing,material.x,material.y,q.footOffset.x,q.footOffset.y,
        ...Array(11).fill(0),q.legs,0,0],v=y.map((_z,j)=>Math.sin(.7*j)*.3),analytic=pressureRate(q,y,v),h=1e-5,
        finite=(h:number)=>(pressureGeometry(q,y.map((z,j)=>z+h*v[j])).beta-pressureGeometry(q,y.map((z,j)=>z-h*v[j])).beta)/(2*h),
        richardson=(4*finite(h/2)-finite(h))/3;
      expect(Math.abs(analytic-richardson)).toBeLessThan(1e-7*Math.max(1,Math.abs(analytic)));
    }
  });
  it.each([...fixture.cases,...fresh.cases])
    ('matches independent World motion, shared budget, attachments and work: $id',({input,reference:z,physical,convergence})=>{
      const saved=structuredClone(input),r=saturationGripInterval(input);
      expect(input).toEqual(saved);expect(physical&&convergence.converged).toBe(true);expect(['uniform-no-event','saturation-gauss']).toContain(r.method);
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
      if(r.method==='saturation-gauss'){
        expect(r.eventTime).toBeGreaterThan(0);expect(r.eventTime).toBeLessThan(input.duration);
        expect(Math.abs(r.eventResidual)).toBeLessThanOrEqual(1e-10);
        expect(r.maximumCapacityExcess).toBeLessThan(1e-9);expect(r.partitions).toBeLessThanOrEqual(16);}
    });
  it('retains the uniform refusal on the valid fresh late-transition case',()=>{
    const c=fresh.cases.find(c=>c.id==='fresh-lower-opening')!;
    expect(c.physical&&c.convergence.converged).toBe(true);
    expect(()=>mixedGripInterval(c.input)).toThrow('Mixed-grip scope/refinement limit exhausted');
    expect(saturationGripInterval(c.input).method).toBe('saturation-gauss');
  });
  it.each(tangent.cases)('retains the complete existing tangent result: $id',({input})=>{
    const {method,normalImpulse,tangentImpulse,...r}=saturationGripInterval(input);
    expect(method).toBe('existing-tangent');expect(normalImpulse).toBe(0);expect(tangentImpulse).toBeUndefined();
    expect(r).toEqual(boundedGripInterval(input,'capped'));
  });
  it('composes unequal intervals through moving arms and work',()=>{
    const input=fixture.cases.find(c=>c.id.endsWith('mixed-0.3'))!.input,h=.0013,whole=saturationGripInterval(input),
      first=saturationGripInterval({...input,duration:h}),second=saturationGripInterval({...input,a:first.a,b:first.b,
        material:first.material,footOffset:first.footOffset,hold:first.hold,legs:first.legs,duration:input.duration-h});
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
  it('rotates both mobility directions and the moving material point',()=>{
    const input=fixture.cases[1].input,angle=.7,
      rotate=(v:{x:number;y:number})=>({x:Math.cos(angle)*v.x-Math.sin(angle)*v.y,y:Math.sin(angle)*v.x+Math.cos(angle)*v.y}),
      particle=(p:typeof input.a)=>({...p,pos:rotate(p.pos),vel:rotate(p.vel),facing:p.facing+angle}),
      r=saturationGripInterval(input),z=saturationGripInterval({...input,a:particle(input.a),b:particle(input.b),footOffset:rotate(input.footOffset)});
    for(const k of ['a','b'] as const){expect(norm(z[k].pos,rotate(r[k].pos))).toBeLessThan(5e-7);
      expect(norm(z[k].vel,rotate(r[k].vel))).toBeLessThan(2.5e-5);expect(Math.abs(z[k].facing-r[k].facing-angle)).toBeLessThan(2.5e-6);
      expect(Math.abs(z[k].spin-r[k].spin)).toBeLessThan(2.5e-4);}
    for(const k of ['point','footOffset','impulse','moment'] as const)expect(norm(z[k],rotate(r[k]))).toBeLessThan(k==='impulse'?.002:k==='moment'?.00005:5e-7);
    expect(norm(z.material,r.material)).toBeLessThan(5e-7);
    for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(z[k]-r[k])).toBeLessThan(.01);
  });
  it('keeps zero/tiny budgets finite without manufactured force',()=>{
    for(const capacity of [0,1e-12,1e-9]){const input={...fixture.cases[1].input,capacity},r=saturationGripInterval(input);
      expect(r.dose).toBeLessThanOrEqual(capacity*input.duration+1e-20);expect(norm(r.impulse,{x:0,y:0})).toBeLessThanOrEqual(r.dose+1e-20);
      expect(Number.isFinite(r.motorWork)).toBe(true);expect(r.passiveWork).toBeLessThanOrEqual(1e-12);}
  });
  it('refuses unsupported allocation inputs, motors, reels and slip transitions without mutating input',()=>{
    const input=fixture.cases[1].input,saved=structuredClone(input);
    expect(()=>saturationGripInterval({...input,desired:{x:1,y:0}})).toThrow('Active motor/reel');
    expect(()=>saturationGripInterval({...input,pullSpeed:20})).toThrow('Active motor/reel');
    expect(()=>saturationGripInterval({...input,capacity:10000})).toThrow('scope/refinement');
    expect(input).toEqual(saved);
  });
});
