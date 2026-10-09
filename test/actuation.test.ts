import {describe,it,expect} from 'vitest';
import type {PhysicalProfile} from '../src/players/physical.js';
import type {Body} from '../src/physics/kinematics.js';
import {baseRadiusAt,supportParams} from '../src/physics/support.js';
import {World,type Intent} from '../src/physics/world.js';

const profile:PhysicalProfile={massKg:100,radius:.3,reach:1,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
  backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5};
const body=(x:number,y=0):Body=>({pos:{x,y},vel:{x:0,y:0},facing:0,energy:1,profile:{...profile}});
const free:Intent={vel:{x:0,y:0},free:true};

describe('one body actuator budget',()=>{
  it('delivers finite reachable strikes and rejects remote requests',()=>{
    for(const distance of [1,5]){
      const a=body(0),b=body(distance),w=new World([a,b]);
      w.strike(a,b,{x:1e9,y:0});
      const r=w.step([free,free],.05);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
      expect(r.armImpulse[0]).toBeLessThanOrEqual(r.armImpulseLimit[0]+1e-8);
      expect(a.vel.x+b.vel.x).toBeCloseTo(0,10);
      if(distance===5){expect(b.vel.x).toBe(0);expect(r.work.strikes).toBe(0);}
      else {expect(b.vel.x).toBeGreaterThan(0);expect(r.work.strikes).toBeGreaterThan(0);}
    }
  });

  it('shares normal, steering and repeated strike requests across the same arms',()=>{
    const a=body(0),b=body(.9),c=body(-.9),w=new World([a,b,c]);
    b.vel.y=4;c.vel.y=-4;
    for(const target of [b,c]){
      w.joints.push({kind:'hands',a,b:target,extension:1,push:1e6,hold:1e6,steer:1e6});
      for(let k=0;k<10;k++)w.strike(a,target,{x:target.pos.x*100,y:50});
    }
    const r=w.step([free,free,free],.05);
    expect(r.armImpulse[0]).toBeGreaterThan(0);
    expect(r.armImpulse[0]).toBeLessThanOrEqual(r.armImpulseLimit[0]+1e-8);
    expect(r.armWork[0]).toBeLessThanOrEqual(r.armWorkLimit[0]+1e-8);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
  });

  it('does not create passive grip work; reeling requires the same active arms',()=>{
    for(const pull of [0,1]){
      const a=body(0),b=body(1),w=new World([a,b]);
      w.joints.push({kind:'grasp',a,b,reach:1.3,hold:.7,capacity:1000,legs:0,pull});
      const r=w.step([free,free],.05);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
      expect(r.armWork[0]).toBeLessThanOrEqual(r.armWorkLimit[0]+1e-8);
      if(pull===0){expect(w.kineticEnergy()).toBeCloseTo(0,10);expect(r.armWork[0]).toBe(0);}
      else {expect(r.armWork[0]).toBeGreaterThan(0);expect(b.pos.x-a.pos.x).toBeLessThan(1);}
    }
  });

  it('does not multiply passive holding strength by duplicating a grasp',()=>{
    const run=(count:number)=>{
      const a=body(0),b=body(1),w=new World([a,b]);b.vel.x=5;
      for(let k=0;k<count;k++)w.joints.push({kind:'grasp',a,b,reach:1.3,capacity:300,legs:0});
      const r=w.step([free,free],.05);
      return {force:w.joints.reduce((s,j)=>s+(j.kind==='grasp'?(j.force??0):0),0),r};
    };
    for(const count of [1,2,8]){const {force,r}=run(count);expect(force).toBeLessThanOrEqual(300+1e-8);expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);}
  });

  it('reeling and passive restraint share one grip force, including duplicate holds',()=>{
    for(const capacity of [0,50,300])for(const count of [1,2,8])for(const substeps of [12,48]){
      const a=body(0),b=body(1),w=new World([a,b],{substeps});b.vel.x=5;
      for(let k=0;k<count;k++)w.joints.push({kind:'grasp',a,b,reach:2,hold:1,capacity,legs:0,pull:2});
      const before={...a.vel},r=w.step([free,free],.05);
      const delivered=Math.hypot(a.vel.x-before.x,a.vel.y-before.y)*a.profile.massKg;
      const used=w.joints.reduce((s,j)=>s+(j.kind==='grasp'?(j.force??0):0),0);
      expect(delivered).toBeLessThanOrEqual(capacity*.05+1e-8);
      expect(used).toBeLessThanOrEqual(capacity+1e-8);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
      expect(r.armWork[0]).toBeLessThanOrEqual(r.armWorkLimit[0]+1e-8);
      expect(a.vel.x+b.vel.x).toBeCloseTo(5,10);
    }
  });

  it('shares ground traction with yaw and accounts for angular work',()=>{
    const a=body(0),w=new World([a]);
    const r=w.step([{vel:{x:6,y:0},facing:Math.PI}],.05);
    const sp=supportParams(a.profile),radius=baseRadiusAt(sp,a.support!.posture);
    const force=Math.hypot(r.groundImpulse[0].x,r.groundImpulse[0].y)/.05;
    const torque=Math.abs(r.groundYawImpulse[0])/.05;
    expect(Math.hypot(force,torque/radius)).toBeLessThanOrEqual(sp.traction+1e-8);
    expect(r.groundYawWork[0]).toBeGreaterThan(0);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
  });

  it('closes the planar work ledger through movement, hands, grasps, hits and falls',()=>{
    const a=body(0),b=body(.9),c=body(1.4,.5),w=new World([a,b,c]);c.vel={x:-4,y:-3};
    w.joints.push({kind:'hands',a,b,extension:1,push:900,hold:400,steer:600});
    w.joints.push({kind:'grasp',a:b,b:c,reach:1.3,capacity:800,legs:.6,pull:.7});
    for(let k=0;k<40;k++){
      if(k%5===0)w.strike(a,b,{x:40,y:10});
      const r=w.step([{vel:{x:3,y:1},push:1},{vel:{x:-1,y:0},push:1},{vel:{x:-2,y:-2}}],.05);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
      for(let i=0;i<3;i++){
        expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i]+1e-8);
        expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i]+1e-8);
      }
    }
  });
});
