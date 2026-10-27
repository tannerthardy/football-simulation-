/** Bound legs: a hold on a runner's legs resists his stride with its grip,
 * anchored by the holder's footing, scaled by how much of the legs the arms
 * cover. These checks pin that law in World; they do not calibrate tackles. */
import { describe, expect, it } from 'vitest';
import { G } from '../src/core/units.js';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World, type GraspJoint, type Intent } from '../src/physics/world.js';

const TICK = 0.05;

function body(mass: number, x: number, vx: number): Body {
  return { pos: { x, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1,
    profile: { massKg: mass, radius: 0.3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6,
      shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25,
      power: mass, balance: 0.5, stepSpeed: 3.4, getUp: 0.9 } };
}

/** A holder behind a runner who keeps asking to run on at 6 yd/s. */
function scene(legs: number | null, runner: Intent = { vel: { x: 6, y: 0 } }, holderDown = false) {
  const holder = body(100, 0, 3), carrier = body(100, 0.75, 3);
  const world = new World([holder, carrier], { substeps: 6 });
  if (holderDown) holder.support!.state = 'down';
  const grip: GraspJoint | null = legs === null ? null : { kind: 'grasp', a: holder, b: carrier,
    reach: 1.4, capacity: 600, legs, pull: 0, hold: 0.75 };
  if (grip) world.joints.push(grip);
  const report = world.step([{ vel: { x: 3, y: 0 } }, runner], TICK);
  return { holder, carrier, grip, report };
}

describe('a hold on his legs binds his stride', () => {
  it('takes no more than its grip times the legs it covers, within his traction', () => {
    const { carrier, grip, report } = scene(0.6);
    const limit = 0.6 * Math.min(600, supportParams(carrier.profile).traction);
    expect(grip!.strideForce).toBeGreaterThan(0);
    expect(grip!.strideForce!).toBeLessThanOrEqual(limit + 1e-9);
    const gi = report.groundImpulse[1];
    expect(Math.hypot(gi.x, gi.y)).toBeLessThanOrEqual(report.groundImpulseLimit[1] + 1e-9);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });

  it('leaves a free runner, and a held man who is not striding, unchanged', () => {
    expect(scene(null).carrier.vel.x).toBeGreaterThan(scene(0.6).carrier.vel.x);
    // Standing (or carried along by the hold) is not a stride.
    expect(scene(0.6, { vel: { x: 0, y: 0 } }).grip!.strideForce).toBe(0);
    // A hold at the waist does not bind the legs.
    expect(scene(0).grip!.strideForce).toBe(0);
  });

  it('is only as firm as the holder\'s footing', () => {
    const up = scene(0.6), down = scene(0.6, { vel: { x: 6, y: 0 } }, true);
    expect(down.grip!.strideForce!).toBeLessThan(up.grip!.strideForce!);
    expect(down.grip!.strideForce!).toBeLessThanOrEqual(0.6 * 0.75 * G * 100 + 1e-9);
  });

  it('slows him more the more of his legs it covers', () => {
    const run = (legs: number) => {
      const holder = body(100, 0, 3), carrier = body(100, 0.75, 3);
      const world = new World([holder, carrier], { substeps: 6 });
      world.joints.push({ kind: 'grasp', a: holder, b: carrier, reach: 1.4, capacity: 600, legs, pull: 0, hold: 0.75 });
      for (let k = 0; k < 4; k++) world.step([{ vel: { x: 3, y: 0 } }, { vel: { x: 6, y: 0 } }], TICK);
      return carrier.vel.x;
    };
    expect(run(0.8)).toBeLessThan(run(0.3));
  });
});
