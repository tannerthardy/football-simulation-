/** Production lower attachment: integration contracts exercised
 * through the actual World, without a football-specific force multiplier. */
import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { World, type GraspJoint, type Intent, type StepReport } from '../src/physics/world.js';

const profile = { massKg: 100, radius: .28, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
  shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
  power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const stand: Intent = { vel: { x: 0, y: 0 }, posture: .2 };
const body = (x: number, y = 0): Body => ({ pos: { x, y }, vel: { x: 0, y: 0 },
  facing: 0, profile: { ...profile }, energy: 1, support: newSupport() });
const hold = (a: Body, b: Body, capacity: number, extra: Partial<GraspJoint> = {}): GraspJoint =>
  ({ kind: 'grasp', a, b, capacity, reach: 1.5, hold: 1, legs: 1, pull: 0, ...extra });
const magnitude = (v: Vec2) => Math.hypot(v.x, v.y);
const momentum = (bodies: Body[]): Vec2 => bodies.reduce((sum, b) =>
  ({ x: sum.x + b.profile.massKg * b.vel.x, y: sum.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
interface Geometry {
  graspPoint(j: GraspJoint): Vec2;
  graspVelocity(j: GraspJoint): Vec2;
  jointRows(h: number): Array<{ joint: unknown; nx: number; ny: number; mn: number; mt?: number }>;
  supportImpulse(j: GraspJoint, x: number, y: number, h: number, active?: boolean, channel?: { net: number }): number;
  footImpulseX: Float64Array;
  footImpulseY: Float64Array;
  report: StepReport;
  syncHeldSupport(): void;
  attachments: WeakMap<GraspJoint, { share: number; reference: Vec2;
    foot: NonNullable<NonNullable<Body['support']>['foot']>; bounded?: boolean }>;
}
const geometry = (world: World) => world as unknown as Geometry;

function physical(bodies: Body[], before: Vec2, report: StepReport) {
  const after = momentum(bodies), ground = report.groundImpulse.reduce((sum, p) =>
    ({ x: sum.x + p.x, y: sum.y + p.y }), { x: 0, y: 0 });
  expect(after.x - before.x).toBeCloseTo(ground.x, 8);
  expect(after.y - before.y).toBeCloseTo(ground.y, 8);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  expect(report.passiveGraspWork).toBeLessThanOrEqual(1e-8);
  for (let i = 0; i < bodies.length; i++) {
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    for (const value of [bodies[i].pos.x, bodies[i].pos.y, bodies[i].vel.x, bodies[i].vel.y])
      expect(Number.isFinite(value)).toBe(true);
  }
}

function stationary(capacity: number | null, count = 1, substeps = 12, gap = 1,
  boundedAttachment: boolean | 'omit' = true) {
  const a = body(0), b = body(gap), bodies = [a, b];
  b.support!.xi = { x: .24, y: .04 }; b.support!.out = .12;
  const world = new World(bodies, boundedAttachment === 'omit' ? { substeps } : { substeps, boundedAttachment });
  // Keep the same subdivision cadence when the tested grasp is absent.
  world.joints.push({ kind: 'hands', a, b, extension: 3, push: 0, hold: 0, steer: 0 });
  const grips = capacity === null ? [] : Array.from({ length: count }, () => hold(a, b, capacity, { hold: gap }));
  world.joints.push(...grips);
  let impulse = 0, motorWork = 0, lowerReleases = 0;
  const trajectory: Array<{ a: Body; b: Body }> = [];
  for (let tick = 0; tick < 8; tick++) {
    const before = momentum(bodies), report = world.step([stand, stand], .05);
    physical(bodies, before, report);
    impulse += grips.reduce((sum, j) => sum + (j.force ?? 0) * .05, 0);
    motorWork += report.supportMotorWork[1]; lowerReleases += report.lowerHoldReleases;
    trajectory.push({ a: structuredClone(a), b: structuredClone(b) });
  }
  return { a, b, world, grips, impulse, motorWork, lowerReleases, trajectory };
}

function turning(side: number, substeps: number, capacity = 348) {
  const a = body(0), b = body(1);
  for (const subject of [a, b]) {
    subject.energy = .72; subject.vel = { x: 7, y: 0 };
    subject.profile = { ...subject.profile, massKg: 125, radius: .32, power: 120, stepSpeed: 3.1, balance: .65 };
  }
  b.support!.xi = { x: .45, y: side * .08 }; b.support!.out = .12;
  // Construct only after the profile setup so World caches the actual mass
  // and capabilities. Both cases use exactly the same profiles.
  const actual = new World([a, b], { substeps, boundedAttachment: true });
  actual.joints.push({ kind: 'hands', a, b, extension: 3, push: 0, hold: 0, steer: 0 });
  const grip = hold(a, b, capacity, { legs: .14, reach: 10 }); actual.joints.push(grip);
  const trajectory: Array<{ pos: Vec2; vel: Vec2; xi: Vec2; state: string; broken: boolean }> = [];
  let impulse = 0, lowerReleases = 0;
  for (let tick = 0; tick < 8; tick++) {
    const intent: Intent = { vel: { x: 7, y: side }, facing: 1.2 * side, posture: .2 };
    const before = momentum(actual.bodies), report = actual.step([intent, intent], .05);
    physical(actual.bodies, before, report);
    impulse += (grip.force ?? 0) * .05; lowerReleases += report.lowerHoldReleases;
    trajectory.push({ pos: { ...b.pos }, vel: { ...b.vel }, xi: { ...b.support!.xi },
      state: b.support!.state, broken: !!grip.broken });
  }
  return { trajectory, impulse, lowerReleases, grip, world: actual };
}

describe('bounded lower attachment in the actual World', () => {
  it('is the live default while preserving explicit linear and research options', () => {
    expect(new World([body(0)]).boundedAttachment).toBe(true);
    expect(new World([body(0)], { boundedAttachment: true }).boundedAttachment).toBe(true);
    expect(new World([body(0)], { boundedAttachment: false }).boundedAttachment).toBe(false);
    expect(new World([body(0)], { supportModel: 'virtual-foot' }).boundedAttachment).toBe(false);
    expect(() => new World([body(0)], { boundedAttachment: true, supportModel: 'virtual-foot' })).toThrow();
    const absent = stationary(900, 1, 12, 1, 'omit'), bounded = stationary(900, 1, 12, 1, true);
    expect(absent.trajectory).toEqual(bounded.trajectory);
    expect(absent.impulse).toBe(bounded.impulse);
    expect(absent.motorWork).toBe(bounded.motorWork);
  });

  it('weak, medium and strong holds transmit progressive bounded force and oppose recovery', () => {
    for (const substeps of [12, 48]) {
      const rows = [1, 50, 900].map(capacity => stationary(capacity, 1, substeps));
      for (let i = 0; i < rows.length; i++) {
        expect(rows[i].impulse).toBeGreaterThan(0);
        expect(rows[i].impulse).toBeLessThanOrEqual([1, 50, 900][i] * .4 + 1e-8);
        expect(rows[i].lowerReleases).toBe(0);
        if (i > 0) {
          expect(rows[i].impulse).toBeGreaterThan(rows[i - 1].impulse);
          expect(magnitude(rows[i].b.support!.xi)).toBeGreaterThan(magnitude(rows[i - 1].b.support!.xi));
        }
      }
      expect(rows[0].b.support!.state).toBe('up');
      expect(rows[2].b.support!.state).not.toBe('up');
    }
  });

  it('zero capacity and out-of-reach lower holds retain the unheld physical trajectory', () => {
    for (const substeps of [12, 48]) for (const [capacity, gap] of [[0, 1], [900, 2.2]]) {
      const held = stationary(capacity, 1, substeps, gap), free = stationary(null, 0, substeps, gap);
      expect(held.impulse).toBe(0);
      expect(held.grips[0].broken).toBe(true);
      expect(held.lowerReleases).toBe(0);
      expect(held.a).toEqual(free.a); expect(held.b).toEqual(free.b);
    }
  });

  it('duplicate numerical rows cannot buy extra grip, corrective force or work', () => {
    for (const substeps of [12, 48]) for (const capacity of [50, 900]) {
      const one = stationary(capacity, 1, substeps), four = stationary(capacity, 4, substeps);
      for (let i = 0; i < one.trajectory.length; i++) for (const name of ['a', 'b'] as const) {
        const a = one.trajectory[i][name], b = four.trajectory[i][name];
        for (const axis of ['x', 'y'] as const) {
          expect(b.pos[axis]).toBeCloseTo(a.pos[axis], 8);
          expect(b.vel[axis]).toBeCloseTo(a.vel[axis], 8);
          expect(b.support!.xi[axis]).toBeCloseTo(a.support!.xi[axis], 8);
        }
        expect(b.support!.state).toBe(a.support!.state);
      }
      expect(four.impulse).toBeCloseTo(one.impulse, 8);
      expect(four.motorWork).toBeCloseTo(one.motorWork, 8);
    }
  });

  it('an existing hold changes leg share continuously and a new holder acquires at the body', () => {
    const left = body(0), runner = body(1), right = body(1, 1);
    const world = new World([left, runner, right], { boundedAttachment: true });
    runner.support!.xi = { x: .3, y: .1 }; runner.support!.out = .12;
    const first = hold(left, runner, 20, { legs: .3 }); world.joints.push(first);
    const before = momentum(world.bodies), report = world.step([stand, stand, stand], .05);
    physical(world.bodies, before, report);
    expect(magnitude(runner.support!.foot!.offset)).toBeGreaterThan(0);
    const engine = geometry(world), point = engine.graspPoint(first);
    const second = hold(right, runner, 30, { legs: .8 });
    first.legs = .9; world.joints.push(second); engine.syncHeldSupport();
    for (const axis of ['x', 'y'] as const) {
      expect(engine.graspPoint(first)[axis]).toBeCloseTo(point[axis], 12);
      expect(engine.graspPoint(second)[axis]).toBeCloseTo(runner.pos[axis], 12);
    }
    expect(engine.attachments.get(first)?.bounded).toBe(true);
    expect(engine.attachments.get(second)?.bounded).toBe(true);
    // Distinct holders must act through the same recovery motor; their
    // simultaneous loads cannot create another force/work allowance.
    for (let tick = 0; tick < 4; tick++) {
      const previous = momentum(world.bodies), next = world.step([stand, stand, stand], .05);
      physical(world.bodies, previous, next);
      expect(first.force!).toBeLessThanOrEqual(20 + 1e-8);
      expect(second.force!).toBeLessThanOrEqual(30 + 1e-8);
    }
  });

  it('a chart rebase preserves the bounded material point and its physical velocity', () => {
    const { b, world, grips } = stationary(50);
    const grip = grips[0], foot = b.support!.foot!, engine = geometry(world);
    const reach = supportParams(b.profile).comHeight;
    b.pos = { x: 0, y: 0 }; // isolate the exact-bound lifecycle from cancellation rounding
    // A chart-only edit moves into an anisotropic, strongly extended region.
    // It is a lifecycle check, not a force-calibration or football sample.
    foot.offset = { x: 3 * reach, y: .7 * reach };
    foot.desired = { x: .4, y: .2 }; foot.force = { x: -20, y: 5 };
    const point = engine.graspPoint(grip), velocity = engine.graspVelocity(grip);
    expect(magnitude({ x: point.x - b.pos.x, y: point.y - b.pos.y })).toBeLessThanOrEqual(reach);
    const bodily = { pos: { ...b.pos }, vel: { ...b.vel }, xi: { ...b.support!.xi }, state: b.support!.state };
    engine.syncHeldSupport();
    expect(grip.broken).not.toBe(true);
    expect(foot.offset).toEqual({ x: 0, y: 0 });
    for (const axis of ['x', 'y'] as const) {
      expect(engine.graspPoint(grip)[axis]).toBeCloseTo(point[axis], 12);
      expect(engine.graspVelocity(grip)[axis]).toBeCloseTo(velocity[axis], 12);
    }
    expect({ pos: b.pos, vel: b.vel, xi: b.support!.xi, state: b.support!.state }).toEqual(bodily);
  });

  it('point velocity and both directional solver masses use the measured material-point derivative', () => {
    const { a, b, world, grips } = stationary(50);
    const grip = grips[0], foot = b.support!.foot!, engine = geometry(world);
    const reach = supportParams(b.profile).comHeight;
    foot.offset = { x: 1.3 * reach, y: .6 * reach };
    foot.desired = { x: .8, y: -.3 }; foot.force = { x: 0, y: 0 };
    // Differentiate the actual World point, not the helper's formula. This
    // checks that contact velocity and mass are wired to the same geometry.
    const epsilon = 1e-6;
    const derivative = (axis: 'x' | 'y'): Vec2 => {
      const coordinate = { ...foot.offset };
      foot.offset = { ...coordinate, [axis]: coordinate[axis] + epsilon };
      const plus = engine.graspPoint(grip);
      foot.offset = { ...coordinate, [axis]: coordinate[axis] - epsilon };
      const minus = engine.graspPoint(grip); foot.offset = { ...coordinate };
      return { x: (plus.x - minus.x) / (2 * epsilon), y: (plus.y - minus.y) / (2 * epsilon) };
    };
    const dx = derivative('x'), dy = derivative('y'), velocity = engine.graspVelocity(grip);
    expect(velocity.x).toBeCloseTo(b.vel.x - a.vel.x + dx.x * foot.desired.x + dy.x * foot.desired.y, 8);
    expect(velocity.y).toBeCloseTo(b.vel.y - a.vel.y + dx.y * foot.desired.x + dy.y * foot.desired.y, 8);
    const h = .05 / 12, row = engine.jointRows(h).find(r => r.joint === grip)!;
    const directionalMass = (nx: number, ny: number) => 1 /
      (1 / a.profile.massKg + 1 / b.profile.massKg + foot.mobility / h *
        ((dx.x * nx + dx.y * ny) ** 2 + (dy.x * nx + dy.y * ny) ** 2));
    expect(row.mn).toBeCloseTo(directionalMass(row.nx, row.ny), 6);
    expect(row.mt).toBeCloseTo(directionalMass(-row.ny, row.nx), 6);
    expect(Math.abs(row.mn - row.mt!)).toBeGreaterThan(.01);

    // Observe a real solve: the same finite-difference derivative must
    // project grip impulse into the common motor and its work ledger.
    const apply = engine.supportImpulse;
    let measured = 0, transmitted = 0;
    const kinetic = () => [a, b].reduce((sum, subject) => sum + .5 * subject.profile.massKg *
      (subject.vel.x ** 2 + subject.vel.y ** 2), 0);
    const motorWork = (px: number, py: number) => -px * (foot.desired.x + foot.mobility * foot.force.x)
      - py * (foot.desired.y + foot.mobility * foot.force.y);
    engine.supportImpulse = function(j, x, y, interval, active, channel) {
      if (j !== grip || measured >= 8) return apply.call(world, j, x, y, interval, active, channel);
      const gx = derivative('x'), gy = derivative('y'), idx = world.indexOf(b);
      const px = engine.footImpulseX[idx], py = engine.footImpulseY[idx];
      const beforeKinetic = kinetic(), beforeMotor = motorWork(px, py), beforePassive = engine.report.passiveGraspWork;
      const fraction = apply.call(world, j, x, y, interval, active, channel);
      const afterX = engine.footImpulseX[idx], afterY = engine.footImpulseY[idx];
      expect(afterX - px).toBeCloseTo(fraction * (gx.x * x + gx.y * y), 8);
      expect(afterY - py).toBeCloseTo(fraction * (gy.x * x + gy.y * y), 8);
      const passive = kinetic() - beforeKinetic - (motorWork(afterX, afterY) - beforeMotor);
      expect(engine.report.passiveGraspWork - beforePassive).toBeCloseTo(passive, 8);
      if (Math.hypot(afterX - px, afterY - py) > 1e-10) transmitted++;
      measured++;
      return fraction;
    };
    grip.reach = 10; // keep this material-point plumbing fixture in holder reach
    const before = momentum(world.bodies), report = world.step([stand, stand], .05);
    physical(world.bodies, before, report);
    expect(measured).toBe(8);
    expect(transmitted).toBeGreaterThan(0);
  });

  it('restoring an acquired nonzero linear attachment converts without moving its point', () => {
    for (const fraction of [.72, .999999]) {
      const { b, world, grips } = stationary(50);
      const grip = grips[0], foot = b.support!.foot!, engine = geometry(world);
      const reach = supportParams(b.profile).comHeight, pointOffset = { x: fraction * reach, y: 0 };
      engine.attachments.set(grip, { share: grip.legs, foot,
        reference: { x: pointOffset.x - grip.legs * foot.offset.x, y: pointOffset.y - grip.legs * foot.offset.y } });
      const point = engine.graspPoint(grip); engine.syncHeldSupport();
      expect(engine.attachments.get(grip)?.bounded).toBe(true);
      expect(grip.broken).not.toBe(true);
      for (const axis of ['x', 'y'] as const) {
        expect(engine.graspPoint(grip)[axis]).toBeCloseTo(point[axis], 12);
        expect(engine.graspPoint(grip)[axis]).toBeCloseTo(b.pos[axis] + pointOffset[axis], 12);
      }
    }
  });

  it('a restored point at the body bound uses an explicit legacy fallback rather than jumping', () => {
    const { b, world, grips } = stationary(50);
    const grip = grips[0], foot = b.support!.foot!, engine = geometry(world);
    const reach = supportParams(b.profile).comHeight;
    engine.attachments.set(grip, { share: grip.legs, foot,
      reference: { x: reach - grip.legs * foot.offset.x, y: -grip.legs * foot.offset.y } });
    const point = engine.graspPoint(grip); engine.syncHeldSupport();
    expect(engine.attachments.get(grip)?.bounded).not.toBe(true);
    for (const axis of ['x', 'y'] as const) expect(engine.graspPoint(grip)[axis]).toBeCloseTo(point[axis], 12);
  });

  it('sustained turning holds remain mirrored and refine without a classification reversal', () => {
    const rows = [12, 24, 48].map(substeps => turning(1, substeps));
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j], mirror = turning(-1, [12, 24, 48][j]);
      expect(row.impulse).toBeGreaterThan(0);
      expect(row.impulse).toBeLessThanOrEqual(348 * .4 + 1e-8);
      expect(row.lowerReleases).toBe(0); expect(mirror.lowerReleases).toBe(0);
      for (let i = 0; i < row.trajectory.length; i++) {
        const a = row.trajectory[i], b = mirror.trajectory[i];
        expect(b.pos.x).toBeCloseTo(a.pos.x, 8); expect(b.pos.y).toBeCloseTo(-a.pos.y, 8);
        expect(b.vel.x).toBeCloseTo(a.vel.x, 8); expect(b.vel.y).toBeCloseTo(-a.vel.y, 8);
        expect(b.xi.x).toBeCloseTo(a.xi.x, 8); expect(b.xi.y).toBeCloseTo(-a.xi.y, 8);
        expect(b.state).toBe(a.state); expect(b.broken).toBe(a.broken);
      }
    }
    const fine = rows[2].trajectory.at(-1)!;
    for (const row of rows.slice(0, 2)) {
      const last = row.trajectory.at(-1)!;
      expect(last.state).toBe(fine.state); expect(last.broken).toBe(fine.broken);
      expect(magnitude({ x: last.pos.x - fine.pos.x, y: last.pos.y - fine.pos.y })).toBeLessThan(.05);
      expect(magnitude({ x: last.vel.x - fine.vel.x, y: last.vel.y - fine.vel.y })).toBeLessThan(.15);
    }
  });

  it('ordinary head-on torso holds and collisions retain their original physical response', () => {
    function run(boundedAttachment: boolean) {
      const a = body(0), b = body(.75);
      a.vel = { x: 4, y: 0 }; b.vel = { x: -3, y: 0 }; b.facing = Math.PI;
      const world = new World([a, b], { substeps: 12, boundedAttachment });
      const grip = hold(a, b, 900, { legs: 0, hold: .75 }); world.joints.push(grip);
      const trajectory: unknown[] = [];
      let impulse = 0;
      for (let tick = 0; tick < 12; tick++) {
        const before = momentum(world.bodies), report = world.step([
          { vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }], .05);
        physical(world.bodies, before, report);
        impulse += (grip.force ?? 0) * .05;
        trajectory.push({ bodies: structuredClone(world.bodies), report: structuredClone(report),
          broken: !!grip.broken, slipping: !!grip.slipping });
      }
      return { trajectory, impulse };
    }
    const off = run(false), candidate = run(true);
    expect(candidate.impulse).toBeGreaterThan(0);
    expect(candidate).toEqual(off);
  });
});
