/** Bound legs: a holder off his feet who still holds a runner's legs hangs
 * half his weight on the hold. Swinging that leg through a stride needs the
 * runner's hip to lift it, from the same hip torque that braces the hold's
 * pull on his thighs. These checks pin that law in World; they do not
 * calibrate tackles. */
import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../src/physics/world.js';

const TICK = 0.05;

function body(mass: number, x: number, vx: number): Body {
  return { pos: { x, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1,
    profile: { massKg: mass, radius: 0.3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6,
      shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25,
      power: mass, balance: 0.5, stepSpeed: 3.4, getUp: 0.9 } };
}

/** A runner asking to run on at 6 yd/s with a holder behind him on his legs;
 * the holder either on his feet or already on the ground. */
function run(legs: number | null, opts: { holderDown?: boolean; holderMass?: number; runner?: Intent; ticks?: number } = {}) {
  const holder = body(opts.holderMass ?? 100, 0, 3), carrier = body(100, 0.75, 3);
  const world = new World([holder, carrier], { substeps: 6 });
  if (opts.holderDown) { holder.support!.state = 'down'; holder.support!.since = -10; }
  const grip: GraspJoint | null = legs === null ? null : { kind: 'grasp', a: holder, b: carrier,
    reach: 2.4, ground: 2.4, capacity: 3000, legs, pull: 0, hold: 0.75 };
  if (grip) world.joints.push(grip);
  let report = world.step([{ vel: { x: 0, y: 0 } }, opts.runner ?? { vel: { x: 6, y: 0 } }], TICK);
  for (let k = 1; k < (opts.ticks ?? 1); k++) report = world.step([{ vel: { x: 0, y: 0 } }, opts.runner ?? { vel: { x: 6, y: 0 } }], TICK);
  return { holder, carrier, grip, report };
}

describe('a holder hanging on his legs binds his stride', () => {
  it('binds nothing while the holder is on his feet: he carries his own weight', () => {
    expect(run(0.7).grip!.strideForce).toBe(0);
  });

  it('takes drive from a runner whose legs carry a grounded holder, never adding any', () => {
    const free = run(null, { ticks: 4 }), held = run(0.7, { holderDown: true, ticks: 4 });
    expect(held.grip!.strideForce!).toBeGreaterThan(0);
    // Only his own propulsion is reduced: the ground impulse stays within
    // what his feet can transmit, and energy is accounted for.
    const gi = held.report.groundImpulse[1];
    expect(Math.hypot(gi.x, gi.y)).toBeLessThanOrEqual(held.report.groundImpulseLimit[1] + 1e-9);
    expect(Math.abs(held.report.work.residual)).toBeLessThan(1e-8);
    expect(held.carrier.vel.x).toBeLessThan(free.carrier.vel.x);
  });

  it('binds more the lower the hold and the heavier the holder', () => {
    const v = (legs: number, holderMass = 100) => run(legs, { holderDown: true, holderMass, ticks: 4 }).carrier.vel.x;
    expect(v(0.9)).toBeLessThan(v(0.4));
    expect(v(0.7, 130)).toBeLessThan(v(0.7, 80));
    // A waist hold hangs nothing on the legs.
    expect(run(0, { holderDown: true }).grip!.strideForce).toBe(0);
  });

  it('leaves braking alone: a runner who stops is not striding', () => {
    const held = run(0.7, { holderDown: true, runner: { vel: { x: 0, y: 0 } } });
    expect(held.grip!.strideForce).toBe(0);
  });
});
