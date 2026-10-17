/** Absolute calibration inputs preserve mass, existing laws and shared budgets.
 * No force below is an NFL calibration or a required football ending. */
import { describe, expect, it } from 'vitest';
import { G } from '../src/core/units.js';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { World, type Intent } from '../src/physics/world.js';
import type { PhysicalProfile } from '../src/players/physical.js';

const base: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
  shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const body = (x: number, extra: Partial<PhysicalProfile> = {}): Body => ({
  pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1,
  profile: { ...base, ...extra }, support: newSupport(.6),
});
const snapshot = ({ profile: _, ...b }: Body) => structuredClone(b);

function contact(extra: Partial<PhysicalProfile> = {}, hold = false) {
  const a = body(0, extra), b = body(.9); b.facing = Math.PI;
  const w = new World([a, b]);
  if (hold) {
    a.support!.xi = { x: .4, y: .05 };
    w.joints.push({ kind: 'grasp', a: b, b: a, reach: 1.5, capacity: 50, legs: 1, hold: 1 });
  } else w.joints.push({ kind: 'hands', a, b, extension: .9, push: 600, hold: 0, steer: 100 });
  const reports = [];
  for (let k = 0; k < 20; k++) {
    const before = [a, b].reduce((p, q) => ({ x: p.x + q.profile.massKg * q.vel.x,
      y: p.y + q.profile.massKg * q.vel.y }), { x: 0, y: 0 });
    const r = w.step([{ vel: { x: hold ? 0 : 3, y: 0 }, push: 1, facing: hold ? .3 : 0 },
      { vel: { x: hold ? 0 : -3, y: 0 }, push: 1, facing: Math.PI }], .05);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
    for (const [i, q] of [a, b].entries()) {
      expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-8);
      expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-8);
      expect(r.supportMotorWork[i]).toBeLessThanOrEqual(r.supportMotorWorkLimit[i] + 1e-8);
      expect(Math.hypot(r.groundImpulse[i].x, r.groundImpulse[i].y))
        .toBeLessThanOrEqual(supportParams(q.profile).traction * .05 + 1e-8);
      expect([q.pos.x, q.pos.y, q.vel.x, q.vel.y, q.energy, q.support!.xi.x, q.support!.xi.y]
        .every(Number.isFinite)).toBe(true);
    }
    for (const axis of ['x', 'y'] as const) expect([a, b].reduce((p, q, i) =>
      p + q.profile.massKg * q.vel[axis] - r.groundImpulse[i][axis], -before[axis])).toBeCloseTo(0, 8);
    reports.push(r);
  }
  return { bodies: [snapshot(a), snapshot(b)], reports };
}

describe('independent measured force inputs', () => {
  it('is exactly identical to legacy execution when supplied its existing capacities', () => {
    // Include loaded turning/support and fatigue, not just parameter arithmetic.
    const sp = supportParams(base);
    for (const hold of [false, true]) expect(contact({ loadedDriveForce: sp.pushForce,
      armForce: sp.armForce }, hold)).toEqual(contact({}, hold));
  });

  it('changes loaded drive independently of arm budgets at fixed mass', () => {
    const low = contact({ loadedDriveForce: 400 }), high = contact({ loadedDriveForce: 1000 });
    expect(high.bodies[0].pos.x).toBeGreaterThan(low.bodies[0].pos.x);
    expect(low.reports[0].armImpulseLimit).toEqual(high.reports[0].armImpulseLimit);
    expect(supportParams({ ...base, loadedDriveForce: 400 }).armForce).toBe(.75 * base.power * G);
  });

  it('preserves real mass, inertia and traction when absolute capacities are equal', () => {
    const light = supportParams({ ...base, loadedDriveForce: 700, armForce: 400 });
    const heavy = supportParams({ ...base, massKg: 150, loadedDriveForce: 700, armForce: 400 });
    expect(heavy.pushForce).toBe(light.pushForce);
    expect(heavy.armForce).toBe(light.armForce);
    expect(heavy.traction / light.traction).toBeCloseTo(1.5, 12);
    expect(heavy.yawInertia / light.yawInertia).toBeCloseTo(1.5, 12);
  });

  it('cannot buy extra loaded drive above unchanged traction', () => {
    const traction = supportParams(base).traction;
    expect(contact({ loadedDriveForce: 2 * traction })).toEqual(contact({ loadedDriveForce: traction }));
  });

  it('does not reinterpret loaded drive as the measured free-gait ceiling', () => {
    const run = (extra: Partial<PhysicalProfile>) => {
      const a = body(0, extra), w = new World([a]);
      for (const vel of [{ x: 8, y: 0 }, { x: 0, y: 4 }])
        for (let k = 0; k < 10; k++) w.step([{ vel }], .05);
      return { pos: a.pos, vel: a.vel, energy: a.energy, facing: a.facing };
    };
    expect(run({ loadedDriveForce: 100 })).toEqual(run({}));
  });

  it('shares an absolute arm budget across multiple simultaneous requests', () => {
    const a = body(0, { armForce: 200 }), b = body(.9), c = body(-.9);
    const w = new World([a, b, c]);
    // Compress both working gaps: a neutral rest-length joint requests no
    // force under the existing law, regardless of its capacity.
    for (const target of [b, c]) w.joints.push({ kind: 'hands', a, b: target, extension: 1,
      push: 5000, hold: 0, steer: 0 });
    const free: Intent = { vel: { x: 0, y: 0 }, free: true };
    const r = w.step([free, free, free], .05);
    expect(r.armImpulseLimit[0]).toBe(10);
    expect(r.armImpulse[0]).toBeGreaterThan(0);
    expect(r.armImpulse[0]).toBeLessThanOrEqual(10 + 1e-9);
    expect(r.armWork[0]).toBeLessThanOrEqual(r.armWorkLimit[0] + 1e-9);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
  });

  it('keeps held support finite under a lower calibrated drive capacity', () => {
    const r = contact({ loadedDriveForce: 350, armForce: 300 }, true);
    expect(r.reports.some(s => s.supportMotorWorkLimit.some(w => w > 0))).toBe(true);
  });

  it('rejects unusable calibration inputs instead of poisoning or silently changing the body', () => {
    for (const field of ['loadedDriveForce', 'armForce'] as const)
      for (const value of [0, -1, NaN, Infinity, -Infinity, Number.MIN_VALUE, 1e-200, 1e200, Number.MAX_VALUE])
        expect(() => supportParams({ ...base, [field]: value })).toThrow(RangeError);
    expect(() => supportParams({ ...base, loadedDriveForce: 1e-12, armForce: 1e-12 })).not.toThrow();
    expect(() => supportParams({ ...base, loadedDriveForce: 400, stepSpeed: Infinity })).toThrow(RangeError);
  });
});
