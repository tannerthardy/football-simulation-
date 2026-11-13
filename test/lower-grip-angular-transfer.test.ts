import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { World, type GraspJoint, type HandJoint, type Intent, type StepReport } from '../src/physics/world.js';

const DT = .05, free: Intent = { vel: { x: 0, y: 0 }, free: true };
const stand: Intent = { vel: { x: 0, y: 0 }, posture: .2 };
const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;
const rotate = (v: Vec2, angle: number): Vec2 => ({
  x: v.x * Math.cos(angle) - v.y * Math.sin(angle), y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
});
function body(mass: number, radius: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: .2, y: 0 }, facing: 0, spin: 0, energy: 1, support: newSupport(),
    profile: { massKg: mass, radius, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
      reactReach: 2.6, reactionTime: .25, power: mass, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 } };
}
function pair(side: number, angle = 0) {
  const bs = [body(90, .25, 0), body(120, .35, 1)];
  bs[1].vel.y = side * .002;
  for (const b of bs) {
    b.pos = rotate(b.pos, angle); b.pos.x += 17; b.pos.y -= 9;
    b.vel = rotate(b.vel, angle); b.facing = angle;
  }
  return bs;
}
const grasp = (a: Body, b: Body, legs = 1, pull = 0, capacity = 900): GraspJoint =>
  ({ kind: 'grasp', a, b, capacity, reach: 1.5, legs, pull });
function totals(bs: Body[]) {
  return {
    angular: bs.reduce((s, b) => s + b.profile.massKg * cross(b.pos, b.vel)
      + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0),
    px: bs.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0),
    py: bs.reduce((s, b) => s + b.profile.massKg * b.vel.y, 0),
    energy: bs.reduce((s, b) => s + .5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2)
      + .5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0),
  };
}
function budgets(bs: Body[], r: StepReport) {
  expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
  expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-9);
  for (let i = 0; i < bs.length; i++) {
    expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-9);
    expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-9);
    expect(r.supportMotorWork[i]).toBeLessThanOrEqual(r.supportMotorWorkLimit[i] + 1e-9);
    for (const n of [bs[i].pos.x, bs[i].pos.y, bs[i].vel.x, bs[i].vel.y, bs[i].spin ?? 0])
      expect(Number.isFinite(n)).toBe(true);
  }
}
function laws(bs: Body[], before: ReturnType<typeof totals>, r: StepReport, passive: boolean) {
  const after = totals(bs);
  expect(after.angular).toBeCloseTo(before.angular, 8);
  expect(after.px).toBeCloseTo(before.px, 9); expect(after.py).toBeCloseTo(before.py, 9);
  expect(after.energy - before.energy).toBeCloseTo(r.work.hands + r.work.grasps, 9);
  expect(r.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
  expect(r.groundYawImpulse).toEqual(bs.map(() => 0));
  expect(r.contacts).toHaveLength(0); expect(r.falls).toHaveLength(0);
  budgets(bs, r);
  if (passive) expect(after.energy).toBeLessThanOrEqual(before.energy + 1e-9);
}
interface Geometry {
  graspPoint(j: GraspJoint): Vec2;
  syncHeldSupport(): void;
}
const geometry = (w: World) => w as unknown as Geometry;
function near(a: unknown, b: unknown): void {
  if (typeof a === 'number' && typeof b === 'number') { expect(a).toBeCloseTo(b, 9); return; }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    expect(Object.keys(a)).toEqual(Object.keys(b));
    for (const key of Object.keys(a)) near((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
  } else expect(a).toEqual(b);
}

/** A real low hold restrains a real attempted corrective step. No foot or
 * attachment is injected; the measurement phase begins with its achieved point. */
function displaced(side: number, legs = 1, substeps = 12) {
  const bs = pair(side); for (const b of bs) b.vel = { x: 0, y: 0 };
  bs[1].support!.xi = { x: .24, y: side * .08 }; bs[1].support!.out = .12;
  const j = grasp(bs[0], bs[1], legs, 0, 50), w = new World(bs, { substeps, handContact: 'patch' });
  w.joints.push(j); const r = w.step(bs.map(() => stand), DT); budgets(bs, r);
  expect(j.broken ?? false).toBe(false); expect(bs[1].support!.state).toBe('up');
  const point = geometry(w).graspPoint(j), b = bs[1];
  expect(Math.hypot(point.x - b.pos.x, point.y - b.pos.y)).toBeGreaterThan(.005);
  expect(Math.hypot(point.x - b.pos.x, point.y - b.pos.y)).toBeLessThan(supportParams(b.profile).comHeight);
  return { bs, j, w };
}

describe('lower patch grips attach force, yaw and support to one material point', () => {
  it.each([-1, 1].flatMap(side => [0, .8].map(angle => ({ side, angle }))))
    ('restrains holder spin at a newly acquired lower point: side $side, rotation $angle', ({ side, angle }) => {
      const bs = pair(side, angle), [a, b] = bs; b.vel = { ...a.vel }; a.spin = side * .1;
      const incoming = { ...b.vel }, before = totals(bs), j = grasp(a, b);
      const w = new World(bs, { substeps: 1, handContact: 'patch' }); w.joints.push(j);
      const r = w.step(bs.map(() => free), DT); laws(bs, before, r, true);
      const ia = supportParams(a.profile).yawInertia;
      const jt = side * .1 / (1 / a.profile.massKg + 1 / b.profile.massKg + 1 / ia);
      const t = rotate({ x: 0, y: 1 }, angle);
      const J = { x: b.profile.massKg * (b.vel.x - incoming.x), y: b.profile.massKg * (b.vel.y - incoming.y) };
      expect(J.x * t.x + J.y * t.y).toBeCloseTo(jt, 10);
      expect(a.spin).toBeCloseTo(side * .1 - jt / ia, 10); expect(b.spin).toBeCloseTo(0, 10);
      expect(j.force).toBeGreaterThan(0);
    });

  it.each([-1, 1])('does not mistake held-body spin at its undeformed COM point for slip, side %s', side => {
    const bs = pair(side); bs[1].vel = { ...bs[0].vel }; bs[1].spin = side * .1;
    const before = totals(bs), j = grasp(bs[0], bs[1]), w = new World(bs, { substeps: 48, handContact: 'patch' });
    w.joints.push(j); const r = w.step(bs.map(() => free), DT); laws(bs, before, r, true);
    expect(j.force).toBeCloseTo(0, 12); expect(bs[0].spin).toBe(0); expect(bs[1].spin).toBe(side * .1);
  });

  it.each([.25, 1].flatMap(legs => [-1, 1].flatMap(side => [0, .8].map(angle => ({ legs, side, angle })))))
    ('has the independent undeformed tangent impulse: legs $legs, side $side, rotation $angle', ({ legs, side, angle }) => {
      const bs = pair(side, angle), [a, b] = bs, j = grasp(a, b, legs);
      b.vel = rotate({ x: .2, y: side * .25 }, angle);
      const incoming = { ...b.vel }, before = totals(bs), w = new World(bs, { substeps: 1, handContact: 'patch' });
      w.joints.push(j); const r = w.step(bs.map(() => free), DT); laws(bs, before, r, true);
      expect(j.broken ?? false).toBe(false); expect(j.slipping ?? false).toBe(false);
      const d = { x: 1, y: side * .25 * DT / 2 }, length = Math.hypot(d.x, d.y);
      const n = { x: d.x / length, y: d.y / length }, t = rotate({ x: -n.y, y: n.x }, angle);
      // A newly acquired lower point is at held COM. The holder's lever
      // arm spans the separation; held-body yaw arm is initially zero.
      const ia = supportParams(a.profile).yawInertia;
      const mobility = 1 / a.profile.massKg + 1 / b.profile.massKg + length ** 2 / ia;
      const jt = -side * .25 * n.x / mobility;
      const J = { x: b.profile.massKg * (b.vel.x - incoming.x), y: b.profile.massKg * (b.vel.y - incoming.y) };
      expect(J.x * t.x + J.y * t.y).toBeCloseTo(jt, 10);
      expect(a.spin).toBeCloseTo(-length * jt / ia, 10); expect(b.spin).toBeCloseTo(0, 10);
      expect(a.spin! * side).toBeGreaterThan(0);
    });

  it.each([0, 1.5].flatMap(pull => [1, 12, 48].flatMap(substeps => [-1, 1].map(side => ({ pull, substeps, side })))))
    ('closes sustained lower work/transport: pull $pull, $substeps steps, side $side', ({ pull, substeps, side }) => {
      const bs = pair(side), j = grasp(bs[0], bs[1], .6, pull), w = new World(bs, { substeps, handContact: 'patch' });
      w.joints.push(j); let positiveWork = 0;
      for (let k = 0; k < 4; k++) {
        const before = totals(bs), r = w.step(bs.map(() => free), DT); laws(bs, before, r, pull === 0);
        expect(j.broken ?? false).toBe(false); expect(j.slipping ?? false).toBe(false);
        expect(j.legs).toBe(.6); expect(j.force).toBeLessThanOrEqual(j.capacity + 1e-9);
        positiveWork += Math.max(0, r.work.grasps);
      }
      if (pull > 0) expect(positiveWork).toBeGreaterThan(0);
    });

  it.each([.4, 1].flatMap(legs => [-1, 1].map(side => ({ legs, side }))))
    ('a native displaced point rotates with the held body without rotating world support: legs $legs, side $side', ({ legs, side }) => {
      const { bs, j, w } = displaced(side, legs), b = bs[1], engine = geometry(w);
      const original = engine.graspPoint(j), q = { x: original.x - b.pos.x, y: original.y - b.pos.y };
      const theta = b.facing, eps = 1e-6, offset = { ...b.support!.foot!.offset };
      b.facing = theta + eps; const plus = engine.graspPoint(j);
      b.facing = theta - eps; const minus = engine.graspPoint(j); b.facing = theta;
      expect((plus.x - minus.x) / (2 * eps)).toBeCloseTo(-q.y, 8);
      expect((plus.y - minus.y) / (2 * eps)).toBeCloseTo(q.x, 8);
      b.facing = theta + .3; const rotated = engine.graspPoint(j), expected = rotate(q, .3);
      expect(rotated.x - b.pos.x).toBeCloseTo(expected.x, 12);
      expect(rotated.y - b.pos.y).toBeCloseTo(expected.y, 12);
      expect(b.support!.foot!.offset).toEqual(offset); b.facing = theta;
    });

  it.each([12, 48].flatMap(substeps => [-1, 1].flatMap(side => ['normal', 'tangent', 'spin']
    .map(kind => ({ substeps, side, kind })))))
    ('closes a native displaced $kind load at $substeps steps, side $side', ({ substeps, side, kind }) => {
      const { bs, j, w } = displaced(side, .6, substeps), [a, b] = bs;
      a.vel = { x: .2, y: 0 }; b.vel = { x: kind === 'normal' ? .23 : .2, y: kind === 'tangent' ? side * .02 : 0 };
      a.spin = 0; b.spin = kind === 'spin' ? side * .08 : 0;
      const before = totals(bs), offset = { ...b.support!.foot!.offset };
      const r = w.step(bs.map(() => free), DT); laws(bs, before, r, true);
      expect(b.support!.foot!.offset).toEqual(offset); // yaw rotates the material point, not ground support
      expect(j.broken ?? false).toBe(false); expect(j.force).toBeGreaterThan(0);
      if (kind === 'normal' || kind === 'spin') expect(Math.abs(b.spin! - (kind === 'spin' ? side * .08 : 0))).toBeGreaterThan(1e-8);
    });

  it.each([1, 12, 48].flatMap(substeps => [-1, 1].map(side => ({ substeps, side }))))
    ('shares finite transport with hands and positive leg share at $substeps steps, side $side', ({ substeps, side }) => {
      const bs = pair(side), j = grasp(bs[0], bs[1], .6, 1.5), w = new World(bs, { substeps, handContact: 'patch' });
      const hand: HandJoint = { kind: 'hands', a: bs[0], b: bs[1], extension: 1.1, push: 50, hold: 0, steer: 20 };
      w.joints.push(j, hand);
      for (let k = 0; k < 4; k++) {
        const before = totals(bs), r = w.step(bs.map(() => free), DT); laws(bs, before, r, false);
        expect(j.broken ?? false).toBe(false); expect(j.legs).toBe(.6);
        expect(hand.normalForce).toBeGreaterThan(0);
      }
    });

  it.each([-1, 1])('retains a point through a change in lower-share representation, side %s', side => {
    const { bs, j, w } = displaced(side, .4), engine = geometry(w);
    const point = engine.graspPoint(j), offset = { ...bs[1].support!.foot!.offset };
    j.legs = .8; engine.syncHeldSupport(); // coordinate-only transition, no impulse solve
    expect(engine.graspPoint(j).x).toBeCloseTo(point.x, 12);
    expect(engine.graspPoint(j).y).toBeCloseTo(point.y, 12);
    expect(bs[1].support!.foot!.offset).toEqual(offset);
  });

  it.each([-1, 1])('a later holder contact acquires without moving the prior point, side %s', side => {
    const run = (observe: boolean) => {
      const { bs, j, w } = displaced(side, .4), engine = geometry(w);
      const next = grasp(bs[0], bs[1], .7, 0, 40); w.joints.push(next);
      let sample: { oldBefore: Vec2; oldAfter: Vec2; acquired: Vec2; body: Vec2 } | undefined;
      if (observe) {
        const sync = engine.syncHeldSupport;
        engine.syncHeldSupport = function() {
          const oldBefore = { ...engine.graspPoint(j) }, position = { ...bs[1].pos };
          sync.call(w);
          sample ??= { oldBefore, oldAfter: { ...engine.graspPoint(j) }, acquired: { ...engine.graspPoint(next) }, body: position };
        };
      }
      const before = totals(bs), r = w.step(bs.map(() => free), .005); laws(bs, before, r, true);
      return { sample, final: { bodies: structuredClone(bs), report: r,
        loads: [j.force, next.force], broken: [j.broken ?? false, next.broken ?? false] } };
    };
    const observed = run(true), plain = run(false);
    expect(observed.final).toEqual(plain.final); expect(observed.sample).toBeDefined();
    expect(observed.sample!.oldAfter).toEqual(observed.sample!.oldBefore);
    expect(observed.sample!.acquired).toEqual(observed.sample!.body);
    expect(observed.final.broken).toEqual([false, false]);
  });

  it.each([12, 48])('coincident full-cap copies share one physical motor and compliance at %s steps', substeps => {
    const run = (copies: number) => {
      const bs = pair(1); for (const b of bs) b.vel = { x: 0, y: 0 };
      bs[1].support!.xi = { x: .24, y: .08 }; bs[1].support!.out = .12;
      const w = new World(bs, { substeps, handContact: 'patch' });
      const joints = Array.from({ length: copies }, () => grasp(bs[0], bs[1], .6, .3, 50));
      w.joints.push(...joints); const states = [];
      for (let k = 0; k < 3; k++) {
        const report = w.step(bs.map(() => stand), DT); budgets(bs, report);
        states.push({ bodies: structuredClone(bs), report, force: joints.reduce((sum, j) => sum + j.force!, 0) });
      }
      return states;
    };
    near(run(2), run(1)); // duplicate claims do not double the strongest structural capacity
  });

  it.each([1, 12, 48])('uses the same free lower laws with virtual-foot support at %s steps', substeps => {
    for (const pull of [0, 1.5]) for (const side of [-1, 1]) for (const mixed of [false, true]) {
      const bs = pair(side), j = grasp(bs[0], bs[1], .6, pull);
      const w = new World(bs, { substeps, supportModel: 'virtual-foot', handContact: 'patch' }); w.joints.push(j);
      if (mixed) w.joints.push({ kind: 'hands', a: bs[0], b: bs[1], extension: 1.1, push: 50, hold: 0, steer: 20 });
      for (let k = 0; k < 4; k++) {
        const before = totals(bs), r = w.step(bs.map(() => free), DT); laws(bs, before, r, pull === 0 && !mixed);
        expect(j.broken ?? false).toBe(false); expect(j.legs).toBe(.6);
        for (const b of bs) {
          expect(b.support!.foot).toBeDefined(); expect(b.support!.foot!.offset).toEqual({ x: 0, y: 0 });
        }
      }
    }
  });

  it.each(['broken', 'powerless', 'out-of-reach'] as const)('an unusable lower grip delivers no remote impulse: %s', type => {
    const bs = pair(1), j = grasp(bs[0], bs[1]), w = new World(bs, { substeps: 48, handContact: 'patch' });
    if (type === 'broken') j.broken = true;
    if (type === 'powerless') j.capacity = 0;
    if (type === 'out-of-reach') j.reach = .8;
    const before = totals(bs), incoming = structuredClone(bs); w.joints.push(j);
    const r = w.step(bs.map(() => free), DT); laws(bs, before, r, true);
    expect(j.broken).toBe(true); expect(r.work.grasps).toBe(0); expect(r.armImpulse).toEqual([0, 0]);
    for (const [i, b] of bs.entries()) {
      expect(b.vel).toEqual(incoming[i].vel);
      expect(b.pos.x).toBeCloseTo(incoming[i].pos.x + incoming[i].vel.x * DT, 12);
      expect(b.pos.y).toBeCloseTo(incoming[i].pos.y + incoming[i].vel.y * DT, 12);
      expect(b.support!.foot).toBeUndefined();
    }
  });

  it('an ordinary no-grip free body keeps its yaw and straight-line momentum', () => {
    const bs = pair(1), w = new World(bs, { substeps: 48, handContact: 'patch' });
    bs[1].spin = .2; const before = totals(bs), theta = bs[1].facing;
    const r = w.step(bs.map(() => free), DT); laws(bs, before, r, true);
    expect(bs[1].spin).toBe(.2); expect(bs[1].facing).toBeCloseTo(theta + .2 * DT, 12);
    expect(bs.every(b => b.support!.foot === undefined)).toBe(true);
  });
});
