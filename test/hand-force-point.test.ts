import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World, type HandJoint, type Intent } from '../src/physics/world.js';

const DT = .05;
const free: Intent = { vel: { x: 0, y: 0 }, free: true };
const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;
const rotate = (v: Vec2, angle: number): Vec2 => ({
  x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
  y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
});
function body(mass: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, spin: 0, energy: 1,
    profile: { massKg: mass, radius: .3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
      shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
      power: mass, balance: .5, stepSpeed: 3.4, getUp: .9 } };
}
function totals(bs: Body[]) {
  return {
    angular: bs.reduce((s, b) => s + b.profile.massKg * cross(b.pos, b.vel)
      + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0),
    energy: bs.reduce((s, b) => s + .5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2)
      + .5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0),
    px: bs.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0),
    py: bs.reduce((s, b) => s + b.profile.massKg * b.vel.y, 0),
  };
}
function checkLaws(bs: Body[], before: ReturnType<typeof totals>, r: ReturnType<World['step']>, torso = false) {
  const after = totals(bs);
  expect(after.angular).toBeCloseTo(before.angular, 8);
  expect(after.px).toBeCloseTo(before.px, 9);
  expect(after.py).toBeCloseTo(before.py, 9);
  expect(after.energy - before.energy).toBeCloseTo(r.work.hands + r.work.contacts, 9);
  expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
  if (torso) expect(r.contacts.some(c => c.impulse > 0)).toBe(true);
  else expect(r.contacts).toHaveLength(0);
  expect(r.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
  expect(r.groundYawImpulse).toEqual(bs.map(() => 0));
  for (let i = 0; i < bs.length; i++) {
    expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-9);
    expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-9);
  }
}
function frame(bs: Body[], angle: number) {
  for (const b of bs) {
    b.pos = rotate(b.pos, angle); b.pos.x += 17; b.pos.y -= 9;
    b.vel = rotate(b.vel, angle); b.facing = angle;
  }
}

describe('a material hand point supplies force and yaw through the same contact', () => {
  const normalCases = (['a', 'b'] as const).flatMap(on => [-1, 1].flatMap(side =>
    [0, .8].map(angle => ({ on, side, angle }))));
  it.each(normalCases)('has the analytic normal impulse and moment: $on, side $side, rotation $angle', ({ on, side, angle }) => {
    const a = body(100, 0), b = body(80, .9), bs = [a, b];
    frame(bs, angle);
    const before = totals(bs), local = Object.freeze({ x: 0, y: side * .2 });
    const contact = Object.freeze({ on, local });
    const w = new World(bs, { substeps: 1, handContact: 'patch' });
    const j: HandJoint = { kind: 'hands', a, b, contact, extension: 1.1, push: 20, hold: 0, steer: 0 };
    w.joints.push(j);
    const r = w.step(bs.map(() => free), DT);
    checkLaws(bs, before, r);
    // Independent oracle for this initially still frame. No body touch,
    // ground or work clipping; the compression is large enough to saturate.
    const separation = { x: .9, y: on === 'b' ? side * .2 : -side * .2 };
    const length = Math.hypot(separation.x, separation.y);
    const J = rotate({ x: 20 * DT * separation.x / length, y: 20 * DT * separation.y / length }, angle);
    expect(j.normalForce).toBeCloseTo(20, 10);
    expect(a.vel.x).toBeCloseTo(-J.x / a.profile.massKg, 10);
    expect(a.vel.y).toBeCloseTo(-J.y / a.profile.massKg, 10);
    expect(b.vel.x).toBeCloseTo(J.x / b.profile.massKg, 10);
    expect(b.vel.y).toBeCloseTo(J.y / b.profile.massKg, 10);
    const offset = rotate(local, angle), attached = on === 'a' ? a : b, other = on === 'a' ? b : a;
    const signedJ = on === 'a' ? { x: -J.x, y: -J.y } : J;
    expect(attached.spin).toBeCloseTo(cross(offset, signedJ) / supportParams(attached.profile).yawInertia, 10);
    expect(other.spin).toBeCloseTo(0, 10);
    expect(Math.abs(attached.spin!)).toBeGreaterThan(.001);
    expect(j.forceOnB!.x).toBeCloseTo(J.x / DT, 10);
    expect(j.forceOnB!.y).toBeCloseTo(J.y / DT, 10);
    expect(j.momentOnA).toBeCloseTo(supportParams(a.profile).yawInertia * a.spin! / DT, 10);
    expect(j.momentOnB).toBeCloseTo(supportParams(b.profile).yawInertia * b.spin! / DT, 10);
    expect(j.contact).toBe(contact);
    expect(j.contact!.local).toEqual({ x: 0, y: side * .2 });
  });

  it.each([-1, 1].flatMap(side => [0, .8].map(angle => ({ side, angle }))))(
    'a separating tensile load produces the opposite normal moment: side $side, rotation $angle', ({ side, angle }) => {
      const a = body(100, 0), b = body(80, .9), bs = [a, b], length = Math.hypot(.9, .2);
      const n = { x: .9 / length, y: side * .2 / length };
      b.vel = { x: 2 * n.x, y: 2 * n.y }; frame(bs, angle);
      const incoming = bs.map(q => ({ ...q.vel })), before = totals(bs);
      const w = new World(bs, { substeps: 1, handContact: 'patch' });
      const j: HandJoint = { kind: 'hands', a, b, contact: { on: 'b', local: { x: 0, y: side * .2 } },
        extension: .6, push: 0, hold: 20, steer: 0 };
      w.joints.push(j);
      const r = w.step(bs.map(() => free), DT), J = rotate({ x: -20 * DT * n.x, y: -20 * DT * n.y }, angle);
      checkLaws(bs, before, r);
      expect(j.normalForce).toBeCloseTo(-20, 10);
      for (const [i, q] of bs.entries()) {
        const sign = i === 0 ? -1 : 1;
        expect(q.vel.x - incoming[i].x).toBeCloseTo(sign * J.x / q.profile.massKg, 10);
        expect(q.vel.y - incoming[i].y).toBeCloseTo(sign * J.y / q.profile.massKg, 10);
      }
      expect(a.spin).toBeCloseTo(0, 10);
      expect(b.spin).toBeCloseTo(cross(rotate({ x: 0, y: side * .2 }, angle), J)
        / supportParams(b.profile).yawInertia, 10);
      expect(b.spin! * side).toBeGreaterThan(0);
      expect(r.work.hands).toBeLessThan(0); // separating state, not all tensile corrections
      expect(r.armWork[0]).toBeLessThan(1e-9);
    });

  it.each([-1, 1].flatMap(side => [0, .8].map(angle => ({ side, angle }))))(
    'uses the same point for passive tangent impulse and both moments: side $side, rotation $angle', ({ side, angle }) => {
      const a = body(100, 0), b = body(80, .9), bs = [a, b];
      b.vel.y = side * 2; frame(bs, angle);
      const incoming = bs.map(q => ({ ...q.vel })), before = totals(bs);
      const w = new World(bs, { substeps: 1, handContact: 'patch' });
      const j: HandJoint = { kind: 'hands', a, b, contact: { on: 'b', local: { x: 0, y: side * .2 } },
        extension: .9, push: 0, hold: 0, steer: 20 };
      w.joints.push(j);
      const r = w.step(bs.map(() => free), DT);
      checkLaws(bs, before, r);
      // The force acts at mean incoming travel: b moves .05 yd before the
      // midpoint. This point differs from both the initial and final COMs.
      const P = { x: .9, y: side * (.2 + 2 * DT / 2) }, d = Math.hypot(P.x, P.y);
      const J = rotate({ x: side * 20 * DT * P.y / d, y: -side * 20 * DT * P.x / d }, angle);
      expect(j.tangentForce).toBeCloseTo(-side * 20, 10);
      for (const [i, q] of bs.entries()) {
        const sign = i === 0 ? -1 : 1;
        expect(q.vel.x - incoming[i].x).toBeCloseTo(sign * J.x / q.profile.massKg, 10);
        expect(q.vel.y - incoming[i].y).toBeCloseTo(sign * J.y / q.profile.massKg, 10);
      }
      const ra = rotate(P, angle), rb = rotate({ x: 0, y: side * .2 }, angle);
      expect(a.spin).toBeCloseTo(cross(ra, { x: -J.x, y: -J.y }) / supportParams(a.profile).yawInertia, 10);
      expect(b.spin).toBeCloseTo(cross(rb, J) / supportParams(b.profile).yawInertia, 10);
      expect(j.forceOnB!.x).toBeCloseTo(J.x / DT, 10);
      expect(j.forceOnB!.y).toBeCloseTo(J.y / DT, 10);
      expect(j.momentOnA).toBeCloseTo(cross(ra, { x: -J.x, y: -J.y }) / DT, 10);
      expect(j.momentOnB).toBeCloseTo(cross(rb, J) / DT, 10);
      expect(r.work.hands).toBeLessThan(0);
      expect(r.armWork[0]).toBeLessThan(1e-9);
    });

  it.each([1, 12, 48])('retains a rotating material point and physical laws over sustained contact at %s substeps', substeps => {
    for (const side of [-1, 1]) {
      const a = body(100, 0), b = body(80, .9), bs = [a, b];
      b.spin = side * .7; b.vel.y = side * .5; frame(bs, .8);
      const contact = Object.freeze({ on: 'b' as const, local: Object.freeze({ x: .1, y: side * .2 }) });
      const w = new World(bs, { substeps, handContact: 'patch' });
      w.joints.push({ kind: 'hands', a, b, contact, extension: 1.2, push: 20, hold: 20, steer: 20 });
      for (let k = 0; k < 4; k++) {
        const before = totals(bs), r = w.step(bs.map(() => free), DT);
        checkLaws(bs, before, r);
        expect(contact.local).toEqual({ x: .1, y: side * .2 });
        expect(bs.every(q => q.support!.state === 'up')).toBe(true);
      }
    }
  });

  it.each([1, 12, 48])('splitting one unsaturated contact preserves compliance and shared budgets at %s substeps', substeps => {
    const run = (count: number) => {
      const bs = [body(100, 0), body(100, .9)], w = new World(bs, { substeps, handContact: 'patch' });
      const local = { x: 0, y: .2 }, extension = Math.hypot(.9, .2) + .00002;
      for (let k = 0; k < count; k++) w.joints.push({ kind: 'hands', a: bs[0], b: bs[1],
        contact: { on: 'b', local }, extension, push: 200 / count, hold: 0, steer: 0 });
      const traces = [];
      for (let k = 0; k < 4; k++) {
        const before = totals(bs), r = w.step(bs.map(() => free), DT);
        checkLaws(bs, before, r);
        const loads = w.joints.map(j => (j as HandJoint).normalForce ?? 0);
        expect(Math.max(...loads)).toBeLessThan(1); // far below 100/200 cap: stiffness is observable
        const hands = w.joints as HandJoint[];
        const returned = hands.reduce((s, h) => ({ x: s.x + h.forceOnB!.x, y: s.y + h.forceOnB!.y,
          momentA: s.momentA + h.momentOnA!, momentB: s.momentB + h.momentOnB! }),
        { x: 0, y: 0, momentA: 0, momentB: 0 });
        traces.push({ bodies: structuredClone(bs), load: loads.reduce((s, f) => s + f, 0), returned, report: r });
      }
      return traces;
    };
    const one = run(1), two = run(2);
    expect(one[0].load).toBeGreaterThan(0);
    expect(two).toEqual(one);
  });

  it.each([-1, 1])('refines position, velocity and spin in the same sustained interaction, side %s', side => {
    const run = (substeps: number) => {
      const bs = [body(100, 0), body(80, .9)];
      bs[1].spin = side * .7; bs[1].vel.y = side * .5;
      const w = new World(bs, { substeps, handContact: 'patch' });
      w.joints.push({ kind: 'hands', a: bs[0], b: bs[1], contact: { on: 'b', local: { x: .1, y: side * .2 } },
        extension: 1.2, push: 20, hold: 20, steer: 20 });
      for (let k = 0; k < 4; k++) {
        const before = totals(bs), r = w.step(bs.map(() => free), DT);
        checkLaws(bs, before, r);
      }
      return bs;
    };
    const coarse = run(1), fine = run(12), reference = run(48);
    const error = (bs: Body[]) => ({
      position: Math.max(...bs.map((b, i) => Math.hypot(b.pos.x - reference[i].pos.x, b.pos.y - reference[i].pos.y))),
      velocity: Math.max(...bs.map((b, i) => Math.hypot(b.vel.x - reference[i].vel.x, b.vel.y - reference[i].vel.y))),
      spin: Math.max(...bs.map((b, i) => Math.abs(b.spin! - reference[i].spin!))),
    });
    const c = error(coarse), f = error(fine);
    // Engineering refinement of a fixed physical request; no outcome target.
    for (const key of ['position', 'velocity', 'spin'] as const) expect(f[key]).toBeLessThan(c[key] / 4);
    expect(f.position).toBeLessThan(1e-5); // yd
    expect(f.velocity).toBeLessThan(1e-4); // yd/s
    expect(f.spin).toBeLessThan(1e-3); // rad/s
  });

  it.each([1, 12, 48].flatMap(substeps => [-1, 1].map(side => ({ substeps, side }))))(
    'conserves the coupled law through torso impact plus explicit hand forces: $substeps substeps, side $side', ({ substeps, side }) => {
      const a = body(100, 0), b = body(80, .5), bs = [a, b];
      a.profile.radius = .25; b.profile.radius = .35;
      a.vel.x = 1.2; b.vel = { x: .2, y: side };
      const w = new World(bs, { substeps, handContact: 'patch' });
      const j: HandJoint = { kind: 'hands', a, b, contact: { on: 'b', local: { x: 0, y: side * .2 } },
        extension: .9, push: 20, hold: 0, steer: 20 };
      w.joints.push(j);
      const before = totals(bs), r = w.step(bs.map(() => free), DT);
      checkLaws(bs, before, r, true);
      expect(j.normalForce! + Math.abs(j.tangentForce!)).toBeGreaterThan(0);
    });

  it.each([{ x: .31, y: 0 }, { x: NaN, y: 0 }, { x: 0, y: Infinity }])(
    'rejects an unattainable torso point %j instead of silently clamping it', local => {
      const bs = [body(100, 0), body(80, .9)], w = new World(bs, { handContact: 'patch' });
      w.joints.push({ kind: 'hands', a: bs[0], b: bs[1], contact: { on: 'b', local }, extension: 1,
        push: 20, hold: 0, steer: 0 });
      expect(() => w.step(bs.map(() => free), DT)).toThrow(RangeError);
    });

  it('requires the common point solve for explicit contact', () => {
    const bs = [body(100, 0), body(80, .9)], w = new World(bs, { handContact: 'center' });
    w.joints.push({ kind: 'hands', a: bs[0], b: bs[1], contact: { on: 'b', local: { x: 0, y: .2 } },
      extension: 1, push: 20, hold: 0, steer: 0 });
    expect(() => w.step(bs.map(() => free), DT)).toThrow('Material hand contacts require the common patch solve');
  });

  it('keeps new diagnostic properties out of the historical center solve', () => {
    const bs = [body(100, 0), body(80, .9)], w = new World(bs, { handContact: 'center' });
    const j: HandJoint = { kind: 'hands', a: bs[0], b: bs[1], extension: 1, push: 20, hold: 0, steer: 0 };
    w.joints.push(j); w.step(bs.map(() => free), DT);
    expect(j).not.toHaveProperty('forceOnB');
    expect(j).not.toHaveProperty('momentOnA');
    expect(j).not.toHaveProperty('momentOnB');
  });
});
