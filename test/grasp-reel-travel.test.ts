/** Active muscular force must carry the same Newtonian travel as other
 * finite force paths. These short force/travel checks do not calibrate
 * tackles, grip strength, contact loads or support mechanics. */
import { describe, expect, it } from 'vitest';
import { G } from '../src/core/units.js';
import type { Vec2 } from '../src/core/vec.js';
import type { Body } from '../src/physics/kinematics.js';
import { World, type GraspJoint, type Intent } from '../src/physics/world.js';

const TICK = 0.05, DURATION = 0.2, SPEED = 0.7, GAP = 1.2;
const FREE: Intent = { vel: { x: 0, y: 0 }, free: true };

function body(mass: number, x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: SPEED, y: 0 }, facing: 0, energy: 1,
    profile: { massKg: mass, radius: 0.3, reach: 1, heightYd: 2.05,
      vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6,
      shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25,
      power: mass, balance: 0.5, stepSpeed: 3.4, getUp: 0.9 } };
}

function run(force: number, substeps: number, angle = 0, active = true) {
  const rotate = (x: number): Vec2 => ({ x: x * Math.cos(angle), y: x * Math.sin(angle) });
  const bodies = [body(100, 0), body(80, GAP)];
  // The common arm-force law bounds the muscular pull. Keeping the passive
  // grip stronger avoids a slip into leg support, which is a different test.
  bodies[0].profile.power = force / (0.75 * G);
  for (const b of bodies) { b.pos = rotate(b.pos.x); b.vel = rotate(b.vel.x); b.facing = angle; }
  const initial = bodies.map(b => ({ position: { ...b.pos }, velocity: { ...b.vel }, mass: b.profile.massKg }));
  const world = new World(bodies, { substeps });
  const grip: GraspJoint = { kind: 'grasp', a: bodies[0], b: bodies[1], reach: 1.4,
    capacity: 900, legs: 0, pull: active ? 3 : 0 };
  world.joints.push(grip);
  for (let tick = 0; tick < DURATION / TICK; tick++) {
    const report = world.step([FREE, FREE], TICK);
    expect(report.contacts.length).toBe(0);
    expect(report.falls.length + report.downs.length + report.rises.length).toBe(0);
    expect(!!grip.broken).toBe(false);
    expect(!!grip.slipping).toBe(false);
    expect(grip.legs).toBe(0);
    expect(report.armImpulse[0]).toBeCloseTo(active ? force * TICK : 0, 10);
    expect(Math.abs(report.passiveGraspWork)).toBeLessThan(1e-9);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-9);
    for (let i = 0; i < bodies.length; i++) {
      expect(bodies[i].support!.state).toBe('up');
      expect(bodies[i].support!.foot).toBeUndefined();
      expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y)).toBeLessThan(1e-12);
      expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-9);
      expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-9);
    }
  }
  return { bodies, initial, force: active ? force : 0, angle };
}

function assertNewtonian(s: ReturnType<typeof run>) {
  const direction = { x: Math.cos(s.angle), y: Math.sin(s.angle) };
  let px = 0, py = 0, xMoment = 0, yMoment = 0;
  let initialPx = 0, initialPy = 0, expectedXMoment = 0, expectedYMoment = 0;
  const errors: number[] = [];
  for (let i = 0; i < s.bodies.length; i++) {
    const b = s.bodies[i], initial = s.initial[i], signedForce = i === 0 ? s.force : -s.force;
    const acceleration = { x: direction.x * signedForce / initial.mass,
      y: direction.y * signedForce / initial.mass };
    const position = { x: initial.position.x + initial.velocity.x * DURATION + acceleration.x * DURATION ** 2 / 2,
      y: initial.position.y + initial.velocity.y * DURATION + acceleration.y * DURATION ** 2 / 2 };
    const velocity = { x: initial.velocity.x + acceleration.x * DURATION,
      y: initial.velocity.y + acceleration.y * DURATION };
    expect(b.vel.x).toBeCloseTo(velocity.x, 10);
    expect(b.vel.y).toBeCloseTo(velocity.y, 10);
    errors.push(Math.hypot(b.pos.x - position.x, b.pos.y - position.y));
    px += initial.mass * b.vel.x; py += initial.mass * b.vel.y;
    xMoment += initial.mass * b.pos.x; yMoment += initial.mass * b.pos.y;
    initialPx += initial.mass * initial.velocity.x; initialPy += initial.mass * initial.velocity.y;
    expectedXMoment += initial.mass * position.x; expectedYMoment += initial.mass * position.y;
  }
  // Internal reel forces preserve total momentum and centre-of-mass travel.
  expect(px).toBeCloseTo(initialPx, 9); expect(py).toBeCloseTo(initialPy, 9);
  expect(xMoment).toBeCloseTo(expectedXMoment, 9); expect(yMoment).toBeCloseTo(expectedYMoment, 9);
  expect(Math.max(...errors)).toBeLessThan(1e-10);
}

describe('finite torso-reel travel', () => {
  it.each([1, 6])('integrates saturated muscular force exactly with %i substeps', substeps => {
    assertNewtonian(run(200, substeps));
  });

  it('preserves unforced translating travel with a passive torso hold', () => {
    assertNewtonian(run(200, 6, 0, false));
  });

  it.each([0.8, -0.8])('uses the same force/travel relationship after rotating or mirroring by %f radians', angle => {
    assertNewtonian(run(200, 6, angle));
  });

  it('scales motion progressively with the same weak and strong arm capacities', () => {
    const weak = run(20, 6), strong = run(200, 6);
    for (let i = 0; i < weak.bodies.length; i++) {
      const weakDv = weak.bodies[i].vel.x - weak.initial[i].velocity.x;
      const strongDv = strong.bodies[i].vel.x - strong.initial[i].velocity.x;
      expect(strongDv / weakDv).toBeCloseTo(10, 9);
      const inertialX = weak.initial[i].position.x + weak.initial[i].velocity.x * DURATION;
      expect((strong.bodies[i].pos.x - inertialX) / (weak.bodies[i].pos.x - inertialX)).toBeCloseTo(10, 9);
    }
    assertNewtonian(weak);
  });

  it('does not advance a requested reel when another reachable action has exhausted shared arm work', () => {
    const a = body(100, 0), b = body(80, GAP), struck = body(120, -1);
    a.profile.power = 200 / (0.75 * G); struck.vel.x = -6;
    const bodies = [a, b, struck], initial = bodies.map(q => ({ pos: { ...q.pos }, vel: { ...q.vel } }));
    const world = new World(bodies, { substeps: 1 });
    const grip: GraspJoint = { kind: 'grasp', a, b, reach: 1.4, capacity: 900, legs: 0, pull: 3 };
    world.joints.push(grip);
    // Moving the retreating third body costs positive work. The requested
    // strike is clipped by the shared budget before the reel is evaluated.
    world.strike(a, struck, { x: -1000, y: 0 });
    const report = world.step([FREE, FREE, FREE], TICK);
    expect(report.contacts).toHaveLength(0);
    expect(report.falls).toHaveLength(0);
    expect(report.strikes).toHaveLength(1);
    const deliveredStrike = Math.abs(report.strikes[0].impulse.x);
    expect(deliveredStrike).toBeGreaterThan(0);
    expect(deliveredStrike).toBeLessThan(report.armImpulseLimit[0]);
    expect(report.armImpulse[0]).toBeCloseTo(deliveredStrike, 10);
    expect(report.armWork[0]).toBeCloseTo(report.armWorkLimit[0], 10);
    expect(Math.abs(report.work.grasps)).toBeLessThan(1e-10);
    expect(Math.abs(report.passiveGraspWork)).toBeLessThan(1e-10);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(!!grip.broken).toBe(false); expect(!!grip.slipping).toBe(false);
    expect(b.vel.x).toBeCloseTo(initial[1].vel.x, 11);
    for (const [i, q] of bodies.entries()) {
      expect(q.support!.state).toBe('up');
      expect(q.support!.foot).toBeUndefined();
      expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y)).toBeLessThan(1e-12);
      expect(q.pos.x).toBeCloseTo(initial[i].pos.x + (initial[i].vel.x + q.vel.x) * TICK / 2, 11);
      expect(q.pos.y).toBeCloseTo(initial[i].pos.y + (initial[i].vel.y + q.vel.y) * TICK / 2, 11);
    }
  });
});

describe('finite lower-reel body travel', () => {
  it.each([20, 200])('retains Newtonian COM motion with an ordinary moving support coordinate and %i force cap', capacity => {
    const a = body(100, 0), b = body(80, GAP), bodies = [a, b];
    for (const q of bodies) q.vel = { x: 0, y: 0 };
    const world = new World(bodies, { substeps: 6 });
    const grip: GraspJoint = { kind: 'grasp', a, b, reach: 1.4, capacity, legs: 1, pull: 3 };
    world.joints.push(grip);
    // One ordinary standing-controller tick from rest has no planned ground
    // drive. The lower attachment, support mobility, slip and work still
    // evolve normally; a free-ground flag would disable this support motor.
    const stand: Intent = { vel: { x: 0, y: 0 } };
    const report = world.step([stand, stand], TICK);
    expect(world.boundedAttachment).toBe(true);
    expect(report.contacts).toHaveLength(0);
    expect(report.falls.length + report.downs.length + report.rises.length).toBe(0);
    expect(!!grip.broken).toBe(false);
    expect(grip.legs).toBe(1);
    expect(report.armImpulse[0]).toBeCloseTo(capacity * TICK, 10);
    const foot = b.support!.foot!;
    expect(foot).toBeDefined();
    expect(foot.mobility).toBeGreaterThan(0);
    expect(Math.hypot(foot.offset.x, foot.offset.y)).toBeGreaterThan(0);
    expect(Math.hypot(foot.desired.x, foot.desired.y)).toBeLessThan(1e-10);
    expect(report.supportMotorWork[1]).toBeLessThan(0);
    expect(report.armWork[0]).toBeCloseTo(report.work.grasps - report.supportMotorWork[1], 9);
    expect(Math.abs(report.passiveGraspWork)).toBeLessThan(1e-9);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-9);
    const positionErrors: number[] = [];
    for (const [i, q] of bodies.entries()) {
      expect(q.support!.state).toBe('up');
      expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y)).toBeLessThan(1e-10);
      expect(Math.abs(report.groundYawImpulse[i])).toBeLessThan(1e-10);
      expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-9);
      expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-9);
      expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-9);
      const acceleration = (i === 0 ? capacity : -capacity) / q.profile.massKg;
      expect(q.vel.x).toBeCloseTo(acceleration * TICK, 10);
      expect(q.vel.y).toBeCloseTo(0, 10);
      const expectedX = (i === 0 ? 0 : GAP) + acceleration * TICK ** 2 / 2;
      positionErrors.push(Math.hypot(q.pos.x - expectedX, q.pos.y));
    }
    expect(Math.max(...positionErrors)).toBeLessThan(1e-10);
  });
});
