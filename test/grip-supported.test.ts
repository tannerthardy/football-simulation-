import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { linearSupportForce, supportedGripInterval, type SupportedGripInput } from '../scripts/diag/physics/grip-force-supported.js';
import { passiveSlipReference } from '../scripts/diag/physics/passive-slip-reference.js';
import type { Particle } from '../scripts/diag/physics/grip-force-interval.js';

const fixture:{cases:Array<{id:string;input:SupportedGripInput;reference:Record<string,any>;
  convergence:{converged:boolean}}>}=
  JSON.parse(readFileSync(new URL('../config/grip-supported-reference.json',import.meta.url),'utf8'));
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const energy=(p:Particle)=>.5*p.mass*(p.vel.x**2+p.vel.y**2)+.5*p.inertia*p.spin**2;
const angular=(p:Particle)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin;

describe('single-grip prescribed-support feasibility; no World insertion',()=>{
  it.each(fixture.cases)('matches independently refined moving support: $id',(c:any)=>{
    const input:SupportedGripInput=c.input,saved=structuredClone(input),r=supportedGripInterval(input),z=c.reference;
    expect(input).toEqual(saved);expect(c.convergence.converged).toBe(true);
    for(const k of ['a','b'] as const) {
      expect(distance(r[k].pos,z[k].pos)).toBeLessThan(5e-7);
      expect(distance(r[k].vel,z[k].vel)).toBeLessThan(2.5e-5);
      expect(Math.abs(r[k].facing-z[k].facing)).toBeLessThan(2.5e-6);
      expect(Math.abs(r[k].spin-z[k].spin)).toBeLessThan(2.5e-4);
    }
    for(const k of ['material','footOffset','point'] as const)expect(distance(r[k],z[k])).toBeLessThan(5e-7);
    expect(distance(r.impulse,z.impulse)).toBeLessThan(2.5e-5*Math.min(input.a.mass,input.b.mass));
    expect(distance(r.moment,z.moment)).toBeLessThan(5e-7*Math.min(input.a.mass,input.b.mass));
    for(const [i,k] of ['A','B'].entries()) {
      expect(Math.abs(r.angularImpulse[i]-z[`angularImpulse${k}`])).toBeLessThan(2.5e-4*Math.min(input.a.inertia,input.b.inertia));
      expect(Math.abs(r.angularMoment[i]-z[`angularMoment${k}`])).toBeLessThan(2.5e-6*Math.min(input.a.inertia,input.b.inertia));
    }
    for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(r[k]-z[k])).toBeLessThan(.01);
    expect(Math.abs(r.hold-z.hold)).toBeLessThan(5e-7);expect(r.slipping).toBe(z.slipping);
    expect(Math.abs(energy(r.a)+energy(r.b)-energy(input.a)-energy(input.b)-r.bodyWork)).toBeLessThan(1e-8);
    expect(Math.abs(angular(r.a)+angular(r.b)-angular(input.a)-angular(input.b))).toBeLessThan(1e-7);
    expect(r.passiveWork).toBeLessThanOrEqual(1e-9);
    expect(r.dose).toBeLessThanOrEqual(input.capacity*input.duration+1e-9);
    expect(r.representationError).toBeLessThan(1e-10);
    expect(distance(r.footOffset,{x:input.footOffset.x+input.mobility*r.impulse.x,
      y:input.footOffset.y+input.mobility*r.impulse.y})).toBeLessThan(1e-11);
    expect(Math.abs(r.angularImpulse[1])).toBeGreaterThan(1e-6); // moving point creates held-body torque
  });

  it('uses one vector capacity and keeps the normal damper distinct from motor work',()=>{
    const C=2000,mu=.002,K=.02,damping=2*.8*2*Math.PI*6/K;
    const vn=.6*C*(1+damping*mu)/damping,f=linearSupportForce(vn,100,0,K,mu,C);
    expect(f.normal).toBeCloseTo(-.6*C,10);expect(f.tangent).toBeCloseTo(-.8*C,10);
    expect(Math.hypot(f.normal,f.tangent)).toBeCloseTo(C,10);
    expect(f.normal*(vn+mu*f.normal)).toBeLessThan(0);
    expect(Math.abs(linearSupportForce(0,0,.1,K,mu,C).normal)).toBe(0);
    expect(Math.abs(linearSupportForce(0,0,.1,K,mu,C).tangent)).toBe(0);
  });

  it.each(['tangent','normal'] as const)('retains the exact frozen $0 channel impulse, moment and separate work',(kind)=>{
    const K=kind==='tangent'?.52:.02,mu=kind==='tangent'?.0001:.002,C=2000,H=.01,
      damping=2*.8*2*Math.PI*6/.02,M=kind==='tangent'?mu:mu+1/damping,v0=kind==='tangent'?4:2;
    // This numerical check evaluates the candidate force against a separate
    // closed-form channel, not another World/refinement implementation.
    let y=[v0,0,0,0,0],h=H/2048;
    const df=(t:number,z:number[])=>{
      const f=linearSupportForce(kind==='normal'?z[0]:0,kind==='tangent'?z[0]:0,0,.02,mu,C),
        F=kind==='normal'?f.normal:f.tangent;
      return [K*F,F,(H-t)*F,F*z[0],-mu*F*F];
    };
    for(let i=0;i<2048;i++) {
      const t=i*h,add=(z:number[],s:number)=>y.map((v,j)=>v+s*z[j]),
        a=df(t,y),b=df(t+h/2,add(a,h/2)),c=df(t+h/2,add(b,h/2)),d=df(t+h,add(c,h));
      y=y.map((v,j)=>v+h*(a[j]+2*b[j]+2*c[j]+d[j])/6);
    }
    const ref=passiveSlipReference(v0,K,M,C,H),ts=ref.saturatedUntil,v=Math.max(0,v0-K*C*ts),
      squared=C*C*ts+v*v/(2*K*M)*-Math.expm1(-2*K/M*(H-ts)),motor=-mu*squared,
      body=(ref.finalSlip**2-v0*v0)/(2*K);
    expect(Math.abs(y[0]-ref.finalSlip)).toBeLessThan(1e-7);
    expect(Math.abs(y[1]-ref.impulse)).toBeLessThan(1e-6);
    expect(Math.abs(y[2]-ref.transport)).toBeLessThan(1e-8);
    expect(Math.abs(y[3]-body)).toBeLessThan(.001);
    expect(Math.abs(y[4]-motor)).toBeLessThan(.001);
    if(kind==='normal')expect(body-motor).toBeCloseTo(-squared/damping,8);
  });

  it('composes unequal intervals through both torque moments, material transport and work',()=>{
    for(const c of fixture.cases.filter((c:any)=>c.id.includes('-1-'))) {
      const input:SupportedGripInput=c.input,whole=supportedGripInterval(input),h=.0013,
        first=supportedGripInterval({...input,duration:h}),second=supportedGripInterval({...input,
          a:first.a,b:first.b,material:first.material,footOffset:first.footOffset,hold:first.hold,duration:input.duration-h});
      for(const k of ['a','b'] as const) {
        expect(distance(whole[k].pos,second[k].pos)).toBeLessThan(5e-7);
        expect(distance(whole[k].vel,second[k].vel)).toBeLessThan(2.5e-5);
        expect(Math.abs(whole[k].facing-second[k].facing)).toBeLessThan(2.5e-6);
        expect(Math.abs(whole[k].spin-second[k].spin)).toBeLessThan(2.5e-4);
      }
      expect(distance(whole.point,second.point)).toBeLessThan(5e-7);
      for(const k of ['x','y'] as const) {
        expect(Math.abs(whole.impulse[k]-first.impulse[k]-second.impulse[k])).toBeLessThan(.001);
        expect(Math.abs(whole.moment[k]-first.moment[k]-(input.duration-h)*first.impulse[k]-second.moment[k])).toBeLessThan(1e-5);
      }
      for(const i of [0,1])expect(Math.abs(whole.angularMoment[i]-first.angularMoment[i]
        -(input.duration-h)*first.angularImpulse[i]-second.angularMoment[i])).toBeLessThan(2.5e-6*Math.min(input.a.inertia,input.b.inertia));
      for(const k of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(whole[k]-first[k]-second[k])).toBeLessThan(.01);
    }
  });

  it('leaves common translation and a resting stretched hold force-free',()=>{
    const input:SupportedGripInput=structuredClone(fixture.cases[0].input);
    for(const rest of [false,true]) {
      input.a.vel=input.b.vel={x:rest?0:3,y:0};input.a.spin=input.b.spin=0;
      if(rest)input.hold=distance(input.a.pos,input.b.pos)-.1;
      const r=supportedGripInterval(input);
      expect(r.impulse).toEqual({x:0,y:0});expect(r.bodyWork).toBe(0);expect(r.motorWork).toBe(0);
      expect(r.angularImpulse).toEqual([0,0]);expect(r.material).toEqual(input.material);
      expect(r.footOffset).toEqual(input.footOffset);
      if(rest)expect(r.hold).toBe(input.hold);
    }
  });

  it('keeps zero and tiny loads finite without a manufactured dry impulse',()=>{
    for(const capacity of [0,1e-12,1e-9]) {
      const input={...fixture.cases[0].input,capacity},r=supportedGripInterval(input);
      expect(r.dose).toBeLessThanOrEqual(capacity*input.duration+1e-20);
      expect(Math.hypot(r.impulse.x,r.impulse.y)).toBeLessThanOrEqual(r.dose+1e-20);
      expect(r.passiveWork).toBeLessThanOrEqual(1e-12);expect(Number.isFinite(r.bodyWork)).toBe(true);
    }
  });

  it('refuses unsupported motors, reach, high angular travel and slip transitions',()=>{
    const input=fixture.cases[0].input;
    expect(()=>supportedGripInterval({...input,desired:{x:1,y:0}})).toThrow('Active support budget');
    expect(()=>supportedGripInterval({...input,hold:2})).toThrow('Invalid supported-grip');
    expect(()=>supportedGripInterval({...input,a:{...input.a,spin:1000}})).toThrow('Angular travel');
    expect(()=>supportedGripInterval({...input,capacity:1000})).toThrow('scope/refinement bound');
  });
});
