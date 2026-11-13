import {describe,expect,it} from 'vitest';
import {World,type GraspJoint} from '../../src/physics/world.js';
import {baseRadiusAt,newSupport,supportParams} from '../../src/physics/support.js';
import type {Body} from '../../src/physics/kinematics.js';
import {native,withRecoveryExperiment} from '../../scripts/diag/tackle/grip-refinement.js';
const p={massKg:100,radius:.28,reach:1,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
function run(capacity:number|null,side=1,n=12,slack=false,mode:'center'|'patch'='center'){
  const bodies:Body[]=[slack?2:0,1].map(x=>({pos:{x,y:0},vel:{x:0,y:0},facing:0,profile:{...p},energy:1,support:newSupport()}));
  bodies[1].support!.xi={x:baseRadiusAt(supportParams(p),.2)+.001,y:slack?0:side*.01};bodies[1].support!.out=.12;
  const world=new World(bodies,{substeps:n,handContact:mode}),profiles=bodies.map(b=>b.profile);
  const grip:GraspJoint={kind:'grasp',a:bodies[0],b:bodies[1],capacity:capacity??0,legs:1,hold:1,reach:3,pull:0};
  if(capacity!==null)world.joints.push(grip);
  world.joints.push({kind:'hands',a:bodies[0],b:bodies[1],extension:3,push:0,hold:0,steer:0});
  const result=withRecoveryExperiment(world,'continued-recovery',()=>world.step(bodies.map(()=>({vel:{x:0,y:0},posture:.2})),.05));
  expect(world.bodies).toBe(bodies);
  expect(world.indexOf(bodies[0])).toBe(0);expect(world.indexOf(bodies[1])).toBe(1);
  bodies.forEach((b,i)=>expect(b.profile).toBe(profiles[i]));
  if(capacity!==null){expect(world.joints[0]).toBe(grip);expect(grip.a).toBe(bodies[0]);expect(grip.b).toBe(bodies[1]);}
  return {...result,bodies,world,grip};
}

describe('continued response shares achieved World placement and physical budgets',()=>{
  it('a live zero-load grip and tiny real loads approach the unheld common response',()=>{
    for(const mode of ['center','patch']as const)for(const side of [1,-1]){
      const free=run(null,side,12,false,mode);
      for(const capacity of [1e-3,1e-6,1e-9]){
        const held=run(capacity,side,12,false,mode);
        expect(held.grip.force!).toBeGreaterThan(0);
        expect(Math.hypot(held.bodies[1].support!.xi.x-free.bodies[1].support!.xi.x,
          held.bodies[1].support!.xi.y-free.bodies[1].support!.xi.y)).toBeLessThan(capacity*.01+1e-9);
      }
      const loose=run(900,side,12,true,mode),unheld=run(null,side,12,true,mode);
      expect(loose.grip.force).toBe(0);
      expect(loose.bodies[1].support!.xi.x).toBeCloseTo(unheld.bodies[1].support!.xi.x,10);
    }
  });
  it('couples balance to the SAME mean requested and achieved movement through a loaded base crossing',()=>{
    for(const mode of ['center','patch']as const)for(const n of [12,48]){
      const r=run(80,1,n,false,mode);
      expect(r.grip.force!).toBeGreaterThan(0);
      expect(r.trace.length).toBe(n);
      for(const row of r.trace){
        expect(row.coupling.residual).toBeLessThanOrEqual(1e-9);
        for(const u of row.supportUpdates){
          const flow=u.phase.continued,foot=u.before.support.foot;
          if(!foot)continue;
          expect(Math.hypot(foot.desired.x-flow.requested.x/u.h,foot.desired.y-flow.requested.y/u.h)).toBeLessThan(1e-8);
          expect(Math.hypot(foot.achieved.x-flow.achieved.x/u.h,foot.achieved.y-flow.achieved.y/u.h)).toBeLessThan(1e-8);
          expect(flow.peakCommandForce).toBeLessThanOrEqual(foot.capacity+1e-8);
          expect(flow.commandWork).toBeLessThanOrEqual(foot.capacity*u.recovery*u.h+1e-8);
        }
      }
    }
  });
  it('accepted scratch solves spend one physical interval, conserving momentum and work',()=>{
    for(const mode of ['center','patch']as const)for(const side of [1,-1]){
      const r=run(300,side,12,false,mode),report=r.result;
      expect(r.world.time).toBeCloseTo(.05,12);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      expect(report.passiveGraspWork).toBeLessThanOrEqual(1e-8);
      for(const axis of ['x','y']as const){
        const momentum=r.bodies.reduce((v,b)=>v+b.profile.massKg*b.vel[axis],0);
        expect(momentum).toBeCloseTo(report.groundImpulse.reduce((v,j)=>v+j[axis],0),9);
      }
      for(let i=0;i<2;i++){
        expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i]+1e-8);
        expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i]+1e-8);
      }
      if(mode==='patch')for(const row of r.trace)for(let k=0;k<2;k++){
        const angular=row.start[k].inertia*(row.end[k].spin-row.start[k].spin),role=k===0?'angularA':'angularB';
        expect(angular).toBeCloseTo(row.groundYaw[k]+row.reel[role]+row.passive[role]+row.torso[role],9);
      }
    }
  });
  it.each([1,-1]as const)('retains an ordinary frontal physical tackle, side=%s',side=>{
    for(const mode of ['center','patch']as const){
      const c=native({angle:0,speed:3,cut:false,difficulty:'ordinary'},mode,side,12,true,'continued-recovery');
      expect((c.result as any).ending).toBe('tackled');expect((c.result as any).finish).toBe('physical fall');
    }
  });
});
