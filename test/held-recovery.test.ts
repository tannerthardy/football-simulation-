/** Production recovery under low holds: the represented force must oppose an
 * attempted correction, with matching reaction and bounded common effort.
 * These fixtures exercise World, rather than a standalone support kernel. */
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

function physical(bodies: Body[], before: Vec2, report: StepReport) {
  const after = momentum(bodies), ground = report.groundImpulse.reduce((sum, p) =>
    ({ x: sum.x + p.x, y: sum.y + p.y }), { x: 0, y: 0 });
  expect(after.x - before.x).toBeCloseTo(ground.x, 9);
  expect(after.y - before.y).toBeCloseTo(ground.y, 9);
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

function stationary(capacity: number | null, count = 1, substeps = 12, gap = 1) {
  const a = body(0), b = body(gap), bodies = [a, b];
  b.support!.xi = { x: .24, y: .04 }; b.support!.out = .12;
  const world = new World(bodies, { substeps });
  // Keep the same contact subdivision even if the tested grasp is absent.
  world.joints.push({ kind: 'hands', a, b, extension: 3, push: 0, hold: 0, steer: 0 });
  const grips = capacity === null ? [] : Array.from({ length: count }, () => hold(a, b, capacity, { hold: gap }));
  world.joints.push(...grips);
  let impulse = 0, motorWork = 0;
  for (let tick = 0; tick < 8; tick++) {
    const before = momentum(bodies), report = world.step([stand, stand], .05);
    physical(bodies, before, report);
    impulse += grips.reduce((sum, j) => sum + (j.force ?? 0) * .05, 0);
    motorWork += report.supportMotorWork[1];
  }
  return { a, b, world, grips, impulse, motorWork };
}

describe('production force-coupled held recovery', () => {
  it('weak, medium and strong holds transmit real force and progressively oppose recovery', () => {
    for (const substeps of [12, 48]) {
      const rows = [1, 50, 900].map(capacity => stationary(capacity, 1, substeps));
      for (let i = 0; i < rows.length; i++) {
        expect(rows[i].impulse).toBeGreaterThan(0);
        expect(rows[i].impulse).toBeLessThanOrEqual([1, 50, 900][i] * .4 + 1e-8);
        if (i > 0) {
          expect(rows[i].impulse).toBeGreaterThan(rows[i - 1].impulse);
          expect(magnitude(rows[i].b.support!.xi)).toBeGreaterThan(magnitude(rows[i - 1].b.support!.xi));
        }
      }
      expect(rows[0].b.support!.state).toBe('up');
      expect(rows[2].b.support!.state).not.toBe('up');
    }
  });

  it('zero-capacity and unreachable low holds follow the same motion as unheld controls', () => {
    for (const substeps of [12, 48]) for (const [capacity, gap] of [[0, 1], [900, 2.2]]) {
      const held = stationary(capacity, 1, substeps, gap), free = stationary(null, 0, substeps, gap);
      expect(held.impulse).toBe(0);
      expect(held.grips[0].broken).toBe(true);
      expect(held.b.support!.foot).toBeUndefined();
      expect(held.b).toEqual(free.b);
      expect(held.a).toEqual(free.a);
    }
  });

  it('a vanishingly weak hold cannot buy a finite recovery restriction', () => {
    const free = stationary(null), weak = stationary(1e-6);
    expect(weak.impulse).toBeLessThanOrEqual(1e-6 * .4 + 1e-10);
    expect(magnitude({ x: weak.b.support!.xi.x - free.b.support!.xi.x,
      y: weak.b.support!.xi.y - free.b.support!.xi.y })).toBeLessThan(.005);
    expect(magnitude({ x: weak.b.pos.x - free.b.pos.x, y: weak.b.pos.y - free.b.pos.y })).toBeLessThan(.005);
  });

  it('free movement, braking, cuts and ordinary hand contact use no held motor', () => {
    const a = body(0), world = new World([a]);
    for (const intent of [{ vel: { x: 7, y: 0 } }, stand, { vel: { x: 0, y: 5 } }]) {
      for (let tick = 0; tick < 10; tick++) {
        const before = momentum([a]), report = world.step([intent], .05);
        physical([a], before, report);
        expect(a.support!.foot).toBeUndefined();
        expect(report.supportMotorWork).toEqual([0]);
        expect(report.supportMotorWorkLimit).toEqual([0]);
      }
    }
    const blocker = body(0), receiver = body(.9), jam = new World([blocker, receiver]);
    jam.joints.push({ kind: 'hands', a: blocker, b: receiver, extension: 1.05, push: 700, hold: 700, steer: 200 });
    for (let tick = 0; tick < 10; tick++) {
      const before = momentum(jam.bodies), report = jam.step([stand, { vel: { x: 5, y: 2 } }], .05);
      physical(jam.bodies, before, report);
      expect(jam.bodies.every(b => !b.support!.foot)).toBe(true);
      expect(report.supportMotorWork).toEqual([0, 0]);
      expect(report.supportMotorWorkLimit).toEqual([0, 0]);
    }
  });

  it('duplicate claims share force and work instead of buying additional recovery restraint', () => {
    for (const capacity of [50, 900]) {
      const one = stationary(capacity), four = stationary(capacity, 4);
      for (const key of ['a', 'b'] as const) {
        expect(four[key].pos.x).toBeCloseTo(one[key].pos.x, 9);
        expect(four[key].pos.y).toBeCloseTo(one[key].pos.y, 9);
        expect(four[key].vel.x).toBeCloseTo(one[key].vel.x, 9);
        expect(four[key].vel.y).toBeCloseTo(one[key].vel.y, 9);
        expect(four[key].support!.xi.x).toBeCloseTo(one[key].support!.xi.x, 9);
      }
      expect(four.impulse).toBeCloseTo(one.impulse, 9);
      expect(four.motorWork).toBeCloseTo(one.motorWork, 9);
    }
  });

  it('sliding a grip and acquiring another holder preserve their attachment positions', () => {
    const left = body(0), runner = body(1), right = body(1, 1), world = new World([left, runner, right]);
    runner.support!.xi = { x: .3, y: .1 }; runner.support!.out = .12;
    const first = hold(left, runner, 20, { legs: .3 });
    world.joints.push(first);
    const before = momentum(world.bodies), report = world.step([stand, stand, stand], .05);
    physical(world.bodies, before, report);
    expect(magnitude(runner.support!.foot!.offset)).toBeGreaterThan(0);
    // Observe attachment geometry at a transition without integrating time.
    const geometry = world as unknown as { graspPoint(j: GraspJoint): Vec2; syncHeldSupport(): void };
    const oldPoint = geometry.graspPoint(first);
    const second = hold(right, runner, 30, { legs: .8 });
    first.legs = .9;
    world.joints.push(second);
    geometry.syncHeldSupport();
    expect(geometry.graspPoint(first).x).toBeCloseTo(oldPoint.x, 12);
    expect(geometry.graspPoint(first).y).toBeCloseTo(oldPoint.y, 12);
    expect(geometry.graspPoint(second).x).toBeCloseTo(runner.pos.x, 12);
    expect(geometry.graspPoint(second).y).toBeCloseTo(runner.pos.y, 12);
    const nextBefore = momentum(world.bodies), next = world.step([stand, stand, stand], .05);
    physical(world.bodies, nextBefore, next);
    expect(first.legs).toBeGreaterThanOrEqual(.9);
    expect(second.legs).toBeGreaterThanOrEqual(.8);
    expect(first.force!).toBeLessThanOrEqual(20 + 1e-8);
    expect(second.force!).toBeLessThanOrEqual(30 + 1e-8);
  });

  it('removing the final low hold retires its coordinate without erasing balance', () => {
    const a = body(0), b = body(1), world = new World([a, b]);
    b.support!.xi = { x: .24, y: .04 }; b.support!.out = .12;
    const grip = hold(a, b, 50);
    world.joints.push(grip);
    world.step([stand, stand], .05);
    expect(b.support!.foot).toBeDefined();
    expect(magnitude(b.support!.xi)).toBeGreaterThan(0);
    world.joints.length = 0;
    const before = momentum(world.bodies), report = world.step([stand, stand], .05);
    physical(world.bodies, before, report);
    expect(b.support!.foot).toBeUndefined();
    expect(report.supportMotorWork).toEqual([0, 0]);
    expect(magnitude(b.support!.xi)).toBeGreaterThan(0);
  });

  it('retiring a hold clears its old diagnostic restraint before the next movement plan', () => {
    const a = body(0), b = body(1), world = new World([a, b], { substeps: 12 });
    b.support!.xi = { x: .5, y: .04 }; b.support!.out = .12;
    world.joints.push(hold(a, b, 50));
    world.step([stand, stand], .05);
    expect(b.support!.feetLock).toBeGreaterThan(0);
    const clones = structuredClone(world.bodies);
    for (const clone of clones) { delete clone.support!.foot; clone.support!.feetLock = 0; }
    const control = new World(clones, { substeps: 12 });
    control.time = world.time;
    // Both cases retain the same neutral joint and solver cadence. The only
    // difference entering this tick is the retired hold's old support record.
    world.joints = [{ kind: 'hands', a, b, extension: 3, push: 0, hold: 0, steer: 0 }];
    control.joints.push({ kind: 'hands', a: clones[0], b: clones[1], extension: 3, push: 0, hold: 0, steer: 0 });
    const intents: Intent[] = [stand, { vel: { x: 4, y: 1 }, posture: .2 }];
    const before = momentum(world.bodies), report = world.step(intents, .05);
    const controlBefore = momentum(control.bodies), controlReport = control.step(intents, .05);
    physical(world.bodies, before, report);
    physical(control.bodies, controlBefore, controlReport);
    expect(world.bodies).toEqual(control.bodies);
    expect(b.support!.foot).toBeUndefined();
    expect(b.support!.feetLock).toBe(0);
  });

  it('standing up while still held keeps the same lower attachment and corrective coordinate', () => {
    const a = body(0), b = body(1), world = new World([a, b], { substeps: 12 });
    b.support!.xi = { x: .24, y: .04 }; b.support!.out = .12;
    const grip = hold(a, b, 50);
    world.joints.push(grip);
    world.step([stand, stand], .05);
    const foot = b.support!.foot!, offset = { ...foot.offset };
    expect(magnitude(offset)).toBeGreaterThan(0);
    const geometry = world as unknown as { graspPoint(j: GraspJoint): Vec2 };
    const attachment = geometry.graspPoint(grip);
    // Place an already stationary held player at the final rising transition.
    // This isolates lifecycle continuity, not the preceding fall trajectory.
    a.vel = b.vel = { x: 0, y: 0 };
    b.support!.state = 'rising';
    b.support!.since = world.time - supportParams(b.profile).getUp - .01;
    const before = momentum(world.bodies), report = world.step([stand, stand], .05);
    physical(world.bodies, before, report);
    expect(report.rises).toContain(1);
    expect(b.support!.state).toBe('up');
    expect(grip.broken).not.toBe(true);
    expect(b.support!.foot).toBe(foot);
    expect(foot.offset.x).toBeCloseTo(offset.x, 12);
    expect(foot.offset.y).toBeCloseTo(offset.y, 12);
    expect(geometry.graspPoint(grip).x).toBeCloseTo(attachment.x, 12);
    expect(geometry.graspPoint(grip).y).toBeCloseTo(attachment.y, 12);
  });

  it('a grip lost at interval end still delivers its solved restraint to balance', () => {
    const a = body(0), b = body(1), world = new World([a, b], { substeps: 12 });
    b.support!.xi = { x: .5, y: .04 }; b.support!.out = .12;
    const grip = hold(a, b, 50, { reach: 1.02 });
    world.joints.push(grip);
    // Observe the balance-consumption boundary. This hold breaks through
    // actual achieved travel, not an injected broken flag or a fake impulse.
    const engine = world as unknown as { updateSupport(i: number, h: number, report: StepReport): void };
    const advance = engine.updateSupport;
    let consumedFinalImpulse = false;
    engine.updateSupport = function(i, h, report) {
      if (i === 1 && grip.broken && !consumedFinalImpulse) {
        expect(report.supportMotorWork[1]).toBeGreaterThan(0);
        expect(b.support!.foot).toBeDefined();
        expect(magnitude(b.support!.foot!.force)).toBeGreaterThan(0);
        consumedFinalImpulse = true;
      }
      advance.call(world, i, h, report);
    };
    const before = momentum(world.bodies), report = world.step([stand, stand], .05);
    physical(world.bodies, before, report);
    expect(grip.broken).toBe(true);
    expect(grip.force!).toBeGreaterThan(0);
    expect(consumedFinalImpulse).toBe(true);
    expect(b.support!.foot).toBeUndefined();
  });

  it('rebasing accumulated correction preserves a reachable small-share hold and its physical state', () => {
    const a = body(0), b = body(1), world = new World([a, b]);
    const grip = hold(a, b, 50, { legs: .1 });
    world.joints.push(grip);
    const report = world.step([stand, stand], .05);
    const foot = b.support!.foot!, reach = supportParams(b.profile).comHeight;
    // Coordinate-only fixture: large accumulated chart travel with a small
    // coupling still leaves the actual held point within physical reach.
    foot.offset = { x: 2 * reach, y: .25 * reach };
    foot.desired = { x: .4, y: .2 }; foot.force = { x: -20, y: 5 };
    b.support!.xi = { x: .2, y: .03 };
    const geometry = world as unknown as {
      graspPoint(j: GraspJoint): Vec2; graspVelocity(j: GraspJoint): Vec2; syncHeldSupport(): void;
    };
    const point = geometry.graspPoint(grip), velocity = geometry.graspVelocity(grip);
    expect(magnitude({ x: point.x - b.pos.x, y: point.y - b.pos.y })).toBeLessThan(reach);
    const bodyState = { pos: { ...b.pos }, vel: { ...b.vel }, energy: b.energy };
    const supportState = structuredClone(b.support!); delete supportState.foot;
    const dynamics = { desired: { ...foot.desired }, achieved: { ...foot.achieved }, force: { ...foot.force },
      capacity: foot.capacity, mobility: foot.mobility, state: foot.state };
    const work = structuredClone({ ledger: report.work, motor: report.supportMotorWork, arms: report.armWork });
    geometry.syncHeldSupport();
    expect(grip.broken).not.toBe(true);
    expect(report.lowerHoldReleases).toBe(0);
    expect(b.support!.foot).toBe(foot);
    expect(foot.offset).toEqual({ x: 0, y: 0 });
    expect(geometry.graspPoint(grip).x).toBeCloseTo(point.x, 12);
    expect(geometry.graspPoint(grip).y).toBeCloseTo(point.y, 12);
    expect(geometry.graspVelocity(grip).x).toBeCloseTo(velocity.x, 12);
    expect(geometry.graspVelocity(grip).y).toBeCloseTo(velocity.y, 12);
    expect({ pos: b.pos, vel: b.vel, energy: b.energy }).toEqual(bodyState);
    const afterSupport = structuredClone(b.support!); delete afterSupport.foot;
    expect(afterSupport).toEqual(supportState);
    expect({ desired: foot.desired, achieved: foot.achieved, force: foot.force,
      capacity: foot.capacity, mobility: foot.mobility, state: foot.state }).toEqual(dynamics);
    expect({ ledger: report.work, motor: report.supportMotorWork, arms: report.armWork }).toEqual(work);
  });

  it('unreachable held corrective state releases rather than clamping or forcing a fall', () => {
    const a = body(0), b = body(1), world = new World([a, b]);
    const grip = hold(a, b, 50);
    world.joints.push(grip);
    world.step([stand, stand], .05);
    const foot = b.support!.foot!, reach = supportParams(b.profile).comHeight;
    // Synthetic invalid-state lifecycle fixture: not a repeated-hit or force
    // measurement. The retired coordinate must remain visibly invalid.
    foot.offset = { x: reach + .1, y: 0 };
    b.support!.xi = { x: .05, y: 0 };
    const before = momentum(world.bodies), report = world.step([stand, stand], .05);
    physical(world.bodies, before, report);
    expect(report.lowerHoldReleases).toBe(1);
    expect(report.maxHeldRecoveryExcursion).toBeGreaterThan(reach);
    expect(grip.broken).toBe(true);
    expect(grip.force).toBe(0);
    expect(b.support!.foot).toBeUndefined();
    expect(magnitude(foot.offset)).toBeGreaterThan(reach);
    expect(b.support!.state).toBe('up');
    expect(b.support!.xi.x).toBeGreaterThan(0);
  });
});
