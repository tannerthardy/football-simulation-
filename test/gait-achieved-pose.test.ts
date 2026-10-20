import { describe, expect, it } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';
import { stepBody, type Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World } from '../src/physics/world.js';

const profile: PhysicalProfile = { massKg:100, radius:.3, reach:1, heightYd:2.05,
  vmax:9, tau:1.3, brake:6, lateral:6, turnRate:8, backpedal:.6, shuffle:.55,
  maxCatchHeight:3, reactReach:2.6, reactionTime:.25, power:100, balance:.5 };
const body=():Body=>({pos:{x:0,y:0},vel:{x:0,y:0},facing:0,energy:1,profile:{...profile}});

describe('gait uses the pose that the body has attained',()=>{
  it.each([-1,1])('does not grant forward burst before a requested quarter turn, side %s',side=>{
    for(const fullWorld of [false,true]){
      const b=body(),command={vel:{x:0,y:side*9},facing:side*Math.PI/2};
      if(fullWorld){
        const r=new World([b]).step([command],.05);
        expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
      }else stepBody(b,command,.05);
      // Initially this is sideways gait. The independent sprint law is
      // (directional cap - speed)/tau; requesting yaw cannot award that yaw.
      expect(b.vel.x).toBe(0);
      expect(side*b.vel.y).toBeCloseTo(profile.vmax*profile.shuffle/profile.tau*.05,12);
      expect(side*b.facing).toBeGreaterThan(0);
      expect(side*b.facing).toBeLessThanOrEqual(profile.turnRate*.05);
    }
  });

  it('a new yaw request changes turning without changing the already planned first gait interval',()=>{
    for(const fullWorld of [false,true]){
      const run=(facing:number)=>{
        const b=body(),command={vel:{x:0,y:9},facing};
        if(fullWorld)new World([b]).step([command],.05);else stepBody(b,command,.05);
        return b;
      };
      const held=run(0),turning=run(Math.PI/2);
      expect(turning.vel).toEqual(held.vel);expect(turning.pos).toEqual(held.pos);
      expect(held.facing).toBe(0);expect(turning.facing).toBeGreaterThan(0);
    }
  });

  it('preserves the ordinary forward sprint and rest controls',()=>{
    for(const fullWorld of [false,true])for(const speed of [0,9]){
      const b=body(),command={vel:{x:speed,y:0},facing:0};
      if(fullWorld)new World([b]).step([command],.05);else stepBody(b,command,.05);
      const acceleration=speed===0?0:profile.vmax/profile.tau;
      expect(b.vel.x).toBeCloseTo(acceleration*.05,12);
      expect(b.pos.x).toBeCloseTo(.5*acceleration*.05*.05,12);
      expect(b.vel.y).toBe(0);expect(b.facing).toBe(0);expect(b.spin).toBe(0);
    }
  });

  it('cannot turn when a traction-saturated brake consumes the same ground allowance',()=>{
    // Synthetic limiting state: the same capacities cap translation; this
    // does not assert that NFL players use this braking profile.
    const b=body();b.vel={x:0,y:7};b.profile.brake=30;
    const r=new World([b]).step([{vel:{x:0,y:9},facing:Math.PI/2}],.05);
    const traction=supportParams(b.profile).traction;
    expect(b.facing).toBe(0);expect(b.spin).toBe(0);
    expect(r.groundYawImpulse[0]).toBe(0);
    expect(Math.abs(r.groundImpulse[0].y)).toBeCloseTo(traction*.05,10);
    expect(b.vel.y).toBeCloseTo(7-traction/profile.massKg*.05,12);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
  });
});
