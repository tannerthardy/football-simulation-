import { describe, expect, it } from 'vitest';
import type { Body } from '../../src/physics/kinematics.js';
import { baseRadiusAt, newSupport, supportParams } from '../../src/physics/support.js';
import { World, type GraspJoint } from '../../src/physics/world.js';
import { native, withRecoveryExperiment } from '../../scripts/diag/tackle/grip-refinement.js';

const profile = { massKg:100,radius:.28,reach:1,heightYd:2.05,vmax:9,tau:1.3,
  brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,maxCatchHeight:3,
  reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9 };
function fixture(variant:string,capacity:number|null,loaded=false,mode:'center'|'patch'='center',side=1,n=12,nearBase=false){
  const bodies:Body[]=[loaded?0:2,1].map(x=>({pos:{x,y:0},vel:{x:0,y:0},facing:0,
    profile:{...profile},energy:1,support:newSupport()}));
  const b=bodies[1],rb=baseRadiusAt(supportParams(profile),.2);
  b.support!.xi={x:loaded&&!nearBase?.5:rb+.001,y:side*(loaded&&!nearBase?.03:0)};b.support!.out=.12;
  const w=new World(bodies,{handContact:mode,substeps:n});
  const grip:GraspJoint={kind:'grasp',a:bodies[0],b,reach:3,hold:1,capacity:capacity??0,legs:1,pull:0};
  if(capacity!==null)w.joints.push(grip);
  // Keep the partition identical even with no grip, without transmitting force.
  w.joints.push({kind:'hands',a:bodies[0],b,extension:3,push:0,hold:0,steer:0});
  const audit=withRecoveryExperiment(w,variant,()=>w.step(bodies.map(()=>({vel:{x:0,y:0},posture:.2})),.05));
  return {...audit,bodies,grip};
}

describe('recovery candidate physical controls and rejected negative control',()=>{
  it.each(['phase','phase-timing'])('%s preserves ordinary hand blocking exactly',variant=>{
    const run=(candidate:string)=>{
      const bodies:Body[]=[0,1].map(x=>({pos:{x,y:0},vel:{x:2,y:0},facing:0,
        profile:{...profile},energy:1,support:newSupport()}));
      const w=new World(bodies,{handContact:'patch',substeps:12});
      w.joints.push({kind:'hands',a:bodies[0],b:bodies[1],extension:1.1,push:80,hold:80,steer:20});
      const reports=withRecoveryExperiment(w,candidate,()=>Array.from({length:6},()=>w.step([
        {vel:{x:3,y:0},posture:.2},{vel:{x:2,y:0},posture:.2}],.05))).result;
      return {bodies,reports};
    };
    expect(run(variant)).toEqual(run('full'));
  });
  it('places the dive transition at the completed plant in equal and unequal refinements',()=>{
    for(const variant of ['phase-timing','phase-source'])for(const n of [12,24,48,96,15,35]){
      const bodies:Body[]=[0,5].map(x=>({pos:{x,y:0},vel:{x:6,y:0},facing:0,
        profile:{...profile},energy:1,support:newSupport()}));
      const w=new World(bodies,{substeps:n});
      w.joints.push({kind:'hands',a:bodies[0],b:bodies[1],extension:10,push:0,hold:0,steer:0});
      const run=withRecoveryExperiment(w,variant,()=>w.step([{vel:{x:6,y:0},dive:{x:1,y:0}},
        {vel:{x:6,y:0}}],.05));
      expect(bodies[0].support!.state).toBe('falling');
      expect(bodies[0].support!.since).toBeCloseTo(.05,12);
      expect(run.trace.slice(0,-1).every(row=>row.end[0].support.state==='up')).toBe(true);
      expect(run.trace.at(-1).start[0].support.state).toBe('up');
    }
  });
  it.each(['phase','phase-timing','phase-source'])('%s preserves unheld ordinary movement exactly',variant=>{
    const run=(candidate:string)=>{
      const b:Body={pos:{x:0,y:0},vel:{x:3,y:1},facing:.1,profile:{...profile},energy:1,support:newSupport()};
      const w=new World([b],{handContact:'patch'});
      withRecoveryExperiment(w,candidate,()=>{
        for(let k=0;k<8;k++)w.step([{vel:{x:4,y:1},facing:.2,posture:.2}],.05);
      });
      return b;
    };
    expect(run(variant)).toEqual(run('full'));
  });
  it.each(['phase','phase-timing'])('%s retains ordinary frontal physical tackles and mirrors',variant=>{
    for(const mode of ['center','patch']as const)for(const side of [1,-1]as const){
      const cell={angle:0,speed:3,cut:false,difficulty:'ordinary' as const};
      const baseline=native(cell,mode,side,12),candidate=native(cell,mode,side,12,true,variant);
      expect(candidate.result).toEqual(baseline.result);
      expect(candidate.endpoint).toBe(baseline.endpoint);
    }
  });
  it('permanently rejects achieved-support even when a live grip transmits zero force',()=>{
    const free=fixture('achieved-support',null),live=fixture('achieved-support',900);
    expect(live.grip.broken).not.toBe(true);expect(live.grip.force).toBe(0);
    expect(live.result.work.grasps).toBe(0);
    expect(Math.abs(live.bodies[1].support!.xi.x-free.bodies[1].support!.xi.x)).toBeGreaterThan(.005);
    for(const capacity of [1e-3,1e-6,1e-9]){
      const tiny=fixture('achieved-support',capacity);
      expect(tiny.grip.force).toBe(0);
      expect(tiny.bodies[1].support!.xi.x).toBe(live.bodies[1].support!.xi.x);
    }
  });
  it('rejects the old finite recovery change under vanishing nonzero transmitted force',()=>{
    for(const variant of ['achieved-support','full','phase','phase-timing','phase-source']){
      const free=fixture(variant,null,true,'center',1,12,true);
      for(const capacity of [1e-3,1e-6,1e-9]){
        const held=fixture(variant,capacity,true,'center',1,12,true);
        expect(held.grip.force!).toBeGreaterThan(0);
        expect(held.grip.force!).toBeLessThanOrEqual(capacity+1e-12);
        const impulse=held.trace.reduce((s,row)=>s+Math.hypot(row.passive.x,row.passive.y),0);
        expect(impulse).toBeLessThanOrEqual(capacity*.05+1e-12);
        const error=Math.abs(held.bodies[1].support!.xi.x-free.bodies[1].support!.xi.x);
        if(variant==='achieved-support')expect(error).toBeGreaterThan(.015);
        else if(capacity===1e-6)expect(error).toBeLessThan(1e-8);
      }
    }
  });
  it.each(['full','phase','phase-timing','phase-source'])('%s preserves no-grip/zero-force continuity',variant=>{
    for(const mode of ['center','patch']as const)for(const n of [12,48]){
      const free=fixture(variant,null,false,mode,1,n);
      for(const capacity of [900,1e-3,1e-6,1e-9]){
        const held=fixture(variant,capacity,false,mode,1,n);
        expect(held.grip.force).toBe(0);
        expect(held.bodies[1].support!.xi.x).toBeCloseTo(free.bodies[1].support!.xi.x,12);
        expect(held.bodies[1].support!.out).toBe(free.bodies[1].support!.out);
      }
    }
  });
  it.each(['phase','phase-timing','phase-source'])('%s has a vanishing loaded weak-grip response',variant=>{
    for(const mode of ['center','patch']as const)for(const side of [1,-1]){
      const free=fixture(variant,null,true,mode,side);
      let previous=Infinity;
      for(const capacity of [1e-2,1e-4,1e-6,1e-8]){
        const held=fixture(variant,capacity,true,mode,side);
        const error=Math.hypot(held.bodies[1].support!.xi.x-free.bodies[1].support!.xi.x,
          held.bodies[1].support!.xi.y-free.bodies[1].support!.xi.y);
        expect(error).toBeLessThan(previous);previous=error;
        expect(held.grip.force!).toBeLessThanOrEqual(capacity+1e-10);
        if(capacity===1e-6)expect(error).toBeLessThan(1e-6);
      }
    }
  });
  it.each(['phase','phase-timing','phase-source'])('%s retains force, yaw and work budgets in loaded mirrors',variant=>{
    for(const mode of ['center','patch']as const)for(const side of [1,-1])for(const n of [12,48]){
      const {result:r,trace,bodies,grip}=fixture(variant,80,true,mode,side,n);
      expect(grip.force!).toBeGreaterThan(0);expect(grip.force!).toBeLessThanOrEqual(80+1e-8);
      for(const axis of ['x','y']as const){
        const momentum=bodies.reduce((s,b)=>s+b.profile.massKg*b.vel[axis],0);
        const ground=r.groundImpulse.reduce((s,j)=>s+j[axis],0);
        expect(momentum).toBeCloseTo(ground,9);
      }
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
      expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-8);
      for(let k=0;k<2;k++){
        expect(r.armWork[k]).toBeLessThanOrEqual(r.armWorkLimit[k]+1e-8);
        expect(r.supportMotorWork[k]).toBeLessThanOrEqual(r.supportMotorWorkLimit[k]+1e-8);
      }
      if(mode==='patch')for(const row of trace)for(let k=0;k<2;k++){
        const angular=row.start[k].inertia*(row.end[k].spin-row.start[k].spin);
        const role=k===0?'angularA':'angularB';
        expect(angular).toBeCloseTo(row.groundYaw[k]+row.reel[role]+row.passive[role]+row.torso[role],9);
      }
    }
  });
});
