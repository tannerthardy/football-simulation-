import { describe, expect, it } from 'vitest';
import { angleDiff } from '../src/core/vec.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import { stepBody, type Body } from '../src/physics/kinematics.js';
import { World } from '../src/physics/world.js';

const profile: PhysicalProfile = { massKg:100, radius:.3, reach:1, heightYd:2.05,
  vmax:9, tau:1.3, brake:6, lateral:6, turnRate:8, backpedal:.6, shuffle:.55,
  maxCatchHeight:3, reactReach:2.6, reactionTime:.25, power:100, balance:.5 };
const body = (): Body => ({ pos:{x:0,y:0}, vel:{x:0,y:0}, facing:0,
  energy:1, profile:{...profile} });

describe('requested facing through the ordinary movement motor', () => {
  it.each([-.2,.2,-Math.PI/2,Math.PI/2])('settles a reachable constant turn without reversing it (%s)', target => {
    for (const useWorld of [false,true]) {
      const b=body(), world=new World([b]);
      let previous=0;
      for(let k=0;k<30;k++) {
        const command={vel:{x:0,y:0},facing:target};
        if(useWorld) {
          const report=world.step([command],.05);
          expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
        } else stepBody(b,command,.05);
        const progress=Math.sign(target)*b.facing;
        expect(progress).toBeGreaterThanOrEqual(previous-1e-12);
        expect(progress).toBeLessThanOrEqual(Math.abs(target)+1e-12);
        expect(Math.abs(b.spin??0)).toBeLessThanOrEqual(profile.turnRate+1e-12);
        previous=progress;
      }
      expect(Math.abs(angleDiff(b.facing,target))).toBeLessThan(1e-6);
    }
  });

  it('plans braking against the requested angle, rather than stopping at a new rate-clipped angle each tick', () => {
    const b=body(),world=new World([b]);
    for(let k=0;k<3;k++)world.step([{vel:{x:0,y:0},facing:Math.PI/2}],.05);
    // With the existing acceleration bound this turn is still accelerating
    // toward the existing rate limit. A 0.4rad intermediate stopping target
    // prematurely brakes it to about 3rad/s instead.
    expect(b.spin).toBeCloseTo(profile.turnRate,8);
    expect(b.facing).toBeGreaterThan(.65);
  });

  it('keeps a purposeful reversal responsive instead of holding the previous turn', () => {
    const b=body(),world=new World([b]);
    world.step([{vel:{x:0,y:0},facing:Math.PI/2}],.05);
    const spin=b.spin!;
    world.step([{vel:{x:0,y:0},facing:-Math.PI/2}],.05);
    expect(b.spin).toBeLessThan(spin);
    for(let k=0;k<20;k++)world.step([{vel:{x:0,y:0},facing:-Math.PI/2}],.05);
    expect(Math.abs(angleDiff(b.facing,-Math.PI/2))).toBeLessThan(1e-4);
  });

  it('retains externally acquired spin until finite counter torque can remove it', () => {
    const b=body();b.spin=20;
    const world=new World([b]);
    const report=world.step([{vel:{x:0,y:0},facing:0}],.05);
    expect(b.spin).toBeGreaterThan(profile.turnRate);
    expect(b.spin).toBeLessThan(20);
    expect(b.facing).toBeGreaterThan(0);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });

  it('has no turning work or motion when its requested pose and incoming spin agree', () => {
    const b=body(),world=new World([b]);
    const report=world.step([{vel:{x:0,y:0},facing:0}],.05);
    expect(b.facing).toBe(0);expect(b.spin).toBe(0);
    expect(report.groundYawImpulse[0]).toBe(0);
    expect(report.groundYawWork[0]).toBe(0);
  });
});
