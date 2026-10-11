import { describe, expect, it } from 'vitest';
import type { PhysicalProfile } from '../../src/players/physical.js';
import { newInertialSupport, solveInertialSupportInterval, torsoVelocity } from '../../src/physics/inertial-support.js';
import { advanceInertialGaits, newInertialGait, requestInertialStep, locomotorPowerPrior, planInertialStride } from '../../src/physics/inertial-gait.js';
import type { SupportGrip } from '../../src/physics/finite-support.js';
const p: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
  brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3, reactReach: 2.6,
  reactionTime: .25, power: 100, balance: .5 };
const zero = () => ({ x: 0, y: 0 });
function gait(x = 0, power?: number) {
  const b = newInertialSupport(p, { x, y: 0 }, { footMassFractions: [.020842, .020842] });
  return newInertialGait(b, { transferTime: .04, trackingTime: .05, power: power ?? locomotorPowerPrior(p, b) });
}
describe('force-driven inertial foot lifecycle', () => {
  it('integrates the same prescribed external force through different interval partitions', () => {
    const coarse = gait(), fine = gait();
    for (const g of [coarse, fine]) g.body.traction = 0;
    const run = (g: ReturnType<typeof gait>, maxInterval: number) => advanceInertialGaits([g], [], .1, [zero()],
      { maxInterval, externalTorsoForces: [{ x: 100, y: 30 }] });
    const a = run(coarse, .1), b = run(fine, .01);
    expect(coarse.body.velocity.x).toBeCloseTo(.1, 12);
    expect(coarse.body.velocity.y).toBeCloseTo(.03, 12);
    expect(coarse.body.position.x).toBeCloseTo(fine.body.position.x, 12);
    expect(torsoVelocity(coarse.body).x).toBeCloseTo(torsoVelocity(fine.body).x, 12);
    const work = (r: typeof a) => r.intervals.reduce((sum, i) => sum + i.externalWork, 0);
    expect(work(a)).toBeCloseTo(work(b), 12);
    expect([...a.intervals, ...b.intervals].every(i => i.converged && Math.abs(i.workResidual) < 1e-10)).toBe(true);
  });
  it('stops a sliding plant locally and retains the stop instead of reflecting its velocity each tick', () => {
    const g = gait(), b = g.body;
    b.slots[0].load = 1; b.slots[1].load = 0; b.footVelocity[0].x = 1;
    const stopped = advanceInertialGaits([g], [], .02, [zero()], { maxInterval: .01 });
    expect(stopped.plantStopSplits).toBeGreaterThan(0);
    expect(b.footVelocity[0].x).toBeCloseTo(0, 7);
    expect(stopped.intervals.every(r => r.groundWork <= 1e-8 && r.converged)).toBe(true);
    const position = { ...b.slots[0].position };
    const later = advanceInertialGaits([g], [], .1, [zero()], { maxInterval: .01 });
    expect(b.footVelocity[0].x).toBeCloseTo(0, 7);
    expect(b.slots[0].position.x).toBeCloseTo(position.x, 8);
    expect(later.intervals.every(r => Math.abs(r.workResidual) < 1e-8)).toBe(true);
  });
  it('keeps stepping while braking and forecasts the other foot reaching its limit', () => {
    const g = gait(), b = g.body;
    b.velocity.x = 7; b.slots[0].position.x = -.5; b.slots[1].position.x = .5;
    expect(planInertialStride(g, zero(), .18)).toBe(true);
    expect(g.duration).toBeLessThan(.18);
    expect(g.lastPlan!.fitsDeadline).toBe(true);
    expect(g.duration + 2 * g.transferTime).toBeLessThanOrEqual(g.lastPlan!.stanceReachDeadline + 1e-12);
    expect(g.target.x).toBeGreaterThan(b.reach);
    // Future target is a plan, never an initial position correction.
    expect(b.slots[0].position.x).toBe(-.5);
  });
  it('releases a grip at its first reach crossing and retains the work transmitted before release', () => {
    const holder = gait(), runner = gait(.7);
    runner.body.velocity.x = 4; runner.body.footVelocity.forEach(v => { v.x = 4; });
    const grip: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 0, share: 0 },
      capacity: 10, holdDistance: .7, reach: 1 };
    const report = advanceInertialGaits([holder, runner], [grip], .1, [zero(), zero()], { maxInterval: .1 });
    expect(report.gripBreakSplits).toBe(1); expect(grip.broken).toBe(true);
    expect(report.intervals.some(r => r.gripWork < 0)).toBe(true);
    const firstFree = report.intervals.findIndex((r, i) => i > 0 && r.gripWork === 0);
    expect(firstFree).toBeGreaterThan(0);
    expect(report.intervals.every(r => Math.abs(r.workResidual) < 1e-8 && r.converged)).toBe(true);
  });
  it('unloads, moves the persistent foot, and loads actual achieved placement without teleporting', () => {
    const g = gait(), slot = g.body.slots[0], before = structuredClone(slot.position);
    requestInertialStep(g, 0, { x: .4, y: before.y }, .18);
    const early = advanceInertialGaits([g], [], .02, [zero()], { maxInterval: .01 });
    expect(g.phase).toBe('unloading'); expect(slot.mode).toBe('plant'); expect(slot.position).toEqual(before);
    expect(slot.load).toBeLessThan(.5); expect(early.placements).toHaveLength(0);
    const final = advanceInertialGaits([g], [], .24, [zero()], { maxInterval: .01 });
    expect(g.body.slots[0]).toBe(slot); expect(g.phase).toBe('settled'); expect(slot.mode).toBe('plant');
    expect(slot.load).toBe(1); expect(slot.position.x).toBeGreaterThan(.3);
    expect(final.placements).toHaveLength(1);
    expect(final.placements[0].actual.x).toBeCloseTo(slot.placement!.actual.x, 12);
    for (const r of final.intervals) {
      expect(Math.abs(r.workResidual)).toBeLessThan(1e-8);
      expect(r.commandForce[0]).toBeLessThanOrEqual(g.body.legForce + 1e-9);
    }
  });
  it('counts positive actuator work separately and leaves a weak motor short of its aim', () => {
    const weak = gait(0, 10), strong = gait();
    for (const g of [weak, strong]) requestInertialStep(g, 0, { x: .4, y: g.body.slots[0].position.y }, .18);
    const weakReport = advanceInertialGaits([weak], [], .22, [zero()], { maxInterval: .01 });
    advanceInertialGaits([strong], [], .22, [zero()], { maxInterval: .01 });
    expect(weakReport.powerRetries).toBeGreaterThan(0);
    for (const r of weakReport.intervals) {
      const positive = r.slotMotorWork[0].reduce((sum, work) => sum + Math.max(0, work), 0);
      expect(positive).toBeLessThanOrEqual(weak.power * r.dt + 1e-9);
    }
    expect(weak.body.slots[0].position.x).toBeLessThan(strong.body.slots[0].position.x);
    expect(weak.body.slots[0].placement!.miss.x).toBeLessThan(-.1);
  });
  it('a sustained hold progressively opposes the same actual foot stroke without resetting its attachment', () => {
    const results = [0, 150, 900].map(capacity => {
      const holder = gait(.7), runner = gait(), foot = runner.body.slots[0];
      const separation = Math.hypot(foot.position.x - .7, foot.position.y);
      const grip: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 0, share: 1 },
        capacity, holdDistance: separation, reach: 2 };
      requestInertialStep(runner, 0, { x: -.4, y: foot.position.y }, .18);
      const r = advanceInertialGaits([holder, runner], [grip], .22, [zero(), zero()], { maxInterval: .005 });
      expect(r.intervals.every(s => s.maxReachViolation <= 1e-7 && Math.abs(s.workResidual) < 1e-8)).toBe(true);
      expect(runner.body.slots[0]).toBe(foot); expect(grip.b.slot).toBe(0);
      return foot.position.x;
    });
    expect(results[1]).toBeGreaterThan(results[0]); expect(results[2]).toBeGreaterThan(results[1]);
  });
  it('rolls back an entire failed tick while retaining body, slot and grip identity', () => {
    const a = gait(), b = gait(.7), body = a.body, slot = body.slots[0];
    const grip: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 0, share: 1 },
      capacity: 100, holdDistance: .7, reach: 2 };
    requestInertialStep(a, 0, { x: .4, y: slot.position.y }, .18);
    const before = structuredClone([a, b, grip]);
    expect(() => advanceInertialGaits([a, b], [grip], .01, [{ x: NaN, y: 0 }, zero()], { maxInterval: .01 })).toThrow();
    expect([a, b, grip]).toEqual(before); expect(a.body).toBe(body); expect(body.slots[0]).toBe(slot);
    expect('broken' in grip).toBe(false);
  });
  it('handles a strong held step without treating transverse slip as repeated physical stops', () => {
    // Reproduced 128-event failure: a low-inertia plant turns under a taut
    // grip at nonzero speed. Raising the event limit hid the wrong 2D law.
    const runner = newInertialSupport(p, zero(), { footMassFractions: [.01, .01] });
    const holder = newInertialSupport(p, { x: -.25, y: runner.slots[0].position.y },
      { footMassFractions: [.01, .01] });
    const bodies = [holder, runner];
    const gs = bodies.map(body => newInertialGait(body,
      { transferTime: .04, trackingTime: .05, power: locomotorPowerPrior(p, body) }));
    const grip: SupportGrip = { a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 0, share: 1 },
      capacity: 900, holdDistance: .1, reach: 1.25 };
    requestInertialStep(gs[1], 0, { x: .5 * runner.reach, y: runner.slots[0].position.y }, .18);
    advanceInertialGaits(gs, [grip], .06, bodies.map(zero), { maxInterval: .005 });
    const push = solveInertialSupportInterval(bodies, [grip], .01, bodies.map(() => [zero(), zero()]),
      [zero(), { x: 45, y: 0 }], { gripModel: 'tether' });
    expect(push.converged).toBe(true);
    let directionSplits = 0;
    for (let time = .07; time < 1.5 - 1e-12; time += .01) {
      const v = torsoVelocity(runner), speed = Math.hypot(v.x, v.y);
      const direction = speed > 1e-12 ? { x: v.x / speed, y: v.y / speed } : zero();
      if (speed > .01 && gs[1].phase === 'settled') planInertialStride(gs[1], direction, .18);
      const r = advanceInertialGaits(gs, [grip], .01,
        [zero(), { x: -.2 * direction.x, y: -.2 * direction.y }], { maxInterval: .005 });
      directionSplits += r.slipDirectionSplits;
      expect(r.intervals.every(s => s.converged && s.maxPassiveGroundWork <= 1e-7
        && Math.abs(s.workResidual) < 1e-8 && Math.abs(s.angularMomentumResidual) < 1e-8)).toBe(true);
    }
    expect(directionSplits).toBeGreaterThan(0);
  });
});
