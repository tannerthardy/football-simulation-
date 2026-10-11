import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World, type HandJoint, type Intent } from '../src/physics/world.js';

const free: Intent = { vel: { x: 0, y: 0 }, free: true };
function body(mass: number, x: number, radius = .3): Body {
  return { pos: { x, y: 0 }, vel: { x: .7, y: 0 }, facing: 0, spin: 0, energy: 1,
    profile: { massKg: mass, radius, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: mass, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}
function totals(bs: Body[]) {
  return {
    angular: bs.reduce((sum, b) => sum + b.profile.massKg * (b.pos.x * b.vel.y - b.pos.y * b.vel.x)
      + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0),
    energy: bs.reduce((sum, b) => sum + .5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2)
      + .5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0),
    px: bs.reduce((sum, b) => sum + b.profile.massKg * b.vel.x, 0),
    py: bs.reduce((sum, b) => sum + b.profile.massKg * b.vel.y, 0),
  };
}
function check(bs: Body[], before: ReturnType<typeof totals>, report: ReturnType<World['step']>) {
  const after = totals(bs);
  expect(after.angular).toBeCloseTo(before.angular, 8);
  expect(after.px).toBeCloseTo(before.px, 9);
  expect(after.py).toBeCloseTo(before.py, 9);
  expect(after.energy - before.energy).toBeCloseTo(report.work.hands, 9);
  expect(report.work.hands).toBeLessThanOrEqual(1e-9);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-9);
  expect(report.contacts).toHaveLength(0);
  expect(report.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
  expect(report.groundYawImpulse).toEqual(bs.map(() => 0));
  for (let i = 0; i < bs.length; i++) {
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-9);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-9);
  }
}

describe('one effective hand patch transfers planar angular momentum', () => {
  it('rejects the incompatible historical end-impulse travel rule', () => {
    expect(() => new World([body(100, 0), body(80, .9)], { handContact: 'patch', handIntegration: 'end' }))
      .toThrow('Common hand patches require centered force integration');
  });

  it.each([-1, 1])('transfers real spin into translation with no COM slip, side %s', side => {
    const a = body(100, 0), b = body(80, .9), bs = [a, b];
    a.spin = b.spin = side;
    const before = totals(bs), w = new World(bs, { substeps: 1, handContact: 'patch' });
    const joint: HandJoint = { kind: 'hands', a, b, extension: .9, push: 0, hold: 0, steer: 20 };
    w.joints.push(joint);
    const report = w.step(bs.map(() => free), .05);
    check(bs, before, report);
    expect(joint.tangentForce).toBeCloseTo(side * 20, 10);
    expect(a.vel.y * side).toBeLessThan(0);
    expect(b.vel.y * side).toBeGreaterThan(0);
    for (const q of bs) {
      const impulse = side * 20 * .05;
      const spin = side - .45 * impulse / supportParams(q.profile).yawInertia;
      expect(q.spin).toBeCloseTo(spin, 10);
      expect(q.facing).toBeCloseTo(.05 * (side + spin) / 2, 10);
    }
  });

  it('does not resist opposed spins whose patch velocities already match', () => {
    const a = body(100, 0, .25), b = body(80, .9, .35), bs = [a, b];
    a.spin = 1; b.spin = -.25 / .35;
    const before = totals(bs), w = new World(bs, { substeps: 1, handContact: 'patch' });
    w.joints.push({ kind: 'hands', a, b, extension: .9, push: 0, hold: 0, steer: 20 });
    const report = w.step(bs.map(() => free), .05);
    check(bs, before, report);
    expect(report.armImpulse[0]).toBeLessThan(1e-10);
    expect(a.spin).toBeCloseTo(1, 10);
    expect(b.spin).toBeCloseTo(-.25 / .35, 10);
  });

  it('conserves the law with mixed closing/sliding, unequal radii, mirrors and coordinate changes', () => {
    for (const side of [-1, 1]) for (const angle of [0, .8]) for (const steps of [1, 12, 48]) {
      const a = body(100, 0, .25), b = body(80, .9, .35), bs = [a, b];
      b.vel = { x: -.3, y: side * 2 };
      a.spin = side * .4; b.spin = -side * .7;
      for (const q of bs) {
        const rotate = (v: { x: number; y: number }) => ({
          x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
          y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
        });
        q.pos = rotate(q.pos); q.pos.x += 17; q.pos.y -= 9;
        q.vel = rotate(q.vel); q.facing = angle;
      }
      const w = new World(bs, { substeps: steps, handContact: 'patch' });
      w.joints.push({ kind: 'hands', a, b, extension: 1.5, push: 0, hold: 0, steer: 20 });
      for (let k = 0; k < 4; k++) {
        const before = totals(bs), report = w.step(bs.map(() => free), .05);
        check(bs, before, report);
      }
    }
  });

  it('shares one body across two real hand patches without losing angular momentum', () => {
    const a = body(100, 0), b = body(80, .9), c = body(120, -.9), bs = [a, b, c];
    b.vel.y = 2; c.vel.y = -.7; a.spin = .3;
    const w = new World(bs, { substeps: 12, handContact: 'patch' });
    w.joints.push({ kind: 'hands', a, b, extension: .9, push: 0, hold: 0, steer: 20 },
      { kind: 'hands', a, b: c, extension: .9, push: 0, hold: 0, steer: 30 });
    for (let k = 0; k < 4; k++) {
      const before = totals(bs), report = w.step(bs.map(() => free), .05);
      check(bs, before, report);
    }
  });
});
