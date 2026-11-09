/** Independent finite-force travel controls. A grip's passive load is capped
 * in force units; it is not an instantaneous impact at each substep start. */
import { describe, expect, it } from 'vitest';
import { G } from '../src/core/units.js';
import type { Body } from '../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../src/physics/world.js';

const DT = .05, free: Intent = { vel: { x: 0, y: 0 }, free: true };
function body(mass: number, x: number, vx: number): Body {
  return { pos: { x, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1,
    profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: mass, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}
function rotate(x: number, y: number, angle: number) {
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
}
function run(substeps: number, angle: number, capacity = 20, tangent = false, active = false,
  handIntegration: 'centered' | 'end' = 'centered', side = 1) {
  const bs = [body(100, 0, .7), body(80, 1, tangent || active ? .7 : 1.7)];
  if (tangent) bs[1].vel.y = side;
  if (active) bs[0].profile.power = capacity / (.75 * G);
  for (const b of bs) {
    b.pos = rotate(b.pos.x, b.pos.y, angle); b.vel = rotate(b.vel.x, b.vel.y, angle); b.facing = angle;
  }
  const before = bs.map(b => ({ pos: { ...b.pos }, vel: { ...b.vel } }));
  const world = new World(bs, { substeps, handIntegration });
  const grip: GraspJoint = { kind: 'grasp', a: bs[0], b: bs[1], hold: 1, reach: 1.4,
    capacity: active ? 900 : capacity, legs: 0, pull: active ? 3 : 0 };
  world.joints.push(grip);
  const report = world.step(bs.map(() => free), DT);
  expect(report.contacts).toHaveLength(0);
  expect(report.falls.length + report.downs.length + report.rises.length).toBe(0);
  expect(report.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-9);
  expect(report.passiveGraspWork).toBeLessThanOrEqual(1e-9);
  expect(grip.force ?? 0).toBeLessThanOrEqual(grip.capacity + 1e-9);
  for (let i = 0; i < bs.length; i++) {
    expect(bs[i].support!.state).toBe('up');
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-9);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-9);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-9);
  }
  for (const axis of ['x', 'y'] as const) {
    expect(bs.reduce((p, b) => p + b.profile.massKg * b.vel[axis], 0))
      .toBeCloseTo(bs.reduce((p, b, i) => p + b.profile.massKg * before[i].vel[axis], 0), 10);
    expect(bs.reduce((p, b) => p + b.profile.massKg * b.pos[axis], 0))
      .toBeCloseTo(bs.reduce((p, b, i) => p + b.profile.massKg * (before[i].pos[axis] + before[i].vel[axis] * DT), 0), 10);
  }
  return { bs, before, grip, report };
}
function assertConstantForce(s: ReturnType<typeof run>, force: number, angle: number) {
  for (const [i, b] of s.bs.entries()) {
    const a = rotate((i === 0 ? force : -force) / b.profile.massKg, 0, angle);
    for (const axis of ['x', 'y'] as const) {
      expect(b.vel[axis]).toBeCloseTo(s.before[i].vel[axis] + a[axis] * DT, 11);
      expect(b.pos[axis]).toBeCloseTo(s.before[i].pos[axis] + s.before[i].vel[axis] * DT + .5 * a[axis] * DT ** 2, 11);
    }
  }
}

describe('finite passive grasp-force travel', () => {
  it.each([1, 12, 48])('matches constant tension while slipping at %s substeps, including rotation and mirror', substeps => {
    for (const angle of [0, .8, -.8]) {
      const s = run(substeps, angle);
      expect(s.grip.force).toBeCloseTo(20, 10);
      expect(s.grip.slipping).toBe(true);
      expect(s.grip.broken ?? false).toBe(false);
      expect(s.report.work.grasps).toBeLessThan(0);
      assertConstantForce(s, 20, angle);
    }
  });

  it('retains the old first-order travel error as a comparison with unchanged force and velocity', () => {
    for (const n of [1, 12, 48]) {
      const old = run(n, 0, 20, false, false, 'end'), next = run(n, 0);
      expect(old.grip.force).toBe(next.grip.force);
      expect(old.report.work).toEqual(next.report.work);
      for (const [i, b] of next.bs.entries()) {
        expect(b.vel).toEqual(old.bs[i].vel);
        const expectedExcess = (i === 0 ? 1 : -1) * .5 * 20 / b.profile.massKg * DT * (DT / n);
        expect(old.bs[i].pos.x - b.pos.x).toBeCloseTo(expectedExcess, 12);
      }
    }
  });

  it.each([-1, 1])('centers the achieved passive sideways load without changing its budget: side %s', side => {
    const s = run(1, side * .8, 20, true, false, 'centered', side);
    expect(s.grip.slipping).toBe(true);
    expect(s.report.work.grasps).toBeLessThan(0);
    for (const [i, b] of s.bs.entries()) for (const axis of ['x', 'y'] as const)
      expect(b.pos[axis]).toBeCloseTo(s.before[i].pos[axis] + .5 * (s.before[i].vel[axis] + b.vel[axis]) * DT, 11);
  });

  it('keeps a powerless hold from delivering a last impulse or changing free travel', () => {
    const s = run(12, .8, 0);
    expect(s.grip.broken).toBe(true);
    expect(s.report.work.grasps).toBe(0);
    assertConstantForce(s, 0, .8);
  });

  it.each([1, 12, 48])('does not center the already-centered active reel twice at %s substeps', substeps => {
    const s = run(substeps, .8, 20, false, true);
    expect(s.grip.broken ?? false).toBe(false);
    expect(s.grip.slipping ?? false).toBe(false);
    expect(s.report.armImpulse[0]).toBeCloseTo(20 * DT, 10);
    expect(Math.abs(s.report.passiveGraspWork)).toBeLessThan(1e-10);
    assertConstantForce(s, 20, .8);
  });
});
