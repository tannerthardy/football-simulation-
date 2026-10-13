import { describe, expect, it, vi } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { World, type GraspJoint, type Intent, type StepReport } from '../src/physics/world.js';
import { captureFirstGrip, frozenInterval } from '../scripts/diag/physics/contact-foundations.js';

const free: Intent = { vel: { x: 0, y: 0 }, free: true };
const p = { massKg: 100, radius: .3, reach: 1.5, heightYd: 2.05, vmax: 9, tau: 1.3,
  brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100,
  balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
function body(x: number, y = 0): Body {
  return { pos: { x, y }, vel: { x: .2, y: 0 }, facing: 0, spin: 0, energy: 1,
    support: newSupport(), profile: { ...p } };
}
function totals(bs: Body[]) {
  return { angular: bs.reduce((s, b) => s + b.profile.massKg * (b.pos.x * b.vel.y - b.pos.y * b.vel.x)
      + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0),
    px: bs.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0),
    py: bs.reduce((s, b) => s + b.profile.massKg * b.vel.y, 0) };
}
function check(bs: Body[], before: ReturnType<typeof totals>, r: StepReport, passive = true) {
  const after = totals(bs);
  const g = r.groundImpulse.reduce((v, j) => ({ x: v.x + j.x, y: v.y + j.y }), { x: 0, y: 0 });
  expect(after.px - before.px).toBeCloseTo(g.x, 8);
  expect(after.py - before.py).toBeCloseTo(g.y, 8);
  if (r.groundImpulse.every(j => Math.hypot(j.x, j.y) === 0)
    && r.groundYawImpulse.every(j => j === 0)) expect(after.angular).toBeCloseTo(before.angular, 8);
  expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
  if (passive) expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-8);
  for (let i = 0; i < bs.length; i++) {
    expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-8);
    expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-8);
    expect(r.supportMotorWork[i]).toBeLessThanOrEqual(r.supportMotorWorkLimit[i] + 1e-8);
  }
  expect(r.gripTiming?.limited ?? 0).toBe(0);
}
const grip = (a: Body, b: Body, capacity = 900, legs = .6): GraspJoint =>
  ({ kind: 'grasp', a, b, capacity, reach: 1.6, hold: 1, legs, pull: 0 });

describe('resolved passive grip force and temporal moment', () => {
  it.each([1, -1] as const)('repairs acquired travel and yaw before active recovery, side %s', side => {
    const c = captureFirstGrip({ angle: 45, speed: 8, cut: false, difficulty: 'difficult' }, 'patch', side), h = .05 / 12;
    for (const variant of ['grip-only', 'full'] as const) {
      const old = frozenInterval(c.saved, 1, variant, h);
      const r = frozenInterval(c.saved, 1, variant, h, 'resolved');
      const ref = frozenInterval(c.saved, 256, variant, h);
      const oldAngle = Math.max(...old.end.map((b, i) => Math.abs(b.facing - ref.end[i].facing)));
      const angle = Math.max(...r.end.map((b, i) => Math.abs(b.facing - ref.end[i].facing)));
      expect(angle).toBeLessThan(oldAngle / 100);
      expect(angle).toBeLessThan(1e-5);
      expect(Math.max(...r.end.map((b, i) => Math.abs(b.spin - ref.end[i].spin)))).toBeLessThan(.003);
      expect(Math.max(...r.end.map((b, i) => Math.hypot(b.pos.x - ref.end[i].pos.x, b.pos.y - ref.end[i].pos.y)))).toBeLessThan(1e-7);
      expect(r.integration!.limited).toBe(0);
      expect(r.ground.every(g => !g.command || Math.hypot(g.command.x, g.command.y) === 0)).toBe(true);
      expect(Math.abs(r.energyError)).toBeLessThan(1e-8);
    }
  });

  it.each([1, -1])('conserves moving off-axis grip graphs and shared normal/tangent budgets, side %s', side => {
    const bs = [body(0), body(1), body(-1, side * .15)];
    bs[1].vel = { x: .7, y: side * 1.2 }; bs[2].vel = { x: -.3, y: -side * .6 };
    bs[0].spin = side * .4;
    const w = new World(bs, { substeps: 12, handContact: 'patch', gripTiming: 'resolved' });
    const g = [grip(bs[0], bs[1], 600), grip(bs[0], bs[2], 400, .4)];
    w.joints.push(...g, { kind: 'hands', a: bs[2], b: bs[0], extension: 1.4, push: 20, hold: 0, steer: 20 });
    const solver = w as any, original = solver.solveGrasp;
    const spy = vi.spyOn(solver, 'solveGrasp').mockImplementation(function (...args) {
      original.apply(w, args);
      const row = args[0] as any;
      expect(Math.hypot(row.ln - row.reel, row.lt)).toBeLessThanOrEqual(row.limit + 1e-8);
    });
    try {
    for (let k = 0; k < 3; k++) {
      const before = totals(bs), r = w.step(bs.map(() => free), .05);
      check(bs, before, r);
      for (const j of g) expect(j.force ?? 0).toBeLessThanOrEqual(j.capacity + 1e-8);
    }
    } finally { spy.mockRestore(); }
  });

  it('retains acquired material coordinates through achieved body rotation', () => {
    const bs = [body(0), body(1)], w = new World(bs, { substeps: 12, handContact: 'patch', gripTiming: 'resolved' });
    bs.forEach(b => { b.vel = { x: 0, y: 0 }; });
    bs[1].support!.xi = { x: .24, y: .08 }; bs[1].support!.out = .12;
    const j = grip(bs[0], bs[1], 50); w.joints.push(j);
    const first = w.step(bs.map(() => ({ vel: { x: 0, y: 0 }, posture: .2 })), .05);
    check(bs, { angular: 0, px: 0, py: 0 }, first);
    const point = () => (w as any).graspPoint(j) as { x: number; y: number };
    const local = () => {
      const q = point(), b = bs[1], x = q.x - b.pos.x, y = q.y - b.pos.y;
      return { x: x * Math.cos(b.facing) + y * Math.sin(b.facing),
        y: -x * Math.sin(b.facing) + y * Math.cos(b.facing) };
    };
    const start = local(), offset = { ...bs[1].support!.foot!.offset };
    expect(Math.hypot(start.x, start.y)).toBeGreaterThan(.001);
    bs[0].vel = { x: .2, y: 0 }; bs[1].vel = { x: .2, y: .02 }; bs[1].spin = .08;
    const before = totals(bs), r = w.step(bs.map(() => free), .05);
    check(bs, before, r);
    expect(j.broken ?? false).toBe(false);
    expect(local().x).toBeCloseTo(start.x, 10); expect(local().y).toBeCloseTo(start.y, 10);
    expect(bs[1].support!.foot!.offset).toEqual(offset);
  });

  it('agrees on moving geometry across unequal external partitions', () => {
    const run = (parts: number[], side = 1, angle = 0) => {
      const bs = [body(0), body(1)], rotate = (v: { x: number; y: number }) =>
        ({ x: v.x * Math.cos(angle) - v.y * Math.sin(angle), y: v.x * Math.sin(angle) + v.y * Math.cos(angle) });
      bs[1].vel = { x: .3, y: side * .4 }; bs[0].spin = side * .1;
      for (const b of bs) { b.pos = rotate(b.pos); b.vel = rotate(b.vel); b.facing = angle; }
      const w = new World(bs, { substeps: 12, handContact: 'patch', gripTiming: 'resolved' });
      w.joints.push(grip(bs[0], bs[1], 400));
      for (const h of parts) { const before = totals(bs), r = w.step(bs.map(() => free), h); check(bs, before, r); }
      return bs;
    };
    for (const side of [1, -1]) for (const angle of [0, .8]) {
      const a = run([.05], side, angle), b = run([.003, .011, .007, .029], side, angle);
      for (let i = 0; i < 2; i++) {
        expect(Math.hypot(a[i].pos.x - b[i].pos.x, a[i].pos.y - b[i].pos.y)).toBeLessThan(2e-5);
        expect(Math.hypot(a[i].vel.x - b[i].vel.x, a[i].vel.y - b[i].vel.y)).toBeLessThan(.002);
        expect(Math.abs(a[i].spin! - b[i].spin!)).toBeLessThan(.005);
        expect(Math.abs(a[i].facing - b[i].facing)).toBeLessThan(5e-5);
      }
    }
  });

  it('keeps zero and tiny loads on the original issued-motion path and restores all identities', () => {
    const run = (capacity: number, resolved: boolean) => {
      const bs = [body(0), body(1)], profiles = bs.map(b => b.profile);
      bs[1].support!.xi = { x: .24, y: .04 }; bs[1].support!.out = .12;
      const w = new World(bs, { substeps: 12, handContact: 'patch', gripTiming: resolved ? 'resolved' : 'midpoint' });
      const j = grip(bs[0], bs[1], capacity); w.joints.push(j);
      const r = w.step(bs.map(() => ({ vel: { x: 0, y: 0 }, posture: .2 })), .05);
      expect(w.bodies).toBe(bs); expect(w.joints[0]).toBe(j);
      expect(j.a).toBe(bs[0]); expect(j.b).toBe(bs[1]);
      bs.forEach((b, i) => expect(b.profile).toBe(profiles[i]));
      check(bs, { angular: 0, px: 40, py: 0 }, r);
      return bs;
    };
    for (const cap of [0, 1e-9, 1e-6]) expect(run(cap, true)).toEqual(run(cap, false));
  });
});
