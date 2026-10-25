/** A wrap changes the acquired contact/recovery derivative, not hold height,
 * grip capacity, or recovery availability in the absence of transmitted load. */
import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { World, type GraspJoint, type Intent, type StepReport } from '../src/physics/world.js';

const profile = { massKg: 100, radius: .28, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
  shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const stand: Intent = { vel: { x: 0, y: 0 }, posture: .2 };
function fixture(coupling: number | undefined, capacity = 900, handContact: 'center' | 'patch' = 'center', side = 1) {
  const bs: Body[] = [0, 1].map(x => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 },
    facing: 0, profile: { ...profile }, energy: 1, support: newSupport() }));
  bs[1].support!.xi = { x: .24, y: side * .04 }; bs[1].support!.out = .12;
  const w = new World(bs, { handContact, substeps: 12 });
  // Preserve contact subdivision in the zero-capacity control.
  w.joints.push({ kind: 'hands', a: bs[0], b: bs[1], extension: 3, push: 0, hold: 0, steer: 0 });
  const j: GraspJoint = { kind: 'grasp', a: bs[0], b: bs[1], legs: .55,
    height: .7, reach: 1.5, hold: 1, capacity, pull: 0 };
  if (coupling !== undefined) j.recoveryCoupling = coupling;
  w.joints.push(j);
  return { bs, w, j };
}
interface Geometry {
  syncHeldSupport(): void;
  graspPoint(j: GraspJoint): { x: number; y: number };
  graspJacobian(j: GraspJoint): { xx: number; xy: number; yy: number };
  supportImpulse(j: GraspJoint, x: number, y: number, h: number): number;
}
const geometry = (w: World) => w as unknown as Geometry;
const modes = ['center', 'patch'] as const;

function run(coupling: number | undefined, capacity: number, mode: 'center' | 'patch', side = 1, count = 1) {
  const f = fixture(coupling, capacity, mode, side);
  const grasps = [f.j];
  for (let i = 1; i < count; i++) {
    const j = { ...f.j }; grasps.push(j); f.w.joints.push(j);
  }
  let impulse = 0;
  let report: StepReport | undefined;
  for (let tick = 0; tick < 8; tick++) {
    const before = f.bs.map(b => ({ ...b.vel }));
    const r = f.w.step([stand, stand], .05);
    report = r;
    impulse += grasps.reduce((s, j) => s + (j.force ?? 0) * .05, 0);
    for (const coord of ['x', 'y'] as const) {
      const change = f.bs.reduce((s, b, i) => s + b.profile.massKg * (b.vel[coord] - before[i][coord]), 0);
      expect(change).toBeCloseTo(r.groundImpulse.reduce((s, p) => s + p[coord], 0), 8);
    }
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
    expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-8);
    f.bs.forEach((_, i) => {
      expect(r.armImpulse[i]).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-8);
      expect(r.armWork[i]).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-8);
      expect(r.supportMotorWork[i]).toBeLessThanOrEqual(r.supportMotorWorkLimit[i] + 1e-8);
    });
  }
  return { ...f, impulse, report };
}

describe('independent lower-wrap height and force-transmitting recovery coupling', () => {
  it.each(modes)('omission exactly retains the prior height-share response in %s', mode => {
    // No sliding in this fixture: an explicit fixed coefficient equals the
    // height-derived coefficient only while the latter remains fixed.
    const a = run(undefined, 1e6, mode), b = run(.55, 1e6, mode);
    expect(a.j.legs).toBe(.55); expect(b.j.legs).toBe(.55);
    expect(a.bs).toEqual(b.bs);
    expect(a.report).toEqual(b.report);
    expect(a.impulse).toBe(b.impulse);
  });

  it.each(modes)('changes real loaded recovery without lowering the hold or adding capacity in %s', mode => {
    const partial = run(.55, 900, mode), secure = run(1, 900, mode);
    expect(Math.hypot(partial.bs[1].support!.xi.x - secure.bs[1].support!.xi.x,
      partial.bs[1].support!.xi.y - secure.bs[1].support!.xi.y)).toBeGreaterThan(.001);
    expect(secure.impulse).toBeGreaterThan(0);
    expect(secure.j.height).toBe(partial.j.height);
    // Different actual slipping may change `legs`; the prescribed contact
    // height is fixed in both, so this cannot buy a lower pitch point.
    expect(secure.j.capacity).toBe(partial.j.capacity);
  });

  it.each(modes)('a zero-capacity full-binding claim buys no body or support restriction in %s', mode => {
    const secure = run(1, 0, mode), ordinary = run(.55, 0, mode);
    expect(secure.impulse).toBe(0);
    expect(secure.bs).toEqual(ordinary.bs);
    expect(secure.bs[1].support!.foot).toBeUndefined();
  });

  it.each(modes)('a vanishing capacity makes full versus partial coupling converge in %s', mode => {
    const a = run(1, 1e-9, mode), b = run(.55, 1e-9, mode);
    expect(a.impulse).toBeLessThan(1e-8);
    for (let i = 0; i < 2; i++) for (const c of ['x', 'y'] as const) {
      expect(a.bs[i].pos[c]).toBeCloseTo(b.bs[i].pos[c], 8);
      expect(a.bs[i].support!.xi[c]).toBeCloseTo(b.bs[i].support!.xi[c], 8);
    }
  });

  it.each(modes)('changing an acquired coupling preserves its contact point through zero in %s', mode => {
    const { w, j } = run(.55, 50, mode), g = geometry(w);
    const point = g.graspPoint(j);
    const before = g.graspJacobian(j);
    for (const coupling of [1, .2, 0, .55]) {
      j.recoveryCoupling = coupling; g.syncHeldSupport();
      expect(g.graspPoint(j).x).toBeCloseTo(point.x, 10);
      expect(g.graspPoint(j).y).toBeCloseTo(point.y, 10);
      const jacobian = g.graspJacobian(j);
      for (const axis of ['xx', 'xy', 'yy'] as const)
        expect(jacobian[axis]).toBeCloseTo(before[axis] * coupling / .55, 10);
    }
  });

  it.each(modes)('an actual pair impulse and corrective force use the same derivative in %s', mode => {
    const { w, j, bs } = run(.85, 50, mode), g = geometry(w);
    const foot = bs[1].support!.foot!, beforeForce = { ...foot.force };
    const before = bs.map(b => ({ ...b.vel }));
    const jacobian = g.graspJacobian(j);
    const h = .05 / 12, x = .001, y = -.002;
    const fraction = g.supportImpulse(j, x, y, h);
    expect(fraction).toBeGreaterThan(0);
    expect((foot.force.x - beforeForce.x) * h).toBeCloseTo((jacobian.xx * x + jacobian.xy * y) * fraction, 10);
    expect((foot.force.y - beforeForce.y) * h).toBeCloseTo((jacobian.xy * x + jacobian.yy * y) * fraction, 10);
    expect((bs[1].vel.x - before[1].x) * profile.massKg).toBeCloseTo(x * fraction, 10);
    expect((bs[0].vel.x - before[0].x) * profile.massKg).toBeCloseTo(-x * fraction, 10);
  });

  it.each(modes)('full coupling preserves the reflected loaded response in %s', mode => {
    const a = run(1, 900, mode, 1), b = run(1, 900, mode, -1);
    expect(a.impulse).toBeCloseTo(b.impulse, 8);
    for (let i = 0; i < 2; i++) {
      expect(a.bs[i].pos.x).toBeCloseTo(b.bs[i].pos.x, 8);
      expect(a.bs[i].pos.y).toBeCloseTo(-b.bs[i].pos.y, 8);
      expect(a.bs[i].support!.xi.y).toBeCloseTo(-b.bs[i].support!.xi.y, 8);
    }
  });

  it.each(modes)('duplicate full-binding claims cannot multiply restraint in %s', mode => {
    const one = run(1, 50, mode), four = run(1, 50, mode, 1, 4);
    expect(one.impulse).toBeCloseTo(four.impulse, 8);
    for (let i = 0; i < 2; i++) for (const c of ['x', 'y'] as const) {
      expect(one.bs[i].pos[c]).toBeCloseTo(four.bs[i].pos[c], 8);
      expect(one.bs[i].support!.xi[c]).toBeCloseTo(four.bs[i].support!.xi[c], 8);
    }
  });

  it.each(modes)('an upper hold cannot bind recovery through a stray coefficient in %s', mode => {
    const a = fixture(1, 50, mode), b = fixture(undefined, 50, mode);
    a.j.legs = b.j.legs = 0;
    a.w.step([stand, stand], .05); b.w.step([stand, stand], .05);
    expect(a.bs).toEqual(b.bs);
    expect(a.bs[1].support!.foot).toBeUndefined();
  });

  it.each([.55, 1].flatMap(coupling => [-1, 1].flatMap(side => ['normal', 'tangent', 'spin']
    .map(load => ({ coupling, side, load })))))
    ('preserves independent momentum, angular momentum and work at an achieved point: $coupling / $side / $load', ({ coupling, side, load }) => {
      const { bs, w, j } = run(.55, 50, 'patch', side);
      j.recoveryCoupling = coupling; geometry(w).syncHeldSupport();
      expect(bs[1].support!.state).toBe('up');
      bs[0].vel = { x: .2, y: 0 };
      bs[1].vel = { x: load === 'normal' ? .23 : .2, y: load === 'tangent' ? side * .02 : 0 };
      bs[0].spin = 0; bs[1].spin = load === 'spin' ? side * .08 : 0;
      const totals = () => ({
        angular: bs.reduce((s, b) => s + b.profile.massKg * (b.pos.x * b.vel.y - b.pos.y * b.vel.x)
          + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0),
        px: bs.reduce((s, b) => s + b.profile.massKg * b.vel.x, 0),
        py: bs.reduce((s, b) => s + b.profile.massKg * b.vel.y, 0),
        energy: bs.reduce((s, b) => s + .5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2)
          + .5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0),
      });
      const before = totals(), r = w.step(bs.map(() => ({ vel: { x: 0, y: 0 }, free: true })), .005);
      const after = totals();
      expect(r.contacts).toHaveLength(0); expect(r.falls).toHaveLength(0);
      expect(r.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
      expect(r.groundYawImpulse).toEqual(bs.map(() => 0));
      expect(after.angular).toBeCloseTo(before.angular, 8);
      expect(after.px).toBeCloseTo(before.px, 9); expect(after.py).toBeCloseTo(before.py, 9);
      expect(after.energy - before.energy).toBeCloseTo(r.work.grasps + r.work.hands, 9);
      expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-9);
    });
});
