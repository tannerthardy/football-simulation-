import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {sharedGripInterval,type SharedGripInput} from '../scripts/diag/physics/grip-force-shared.js';
import {sharedGripForce} from '../scripts/diag/physics/grip-shared-law.js';
import {sharedViscousCoefficients} from '../scripts/diag/physics/grip-shared-viscous.js';
import {sharedExplicitStep} from '../scripts/diag/physics/grip-shared-explicit.js';
import {pressureGeometry} from '../scripts/diag/physics/grip-pressure-rate.js';
const reference=JSON.parse(readFileSync(new URL('../config/grip-shared-reference.json',import.meta.url),'utf8')),
  fresh=JSON.parse(readFileSync(new URL('../config/grip-shared-fresh-reference.json',import.meta.url),'utf8')),
  norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
function frames(input:SharedGripInput){return input.grips.map(j=>{
  const a=input.bodies[j.holder],b=input.bodies[1],q=[a.pos.x,a.pos.y,a.vel.x,a.vel.y,a.spin,a.facing,
    b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing,j.material.x,j.material.y,...Array(13).fill(0),j.legs],
    g=pressureGeometry({...j,a,b,mobility:input.mobility,attachmentReach:input.attachmentReach} as any,q);
  return {...g,capacity:j.capacity,inverseMass:1/a.mass+1/b.mass,normalBias:2*Math.PI*6/(2*.8)*Math.max(0,g.d-j.hold)};
});}
describe('one shared foot and coupled passive grips, diagnostic only',()=>{
  it.each([...reference.cases,...fresh.cases])('matches independently refined World: $id',(c:any)=>{
    const saved=structuredClone(c.input),r=sharedGripInterval(c.input),z=c.reference;
    expect(c.physical&&c.convergence.converged).toBe(true);expect(c.input).toEqual(saved);
    for(let i=0;i<r.bodies.length;i++){const a=r.bodies[i],b=z.bodies[i];expect(norm(a.pos,b.pos)).toBeLessThan(5e-7);
      expect(norm(a.vel,b.vel)).toBeLessThan(2.5e-5);expect(Math.abs(a.facing-b.facing)).toBeLessThan(2.5e-6);expect(Math.abs(a.spin-b.spin)).toBeLessThan(2.5e-4);}
    for(let k=0;k<r.grips.length;k++){
      const a=r.grips[k],b=z.grips[k];for(const key of ['material','point'] as const)expect(norm(a[key],b[key])).toBeLessThan(5e-7);
      expect(Math.abs(a.legs-b.legs)).toBeLessThan(1e-6);expect(Math.abs(a.hold-b.hold)).toBeLessThan(5e-7);expect(a.slipping).toBe(b.slipping);
      expect(norm(a.impulse,b.impulse)).toBeLessThan(.002);expect(norm(a.moment,b.moment)).toBeLessThan(.00005);
      for(let i=0;i<2;i++){expect(Math.abs(a.angularImpulse[i]-b.angularImpulse[i])).toBeLessThan(.0005);expect(Math.abs(a.angularMoment[i]-b.angularMoment[i])).toBeLessThan(.000005);}
      expect(Math.abs(a.normalImpulse-b.normalImpulse)).toBeLessThan(.002);expect(Math.abs(a.tangentImpulse-b.tangentImpulse)).toBeLessThan(.002);
      expect(a.dose).toBeLessThanOrEqual(c.input.grips[k].capacity*c.input.duration+1e-9);
    }
    expect(norm(r.footOffset,z.footOffset)).toBeLessThan(5e-7);
    for(const key of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(r[key]-z[key])).toBeLessThan(.01);
    expect(Math.abs(r.workResidual)).toBeLessThanOrEqual(1e-8);expect(Math.abs(r.angularResidual)).toBeLessThanOrEqual(1e-7);
    expect(r.representationError).toBeLessThan(1e-10);expect(r.passiveWork).toBeLessThanOrEqual(1e-9);expect(r.error).toBeLessThanOrEqual(1/16);
    expect(r.evaluations).toBeLessThanOrEqual(4096);
    if(r.grips.length===2){expect(r.eventTimes).toHaveLength(2);expect(r.eventTimes[0]).toBeGreaterThan(0);expect(r.eventTimes[1]).toBeGreaterThan(r.eventTimes[0]);
      expect(r.eventTimes[1]).toBeLessThan(c.input.duration);expect(Math.max(...r.eventResiduals.map(Math.abs))).toBeLessThanOrEqual(1e-10);}
  });
  it('does not replace the common motor by independent recovery work or forces',()=>{
    const input=reference.cases[0].input,g=frames(input),r=sharedGripForce(g,input.mobility),
      independent=g.map(v=>sharedGripForce([v],input.mobility)),separate=independent.reduce((sum,v)=>sum+v.motorPower,0);
    expect(r.rows[1].tangent).toBeGreaterThan(0);expect(independent[1].rows[0].tangent).toBeLessThan(0);
    expect(Math.abs(r.motorPower-separate)).toBeGreaterThan(1);
    expect(r.motorPower).toBeCloseTo(-input.mobility*(r.load.x**2+r.load.y**2),11);
    expect(r.passivePower).toBeLessThanOrEqual(1e-8);
  });
  it('derives all three work regimes from the original ordered map, including mirrors',()=>{
    for(const side of [1,-1]){
      const input=reference.cases.find((c:any)=>c.id===`shared-${side}`).input,base=frames(input),direction=-Math.sign(base[0].vt),
        first=sharedGripForce([base[0]],input.mobility),f=first.rows[0].tangent,
        a=base[0],b=base[1],cross=input.mobility*((-a.xx*a.ny+a.xy*a.nx)*(-b.xx*b.ny+b.xy*b.nx)+(-a.xy*a.ny+a.yy*a.nx)*(-b.xy*b.ny+b.yy*b.nx))*f;
      for(const [vt,regime] of [[b.vt,'assisted'],[-1.5*cross,'inactive'],[-2*cross+direction*.001,'opposing']] as const){
        const g=[a,{...b,vt}],actual=sharedGripForce(g,input.mobility),s=sharedViscousCoefficients(g,input.mobility,direction);
        expect(s.regime).toBe(regime);
        for(let k=0;k<2;k++){const predicted=s.matrix[k][0]*g[0].vt+s.matrix[k][1]*g[1].vt;
          expect(Math.abs(predicted-actual.rows[k].tangent)).toBeLessThan(1e-9);expect(actual.rows[k].normal).toBe(0);}
      }
    }
  });
  it('carries force, time moment, motion, work and dose on one physical clock',()=>{
    const H=.01,rate=40,v0=.7,initial=[0,v0,0,0,0,0,0],
      derivative=(y:number[])=>[y[1],-rate*y[1],1,-rate*y[1],-(H-y[2])*rate*y[1],-rate*y[1]**2,rate*y[1]];
    let r=initial;for(let k=0;k<4;k++)r=sharedExplicitStep(r,H/4,derivative);
    const v=v0*Math.exp(-rate*H),position=(v0-v)/rate;
    expect(r[0]).toBeCloseTo(position,12);expect(r[1]).toBeCloseTo(v,11);expect(r[2]).toBeCloseTo(H,14);
    expect(r[3]).toBeCloseTo(v-v0,11);expect(r[4]).toBeCloseTo(position-v0*H,12);
    expect(r[5]).toBeCloseTo((v*v-v0*v0)/2,11);expect(r[6]).toBeCloseTo(v0-v,11);
  });
  it('preserves proper rotation of bodies, material points and the one raw foot',()=>{
    const input=reference.cases[0].input,angle=.7,rotate=(v:{x:number;y:number})=>({x:Math.cos(angle)*v.x-Math.sin(angle)*v.y,y:Math.sin(angle)*v.x+Math.cos(angle)*v.y}),
      r=sharedGripInterval(input),z=sharedGripInterval({...input,bodies:input.bodies.map((p:any)=>({...p,pos:rotate(p.pos),vel:rotate(p.vel),facing:p.facing+angle})),footOffset:rotate(input.footOffset)});
    for(let i=0;i<r.bodies.length;i++){expect(norm(z.bodies[i].pos,rotate(r.bodies[i].pos))).toBeLessThan(5e-7);expect(norm(z.bodies[i].vel,rotate(r.bodies[i].vel))).toBeLessThan(2.5e-5);
      expect(Math.abs(z.bodies[i].facing-r.bodies[i].facing-angle)).toBeLessThan(2.5e-6);}
    expect(norm(z.footOffset,rotate(r.footOffset))).toBeLessThan(5e-7);
    for(let k=0;k<r.grips.length;k++){expect(norm(z.grips[k].material,r.grips[k].material)).toBeLessThan(5e-7);expect(norm(z.grips[k].point,rotate(r.grips[k].point))).toBeLessThan(5e-7);}
    expect(Math.abs(z.motorWork-r.motorWork)).toBeLessThan(.01);
  });
  it('composes unequal external intervals without duplicating the motor or effort',()=>{
    const input=reference.cases[0].input,h=.0018,r=sharedGripInterval(input),a=sharedGripInterval({...input,duration:h}),
      b=sharedGripInterval({...input,duration:input.duration-h,bodies:a.bodies,footOffset:a.footOffset,
        grips:input.grips.map((g:any,k:number)=>({...g,material:a.grips[k].material,legs:a.grips[k].legs,hold:a.grips[k].hold}))});
    for(let i=0;i<r.bodies.length;i++){expect(norm(r.bodies[i].pos,b.bodies[i].pos)).toBeLessThan(5e-7);expect(norm(r.bodies[i].vel,b.bodies[i].vel)).toBeLessThan(2.5e-5);
      expect(Math.abs(r.bodies[i].facing-b.bodies[i].facing)).toBeLessThan(2.5e-6);expect(Math.abs(r.bodies[i].spin-b.bodies[i].spin)).toBeLessThan(2.5e-4);}
    expect(norm(r.footOffset,b.footOffset)).toBeLessThan(5e-7);
    for(const key of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(r[key]-a[key]-b[key])).toBeLessThan(.01);
    for(let k=0;k<r.grips.length;k++){
      expect(norm(r.grips[k].material,b.grips[k].material)).toBeLessThan(5e-7);expect(norm(r.grips[k].point,b.grips[k].point)).toBeLessThan(5e-7);
      expect(Math.abs(r.grips[k].legs-b.grips[k].legs)).toBeLessThan(1e-6);expect(Math.abs(r.grips[k].hold-b.grips[k].hold)).toBeLessThan(5e-7);
      expect(Math.abs(r.grips[k].dose-a.grips[k].dose-b.grips[k].dose)).toBeLessThan(.002);
      for(const axis of ['x','y'] as const){expect(Math.abs(r.grips[k].impulse[axis]-a.grips[k].impulse[axis]-b.grips[k].impulse[axis])).toBeLessThan(.002);
        expect(Math.abs(r.grips[k].moment[axis]-a.grips[k].moment[axis]-(input.duration-h)*a.grips[k].impulse[axis]-b.grips[k].moment[axis])).toBeLessThan(.00005);}
      for(let j=0;j<2;j++){expect(Math.abs(r.grips[k].angularImpulse[j]-a.grips[k].angularImpulse[j]-b.grips[k].angularImpulse[j])).toBeLessThan(.0005);
        expect(Math.abs(r.grips[k].angularMoment[j]-a.grips[k].angularMoment[j]-(input.duration-h)*a.grips[k].angularImpulse[j]-b.grips[k].angularMoment[j])).toBeLessThan(.000005);}
    }
  });
  it('refuses unsupported geometry and allocations without committing state',()=>{
    const input=reference.cases[0].input,saved=structuredClone(input);
    expect(()=>sharedGripInterval({...input,mobility:0})).toThrow('Invalid');
    expect(()=>sharedGripInterval({...input,grips:input.grips.map((g:any)=>({...g,holder:0}))})).toThrow('Invalid');
    expect(()=>sharedGripInterval({...input,footOffset:{x:input.attachmentReach+1e-6,y:0}})).toThrow('scope');
    expect(()=>sharedGripInterval({...input,duration:.05})).toThrow('budget');
    expect(input).toEqual(saved);
  });
});
