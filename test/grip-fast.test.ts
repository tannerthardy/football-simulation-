import { describe, expect, it } from 'vitest';
import { World, type GraspJoint } from '../src/physics/world.js';
import { newSupport } from '../src/physics/support.js';
import type { Body } from '../src/physics/kinematics.js';
import { captureFirstGrip, frozenInterval } from '../scripts/diag/physics/contact-foundations.js';
const profile={massKg:100,radius:.3,reach:1.6,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
  backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
const body=(x: number,y=0): Body=>({pos:{x,y},vel:{x:.2,y:0},facing:0,spin:0,energy:1,profile:{...profile},support:newSupport()});
const hold=(a: Body,b: Body): GraspJoint=>({kind:'grasp',a,b,capacity:500,reach:1.6,hold:1,legs:.6,pull:0});
function graph(observed: boolean,side=1) {
  const bodies=[body(0),body(1,.1),body(2,-.1)], w:any=new World(bodies,{handContact:'patch',gripTiming:'fast',substeps:12});
  bodies[0].vel={x:.4,y:.2}; bodies[1].vel={x:.3,y:-.1}; bodies[2].vel={x:.1,y:.1};
  bodies.forEach(b=>{b.pos.y*=side;b.vel.y*=side;});
  const j=[hold(bodies[0],bodies[1]),hold(bodies[2],bodies[1])];
  w.joints.push(...j,{kind:'hands',a:bodies[0],b:bodies[1],extension:1.2,push:20,hold:10,steer:20});
  if(observed) { const original=w.integrateInterval; w.integrateInterval=function(...args:any[]) { return original.apply(this,args); }; }
  return {w,bodies,j};
}
describe('separate efficient grip candidate',()=>{
  it.each([1,-1] as const)('retains acquired impulse/time-moment and work accuracy, mirror %s',side=>{
    const c=captureFirstGrip({angle:45,speed:8,cut:false,difficulty:'difficult'},'patch',side);
    for(const variant of ['full','grip-only'] as const) {
      const fast=frozenInterval(c.saved,1,variant,.05/12,'fast'), ref=frozenInterval(c.saved,4096,variant,.05/12);
      fast.end.forEach((b,i)=>{
        expect(Math.hypot(b.pos.x-ref.end[i].pos.x,b.pos.y-ref.end[i].pos.y)).toBeLessThan(1e-7);
        expect(Math.abs(b.facing-ref.end[i].facing)).toBeLessThan(1e-5);
        expect(Math.abs(b.spin-ref.end[i].spin)).toBeLessThan(.003);
      });
      expect(Math.abs(fast.energyError)).toBeLessThan(1e-8);expect(fast.integration!.limited).toBe(0);
    }
  });
  it.each([1,-1])('imports accepted multiple-contact trials with identical motion, work and shared attachment identities, mirror %s',side=>{
    const a=graph(false,side),b=graph(true,side), profiles=a.bodies.map(x=>x.profile);
    for(let k=0;k<4;k++) {
      const intents=a.bodies.map(()=>({vel:{x:.4,y:0},push:.1,posture:.2}));
      const x=a.w.step(intents,.05),y=b.w.step(intents,.05);
      expect(a.bodies).toEqual(b.bodies);
      for(const key of ['work','groundImpulse','groundWork','groundYawImpulse','supportMotorWork','armWork','armImpulse']) expect(x[key]).toEqual(y[key]);
      expect(Math.abs(x.work.residual)).toBeLessThan(1e-8);
      expect(x.gripTiming.commits).toBeGreaterThan(0); expect(y.gripTiming.commits).toBe(0);
      for(let i=0;i<3;i++) {expect(a.bodies[i].profile).toBe(profiles[i]);expect(x.armImpulse[i]).toBeLessThanOrEqual(x.armImpulseLimit[i]+1e-8);expect(x.supportMotorWork[i]).toBeLessThanOrEqual(x.supportMotorWorkLimit[i]+1e-8);}
      for(let i=0;i<2;i++) {
        expect(a.w.joints[i]).toBe(a.j[i]);expect(a.j[i].b).toBe(a.bodies[1]);
        expect(a.w.attachments.get(a.j[i]).foot).toBe(a.bodies[1].support!.foot);
        expect(a.w.graspPoint(a.j[i])).toEqual(b.w.graspPoint(b.j[i]));
      }
    }
  });
  it('preserves zero/tiny-load and center paths',()=>{
    const run=(cap: number,mode:'midpoint'|'fast',hand:'center'|'patch')=>{
      const bs=[body(0),body(1)],w=new World(bs,{handContact:hand,gripTiming:mode,substeps:12});
      w.joints.push({...hold(bs[0],bs[1]),capacity:cap});
      w.step(bs.map(()=>({vel:{x:.2,y:0}})),.05);return bs;
    };
    for(const cap of [0,1e-9,1e-6]) expect(run(cap,'fast','patch')).toEqual(run(cap,'midpoint','patch'));
    expect(run(500,'fast','center')).toEqual(run(500,'midpoint','center'));
  });
  it('proposes a dry cap-stop boundary without replacing the moving-contact force law',()=>{
    const run=(mode:'midpoint'|'resolved'|'fast',n:number)=>{
      const bs=[body(0),body(1)];bs.forEach(b=>{b.vel={x:0,y:0};b.spin=1;});
      const w=new World(bs,{handContact:'patch',gripTiming:mode,substeps:n});
      w.joints.push({...hold(bs[0],bs[1]),legs:0});
      const r=w.step(bs.map(()=>({vel:{x:0,y:0},free:true})),.025);return {bs,r};
    };
    const fast=run('fast',1),slow=run('resolved',1),ref=run('midpoint',65536);
    expect(fast.r.gripTiming!.eventSplits).toBeGreaterThan(0);
    for(let i=0;i<2;i++) {
      expect(Math.hypot(fast.bs[i].pos.x-ref.bs[i].pos.x,fast.bs[i].pos.y-ref.bs[i].pos.y)).toBeLessThan(1e-6);
      expect(Math.abs(fast.bs[i].facing-ref.bs[i].facing)).toBeLessThan(1e-5);
      expect(Math.abs(fast.bs[i].spin!-ref.bs[i].spin!)).toBeLessThan(.003);
    }
    expect(Math.abs(fast.r.work.residual)).toBeLessThan(1e-8);
    expect(fast.r.gripTiming!.limited).toBe(0);
    // The preserved slow reference exhausts its limit at this topology onset;
    // retain that adverse evidence instead of declaring it converged.
    expect(slow.r.gripTiming!.limited).toBe(1);
  });
});
