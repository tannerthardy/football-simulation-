import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import { World, type Intent } from '../src/physics/world.js';

const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5,
  bend: .5, stepSpeed: 3.4, getUp: .9 };

function run(speed: number, spin: number, angle: number, substeps: number, dive: boolean) {
  const axis = { x: Math.cos(angle), y: Math.sin(angle) };
  const body = (distance: number): Body => ({ pos: { x: distance * axis.x, y: distance * axis.y },
    vel: { x: speed * axis.x, y: speed * axis.y }, facing: angle, spin, energy: 1, profile: { ...profile } });
  const b = body(0), other = body(4), w = new World([b, other], { substeps });
  // A zero-force joint selects real subdivision without applying a load.
  w.joints.push({ kind: 'hands', a: b, b: other, extension: 4, push: 0, hold: 0, steer: 0 });
  const cmd: Intent = { vel: { ...b.vel }, ...(dive ? { dive: axis } : { free: true }) };
  const report = w.step([cmd, { vel: { x: 0, y: 0 }, free: true }], .05);
  expect(report.contacts).toHaveLength(0);
  expect(report.substeps).toBe(substeps);
  return { b, report };
}

describe('planted dive yaw transport', () => {
  it.each([1, 12, 48])('transports acquired spin without a yaw impulse at %i subdivisions', substeps => {
    for (const speed of [4, 9]) for (const spin of [-2, 2]) for (const angle of [0, .7]) {
      const { b, report } = run(speed, spin, angle, substeps, true);
      expect(b.facing - angle).toBeCloseTo(spin * .05, 13);
      expect(b.spin).toBe(spin);
      expect(report.groundYawImpulse[0]).toBe(0);
      expect(report.groundYawWork[0]).toBe(0);
      expect(b.support!.state).toBe('falling');
      if (speed === profile.vmax) {
        expect(report.groundImpulse[0]).toEqual({ x: 0, y: 0 });
        expect(report.groundWork[0]).toBe(0);
      } else expect(report.groundWork[0]).toBeGreaterThan(0);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-9);
    }
  });

  it('agrees with torque-free motion when launch force is zero', () => {
    const dive = run(profile.vmax, 2, .7, 12, true), free = run(profile.vmax, 2, .7, 12, false);
    expect(dive.b.facing).toBe(free.b.facing);
    expect(dive.b.vel).toEqual(free.b.vel);
    expect(dive.b.pos).toEqual(free.b.pos);
    expect(dive.b.spin).toBe(free.b.spin);
  });
});
