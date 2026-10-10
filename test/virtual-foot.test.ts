/** The experimental support coordinate must earn promotion through physical
 * contracts and football transfer, not through looser tackle assertions. */
import { describe, expect, it } from 'vitest';
import { approachTackle, sidewaysHit } from '../src/lab/scenarios.js';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';
import { World, type GraspJoint } from '../src/physics/world.js';

const profile = { massKg: 100, radius: .28, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
  shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const stand = { vel: { x: 0, y: 0 } };
function body(x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0,
    profile: { ...profile }, energy: 1, support: newSupport() };
}
function recovery(capacity: number, count = 1, substeps = 12) {
  const a = body(0), b = body(1);
  b.support!.xi = { x: .5, y: 0 }; b.support!.out = .12;
  const world = new World([a, b], { substeps, supportModel: 'virtual-foot' });
  const grips: GraspJoint[] = Array.from({ length: count }, () =>
    ({ kind: 'grasp', a, b, reach: 1.5, hold: 1, capacity, legs: 1 }));
  world.joints.push(...grips);
  const report = world.step([stand, stand], .05);
  return { a, b, world, grips, report };
}

describe('experimental shared support motor', () => {
  it('inherited experimental state cannot silently select or mix support models', () => {
    const a = body(0), experimental = new World([a], { supportModel: 'virtual-foot' });
    a.support!.foot!.offset.x = 2;
    const legacy = new World([a]);
    expect(a.support!.foot).toBeUndefined();
    experimental.step([stand], .05);
    expect(a.support!.foot).toBeDefined();
    legacy.step([stand], .05);
    expect(a.support!.foot).toBeUndefined();
  });
  it('resists a recovery step from stationary COMs progressively within the grip limit', () => {
    const rows = [0, 20, 80, 900].map(capacity => recovery(capacity));
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].b.support!.foot!.offset.x).toBeLessThan(rows[i - 1].b.support!.foot!.offset.x);
      expect(rows[i].b.support!.xi.x).toBeGreaterThan(rows[i - 1].b.support!.xi.x);
    }
    for (const row of rows) {
      expect(row.grips[0].force!).toBeLessThanOrEqual(row.grips[0].capacity * (1 + 1e-9));
      expect(row.report.passiveGraspWork).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(row.report.work.residual)).toBeLessThan(1e-8);
      expect(row.report.supportMotorWork[1]).toBeLessThanOrEqual(row.report.supportMotorWorkLimit[1] + 1e-9);
    }
    expect(rows[3].b.vel.x).toBeLessThan(0);
    expect(rows[3].a.vel.x).toBeGreaterThan(0); // holder is not a world anchor
  });

  it('identical copies cannot create another spring, force budget or motor-work expense', () => {
    for (const capacity of [20, 900]) {
      const one = recovery(capacity), four = recovery(capacity, 4);
      for (const key of ['a', 'b'] as const) {
        expect(four[key].pos.x).toBeCloseTo(one[key].pos.x, 10);
        expect(four[key].vel.x).toBeCloseTo(one[key].vel.x, 10);
      }
      expect(four.b.support!.foot!.offset.x).toBeCloseTo(one.b.support!.foot!.offset.x, 10);
      expect(four.report.supportMotorWork[1]).toBeCloseTo(one.report.supportMotorWork[1], 10);
      expect(four.grips.reduce((s, g) => s + g.force!, 0)).toBeCloseTo(one.grips[0].force!, 10);
    }
  });

  it('internal foot reactions conserve momentum and separate motor work from passive loss', () => {
    const { a, b, report } = recovery(900, 1, 1);
    const ground = report.groundImpulse.reduce((s, j) => s + j.x, 0);
    expect(a.profile.massKg * a.vel.x + b.profile.massKg * b.vel.x).toBeCloseTo(ground, 10);
    expect(report.work.grasps).toBeCloseTo(report.supportMotorWork.reduce((s, w) => s + w, 0)
      + report.passiveGraspWork, 10);
    // Corrective placement and stance drive share the existing leg force.
    const foot = b.support!.foot!;
    const reserve = Math.hypot(foot.desired.x, foot.desired.y) / foot.mobility;
    const stance = Math.hypot(report.groundImpulse[1].x, report.groundImpulse[1].y) / .05;
    expect(Math.hypot(reserve, stance)).toBeLessThanOrEqual(foot.capacity + 1e-8);
  });

  it('validates reach at the same attachment whose motion the constraint solves', () => {
    const a = body(0), b = body(1), world = new World([a, b], { supportModel: 'virtual-foot' });
    b.support!.foot!.offset.x = 2;
    const grip: GraspJoint = { kind: 'grasp', a, b, reach: 1.5, capacity: 900, legs: 1, pull: 1 };
    world.joints.push(grip);
    const report = world.step([stand, stand], .05);
    expect(grip.broken).toBe(true);
    expect(grip.force).toBe(0);
    expect(report.work.grasps).toBe(0);
    expect(b.support!.foot!.force.x).toBe(0);
  });

  it('preserves ordinary frontal tackles and moderate shove recovery on both sides', () => {
    for (const speed of [4, 7]) for (const side of [1, -1] as const) {
      const r = approachTackle({ bearing: 0, speed, side, supportModel: 'virtual-foot' });
      expect(r.tackled).toBe(true);
      expect(r.finite).toBe(true);
      expect(r.momentumError).toBeLessThan(1e-6);
    }
    const r = sidewaysHit({ hitter: 4, supportModel: 'virtual-foot' });
    expect(r.fell).toBe(false);
    expect(r.recovered).toBeLessThan(.6);
  });
});
