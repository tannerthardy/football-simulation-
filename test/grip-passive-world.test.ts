import {describe,it,expect} from 'vitest';
import {World} from '../src/physics/world.js';
import type {PassiveGripInput} from '../src/physics/passive-grip.js';
import {passiveWorldFixture} from '../scripts/diag/physics/grip-passive-world-fixtures.js';
import {spanKernelInterval} from '../scripts/diag/physics/grip-span-kernel-interval.js';
import {spanEventReference} from '../scripts/diag/physics/grip-span-event-reference.js';
import {mixedSpanDifference} from '../scripts/diag/physics/grip-mixed-span-model.js';
const H=.05/12,strip=(r:any)=>{const {passiveGrip,...rest}=r;return rest;};
describe('experimental passive contact in the native World lifecycle',()=>{
  it.each(['radial-control','curved-return','zero-span-control'])('carries supported motion/material/work/dose through native support exactly once: %s',id=>{
    let input:PassiveGripInput|undefined,motion:ReturnType<typeof spanKernelInterval>|undefined;
    const a=passiveWorldFixture(id,'owned',q=>{input=q;motion=spanKernelInterval(q);return motion;}),r=a.w.step(a.intents,H);
    expect(r.passiveGrip?.accepted).toBe(1);expect(input).toBeDefined();expect(motion).toBeDefined();
    const lo=spanEventReference(input!,2048),hi=spanEventReference(input!,4096);
    expect(mixedSpanDifference(lo,hi)).toBeLessThanOrEqual(1/16);expect(mixedSpanDifference(motion!,hi)).toBeLessThanOrEqual(1/16);
    const b=passiveWorldFixture(id,'owned',q=>({...spanEventReference(q,4096)})),s=b.w.step(b.intents,H);
    for(let i=0;i<2;i++){
      expect(Math.hypot(a.bodies[i].pos.x-b.bodies[i].pos.x,a.bodies[i].pos.y-b.bodies[i].pos.y)).toBeLessThan(5e-10/16);
      expect(Math.abs(a.bodies[i].facing-b.bodies[i].facing)).toBeLessThan(2.5e-9/16);
      expect(Math.hypot(a.bodies[i].support!.xi.x-b.bodies[i].support!.xi.x,a.bodies[i].support!.xi.y-b.bodies[i].support!.xi.y)).toBeLessThan(5e-10/16);
      expect(Math.abs(a.bodies[i].energy-b.bodies[i].energy)).toBeLessThan(1e-12);
      const speed=(Math.hypot(a.bodies[i].vel.x,a.bodies[i].vel.y)/a.bodies[i].profile.vmax)**2;
      expect(a.bodies[i].energy).toBeCloseTo(a.fixture.bodies[i].energy-H*(.0045+.012*speed),12);
    }
    expect(a.material()).toEqual(motion!.material);expect(a.foot.offset).toEqual(motion!.footOffset);
    expect(r.work.grasps).toBe(motion!.bodyWork);expect(r.supportMotorWork[1]).toBe(motion!.motorWork);
    expect(r.passiveGrip!.dose).toBe(motion!.dose);expect(a.j.force!*H).toBeCloseTo(motion!.dose,12);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);expect(r.armImpulse.every(v=>v===0)).toBe(true);
    expect(s.passiveGrip!.accepted).toBe(1);
    if(id==='curved-return')expect(motion!.events).toHaveLength(1);
  });
  it('prevents unrelated islands from transporting a held material point; defaults retain the legacy witness',()=>{
    for(const mode of ['legacy','owned'] as const){const a=passiveWorldFixture('radial-control',mode),w:any=a.w,
      original=w.integrateInterval,rows:Array<{before:{x:number;y:number};after:{x:number;y:number}}>=[];
      w.integrateInterval=function(...args:any[]){const outside=!args[0].includes(1),before=a.material();original.apply(this,args);
        if(outside)rows.push({before,after:a.material()});};
      w.step(a.intents,H);expect(rows).toHaveLength(1);
      if(mode==='owned')expect(rows[0].after).toEqual(rows[0].before);
      else expect(Math.hypot(rows[0].after.x-rows[0].before.x,rows[0].after.y-rows[0].before.y)).toBeGreaterThan(1e-7);
    }
  });
  it.each(['unsupported','refused','invalid'] as const)('falls back without partial body/material/work/fatigue commits: %s',mode=>{
    const baseline=passiveWorldFixture('curved-return','owned'),r=baseline.w.step(baseline.intents,H),
      a=passiveWorldFixture('curved-return','owned',q=>{if(mode==='unsupported')return undefined;
        if(mode==='refused')throw new RangeError('declared test refusal');const v=spanKernelInterval(q);return {...v,bodyWork:v.bodyWork+1};}),s=a.w.step(a.intents,H);
    expect(s.passiveGrip!.accepted).toBe(0);expect(s.passiveGrip!.fallbacks).toBe(1);
    expect(a.bodies).toEqual(baseline.bodies);expect(a.material()).toEqual(baseline.material());expect(a.j.force).toBe(baseline.j.force);
    expect(strip(s)).toEqual(r);
  });
  it('retains active-drive/yaw, recovery, multiple-contact and reel scope boundaries',()=>{
    for(const mode of ['drive','yaw','recovery','multiple','reel'] as const){let calls=0;const a=passiveWorldFixture('radial-control','owned',q=>{calls++;return spanKernelInterval(q);});
      if(mode==='drive')a.intents[0].vel={x:2,y:0};if(mode==='yaw')a.intents[0].facing=a.bodies[0].facing+.3;
      if(mode==='recovery')a.bodies[1].support!.xi={x:.3,y:0};if(mode==='multiple')a.w.joints.push({...a.j});if(mode==='reel')a.j.pull=1;
      const r=a.w.step(a.intents,H);expect(calls).toBe(0);expect(r.passiveGrip?.accepted).toBe(0);expect(r.passiveGrip?.fallbacks).toBe(1);
    }
  });
  it('refuses a real cap/slip case and preserves the native fallback',()=>{
    const base=passiveWorldFixture('radial-control','owned'),a=passiveWorldFixture('radial-control','owned',spanKernelInterval);
    for(const v of [base,a]){v.bodies[1].vel={x:.25,y:0};v.intents[1].vel={x:.25,y:0};}
    const r=base.w.step(base.intents,H),s=a.w.step(a.intents,H);
    expect(s.passiveGrip!.accepted).toBe(0);expect(Object.keys(s.passiveGrip!.reasons).some(k=>k.includes('cap/target'))).toBe(true);
    expect(a.bodies).toEqual(base.bodies);expect(a.material()).toEqual(base.material());expect(strip(s)).toEqual(r);
  });
  it('keeps native fatigue and zero dose partition-invariant through a long zero-load hold',()=>{
    const energies:number[][]=[];
    for(const n of [12,96]){
      const a=passiveWorldFixture('zero-span-control','owned',spanKernelInterval);a.w.substeps=n;let accepts=0;
      for(let k=0;k<4;k++){const r=a.w.step(a.intents,.05);accepts+=r.passiveGrip!.accepted;expect(r.passiveGrip!.dose).toBe(0);expect(r.work.grasps).toBe(0);}
      expect(accepts).toBe(n*4);energies.push(a.bodies.map(b=>b.energy));
      for(let i=0;i<2;i++)expect(a.bodies[i].energy).toBeCloseTo(a.fixture.bodies[i].energy-.2*.0045,12);
    }
    expect(energies[0]).toEqual(energies[1]);
  });
  it('preserves the reflected World handoff, including support and effort',()=>{
    const a=passiveWorldFixture('curved-return','owned',spanKernelInterval),b=passiveWorldFixture('curved-return','owned',spanKernelInterval),w:any=b.w;
    for(let i=0;i<b.bodies.length;i++){const p=b.bodies[i];p.pos.y*=-1;p.vel.y*=-1;p.facing*=-1;p.spin!*=-1;
      b.intents[i].vel.y*=-1;b.intents[i].facing=p.facing;}
    b.foot.offset.y*=-1;b.foot.achieved.y*=-1;b.foot.force.y*=-1;w.attachments.get(b.j).material.y*=-1;
    const r=a.w.step(a.intents,H),s=b.w.step(b.intents,H);expect(s.passiveGrip!.accepted).toBe(1);
    for(let i=0;i<2;i++){expect(Math.hypot(a.bodies[i].pos.x-b.bodies[i].pos.x,a.bodies[i].pos.y+b.bodies[i].pos.y)).toBeLessThan(5e-10/16);
      expect(Math.hypot(a.bodies[i].support!.xi.x-b.bodies[i].support!.xi.x,a.bodies[i].support!.xi.y+b.bodies[i].support!.xi.y)).toBeLessThan(5e-10/16);
      expect(a.bodies[i].energy).toBeCloseTo(b.bodies[i].energy,12);}
    expect(r.passiveGrip!.dose).toBeCloseTo(s.passiveGrip!.dose,12);expect(r.work.grasps).toBeCloseTo(s.work.grasps,12);
  });
  it('rejects incompatible host options and preserves absent default properties',()=>{
    const a=passiveWorldFixture('radial-control','legacy');expect(Object.hasOwn(a.w,'passiveGrip')).toBe(false);expect(Object.hasOwn(a.w,'materialTransport')).toBe(false);
    expect(()=>new World(structuredClone(a.bodies),{handContact:'patch',passiveGrip:spanKernelInterval})).toThrow('owned material');
  });
});
