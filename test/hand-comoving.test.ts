import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World, type HandJoint, type Intent, type StepReport } from '../src/physics/world.js';

const DT = .05, free: Intent = { vel: { x: 0, y: 0 }, free: true };
const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;
const cases = [
  { name: 'historical center', mode: 'center' as const, material: false },
  { name: 'common patch', mode: 'patch' as const, material: false },
  { name: 'material patch', mode: 'patch' as const, material: true },
];
function body(mass: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, spin: 0, energy: 1,
    profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
      reactReach: 2.6, reactionTime: .25, power: mass, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}
function setup(mode: 'center' | 'patch', material: boolean, substeps: number, equalMass = false) {
  const bs = [body(100, 0), body(equalMass ? 100 : 80, .9)];
  const w = new World(bs, { handContact: mode, substeps });
  const hand: HandJoint = { kind: 'hands', a: bs[0], b: bs[1], extension: 1.1, push: 0, hold: 0, steer: 2000,
    ...(material ? { contact: { on: 'b' as const, local: { x: .2, y: 0 } } } : {}) };
  w.joints.push(hand); return { bs, w, hand };
}
function totals(bs: Body[]) {
  return { px: bs.reduce((sum, b) => sum + b.profile.massKg * b.vel.x, 0),
    py: bs.reduce((sum, b) => sum + b.profile.massKg * b.vel.y, 0),
    angular: bs.reduce((sum, b) => sum + b.profile.massKg * cross(b.pos, b.vel)
      + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0),
    energy: bs.reduce((sum, b) => sum + .5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2)
      + .5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0) };
}
function freeLaws(bs: Body[], before: ReturnType<typeof totals>, r: StepReport, patch: boolean) {
  const after = totals(bs);
  expect(after.px).toBeCloseTo(before.px, 9); expect(after.py).toBeCloseTo(before.py, 9);
  if (patch) expect(after.angular).toBeCloseTo(before.angular, 8);
  expect(after.energy - before.energy).toBeCloseTo(r.work.hands, 9);
  expect(r.work.hands).toBeLessThanOrEqual(1e-9); expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
  expect(r.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
  expect(r.groundYawImpulse).toEqual(bs.map(() => 0)); expect(r.contacts).toHaveLength(0);
  for (let i = 0; i < bs.length; i++) {
    expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-9);
    expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-9);
  }
}

describe('hand steering resists relative point slip, not common lateral travel', () => {
  it.each(cases)('zero-slip common translation delivers no force despite a large cap: $name', ({ mode, material }) => {
    for (const substeps of [1, 12, 48]) for (const velocity of [{ x: 0, y: 0 }, { x: 0, y: -4 }, { x: 0, y: 4 }, { x: 2, y: 3 }]) {
      const { bs, w, hand } = setup(mode, material, substeps);
      for (const b of bs) b.vel = { ...velocity };
      const initial = bs.map(b => ({ ...b.pos }));
      for (let tick = 0; tick < 4; tick++) {
        const before = totals(bs), r = w.step(bs.map(() => free), DT); freeLaws(bs, before, r, mode === 'patch');
        expect(hand.tangentForce).toBe(0); expect(hand.normalForce).toBe(0); expect(r.armImpulse).toEqual([0, 0]);
        for (const [i, b] of bs.entries()) {
          expect(b.vel).toEqual(velocity); expect(b.spin).toBe(0);
          expect(b.pos.x).toBeCloseTo(initial[i].x + velocity.x * DT * (tick + 1), 11);
          expect(b.pos.y).toBeCloseTo(initial[i].y + velocity.y * DT * (tick + 1), 11);
        }
      }
    }
  });

  it.each(cases)('a common FREE velocity boost leaves true-slip forces and relative response unchanged: $name', ({ mode, material }) => {
    for (const side of [-1, 1]) {
      const run = (boost: Vec2) => {
        const { bs, w, hand } = setup(mode, material, 12); hand.steer = 20;
        bs[0].vel = { x: .7 + boost.x, y: .1 * side + boost.y };
        bs[1].vel = { x: 1.1 + boost.x, y: .5 * side + boost.y };
        bs[0].spin = .1 * side; bs[1].spin = -.05 * side;
        const rows = [];
        for (let tick = 0; tick < 4; tick++) {
          const before = totals(bs), report = w.step(bs.map(() => free), DT); freeLaws(bs, before, report, mode === 'patch');
          rows.push({ bodies: structuredClone(bs), tangent: hand.tangentForce!, normal: hand.normalForce!, work: report.work.hands });
        }
        return rows;
      };
      const boost = { x: 2.3, y: -3.7 }, base = run({ x: 0, y: 0 }), moved = run(boost);
      expect(Math.abs(base[0].tangent)).toBeGreaterThan(1e-5);
      for (let tick = 0; tick < base.length; tick++) {
        expect(moved[tick].tangent).toBeCloseTo(base[tick].tangent, 8);
        expect(moved[tick].normal).toBeCloseTo(base[tick].normal, 8);
        expect(moved[tick].work).toBeCloseTo(base[tick].work, 8);
        for (let i = 0; i < 2; i++) {
          const a = base[tick].bodies[i], b = moved[tick].bodies[i];
          expect(b.vel.x - boost.x).toBeCloseTo(a.vel.x, 9); expect(b.vel.y - boost.y).toBeCloseTo(a.vel.y, 9);
          expect(b.pos.x - boost.x * DT * (tick + 1)).toBeCloseTo(a.pos.x, 9);
          expect(b.pos.y - boost.y * DT * (tick + 1)).toBeCloseTo(a.pos.y, 9);
          expect(b.spin).toBeCloseTo(a.spin!, 9); expect(b.facing).toBeCloseTo(a.facing, 9);
        }
      }
    }
  });

  it.each(cases)('identical achieved grounded acceleration creates no false steering: $name', ({ mode, material }) => {
    const { bs, w, hand } = setup(mode, material, 12, true);
    const intent: Intent = { vel: { x: 0, y: 3 }, facing: 0 };
    for (let tick = 0; tick < 4; tick++) {
      const r = w.step(bs.map(() => intent), DT);
      expect(r.groundImpulse[0].y).toBeGreaterThan(0);
      expect(r.groundImpulse[1]).toEqual(r.groundImpulse[0]); expect(r.groundYawImpulse).toEqual([0, 0]);
      expect(bs[1].vel).toEqual(bs[0].vel); expect(bs[0].spin).toBe(0); expect(bs[1].spin).toBe(0);
      expect(hand.tangentForce).toBe(0); expect(hand.normalForce).toBe(0); expect(r.armImpulse).toEqual([0, 0]);
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-9); expect(r.contacts).toHaveLength(0);
    }
    expect(bs[0].vel.y).toBeGreaterThan(.05);
  });

  it.each([-1, 1])('material-point yaw alone creates real passive slip with equal COM velocities, side %s', side => {
    const { bs, w, hand } = setup('patch', true, 1); hand.steer = 20;
    for (const b of bs) b.vel = { x: .7, y: 3 };
    bs[1].spin = side * .2; const incoming = { ...bs[1].vel }, before = totals(bs);
    const r = w.step(bs.map(() => free), DT); freeLaws(bs, before, r, true);
    // The material point's force-midpoint rotation is omega*h/2; no COM
    // slip, ground, normal force or active work contributes to this oracle.
    const phi = side * .2 * DT / 2, rb = { x: .2 * Math.cos(phi), y: .2 * Math.sin(phi) };
    const ra = { x: .9 + rb.x, y: rb.y }, length = Math.hypot(ra.x, ra.y);
    const n = { x: ra.x / length, y: ra.y / length }, t = { x: -n.y, y: n.x };
    const radiusB = rb.x * n.x + rb.y * n.y;
    const ia = supportParams(bs[0].profile).yawInertia, ib = supportParams(bs[1].profile).yawInertia;
    const impulse = -side * .2 * radiusB / (1 / 100 + 1 / 80 + length ** 2 / ia + radiusB ** 2 / ib);
    const J = { x: 80 * (bs[1].vel.x - incoming.x), y: 80 * (bs[1].vel.y - incoming.y) };
    expect(J.x * t.x + J.y * t.y).toBeCloseTo(impulse, 10);
    expect(hand.tangentForce).toBeCloseTo(impulse / DT, 10); expect(hand.normalForce).toBe(0);
    expect(bs[0].spin).toBeCloseTo(-length * impulse / ia, 10);
    expect(bs[1].spin).toBeCloseTo(side * .2 + radiusB * impulse / ib, 10);
    expect(r.work.hands).toBeLessThan(0);
  });
});
