import { describe, expect, it } from 'vitest';
import { isolated, probe } from '../scripts/diag/constraint-work.js';
import { World } from '../src/physics/world.js';
import type { Body } from '../src/physics/kinematics.js';

const profile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
  brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
  reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 };
const body = (x: number): Body => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 },
  facing: 0, energy: 1, profile: { ...profile } });

describe('per-solve constraint work and physical interval accounting', () => {
  it('unwinds a dissipative normal guess, converges, and preserves passive work and momentum', () => {
    const old = probe('per-update', 'grasp', 32);
    const next = probe('per-solve', 'grasp', 32);
    expect(Math.abs(old.residuals[0])).toBeGreaterThan(.03);
    expect(Math.max(...next.residuals.map(Math.abs))).toBeLessThan(1e-12);
    expect(next.momentum).toBeCloseTo(3, 12);
    expect(next.energyChange).toBeLessThan(0);
    expect(next.passiveGraspWork).toBeCloseTo(next.energyChange, 12);
    expect(next.normalWork.every(work => work <= 1e-12)).toBe(true);
  });

  it('charges no spurious arm cost for the same converged dissipative hands solve in either row order', () => {
    const forward = probe('per-solve', 'hands', 32, false, 0);
    const reverse = probe('per-solve', 'hands', 32, true, 0);
    forward.velocities.forEach((v, i) => expect(v).toBeCloseTo(reverse.velocities[i], 12));
    forward.lambda.forEach((v, i) => expect(v).toBeCloseTo(reverse.lambda[i], 12));
    expect(forward.armWork).toBe(0);
    expect(reverse.armWork).toBe(0);
    expect(probe('per-update', 'hands', 32).armWork).toBeGreaterThan(.01);
  });

  it('keeps correction credit local and bounds shared arm work across channels and real operations', () => {
    const w = isolated('per-solve', .05);
    const normal = { net: 0 }, tangent = { net: 0 };
    // Dissipate .75 on the normal channel, then attempt positive tangential work.
    expect(w.pairImpulse(0, 1, -.5, 0, 0, 'grasps', false, normal)).toBe(1);
    expect(normal.net).toBeCloseTo(-.75);
    expect(w.pairImpulse(0, 1, 0, .1, 0, 'grasps', false, tangent)).toBe(0);
    // A fresh channel models the next physical solve; no old credit follows it.
    expect(w.pairImpulse(0, 1, .1, 0, 0, 'grasps', false, { net: 0 })).toBe(0);
    expect(w.pairImpulse(0, 1, .1, 0, 0, 'grasps', false)).toBe(0);
    // Own negative work can be unwound, but only as far as zero passive net.
    const recovered = w.pairImpulse(0, 1, 1, 0, 0, 'grasps', false, normal);
    expect(recovered).toBeGreaterThan(0);
    expect(recovered).toBeLessThan(1);
    expect(normal.net).toBeCloseTo(0, 12);
    // Two distinct active channels and a real operation share one owner's limit.
    const first = { net: 0 }, second = { net: 0 };
    w.pairImpulse(0, 1, 0, .1, 0, 'hands', true, first);
    const fraction = w.pairImpulse(0, 1, 0, 1, 0, 'hands', true, second);
    expect(fraction).toBeGreaterThan(0);
    expect(fraction).toBeLessThan(1);
    expect(w.report.armWork[0]).toBeCloseTo(.05, 12);
    expect(w.pairImpulse(0, 1, 0, .1, 0, 'strikes')).toBeCloseTo(0, 12);
    expect(w.report.armWork[0]).toBeLessThanOrEqual(.05 + 1e-12);
  });

  it('creates disjoint credits each actual substep and retains earlier physical arm charges', () => {
    const a = body(0), b = body(.9);
    const world = new World([a, b], { substeps: 3, constraintWork: 'per-solve' });
    world.joints.push({ kind: 'hands', a, b, extension: 1.1, push: 800, hold: 800, steer: 0 });
    const w: any = world, intervals: any[][] = [];
    const buildRows = w.jointRows;
    w.jointRows = function(h: number) {
      // No strikes/reels: retained tick charge equals earlier physical rows.
      const retained = intervals.flat().reduce((sum, row) => sum + Math.max(0, row.normalWork?.net ?? 0), 0);
      expect(this.report.armWork[0]).toBeCloseTo(retained, 10);
      const rows = buildRows.call(this, h);
      rows.forEach((row: any) => {
        expect(row.normalWork).toBeUndefined();
        expect(row.tangentWork).toBeUndefined();
      });
      intervals.push(rows);
      return rows;
    };
    const report = world.step([{ vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }], .05);
    expect(intervals).toHaveLength(3);
    const rows = intervals.flat();
    expect(rows).toHaveLength(3);
    expect(new Set(rows).size).toBe(rows.length);
    expect(new Set(rows.map(row => row.normalWork)).size).toBe(rows.length);
    expect(rows.every(row => row.normalWork && row.normalWork.net > 0)).toBe(true);
    expect(report.armWork[0]).toBeCloseTo(rows.reduce((sum, row) => sum + Math.max(0, row.normalWork.net), 0), 10);
    expect(report.armWork[0]).toBeLessThanOrEqual(report.armWorkLimit[0] + 1e-9);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });

  it('keeps virtual-foot passive normal and tangent ledgers local and nonpositive across real substeps', () => {
    const a = body(0), b = body(1);
    b.vel = { x: .1, y: 1 };
    const world = new World([a, b], { substeps: 3, supportModel: 'virtual-foot', constraintWork: 'per-solve' });
    world.joints.push({ kind: 'grasp', a, b, reach: 2, hold: 1, capacity: 900, legs: 1, pull: 0 });
    const w: any = world, intervals: any[][] = [];
    const buildRows = w.jointRows, applySupport = w.supportImpulse;
    let coupledUpdates = 0;
    w.jointRows = function(h: number) {
      const rows = buildRows.call(this, h);
      intervals.push(rows);
      return rows;
    };
    w.supportImpulse = function(...args: any[]) {
      const channel = args[5];
      expect(channel).toBeDefined();
      expect(channel.net).toBeLessThanOrEqual(1e-9);
      const fraction = applySupport.apply(this, args);
      expect(channel.net).toBeLessThanOrEqual(1e-9);
      coupledUpdates++;
      return fraction;
    };
    const report = world.step([{ vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }], .05);
    expect(intervals).toHaveLength(3);
    expect(coupledUpdates).toBeGreaterThan(0);
    const rows = intervals.flat(), channels = rows.flatMap(row => [row.normalWork, row.tangentWork]);
    expect(channels.every(channel => channel && Number.isFinite(channel.net) && channel.net <= 1e-9)).toBe(true);
    expect(new Set(channels).size).toBe(channels.length);
    expect(rows.some(row => row.normalWork.net < -1e-6)).toBe(true);
    expect(rows.some(row => row.tangentWork.net < -1e-6)).toBe(true);
    expect(report.passiveGraspWork).toBeCloseTo(channels.reduce((sum, channel) => sum + channel.net, 0), 10);
    expect(report.armWork.every(work => work === 0)).toBe(true);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });
});
