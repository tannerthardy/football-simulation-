import {describe,it,expect} from 'vitest';
import {phaseInputs} from '../scripts/diag/physics/grip-phase-inputs.js';
import {phaseGripForce} from '../scripts/diag/physics/grip-phase-force.js';
import {phaseBoxReference} from '../scripts/diag/physics/grip-phase-box-reference.js';
import {sharedWorkFrames} from '../scripts/diag/physics/grip-shared-work-scene.js';
import {sharedWorkMotion} from '../scripts/diag/physics/grip-shared-work-motion.js';
import {passivePhaseInterval,phaseDifference} from '../scripts/diag/physics/grip-phase-interval.js';
import {passivePhaseReference} from '../scripts/diag/physics/grip-phase-reference.js';
const cases=phaseInputs(),norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
describe('bounded passive two-grip phase transitions, diagnostic only',()=>{
  it.each(cases)('matches independent force and refined moving reference: $id',(c)=>{
    const saved=structuredClone(c.input),a=passivePhaseInterval(c.input),b=passivePhaseReference(c.input,128),f=passivePhaseReference(c.input,256);
    expect(c.input).toEqual(saved);expect(phaseDifference(b,f)).toBeLessThanOrEqual(1/16);expect(phaseDifference(a,f)).toBeLessThanOrEqual(1/16);
    expect(Math.abs(a.workResidual)).toBeLessThan(1e-8);expect(Math.abs(a.angularResidual)).toBeLessThan(1e-7);
    expect(a.representationError).toBeLessThan(1e-10);expect(a.linearResidual).toBeLessThan(1e-10);expect(a.maximumPassivePower).toBeLessThanOrEqual(1e-8);
    expect(a.evaluations).toBeLessThanOrEqual(4096);expect(a.error).toBeLessThanOrEqual(1/16);
    for(let k=0;k<a.grips.length;k++){
      const g=a.grips[k],initial=c.input.grips[k];expect(g.dose).toBeLessThanOrEqual(initial.capacity*c.input.duration+1e-12);
      expect(g.legs).toBeCloseTo(1-(1-initial.legs)*Math.exp(-g.slipDuration/.3),12);
      if(!g.slipping)expect(g.hold).toBeCloseTo(Math.max(norm(g.point,a.bodies[initial.holder].pos),c.input.minimumDistance),12);
    }
    if(c.id.includes('unequal')||c.id.startsWith('fresh')){
      expect(a.events.slice(0,2).map(e=>e.kind)).toEqual(['cap','slip']);expect(a.events[1].time).toBeGreaterThan(a.events[0].time);
      if(c.input.duration===.0002)expect(a.events.map(e=>e.kind)).toEqual(['cap','slip','zero']);
      for(let k=0;k<a.events.length;k++)expect(Math.abs(a.events[k].time-f.events[k].time)).toBeLessThan(2e-11);
    }else expect(a.events).toHaveLength(0);
  });
  it('preserves the old fixed-phase refusal and stable body/attachment controls',()=>{
    expect(()=>sharedWorkMotion(cases[0].input,'coupled',128,'rk4')).toThrow('motion phase');
    for(const c of cases.filter(v=>v.id.endsWith('-control'))){
      const a=passivePhaseInterval(c.input),b=sharedWorkMotion(c.input,'coupled',2,'rk8');
      for(let k=0;k<a.bodies.length;k++){expect(norm(a.bodies[k].pos,b.bodies[k].pos)).toBeLessThan(5e-10);expect(Math.abs(a.bodies[k].spin-b.bodies[k].spin)).toBeLessThan(2.5e-7);}
      expect(norm(a.footOffset,b.footOffset)).toBeLessThan(5e-10);
      for(let k=0;k<a.grips.length;k++){expect(norm(a.grips[k].material,b.grips[k].material)).toBeLessThan(5e-10);expect(Math.abs(a.grips[k].dose-b.grips[k].dose)).toBeLessThan(1e-9);}
    }
  });
  it('composes unequal intervals across slip and force-zero events exactly once',()=>{
    const input=cases[1].input,H=input.duration,h=.000037,a=passivePhaseInterval(input),first=passivePhaseInterval({...input,duration:h}),
      last=passivePhaseInterval({...input,duration:H-h,bodies:first.bodies,grips:first.grips,footOffset:first.footOffset});
    for(let k=0;k<a.bodies.length;k++){
      expect(norm(a.bodies[k].pos,last.bodies[k].pos)).toBeLessThan(5e-10);expect(norm(a.bodies[k].vel,last.bodies[k].vel)).toBeLessThan(2.5e-8);
      expect(Math.abs(a.bodies[k].facing-last.bodies[k].facing)).toBeLessThan(2.5e-9);expect(Math.abs(a.bodies[k].spin-last.bodies[k].spin)).toBeLessThan(2.5e-7);
    }
    expect(norm(a.footOffset,last.footOffset)).toBeLessThan(5e-10);
    for(let k=0;k<a.grips.length;k++){
      const x=a.grips[k],y=first.grips[k],z=last.grips[k];expect(norm(x.material,z.material)).toBeLessThan(5e-10);expect(Math.abs(x.legs-z.legs)).toBeLessThan(1e-9);
      expect(Math.abs(x.hold-z.hold)).toBeLessThan(5e-10);expect(Math.abs(x.dose-y.dose-z.dose)).toBeLessThan(1e-9);
      expect(Math.abs(x.slipDuration-y.slipDuration-z.slipDuration)).toBeLessThan(2e-11);
      for(const axis of ['x','y'] as const){expect(Math.abs(x.impulse[axis]-y.impulse[axis]-z.impulse[axis])).toBeLessThan(5e-10);
        expect(Math.abs(x.moment[axis]-y.moment[axis]-(H-h)*y.impulse[axis]-z.moment[axis])).toBeLessThan(5e-10);}
      for(let j=0;j<2;j++){expect(Math.abs(x.angularImpulse[j]-y.angularImpulse[j]-z.angularImpulse[j])).toBeLessThan(1e-9);
        expect(Math.abs(x.angularMoment[j]-y.angularMoment[j]-(H-h)*y.angularImpulse[j]-z.angularMoment[j])).toBeLessThan(1e-9);}
    }
    for(const key of ['bodyWork','motorWork','passiveWork'] as const)expect(Math.abs(a[key]-first[key]-last[key])).toBeLessThan(1e-9);
  });
  it('preserves mirrored and reversed contact order across the transitions',()=>{
    const input=cases[1].input,a=passivePhaseInterval(input),b=passivePhaseInterval({...input,grips:[...input.grips].reverse()});
    expect(phaseDifference(a,{...b,grips:[...b.grips].reverse()})).toBeLessThan(1/16);
    const c=passivePhaseInterval(cases[4].input),d=passivePhaseInterval(cases[5].input);
    for(let k=0;k<c.bodies.length;k++){expect(c.bodies[k].pos.x).toBeCloseTo(d.bodies[k].pos.x,12);expect(c.bodies[k].pos.y).toBeCloseTo(-d.bodies[k].pos.y,12);
      expect(c.bodies[k].spin).toBeCloseTo(-d.bodies[k].spin,12);expect(c.bodies[k].facing).toBeCloseTo(-d.bodies[k].facing,12);}
    expect(c.grips.map(g=>g.slipDuration)).toEqual(d.grips.map(g=>g.slipDuration));
  });
  it('does not change the result under proper rotation',()=>{
    const input=cases[1].input,angle=.7,rotate=(v:{x:number;y:number})=>({x:Math.cos(angle)*v.x-Math.sin(angle)*v.y,y:Math.sin(angle)*v.x+Math.cos(angle)*v.y}),
      a=passivePhaseInterval(input),b=passivePhaseInterval({...input,bodies:input.bodies.map(v=>({...v,pos:rotate(v.pos),vel:rotate(v.vel),facing:v.facing+angle})),footOffset:rotate(input.footOffset)});
    for(let k=0;k<a.bodies.length;k++){expect(norm(rotate(a.bodies[k].pos),b.bodies[k].pos)).toBeLessThan(5e-10);expect(norm(rotate(a.bodies[k].vel),b.bodies[k].vel)).toBeLessThan(2.5e-8);
      expect(Math.abs(b.bodies[k].facing-a.bodies[k].facing-angle)).toBeLessThan(2.5e-9);}
    for(let k=0;k<a.grips.length;k++){expect(norm(a.grips[k].material,b.grips[k].material)).toBeLessThan(5e-10);expect(Math.abs(a.grips[k].dose-b.grips[k].dose)).toBeLessThan(1e-9);}
    expect(norm(rotate(a.footOffset),b.footOffset)).toBeLessThan(5e-10);
  });
  it('handles zero/tiny one-grip capacities and refuses unsupported input without mutation',()=>{
    const input=cases[3].input,saved=structuredClone(input);
    for(const capacity of [0,1e-12,1e-6]){
      const a=passivePhaseInterval({...input,grips:input.grips.map(g=>({...g,capacity}))});
      expect(a.grips[0].dose).toBeLessThanOrEqual(capacity*input.duration+1e-12);expect(Math.abs(a.bodyWork)).toBeLessThan(1e-9);
      expect(a.passiveWork).toBeLessThanOrEqual(1e-9);
    }
    expect(()=>passivePhaseInterval({...input,duration:.01})).toThrow('input scope');
    expect(()=>passivePhaseInterval({...input,footOffset:{x:input.attachmentReach+1,y:0}})).toThrow('geometry');expect(input).toEqual(saved);
    const g=sharedWorkFrames(cases[1].input);expect(()=>phaseGripForce([g[0],g[0]],cases[1].input.mobility)).toThrow('Non-unique');
    expect(()=>phaseGripForce(g.map(v=>({...v,normalBias:.1})),cases[1].input.mobility)).toThrow('scope');
  });
  it('ranks near-cap reference energies without cancellation',()=>{
    const g=[{nx:.9950372241981769,ny:.09950337913853385,vt:-.28180015803685676,vn:-.12938882466960921,xx:.600038406976317,xy:8.51766276742423e-12,yy:.6000384069600416,capacity:500,inverseMass:.02},
      {nx:-.9805806606425023,ny:.19611621038025825,vt:.16236851347720377,vn:-.23529647368783424,xx:.3999999999954309,xy:2.523423753466588e-12,yy:.3999999999906091,capacity:500,inverseMass:.02}],
      mu=cases[1].input.mobility,a=phaseGripForce(g,mu),b=phaseBoxReference(g,mu);
    expect(b.force[0]).toBeLessThan(500);expect(b.passivePower).toBeLessThanOrEqual(1e-10);
    for(let k=0;k<g.length;k++)expect(Math.abs(a.force[k]-b.force[k])).toBeLessThan(1e-9);
  });
});
