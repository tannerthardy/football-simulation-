import { describe, expect, it } from 'vitest';
import { loadedSupport, newFiniteSupport, requestSupportStep, solveSupportInterval, stepFiniteSupport, SupportSolveError,
  type FiniteSupportBody, type SupportGrip, type SupportIntervalReport } from '../../src/physics/finite-support.js';
import type { Vec2 } from '../../src/core/vec.js';

const profile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
  brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3,
  reactReach: 2.6, reactionTime: .25, power: 100, balance: .5, bend: .5, stepSpeed: 3.4 };
const zero = (): Vec2 => ({ x: 0, y: 0 });
function singlePlant(x = 0): FiniteSupportBody {
  const b = newFiniteSupport(profile, { x, y: 0 });
  b.slots[0].load = 1; b.slots[1].load = 0; b.slots[1].mode = 'swing';
  return b;
}
function contracts(r: SupportIntervalReport) {
  expect(r.converged).toBe(true);
  expect(Math.abs(r.workResidual)).toBeLessThan(1e-7);
  expect(Math.hypot(r.momentumResidual.x, r.momentumResidual.y)).toBeLessThan(1e-7);
  expect(r.maxReachViolation).toBeLessThan(1e-7);
  expect(r.maxPassiveWork).toBeLessThan(1e-7);
  expect(Math.max(...r.tractionFraction)).toBeLessThanOrEqual(1 + 1e-9);
  expect(Math.max(...r.commandFraction)).toBeLessThanOrEqual(1 + 1e-9);
  r.motorWorkByBody.forEach((w, i) => expect(w).toBeLessThanOrEqual(r.motorWorkLimit[i] + 1e-7));
}

describe('finite massless support research kernel', () => {
  it('matches the independent one-plant midpoint reaction and keeps a supported point world-fixed', () => {
    const b = singlePlant(); b.velocity.x = 1;
    const plant = { ...b.slots[0].position }, dt = .025;
    const expectedGround = -1 / (.5 / b.mass + b.mobility / dt);
    const r = solveSupportInterval([b], [], dt, [[zero(), zero()]]);
    contracts(r);
    expect(r.groundImpulse[0].x).toBeCloseTo(expectedGround, 9);
    expect(b.velocity.x).toBeCloseTo(1 + expectedGround / b.mass, 9);
    expect(b.slots[0].position.x).toBeCloseTo(plant.x, 10);
    expect(b.slots[0].position.y).toBeCloseTo(plant.y, 10);
    expect(Math.abs(r.groundWork)).toBeLessThan(1e-8);
    expect(r.motorWork).toBeLessThan(0);
  });

  it('slips through the shared ground-force cap rather than retaining an impossible fixed plant', () => {
    const b = singlePlant(); b.velocity.x = 1; b.traction = 10;
    const plant = { ...b.slots[0].position };
    const r = solveSupportInterval([b], [], .025, [[zero(), zero()]]);
    contracts(r);
    expect(r.groundImpulse[0].x).toBeCloseTo(-.25, 10);
    expect(b.slots[0].position.x).toBeGreaterThan(plant.x);
    expect(r.groundWork).toBeLessThan(0);
    expect(r.tractionFraction[0]).toBeCloseTo(1, 10);
  });

  it('limits finite reach with a transmitted reaction before integration, not a position reset', () => {
    const b = singlePlant(), before = { ...b.slots[1].position };
    const r = solveSupportInterval([b], [], 1, [[zero(), { x: 100, y: 0 }]]);
    contracts(r);
    expect(r.slotReachImpulse[0][1].x).toBeLessThan(0);
    expect(b.slots[1].position.x).toBeCloseTo(before.x + r.slotMeanVelocity[0][1].x, 10);
    expect(Math.hypot(b.slots[1].position.x - b.position.x, b.slots[1].position.y - b.position.y)).toBeCloseTo(b.reach, 10);
    expect(r.reachWork).toBeLessThan(0);
    expect(r.maxStiffnessRatio).toBeGreaterThan(1); // explicitly diagnostic, not a readiness pass
  });

  it('shares independent speed, force and work limits even when compliance is varied', () => {
    const b = newFiniteSupport(profile, zero());
    b.mobility = 1; b.legForce = 100; b.stepSpeed = 1; b.traction = 100;
    const r = solveSupportInterval([b], [], .01, [[{ x: 100, y: 0 }, { x: -100, y: 0 }]]);
    contracts(r);
    expect(r.motorWork).toBeLessThanOrEqual(r.motorWorkLimit[0] + 1e-7);
    expect(r.commandFraction[0]).toBeLessThan(1);
  });

  it('opposes an attempted swing progressively with finite grips and a movable holder', () => {
    const rows = [0, 50, 200, 900].map(capacity => {
      const a = singlePlant(0), b = singlePlant(1);
      const g: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 1, share: 1 },
        capacity, holdDistance: Math.hypot(1, b.slots[1].position.y), reach: 2 };
      const r = solveSupportInterval([a, b], [g], .05, [[zero(), zero()], [zero(), { x: 2, y: 0 }]]);
      contracts(r);
      return { a, b, r };
    });
    for (let i = 1; i < rows.length; i++) expect(rows[i].b.slots[1].position.x).toBeLessThan(rows[i - 1].b.slots[1].position.x);
    expect(rows[3].a.velocity.x).toBeGreaterThan(0);
    expect(rows[3].b.velocity.x).toBeLessThan(0);
  });

  it('zero active effort retains passive compliance, rather than becoming a rigid leg lock', () => {
    const a = singlePlant(0), b = singlePlant(1); a.velocity.x = -3; b.legForce = 0;
    const g: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 1, share: 1 },
      capacity: 900, holdDistance: Math.hypot(1, b.slots[1].position.y), reach: 2 };
    const r = solveSupportInterval([a, b], [g], .01, [[zero(), zero()], [zero(), { x: 3, y: 0 }]]);
    contracts(r);
    expect(r.commandFraction[1]).toBe(0);
    expect(r.motorWorkLimit[1]).toBe(0);
    expect(b.slots[1].position.x).toBeLessThan(1);
    expect(r.motorWorkByBody[1]).toBeLessThan(0);
  });

  it('does not credit unloaded swing and transfers only achieved contact without changing slot identities', () => {
    const b = newFiniteSupport(profile, zero(), { transferTime: .06 }), foot = b.slots[0];
    requestSupportStep(b, 0, { x: .5, y: foot.position.y });
    let sawSwing = false, sawLanding = false, maxForwardSwing = 0;
    for (let i = 0; i < 40; i++) {
      const beforeMode = foot.mode;
      const reps = stepFiniteSupport([b], [], .01);
      reps.forEach(contracts);
      expect(b.slots[0]).toBe(foot);
      expect(b.slots[0].load + b.slots[1].load).toBeCloseTo(1, 12);
      if (foot.mode === 'swing') {
        sawSwing = true; expect(foot.load).toBe(0);
        maxForwardSwing = Math.max(maxForwardSwing, loadedSupport(b)!.x);
      }
      if (beforeMode === 'swing' && foot.mode === 'plant') {
        sawLanding = true;
        expect(foot.elapsed).toBeGreaterThanOrEqual(b.minimumSwingTime - 1e-10);
        expect(foot.position.x).toBeCloseTo(.5, 6);
        // The exact landing boundary carries no load; the remainder of
        // this tick may already start transferring weight onto the plant.
        expect(foot.load).toBeLessThanOrEqual(.01 / b.transferTime + 1e-10);
        expect(reps.some(r => r.normalShares[0][0] === 0)).toBe(true);
      }
    }
    expect(sawSwing).toBe(true); expect(sawLanding).toBe(true);
    expect(maxForwardSwing).toBeLessThan(1e-7);
    expect(foot.load).toBeCloseTo(1, 10);
    expect(loadedSupport(b)!.x).toBeCloseTo(.5, 6);
  });

  it('splits the actual stroke boundary so tick partition cannot delay an unopposed landing', () => {
    const run = (tick: number) => {
      const b = newFiniteSupport(profile, zero());
      requestSupportStep(b, 0, { x: .45, y: b.slots[0].position.y });
      for (let time = 0; time < .4 - 1e-12; time += tick) stepFiniteSupport([b], [], Math.min(tick, .4 - time)).forEach(contracts);
      return b;
    };
    const coarse = run(.4), fine = run(.01);
    expect(coarse.slots[0].mode).toBe('plant');
    expect(coarse.slots[0].load).toBeCloseTo(fine.slots[0].load, 10);
    expect(coarse.slots[0].load).toBeCloseTo(1, 10);
    expect(coarse.slots[0].position.x).toBeCloseTo(fine.slots[0].position.x, 10);
  });

  it('a held corrective step lands short and credits its actual position, retaining the captured slot', () => {
    const a = newFiniteSupport(profile, { x: 0, y: 0 }), b = newFiniteSupport(profile, { x: 1, y: 0 });
    const foot = b.slots[0], capture = foot.id;
    const grip: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: capture, share: 1 },
      capacity: 900, holdDistance: Math.hypot(1, foot.position.y), reach: 2 };
    requestSupportStep(b, capture, { x: 1.5, y: foot.position.y });
    for (let tick = 0; tick < 50; tick++) stepFiniteSupport([a, b], [grip], .01).forEach(contracts);
    expect(foot.mode).toBe('plant'); expect(foot.load).toBeCloseTo(1, 10);
    expect(grip.b.slot).toBe(capture); expect(b.slots[capture]).toBe(foot);
    expect(foot.placement!.miss.x).toBeLessThan(-.01);
    expect(foot.placement!.actual.x).toBeLessThan(foot.placement!.target.x);
    expect(loadedSupport(b)!.x).toBeCloseTo(foot.position.x, 10);
  });

  it('prevalidates all reach failures before dividing a holder grip budget', () => {
    const run = (reverse: boolean) => {
      const a = singlePlant(0), b = singlePlant(1);
      const good: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 1, share: 1 },
        capacity: 50, holdDistance: Math.hypot(1, b.slots[1].position.y), reach: 2 };
      const bad = { ...good, reach: .1, a: { ...good.a }, b: { ...good.b } };
      const r = solveSupportInterval([a, b], reverse ? [bad, good] : [good, bad], .01,
        [[zero(), zero()], [zero(), { x: 2, y: 0 }]]);
      contracts(r); expect(bad.broken).toBe(true);
      return { a, b, r };
    };
    const a = run(false), b = run(true);
    expect(a.a.velocity).toEqual(b.a.velocity); expect(a.b.velocity).toEqual(b.b.velocity);
    expect(a.r.gripWork).toBe(b.r.gripWork);
  });

  it('preserves reflection of simultaneous ground and grip reactions', () => {
    const run = (side: number) => {
      const a = singlePlant(0), b = singlePlant(1);
      for (const body of [a, b]) {
        body.position.y *= side;
        for (const f of body.slots) for (const v of [f.position, f.target, f.restOffset]) v.y *= side;
      }
      const g: SupportGrip = { a: { body: 0, slot: 0, share: .5 }, b: { body: 1, slot: 1, share: 1 },
        capacity: 900, holdDistance: .8, reach: 2 };
      const r = solveSupportInterval([a, b], [g], .01, [[zero(), { x: -1, y: side }], [zero(), { x: 2, y: side }]]);
      contracts(r); return { a, b, r };
    };
    const p = run(1), m = run(-1);
    for (const key of ['a', 'b'] as const) {
      expect(p[key].position.x).toBeCloseTo(m[key].position.x, 10);
      expect(p[key].position.y).toBeCloseTo(-m[key].position.y, 10);
    }
    expect(p.r.motorWork).toBeCloseTo(m.r.motorWork, 9);
    expect(p.r.gripWork).toBeCloseTo(m.r.gripWork, 9);
  });

  it('reports an exhausted solve rather than describing unchecked constraints as converged', () => {
    const a = singlePlant(0), b = singlePlant(1);
    const g: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 1, share: 1 },
      capacity: 900, holdDistance: 1, reach: 2 };
    const r = solveSupportInterval([a, b], [g], .05, [[zero(), zero()], [zero(), { x: 2, y: 0 }]], undefined, { maxIterations: 1 });
    expect(r.converged).toBe(false);
    expect(r.iterations).toBe(1);
    expect(r.maxImpulseChange).toBeGreaterThan(1e-9);
    expect(Math.abs(r.workResidual)).toBeLessThan(1e-7);
  });

  it('a failed phase tick rolls back loads, placement and grips without replacing captured slots', () => {
    const a = newFiniteSupport(profile, zero()), b = newFiniteSupport(profile, { x: 1, y: 0 });
    a.velocity.x = 1;
    const g: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 0, share: 1 },
      capacity: 900, holdDistance: 1, reach: .1 };
    requestSupportStep(b, 0, { x: 1.5, y: b.slots[0].position.y });
    const before = structuredClone([a, b]), slots = [a.slots[0], b.slots[0]];
    let failure: unknown;
    try { stepFiniteSupport([a, b], [g], .05, { maxIterations: 1 }); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(SupportSolveError);
    expect((failure as SupportSolveError).report.converged).toBe(false);
    expect([a, b]).toEqual(before);
    expect(a.slots[0]).toBe(slots[0]); expect(b.slots[0]).toBe(slots[1]);
    expect(g.broken).toBeUndefined();
  });

  it('local coupling resolves the reproduced loaded-plant iteration failure without changing caps', () => {
    const run = (coupledUpdates: boolean) => {
      const a = newFiniteSupport(profile, zero()), b = newFiniteSupport(profile, { x: 1, y: 0 });
      const g: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 0, share: 1 },
        capacity: 900, holdDistance: Math.hypot(1, b.slots[0].position.y), reach: 2 };
      requestSupportStep(b, 0, { x: 1.5, y: b.slots[0].position.y });
      let updates = 0;
      for (let tick = 0; tick < 50; tick++) {
        try {
          const reps = stepFiniteSupport([a, b], [g], .01, { coupledUpdates });
          reps.forEach(contracts); updates += reps.reduce((sum, r) => sum + r.coupledUpdates, 0);
        } catch (error) {
          if (!(error instanceof SupportSolveError)) throw error;
          return { failed: true, updates, report: error.report };
        }
      }
      return { failed: false, updates };
    };
    const sequential = run(false), coupled = run(true);
    expect(sequential.failed).toBe(true); expect(sequential.report!.iterations).toBe(256);
    expect(coupled.failed).toBe(false); expect(coupled.updates).toBeGreaterThan(0);
  });
});
