/** A distant unheld player cannot advance another island's material grip. */
import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { World, type GraspJoint } from '../src/physics/world.js';

function body(massKg: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: .7, y: 0 }, facing: 0, energy: 1,
    profile: { massKg, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
      maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: massKg,
      balance: .5, stepSpeed: 3.4, getUp: .9 } };
}
function run(extra: boolean, substeps: number, handContact: 'center' | 'patch') {
  const bs = [body(100, 0), body(80, 1.2)];
  if (extra) {
    const far = body(100, 100); far.pos.y = 100; bs.push(far);
  }
  const world = new World(bs, { substeps, handContact });
  const grip: GraspJoint = { kind: 'grasp', a: bs[0], b: bs[1], reach: 1.5,
    hold: 1.2, capacity: 900, legs: .6, pull: 2 };
  world.joints.push(grip);
  const rows = [];
  for (let k = 0; k < 6; k++) {
    const r = world.step(bs.map(() => ({ vel: { x: .7, y: 0 } })), .05);
    expect(r.contacts).toHaveLength(0);
    expect(r.falls.length + r.downs.length + r.rises.length).toBe(0);
    expect(grip.broken ?? false).toBe(false);
    expect(grip.force).toBeGreaterThan(0);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
    expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-9);
    for (let i = 0; i < 2; i++) {
      expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-9);
      expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-9);
      expect(r.supportMotorWork[i]).toBeLessThanOrEqual(r.supportMotorWorkLimit[i] + 1e-9);
    }
    rows.push({ pair: structuredClone(bs.slice(0, 2)), force: grip.force, hold: grip.hold,
      legs: grip.legs, slipping: grip.slipping, motorWork: r.supportMotorWork.slice(0, 2) });
  }
  // The held correction actually moves; a stationary unused attachment would
  // make this locality comparison vacuous.
  expect(Math.hypot(bs[1].support!.foot!.offset.x, bs[1].support!.foot!.offset.y)).toBeGreaterThan(.01);
  return rows;
}

describe('material grasp transport belongs to its active bodies', () => {
  it.each((['center', 'patch'] as const).flatMap(handContact => [12, 48].map(substeps => ({ handContact, substeps }))))(
    'keeps $handContact pair motion identical with an unrelated body at $substeps substeps', ({ handContact, substeps }) => {
      expect(run(true, substeps, handContact)).toEqual(run(false, substeps, handContact));
    });
});
