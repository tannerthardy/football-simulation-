/** Finite arms may absorb a reachable arrival, not exclude an overpowering
 * collision. The same existing force/work/momentum limits own both. */
import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World, type GraspJoint, type HandJoint, type StepReport } from '../src/physics/world.js';

const profile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
  shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
function run(mode: 'center' | 'patch', brace: boolean, closing: number,
  capacity = 900, steps = 12, side = 1, count = 1, lower = false) {
  const bs: Body[] = [0, 1.2].map(x => ({ pos: { x, y: 0 },
    vel: { x: x === 0 ? closing / 2 : -closing / 2, y: 0 },
    facing: x === 0 ? 0 : Math.PI, spin: 0, energy: 1, profile: { ...profile } }));
  const w = new World(bs, { handContact: mode, substeps: steps });
  const joints: GraspJoint[] = [];
  for (let i = 0; i < count; i++) {
    const j: GraspJoint = { kind: 'grasp', a: bs[0], b: bs[1], reach: 1.6,
      hold: 1.2, capacity, legs: lower ? .55 : 0, pull: 0 };
    if (brace) j.brace = 1.2;
    joints.push(j); w.joints.push(j);
  }
  bs[0].vel.y = side * .002; bs[1].vel.y = -side * .002;
  let contactImpulse = 0, armImpulse = 0;
  const reports: StepReport[] = [];
  const angular = () => bs.reduce((s, b) => s + b.profile.massKg * (b.pos.x * b.vel.y - b.pos.y * b.vel.x)
    + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0);
  for (let i = 0; i < 8; i++) {
    const before = bs.map(b => ({ ...b.vel })), l = angular();
    const r = w.step(bs.map(() => ({ vel: { x: 0, y: 0 }, free: true })), .05);
    reports.push(r);
    for (const c of ['x', 'y'] as const)
      expect(bs.reduce((s, b, k) => s + profile.massKg * (b.vel[c] - before[k][c]), 0))
        .toBeCloseTo(r.groundImpulse.reduce((s, p) => s + p[c], 0), 9);
    // An overpowering impact can cause a fall and subsequent external ground
    // torque even under a free command. Closed-system angular accounting is
    // asserted only when the report confirms no such external impulse.
    if (mode === 'patch' && r.groundYawImpulse.every(x => x === 0)
      && r.groundImpulse.every(p => p.x === 0 && p.y === 0)) expect(angular()).toBeCloseTo(l, 8);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
    expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-8);
    for (let k = 0; k < 2; k++) {
      expect(r.armImpulse[k]).toBeLessThanOrEqual(r.armImpulseLimit[k] + 1e-8);
      expect(r.armWork[k]).toBeLessThanOrEqual(r.armWorkLimit[k] + 1e-8);
      expect(r.supportMotorWork[k]).toBeLessThanOrEqual(r.supportMotorWorkLimit[k] + 1e-8);
    }
    armImpulse += r.armImpulse[0];
    contactImpulse += r.contacts.reduce((s, c) => s + c.impulse, 0);
  }
  return { bs, w, joints, reports, armImpulse, contactImpulse,
    distance: Math.hypot(bs[1].pos.x - bs[0].pos.x, bs[1].pos.y - bs[0].pos.y) };
}

describe('acquired reach contact uses finite compressive arms', () => {
  it.each(['center', 'patch'] as const)('compression does not erase structural sideways grip in %s', mode => {
    const bs: Body[] = [0, 1.2].map(x => ({ pos: { x, y: 0 },
      vel: { x: x === 0 ? .5 : -.5, y: x === 0 ? 2 : -2 },
      facing: x === 0 ? 0 : Math.PI, spin: 0, energy: 1, profile: { ...profile } }));
    const w = new World(bs, { handContact: mode });
    const j: GraspJoint = { kind: 'grasp', a: bs[0], b: bs[1], reach: 1.6,
      hold: 1.2, brace: 1.2, capacity: 1500, legs: 0, pull: 0 };
    w.joints.push(j);
    const r = w.step(bs.map(() => ({ vel: { x: 0, y: 0 }, free: true })), .02);
    expect(bs[0].vel.y - bs[1].vel.y).toBeLessThan(4);
    // Bracing is muscular compression; shear is the existing passive hold.
    // Both still fit one structural grip vector, rather than a second grip.
    expect(j.force! * .02).toBeGreaterThan(r.armImpulse[0] + 1e-6);
    expect(j.force!).toBeLessThanOrEqual(j.capacity + 1e-8);
    expect(r.armImpulse[0]).toBeLessThanOrEqual(r.armImpulseLimit[0] + 1e-8);
    expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-8);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
  });

  it.each(['center', 'patch'] as const)('can absorb a modest arrival before torso collision in %s', mode => {
    const ordinary = run(mode, false, 2), braced = run(mode, true, 2);
    expect(ordinary.contactImpulse).toBeGreaterThan(0);
    expect(braced.contactImpulse).toBe(0);
    expect(braced.armImpulse).toBeGreaterThan(0);
    expect(braced.distance).toBeGreaterThan(.6);
    expect(braced.distance).toBeLessThan(1.2); // It flexes, not a rigid span.
  });

  it.each(['center', 'patch'] as const)('cannot keep an overpowering arrival away from the body in %s', mode => {
    const strong = run(mode, true, 9);
    expect(strong.contactImpulse).toBeGreaterThan(0);
    expect(strong.armImpulse).toBeGreaterThan(0);
    expect(strong.distance).toBeLessThan(1.2);
  });

  it.each(['center', 'patch'] as const)('zero capacity supplies no separation or body restraint in %s', mode => {
    const a = run(mode, true, 2, 0), b = run(mode, false, 2, 0);
    expect(a.armImpulse).toBe(0);
    expect(a.bs).toEqual(b.bs);
    expect(a.contactImpulse).toBe(b.contactImpulse);
  });

  it.each(['center', 'patch'].flatMap(mode => [50, 900].map(capacity => ({ mode, capacity }))))
    ('duplicate bracing does not buy extra capacity or stiffness in $mode at $capacity', ({ mode, capacity }) => {
    const a = run(mode as 'center' | 'patch', true, 2, capacity), b = run(mode as 'center' | 'patch', true, 2, capacity, 12, 1, 4);
    expect(a.contactImpulse).toBeCloseTo(b.contactImpulse, 8);
    expect(a.armImpulse).toBeCloseTo(b.armImpulse, 8);
    expect(a.distance).toBeCloseTo(b.distance, 8);
  });

  it.each([0, 1e-6])('a %s-capacity brace does not starve a separate hand claim', capacity => {
    const mixed = (add: boolean) => {
      const bs: Body[] = [0, 1.2, -1.2].map(x => ({ pos: { x, y: 0 },
        vel: { x: -Math.sign(x), y: 0 }, facing: x <= 0 ? 0 : Math.PI,
        energy: 1, profile: { ...profile } }));
      const w = new World(bs);
      const hand: HandJoint = { kind: 'hands', a: bs[0], b: bs[1], extension: 1.2,
        push: 900, hold: 0, steer: 0 };
      w.joints.push(hand);
      if (add) w.joints.push({ kind: 'grasp', a: bs[0], b: bs[2], reach: 1.6,
        hold: 1.2, brace: 1.2, capacity, legs: 0, pull: 0 });
      const r = w.step(bs.map(() => ({ vel: { x: 0, y: 0 }, free: true })), .05);
      expect(r.armImpulse[0]).toBeLessThanOrEqual(r.armImpulseLimit[0] + 1e-8);
      return hand.normalForce!;
    };
    expect(mixed(true)).toBeCloseTo(mixed(false), 5);
  });

  it.each([false, true].flatMap(lower => [12, 48].map(steps => ({ lower, steps }))))
    ('patch work and reflection remain coherent: lower $lower, steps $steps', ({ lower, steps }) => {
      const a = run('patch', true, 2, 900, steps, 1, 1, lower), b = run('patch', true, 2, 900, steps, -1, 1, lower);
      expect(a.distance).toBeCloseTo(b.distance, 9);
      expect(a.armImpulse).toBeCloseTo(b.armImpulse, 9);
      expect(a.joints[0].slipping).toBe(false); // Arm compression is not grip slip.
      expect(a.joints[0].legs).toBe(lower ? .55 : 0);
    });
});
