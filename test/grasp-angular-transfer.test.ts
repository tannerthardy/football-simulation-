import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World, type GraspJoint, type HandJoint, type Intent } from '../src/physics/world.js';

const DT = .05, free: Intent = { vel: { x: 0, y: 0 }, free: true };
const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;
const rotate = (v: Vec2, angle: number): Vec2 => ({
  x: v.x * Math.cos(angle) - v.y * Math.sin(angle), y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
});
function body(mass: number, radius: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: .2, y: 0 }, facing: 0, spin: 0, energy: 1,
    profile: { massKg: mass, radius, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
      reactReach: 2.6, reactionTime: .25, power: mass, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 } };
}
function pair(side: number, angle = 0) {
  const bs = [body(90, .25, 0), body(120, .35, 1)];
  bs[1].vel.y = side * .002; // stays unslipped even at the finest resolution
  for (const b of bs) {
    b.pos = rotate(b.pos, angle); b.pos.x += 17; b.pos.y -= 9;
    b.vel = rotate(b.vel, angle); b.facing = angle;
  }
  return bs;
}
function grasp(a: Body, b: Body, pull = 0): GraspJoint {
  return { kind: 'grasp', a, b, capacity: 900, reach: 1.4, legs: 0, pull };
}
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
function laws(bs: Body[], before: ReturnType<typeof totals>, r: ReturnType<World['step']>, passive: boolean) {
  const after = totals(bs);
  expect(after.angular).toBeCloseTo(before.angular, 8);
  expect(after.px).toBeCloseTo(before.px, 9);
  expect(after.py).toBeCloseTo(before.py, 9);
  expect(after.energy - before.energy).toBeCloseTo(r.work.hands + r.work.grasps, 9);
  expect(Math.abs(r.work.residual)).toBeLessThan(1e-9);
  expect(r.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
  expect(r.groundYawImpulse).toEqual(bs.map(() => 0));
  expect(r.contacts).toHaveLength(0);
  expect(r.falls).toHaveLength(0);
  expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-9);
  if (passive) expect(after.energy).toBeLessThanOrEqual(before.energy + 1e-9);
  for (let i = 0; i < bs.length; i++) {
    expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-9);
    expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-9);
  }
}
function stillUpper(bs: Body[], j: GraspJoint) {
  expect(j.broken ?? false).toBe(false);
  expect(j.slipping ?? false).toBe(false);
  expect(j.legs).toBe(0);
  expect(j.force).toBeLessThanOrEqual(j.capacity + 1e-9);
  for (const b of bs) expect(b.support!.foot).toBeUndefined();
}

describe('upper grasps use one shared point for impulse, yaw and finite travel', () => {
  it.each([-1, 1].flatMap(side => [0, .8].map(angle => ({ side, angle }))))(
    'has the independent unsaturated point-velocity impulse: side $side, rotation $angle', ({ side, angle }) => {
      const bs = pair(side, angle), [a, b] = bs, j = grasp(a, b);
      b.vel = rotate({ x: .2, y: side * .25 }, angle); // retained original ordinary unslipped witness
      const incoming = { ...b.vel }, before = totals(bs), w = new World(bs, { substeps: 1, handContact: 'patch' });
      w.joints.push(j); const r = w.step(bs.map(() => free), DT);
      laws(bs, before, r, true); stillUpper(bs, j);
      // The reduced common point is radius-weighted between force-midpoint
      // COMs. Both normal and tangent components use those same lever arms.
      const d = { x: 1, y: side * .25 * DT / 2 }, length = Math.hypot(d.x, d.y);
      const n = { x: d.x / length, y: d.y / length }, t = rotate({ x: -n.y, y: n.x }, angle);
      const ra = length * .25 / .6, rb = length * .35 / .6;
      const ia = supportParams(a.profile).yawInertia, ib = supportParams(b.profile).yawInertia;
      const mobility = 1 / a.profile.massKg + 1 / b.profile.massKg + ra * ra / ia + rb * rb / ib;
      const jt = -side * .25 * n.x / mobility;
      const J = { x: b.profile.massKg * (b.vel.x - incoming.x), y: b.profile.massKg * (b.vel.y - incoming.y) };
      expect(J.x * t.x + J.y * t.y).toBeCloseTo(jt, 10);
      expect(a.spin).toBeCloseTo(-ra * jt / ia, 10);
      expect(b.spin).toBeCloseTo(-rb * jt / ib, 10);
      expect(a.spin! * side).toBeGreaterThan(0);
      expect(b.spin! * side).toBeGreaterThan(0);
    });

  it.each([0, 1.5].flatMap(pull => [1, 12, 48].flatMap(substeps => [-1, 1].map(side => ({ pull, substeps, side })))))
    ('conserves sustained upper contact with pull $pull at $substeps steps, side $side', ({ pull, substeps, side }) => {
      for (const angle of [0, .8]) {
        const bs = pair(side, angle), j = grasp(bs[0], bs[1], pull), w = new World(bs, { substeps, handContact: 'patch' });
        w.joints.push(j); let positiveWork = 0;
        for (let k = 0; k < 4; k++) {
          const before = totals(bs), r = w.step(bs.map(() => free), DT);
          laws(bs, before, r, pull === 0); stillUpper(bs, j);
          positiveWork += Math.max(0, r.work.grasps);
        }
        if (pull > 0) expect(positiveWork).toBeGreaterThan(0);
      }
    });

  it.each([1, 12, 48])('responds to body spin when COMs have no lateral slip at %s steps', substeps => {
    for (const side of [-1, 1]) {
      const bs = pair(side); bs[1].vel.y = 0; bs[0].spin = bs[1].spin = side * .1;
      const before = totals(bs), j = grasp(bs[0], bs[1]), w = new World(bs, { substeps, handContact: 'patch' });
      w.joints.push(j); const r = w.step(bs.map(() => free), DT);
      laws(bs, before, r, true); stillUpper(bs, j);
      expect(j.force).toBeGreaterThan(0);
      expect(bs[0].vel.y * side).toBeLessThan(0);
      expect(bs[1].vel.y * side).toBeGreaterThan(0);
    }
  });

  it.each([-1, 1])('keeps the central normal tension control unspun, side %s', side => {
    const bs = pair(side); bs[1].vel.y = 0; bs[1].vel.x += .25;
    const before = totals(bs), j = grasp(bs[0], bs[1]), w = new World(bs, { substeps: 12, handContact: 'patch' });
    w.joints.push(j); const r = w.step(bs.map(() => free), DT);
    laws(bs, before, r, true); stillUpper(bs, j);
    expect(j.force).toBeGreaterThan(0);
    expect(bs[0].spin).toBeCloseTo(0, 10); expect(bs[1].spin).toBeCloseTo(0, 10);
  });

  it.each([1, 12, 48].flatMap(substeps => [-1, 1].map(side => ({ substeps, side }))))(
    'closes mixed hand/grasp finite-force transport at $substeps steps, side $side', ({ substeps, side }) => {
      const bs = pair(side), j = grasp(bs[0], bs[1]), w = new World(bs, { substeps, handContact: 'patch' });
      const hand: HandJoint = { kind: 'hands', a: bs[0], b: bs[1], extension: 1.1, push: 50, hold: 0, steer: 0 };
      w.joints.push(hand, j);
      for (let k = 0; k < 4; k++) {
        const before = totals(bs), r = w.step(bs.map(() => free), DT);
        laws(bs, before, r, false); stillUpper(bs, j);
        expect(hand.normalForce).toBeGreaterThan(0);
      }
    });

  it.each([1, 12, 48])('shares a body across a grip and a separate hand connection at %s steps', substeps => {
    const bs = pair(1), c = body(110, .3, 16); c.pos.y = -9; bs.push(c);
    const j = grasp(bs[0], bs[1], 1.5), w = new World(bs, { substeps, handContact: 'patch' });
    w.joints.push(j, { kind: 'hands', a: c, b: bs[0], extension: 1.1, push: 50, hold: 0, steer: 20 });
    for (let k = 0; k < 4; k++) {
      const before = totals(bs), r = w.step(bs.map(() => free), DT);
      laws(bs, before, r, false); stillUpper(bs, j);
    }
  });

  it.each((['legacy', 'virtual-foot'] as const).flatMap(supportModel => [0, 1.5].flatMap(pull =>
    [false, true].flatMap(lowerNeighbor => [12, 48].map(substeps => ({ supportModel, pull, lowerNeighbor, substeps }))))))(
    'numerical full-cap grip copies share compliance and reel work: $supportModel, pull $pull, lower $lowerNeighbor, $substeps steps',
    ({ supportModel, pull, lowerNeighbor, substeps }) => {
      const run = (copies: number) => {
        const bs = pair(1), upper = Array.from({ length: copies }, () => grasp(bs[0], bs[1], pull));
        // Each numerical copy retains the same strongest physical claim.
        // Half-cap copies would halve that claim, unlike split hand requests.
        if (lowerNeighbor) {
          const c = body(110, .3, 18); c.pos.y = -7.8; c.vel.y = .002; bs.push(c);
        }
        const w = new World(bs, { substeps, supportModel, handContact: 'patch' });
        w.joints.push(...upper);
        if (lowerNeighbor) w.joints.push({ kind: 'grasp', a: bs[2], b: bs[1], reach: 1.4,
          capacity: .01, legs: 1, pull: 0 });
        const states = [];
        for (let k = 0; k < 4; k++) {
          const report = w.step(bs.map(() => free), DT);
          expect(Math.abs(report.work.residual)).toBeLessThan(1e-9);
          expect(upper.every(j => j.legs === 0 && !j.broken && !j.slipping)).toBe(true);
          if (lowerNeighbor || supportModel === 'virtual-foot') expect(bs[1].support!.foot).toBeDefined();
          states.push({ bodies: structuredClone(bs), gripLoad: upper.reduce((s, j) => s + j.force!, 0), report });
        }
        return states;
      };
      expect(run(2)).toEqual(run(1));
    });

  it.each(['broken', 'powerless', 'out-of-reach'] as const)('an unusable grip delivers no last impulse: %s', type => {
    const bs = pair(1), j = grasp(bs[0], bs[1]), w = new World(bs, { substeps: 48, handContact: 'patch' });
    if (type === 'broken') j.broken = true;
    if (type === 'powerless') j.capacity = 0;
    if (type === 'out-of-reach') j.reach = .8;
    const before = totals(bs), incoming = bs.map(b => ({ pos: { ...b.pos }, vel: { ...b.vel } }));
    w.joints.push(j); const r = w.step(bs.map(() => free), DT);
    laws(bs, before, r, true);
    expect(j.broken).toBe(true);
    expect(r.work.grasps).toBe(0); expect(r.armImpulse).toEqual([0, 0]);
    for (const [i, b] of bs.entries()) {
      expect(b.vel).toEqual(incoming[i].vel);
      expect(b.pos.x).toBeCloseTo(incoming[i].pos.x + incoming[i].vel.x * DT, 12);
      expect(b.pos.y).toBeCloseTo(incoming[i].pos.y + incoming[i].vel.y * DT, 12);
      expect(b.support!.foot).toBeUndefined();
    }
  });

  it.each([-1, 1])('a real upper slip transitions to lower support after its bounded load, side %s', side => {
    const bs = pair(side); bs[1].vel.y = side * .5;
    const j = grasp(bs[0], bs[1]); j.capacity = 10;
    const w = new World(bs, { substeps: 1, handContact: 'patch' }), before = totals(bs);
    w.joints.push(j); const r = w.step(bs.map(() => free), DT);
    laws(bs, before, r, true);
    expect(j.force).toBeLessThanOrEqual(10 + 1e-9);
    expect(j.slipping).toBe(true);
    expect(j.legs).toBeGreaterThan(0);
    expect(bs[1].support!.foot).toBeDefined();
    // Later lower-hold steps have a different Jacobian; this test makes no
    // angular-law claim for that still separate reduced support model.
  });
});
