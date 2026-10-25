import { describe, expect, it } from 'vitest';
import { newInertialSupport, solveInertialSupportInterval, inertialSupportEnergy, torsoPosition, torsoVelocity } from '../../src/physics/inertial-support.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
  brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3, reactReach: 2.6,
  reactionTime: .25, power: 100, balance: .5 };
const zero = () => ({ x: 0, y: 0 });
const body = (x = 0) => newInertialSupport(profile, { x, y: 0 }, { footMassFractions: [.015, .015] });
describe('inertial support midpoint mechanics', () => {
  it('retains unopposed sprint COM velocity and full kinetic energy with stationary feet and no motor', () => {
    const b = body(); b.velocity.x = 7;
    const before = inertialSupportEnergy(b), r = solveInertialSupportInterval([b], [], .01, [[zero(), zero()]]);
    expect(r.converged).toBe(true); expect(b.velocity.x).toBe(7);
    expect(inertialSupportEnergy(b)).toBeCloseTo(before, 10); expect(r.motorWork).toBe(0);
    expect(r.groundImpulse[0].x).toBeCloseTo(0, 12);
  });
  it('shares finite physical leg force without imposing a free velocity or creating COM momentum', () => {
    const b = body(); b.traction = 0;
    const r = solveInertialSupportInterval([b], [], .001, [[{ x: 1e6, y: 0 }, { x: 0, y: 1e6 }]]);
    expect(r.converged).toBe(true); expect(r.commandForce[0]).toBeCloseTo(b.legForce, 9);
    expect(b.velocity).toEqual(zero()); expect(b.footVelocity[0].x).toBeGreaterThan(0);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
  });
  it('transmits planted leg force as explicit ground reaction and the correct total COM acceleration', () => {
    const b = body(); b.traction = 1e6;
    const force = 80, dt = .01;
    const r = solveInertialSupportInterval([b], [], dt, [[{ x: -force, y: 0 }, zero()]]);
    expect(r.converged).toBe(true);
    // Midpoint sticking feet have zero endpoint velocity from a resting start.
    expect(b.footVelocity[0].x).toBeCloseTo(0, 10);
    expect(b.footVelocity[1].x).toBeCloseTo(0, 10);
    const torsoMass = b.mass - b.footMass[0] - b.footMass[1];
    expect(b.velocity.x / dt).toBeCloseTo(force / b.mass, 10);
    expect(torsoVelocity(b).x / dt).toBeCloseTo(force / torsoMass, 10);
    expect(r.groundImpulse[0].x).toBeCloseTo(b.mass * b.velocity.x, 10);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
  });
  it('slips at prescribed traction, conserves momentum and records passive loss', () => {
    const b = body(); b.velocity.x = 2; b.footVelocity.forEach(v => { v.x = 2; }); b.traction = 10;
    const r = solveInertialSupportInterval([b], [], .01, [[zero(), zero()]]);
    expect(r.converged).toBe(true); expect(b.footVelocity[0].x).toBeGreaterThan(0);
    expect(Math.hypot(r.groundImpulse[0].x, r.groundImpulse[0].y)).toBeLessThanOrEqual(.1 + 1e-12);
    expect(r.groundWork).toBeLessThan(0); expect(Math.hypot(r.momentumResidual.x, r.momentumResidual.y)).toBeLessThan(1e-9);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
  });
  it('enforces finite reach with a passive relative impulse before integration', () => {
    const b = body(); b.traction = 0;
    b.slots[0].position = { x: (b.reach - .01) * (b.mass - b.footMass[0] - b.footMass[1]) / (b.mass - b.footMass[1]), y: 0 };
    b.footVelocity[0].x = 3;
    const r = solveInertialSupportInterval([b], [], .02, [[zero(), zero()]]);
    expect(r.converged).toBe(true); expect(r.slotReachImpulse[0][0].x).toBeLessThan(0);
    expect(r.maxReachViolation).toBeLessThan(1e-9); expect(r.reachWork).toBeLessThanOrEqual(1e-9);
    expect(b.velocity).toEqual(zero()); expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
  });
  it('reflects grip/ground coupling and closes whole-system work and COM momentum', () => {
    const run = (side: number) => {
      const a = body(), b = body(.7); b.velocity.y = side; b.footVelocity.forEach(v => { v.y = side; });
      for (const player of [a, b]) { player.traction = 0; for (const f of player.slots) f.position.y *= side; }
      const r = solveInertialSupportInterval([a, b], [{ a: { body: 0, slot: 0, share: .5 }, b: { body: 1, slot: 0, share: 1 }, capacity: 100, holdDistance: .7, reach: 2 }], .01, [[zero(), zero()], [zero(), zero()]]);
      expect(r.converged).toBe(true); expect(r.maxPassiveWork).toBeLessThan(1e-8);
      expect(Math.abs(r.workResidual)).toBeLessThan(1e-9); expect(Math.hypot(r.momentumResidual.x, r.momentumResidual.y)).toBeLessThan(1e-9);
      return [a, b];
    };
    const left = run(1), right = run(-1);
    left.forEach((b, i) => { expect(b.position.x).toBeCloseTo(right[i].position.x, 10); expect(b.position.y).toBeCloseTo(-right[i].position.y, 10); });
  });
  it('applies external torso impulses to material torso mass and preserves mass-weighted geometry', () => {
    const b = body(); b.traction = 0;
    const r = solveInertialSupportInterval([b], [], .01, [[zero(), zero()]], [{ x: 1, y: .2 }]);
    const torsoMass = b.mass - b.footMass[0] - b.footMass[1];
    expect(r.converged).toBe(true); expect(torsoVelocity(b).x).toBeCloseTo(1 / torsoMass, 12);
    expect(b.footVelocity[0].x).toBeCloseTo(0, 12); expect(b.footVelocity[1].x).toBeCloseTo(0, 12);
    const torso = torsoPosition(b);
    expect((torso.x * torsoMass + b.slots[0].position.x * b.footMass[0] + b.slots[1].position.x * b.footMass[1]) / b.mass).toBeCloseTo(b.position.x, 12);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-10);
  });
  it('uses material foot mass and actual torso-to-foot reach rather than total COM reach', () => {
    const b = body(); b.traction = 0;
    b.slots[0].position.x = .99 * b.reach;
    expect(Math.hypot(b.slots[0].position.x - b.position.x, b.slots[0].position.y - b.position.y)).toBeLessThan(b.reach);
    expect(() => solveInertialSupportInterval([b], [], .01, [[zero(), zero()]])).toThrow('Initial reach violation');
    const grounded = body(); grounded.traction = 1e6;
    grounded.footVelocity[0].x = 1;
    const r = solveInertialSupportInterval([grounded], [], .001, [[zero(), zero()]]);
    expect(r.converged).toBe(true);
    expect(r.slotGroundImpulse[0][0].x).toBeCloseTo(-2 * grounded.footMass[0], 10);
    expect(r.slotGroundImpulse[0][1].x).toBeCloseTo(0, 10);
  });
  it('keeps tangential reach crossings central at the material midpoint and passively closes work', () => {
    const b = body(); b.traction = 0;
    b.slots[0].position = { x: .95 * b.reach * (b.mass - b.footMass[0] - b.footMass[1]) / (b.mass - b.footMass[1]), y: 0 };
    b.footVelocity[0] = { x: 3, y: 2 };
    const r = solveInertialSupportInterval([b], [], .05, [[zero(), zero()]]);
    expect(r.converged).toBe(true); expect(r.reachWork).toBeLessThan(0);
    expect(r.maxReachViolation).toBeLessThan(1e-9);
    expect(r.unrepresentedAngularImpulse.reach).toBeCloseTo(0, 10);
    expect(r.angularMomentumAfter).toBeCloseTo(r.angularMomentumBefore, 10);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
  });
  it('closes noncentral motor torque through a real torso rotor and includes its work', () => {
    const b = body(); b.traction = 0;
    const r = solveInertialSupportInterval([b], [], .001, [[{ x: 80, y: 0 }, zero()]]);
    expect(r.converged).toBe(true);
    expect(Math.abs(r.motorReactionAngularImpulse[0][0])).toBeGreaterThan(.001);
    expect(b.angularVelocity).not.toBe(0); expect(r.rotorWork).toBeGreaterThan(0);
    expect(r.angularMomentumAfter).toBeCloseTo(r.angularMomentumBefore, 12);
    expect(r.angularMomentumResidual).toBeCloseTo(0, 12);
    expect(r.slotMotorWork[0].reduce((sum, w) => sum + w, 0)).toBeCloseTo(r.motorWorkByBody[0], 12);
    expect(r.physicalLegImpulse[0][0].x).toBeCloseTo(.08, 12);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-10);
  });
  it('accounts for noncentral actuator rotational work under initial spin', () => {
    const b = body(); b.traction = 0; b.angularVelocity = 2;
    const before = inertialSupportEnergy(b), dt = .001;
    const r = solveInertialSupportInterval([b], [], dt, [[{ x: 80, y: 0 }, zero()]]);
    const impulse = r.motorReactionAngularImpulse[0].reduce((sum, torque) => sum + torque, 0);
    expect(r.rotorWork).toBeCloseTo(impulse * (2 + b.angularVelocity) / 2, 12);
    expect(b.angle).toBeCloseTo(dt * (2 + b.angularVelocity) / 2, 12);
    expect(inertialSupportEnergy(b) - before).toBeCloseTo(r.motorWork, 12);
    expect(r.angularMomentumAfter).toBeCloseTo(r.angularMomentumBefore, 12);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-10);
  });
  it('applies finite kinetic friction until the actual foot stop without endpoint reversal', () => {
    const b = body(); b.velocity.x = 1; b.footVelocity.forEach(v => { v.x = 1; });
    b.traction = 300; b.slots[0].load = 1; b.slots[1].load = 0;
    const dt = b.footMass[0] / b.traction;
    const r = solveInertialSupportInterval([b], [], dt, [[zero(), zero()]], undefined,
      { slidingDirections: [[{ x: 1, y: 0 }, null]], staticGround: 'endpoint' });
    expect(r.converged).toBe(true); expect(b.footVelocity[0].x).toBeCloseTo(0, 12);
    expect(r.slotGroundImpulse[0][0].x).toBeCloseTo(-b.footMass[0], 12);
    expect(r.groundWork).toBeCloseTo(-.5 * b.footMass[0], 12);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-10);
    expect(r.slotEndVelocity[0][0].x).toBeCloseTo(0, 12);
  });
  it('keeps an initially static plant at endpoint zero under a finite motor force', () => {
    const b = body(); b.traction = 1e6;
    const r = solveInertialSupportInterval([b], [], .001, [[{ x: -80, y: 0 }, zero()]], undefined,
      { slidingDirections: [[null, null]], staticGround: 'endpoint' });
    expect(r.converged).toBe(true); expect(b.footVelocity[0].x).toBeCloseTo(0, 12);
    expect(b.footVelocity[1].x).toBeCloseTo(0, 12);
    expect(r.groundWork).toBeCloseTo(0, 12); expect(r.maxPassiveWork).toBeLessThan(1e-9);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-10);
  });
  it('resolves midpoint sliding friction against actual two-dimensional slip rather than the frozen direction', () => {
    const b = body(); b.velocity = { x: 1, y: 2 }; b.footVelocity.forEach(v => { v.x = 1; v.y = 2; });
    b.traction = 10; b.slots[0].load = 1; b.slots[1].load = 0;
    const r = solveInertialSupportInterval([b], [], .01, [[zero(), zero()]], undefined,
      { slidingDirections: [[{ x: 1, y: 0 }, null]], slidingFriction: 'midpoint', staticGround: 'endpoint' });
    const j = r.slotGroundImpulse[0][0];
    expect(r.converged).toBe(true);
    expect(Math.hypot(j.x, j.y)).toBeCloseTo(.1, 12);
    expect(j.y / j.x).toBeCloseTo(2, 12);
    expect(r.maxPassiveGroundWork).toBe(0);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-10);
  });
  it('rejects a frozen sliding direction that creates positive ground work past the stop', () => {
    const b = body(); b.velocity.x = 1; b.footVelocity.forEach(v => { v.x = 1; });
    b.traction = 300; b.slots[0].load = 1; b.slots[1].load = 0;
    const r = solveInertialSupportInterval([b], [], .02, [[zero(), zero()]], undefined,
      { slidingDirections: [[{ x: 1, y: 0 }, null]], staticGround: 'endpoint' });
    expect(r.groundWork).toBeGreaterThan(0); expect(r.converged).toBe(false);
    expect(r.projectedReversals[0][0]).toBe(true);
    expect(r.groundStopping[0][0]).toBe(false);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
  });
  it('solves a strongly coupled held static plant without multiplying grip or traction capacity', () => {
    const run = (coupledUpdates: boolean) => {
      const a = body(-.7), b = body();
      a.position.y = -.12041666666666666;
      a.slots.forEach(f => { f.position.y += a.position.y; });
      a.velocity.y = 1; a.footVelocity.forEach(v => { v.y = 1; });
      a.traction = 0; b.traction = 1e6;
      const grip = { a: { body: 0, slot: 0 as const, share: 0 }, b: { body: 1, slot: 0 as const, share: 1 },
        capacity: 1e6, holdDistance: .7, reach: 2 };
      const r = solveInertialSupportInterval([a, b], [grip], .01, [[zero(), zero()], [zero(), zero()]], undefined,
        { staticGround: 'endpoint', coupledUpdates });
      return { b, r };
    };
    const next = run(true), old = run(false);
    expect(next.r.converged).toBe(true); expect(next.r.coupledUpdates).toBeGreaterThan(0);
    expect(old.r.converged).toBe(false);
    expect(next.b.footVelocity[0].y).toBeCloseTo(0, 9);
    next.r.slotGroundImpulse[1].forEach((impulse, f) => {
      expect(Math.hypot(impulse.x, impulse.y)).toBeLessThanOrEqual(next.b.traction * next.b.slots[f].load * .01);
    });
    expect(next.r.maxPassiveWork).toBeLessThan(1e-7);
    expect(Math.abs(next.r.workResidual)).toBeLessThan(1e-9);
    expect(Math.hypot(next.r.momentumResidual.x, next.r.momentumResidual.y)).toBeLessThan(1e-9);
  });
  it('solves a central tether coupled to static ground with both finite disks respected', () => {
    for (const traction of [25, 1e6]) for (const capacity of [10, 1e6]) {
      const a = body(-.7), b = body();
      a.position.y = -.12041666666666666;
      a.slots.forEach(f => { f.position.y += a.position.y; });
      a.velocity.y = 1; a.footVelocity.forEach(v => { v.y = 1; });
      a.traction = 0; b.traction = traction;
      const grip = { a: { body: 0, slot: 0 as const, share: 0 }, b: { body: 1, slot: 0 as const, share: 1 },
        capacity, holdDistance: .7, reach: 2 };
      const r = solveInertialSupportInterval([a, b], [grip], .01, [[zero(), zero()], [zero(), zero()]], undefined,
        { staticGround: 'endpoint', gripModel: 'tether' });
      expect(r.converged).toBe(true); expect(r.coupledUpdates).toBeGreaterThan(0);
      r.slotGroundImpulse[1].forEach((j, f) => {
        expect(Math.hypot(j.x, j.y)).toBeLessThanOrEqual(traction * b.slots[f].load * .01);
      });
      expect(r.maxUncappedHoldDistanceViolation).toBeLessThan(1e-7);
      expect(r.maxPassiveGroundWork).toBeLessThan(1e-7);
      expect(r.maxPassiveGripWork).toBeLessThan(1e-7);
      expect(r.maxPassiveReachWork).toBeLessThan(1e-7);
      expect(Math.abs(r.unrepresentedAngularImpulse.grip)).toBeLessThan(1e-9);
      expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
      expect(Math.hypot(r.momentumResidual.x, r.momentumResidual.y)).toBeLessThan(1e-9);
    }
  });
  it('rejects a boundary tether crossing through the origin rather than reflecting the endpoint', () => {
    const a = body(), b = body(1); a.traction = 0; b.traction = 1e6;
    // Torso-to-captured-foot geometry is exactly (1,0), and the free
    // endpoint passes the opposite side of that unit disk in this interval.
    a.position.y = b.slots[0].position.y;
    a.slots.forEach(f => { f.position.y += a.position.y; });
    a.velocity.x = 3; a.footVelocity.forEach(v => { v.x = 3; });
    const grip = { a: { body: 0, slot: 0 as const, share: 0 }, b: { body: 1, slot: 0 as const, share: 1 },
      capacity: 1e6, holdDistance: 1, reach: 2 };
    expect(() => solveInertialSupportInterval([a, b], [grip], 1, [[zero(), zero()], [zero(), zero()]], undefined,
      { staticGround: 'endpoint', gripModel: 'tether' })).toThrow(/shorter physical interval/);
  });
  it('uses a central tether for transverse motion without endpoint stretch or hidden grip torque', () => {
    const a = body(), b = body(.7); a.traction = b.traction = 0;
    b.velocity.y = 3; b.footVelocity.forEach(v => { v.y = 3; });
    const grip = { a: { body: 0, slot: 0 as const, share: 0 }, b: { body: 1, slot: 0 as const, share: 0 },
      capacity: 1e6, holdDistance: .7, reach: 2 };
    const r = solveInertialSupportInterval([a, b], [grip], .02, [[zero(), zero()], [zero(), zero()]], undefined, { gripModel: 'tether' });
    const pa = torsoPosition(a), pb = torsoPosition(b);
    expect(r.converged).toBe(true); expect(r.gripModel).toBe('tether'); expect(r.gripSlips[0]).toBe(false);
    expect(Math.hypot(pb.x - pa.x, pb.y - pa.y)).toBeLessThanOrEqual(.7 + 1e-10);
    expect(pb.y - pa.y).toBeGreaterThan(0);
    expect(r.unrepresentedAngularImpulse.grip).toBeCloseTo(0, 10);
    expect(r.angularMomentumAfter).toBeCloseTo(r.angularMomentumBefore, 10);
    expect(r.maxUncappedHoldDistanceViolation).toBeLessThan(1e-10);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
  });
  it('ratchets a genuinely capped slipping tether and records delivered work even when it breaks at the interval end', () => {
    const a = body(), b = body(.7); a.traction = b.traction = 0;
    b.velocity.x = 3; b.footVelocity.forEach(v => { v.x = 3; });
    const grip = { a: { body: 0, slot: 0 as const, share: 0 }, b: { body: 1, slot: 0 as const, share: 0 },
      capacity: 1, holdDistance: .7, reach: .72, broken: false };
    const r = solveInertialSupportInterval([a, b], [grip], .02, [[zero(), zero()], [zero(), zero()]], undefined, { gripModel: 'tether' });
    expect(r.converged).toBe(true); expect(r.gripSlips[0]).toBe(true);
    expect(r.maxHoldDistanceViolation).toBeGreaterThan(.05);
    expect(r.maxUncappedHoldDistanceViolation).toBe(0);
    expect(grip.holdDistance).toBeGreaterThan(.75); expect(grip.broken).toBe(true);
    expect(r.gripBrokenAtEnd[0]).toBe(true); expect(r.gripWork).toBeLessThan(0);
    expect(r.unrepresentedAngularImpulse.grip).toBeCloseTo(0, 12);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-9);
  });
});
