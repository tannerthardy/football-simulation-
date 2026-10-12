import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World } from '../src/physics/world.js';

function body(x: number, radius: number): Body {
  return { pos: { x, y: 0 }, vel: { x: .7, y: 0 }, facing: 0, spin: 0, energy: 1,
    profile: { massKg: 100, radius, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: 100, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}

function angular(bs: Body[]) {
  return bs.reduce((sum, b) => sum + b.profile.massKg * (b.pos.x * b.vel.y - b.pos.y * b.vel.x)
    + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0);
}

describe('torso impulses act at one common reduced contact point', () => {
  it.each([-1, 1])('conserves angular momentum through overlap and swept contact, side %s', side => {
    for (const separation of [.50, .54, .58]) {
      const a = body(0, .25), b = body(separation, .35), bs = [a, b];
      a.vel.x = 1.2; b.vel.x = .2; b.vel.y = side * 1;
      const before = angular(bs), world = new World(bs, { substeps: 1, handContact: 'patch' });
      const report = world.step(bs.map(() => ({ vel: { x: 0, y: 0 }, free: true })), .05);
      expect(report.contacts.length).toBeGreaterThan(0);
      expect(report.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
      expect(report.groundYawImpulse).toEqual(bs.map(() => 0));
      expect(report.falls).toHaveLength(0);
      expect(angular(bs)).toBeCloseTo(before, 8);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-9);
    }
  });
});
