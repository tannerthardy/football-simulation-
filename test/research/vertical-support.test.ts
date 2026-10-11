import { describe, expect, it } from 'vitest';
import { newVerticalSupport, advanceVerticalSupport, verticalSupportEnergy, type VerticalSupportState } from '../../src/physics/vertical-support.js';
import { axialLegForce, axialLegDamping } from '../../src/physics/leg-compliance.js';
function standing(): VerticalSupportState {
  return newVerticalSupport({ torsoMass: 100, footMass: [2, 2], torso: { position: 1.15, velocity: 0 },
    feet: [{ id: 0, position: 0, velocity: 0 }, { id: 1, position: 0, velocity: 0 }], gravity: 10,
    legs: [{ restLength: 1.2, stiffness: 10000, forceCap: 2000, damping: 0, dampingCap: 0 },
      { restLength: 1.2, stiffness: 10000, forceCap: 2000, damping: 0, dampingCap: 0 }],
    actuator: { forceCap: 2000, powerCap: 1e6 } });
}
function closure(r: ReturnType<typeof advanceVerticalSupport>['report']): void {
  expect(r.accepted, r.reason ?? '').toBe(true);
  expect(Math.abs(r.workResidual)).toBeLessThan(1e-7);
  expect(Math.abs(r.momentumResidual)).toBeLessThan(1e-7);
  expect(r.groundWork).toBeLessThanOrEqual(1e-10);
  expect(r.dampingWork).toBeLessThanOrEqual(1e-10);
}
describe('vertical material support research', () => {
  it('supports the actual torso and foot weights with jointly solved normals', () => {
    const s = standing(), before = structuredClone(s), { state, report } = advanceVerticalSupport(s, .1, { maxInterval: .01 });
    closure(report); expect(s).toEqual(before);
    expect(state.torso.position).toBeCloseTo(1.15, 10);
    expect(report.normalImpulse[0]).toBeCloseTo(52, 8); expect(report.normalImpulse[1]).toBeCloseTo(52, 8);
    expect(report.energyAfter).toBeCloseTo(report.energyBefore, 8); expect(report.motorWork).toBe(0);
    state.feet.forEach(f => { expect(f.position).toBe(0); expect(f.velocity).toBe(0); });
  });
  it('finds airborne touchdown and plastic foot impact without instantaneous torso impulse', () => {
    const s = standing(); s.torso.position = 1; s.feet.forEach(f => { f.position = .1; }); s.legs.forEach(l => { l.forceCap = 0; });
    const { state, report } = advanceVerticalSupport(s, .2, { maxInterval: .05 }); closure(report);
    const impacts = report.segments.filter(s => s.kind === 'impact'); expect(impacts.length).toBeGreaterThan(0);
    expect(report.impactWork).toBeCloseTo(-4, 7);
    expect(report.segments.filter(s => s.kind === 'interval').slice(0, report.segments.indexOf(impacts[0])).reduce((t, s) => t + s.dt, 0)).toBeCloseTo(Math.sqrt(.02), 8);
    expect(state.torso.position).toBeCloseTo(.8, 8); expect(state.torso.velocity).toBeCloseTo(-2, 8);
    impacts.forEach(i => expect(i.after.torso.velocity).toBe(i.before.torso.velocity));
    state.feet.forEach(f => { expect(f.position).toBe(0); expect(f.velocity).toBe(0); });
  });
  it('stores and returns capped compression energy while a persistent damper only dissipates', () => {
    const s = standing(); s.torso.position = .9; s.legs.forEach(l => { l.forceCap = 600; l.damping = 20; l.dampingCap = 100; });
    const initial = verticalSupportEnergy(s), { state, report } = advanceVerticalSupport(s, .02, { maxInterval: .002 }); closure(report);
    expect(report.dampingWork).toBeLessThan(0); expect(state.torso.velocity).toBeGreaterThan(0);
    expect(report.energyAfter).toBeLessThan(initial.total); expect(report.motorWork).toBe(0);
    report.segments.forEach(seg => seg.springForce.forEach(f => expect(f).toBeLessThanOrEqual(600)));
  });
  it('lifts an actual foot only after finite force overcomes persistent spring and its weight', () => {
    const s = standing(), { state, report } = advanceVerticalSupport(s, .01, { motorForces: [700, 0], maxInterval: .001 }); closure(report);
    expect(state.feet[0].position).toBeGreaterThan(0); expect(report.normalImpulse[0]).toBe(0);
    expect(state.feet[1].position).toBe(0); expect(report.positiveMotorWork).toBeGreaterThan(0);
    expect(state.legs).toEqual(s.legs); expect(report.segments[0].springForce[0]).toBeGreaterThan(0);
    expect(report.segments.length).toBeLessThanOrEqual(11);
  });
  it('transmits an externally held lift through the same spring and actual normals', () => {
    const s = standing(), { state, report } = advanceVerticalSupport(s, .01,
      { motorForces: [700, 0], externalForces: [0, -700, 0], maxInterval: .001 });
    closure(report); expect(state.feet[0].position).toBe(0);
    expect(report.normalImpulse[0]).toBeGreaterThan(0);
    expect(report.externalWork).toBe(0); expect(state.torso.position).toBeLessThan(s.torso.position);
    expect(state.legs).toEqual(s.legs);
  });
  it('permits compression collapse when the finite elastic ceiling cannot support torso weight', () => {
    const s = standing(); s.legs.forEach(l => { l.forceCap = 200; });
    const { state, report } = advanceVerticalSupport(s, .05, { maxInterval: .005 }); closure(report);
    expect(state.torso.position).toBeLessThan(s.torso.position); expect(state.torso.velocity).toBeLessThan(0);
    expect(report.normalImpulse[0]).toBeCloseTo((200 + 20) * .05, 9);
    expect(report.motorWork).toBe(0);
  });
  it('shares finite active force and rejects positive work above power atomically', () => {
    const s = standing(); s.actuator.forceCap = 100; s.actuator.powerCap = 0;
    s.feet.forEach(f => { f.position = .2; }); s.torso.position = 1.3;
    s.feet[0].velocity = 1; s.feet[1].velocity = -1;
    const before = structuredClone(s), r = advanceVerticalSupport(s, .001, { motorForces: [1000, 1000] });
    expect(r.report.appliedMotorForces).toEqual([50, 50]); expect(r.report.positiveMotorWork).toBeGreaterThan(0);
    expect(r.report.accepted).toBe(false); expect(r.report.reason).toMatch(/power budget/);
    expect(r.state).toEqual(before); expect(s).toEqual(before);
  });
  it('uses a zero-time plastic impact for an initially downward moving ground foot', () => {
    const s = standing(); s.feet[0].velocity = -1;
    const { report } = advanceVerticalSupport(s, .001); closure(report);
    expect(report.segments[0].kind).toBe('impact'); expect(report.segments[0].dt).toBe(0);
    expect(report.segments[0].normalImpulse[0]).toBe(2); expect(report.impactWork).toBe(-1);
  });
  it('splits separation before an averaged positive normal could carry an adhesive endpoint', () => {
    const s = standing(); s.torsoMass = 96; s.torso = { position: .75, velocity: 1.5 };
    s.legs.forEach(l => { l.restLength = 1; l.stiffness = 2000; }); s.actuator.forceCap = 800;
    for (const [dt, maxInterval] of [[.1, .1], [.1, .01], [.1, .002], [.3, .3], [.4, .4]]) {
      const { state, report } = advanceVerticalSupport(s, dt, { maxInterval, motorForces: [400, 400] }); closure(report);
      if (dt === .1) { expect(state.feet[0].position).toBeGreaterThan(.01); expect(state.feet[1].position).toBeGreaterThan(.01); }
      expect(Math.max(...report.segments.map(segment => segment.after.feet[0].position))).toBeGreaterThan(.01);
      expect(report.segments.length).toBeLessThan(64);
      for (const segment of report.segments) for (let i = 0; i < 2; i++) if (segment.normalImpulse[i] > 0 && segment.kind === 'interval') {
        const length = segment.after.torso.position - segment.after.feet[i].position;
        const instantaneousNormal = s.footMass[i] * s.gravity + Math.min(2000, 2000 * Math.max(0, 1 - length)) - 400;
        expect(instantaneousNormal).toBeGreaterThan(-1e-7);
      }
    }
  });
  it('reorders touchdown, separation and joint stops on one coupled smooth trajectory', () => {
    const leg = { restLength: 1.1, stiffness: 5572.630137205124, forceCap: 2000,
      damping: 22.75378178106621, dampingCap: 300 };
    const s = newVerticalSupport({ torsoMass: 96, footMass: [2, 2], gravity: 10,
      torso: { position: 1.0570116841699928, velocity: -.7039103391580284 },
      feet: [{ id: 0, position: 0, velocity: 0 }, { id: 1, position: 0, velocity: 0 }],
      legs: [leg, { ...leg }], actuator: { forceCap: 2500, powerCap: 1e6 },
      series: [{ drag: 757.424464263022, rateCap: .3886680691735819, minLength: 1.05, maxLength: 1.15 },
        { drag: 581.2954104505479, rateCap: 1.5687222567154095, minLength: 1.05, maxLength: 1.15 }] });
    const { report } = advanceVerticalSupport(s, .2, { maxInterval: .2,
      motorForces: [422.8203920647502, 231.1355647398159], restForces: [-159.41590890288353, 1011.9421843439341] });
    closure(report); expect(report.restBoundSplits).toBeGreaterThan(0);
    for (const segment of report.segments) for (let i = 0; i < 2; i++) {
      const after = segment.after, foot = after.feet[i], leg = after.legs[i], range = after.series![i];
      expect(foot.position).toBeGreaterThanOrEqual(0);
      expect(leg.restLength).toBeGreaterThanOrEqual(range.minLength); expect(leg.restLength).toBeLessThanOrEqual(range.maxLength);
      if (segment.kind === 'interval' && segment.normalImpulse[i] > 0) {
        const normal = after.footMass[i] * after.gravity + axialLegForce(after.torso.position - foot.position, leg)
          + axialLegDamping(after.torso.velocity - foot.velocity, leg) - report.appliedMotorForces[i];
        expect(normal).toBeGreaterThan(-1e-7);
      }
    }
  });
  it('finds an airborne interior joint stop even when the coarse free endpoint returns inside', () => {
    const leg = { restLength: 1.1, stiffness: 4800, forceCap: 1600, damping: 0, dampingCap: 0 };
    const series = { drag: 600, rateCap: 1, minLength: 1.095, maxLength: 1.4 };
    const s = newVerticalSupport({ torsoMass: 96, footMass: [2, 2], gravity: 10,
      torso: { position: 11, velocity: 0 }, feet: [{ id: 0, position: 10, velocity: 0 }, { id: 1, position: 10, velocity: 0 }],
      legs: [leg, { ...leg }], series: [series, { ...series }], actuator: { forceCap: 2500, powerCap: 1e6 } });
    // Independent continuous linear flight reference until first contact:
    // q'' + 8q' + 2500q=0; w'=2500q, r'=100/600-8q.
    const omega = Math.sqrt(2484), b = (-380 / 600 + .4) / omega;
    const restAt = (t: number): number => {
      const q = Math.exp(-4 * t) * (.1 * Math.cos(omega * t) + b * Math.sin(omega * t));
      const qdot = Math.exp(-4 * t) * ((-.4 + b * omega) * Math.cos(omega * t)
        + (-4 * b - .1 * omega) * Math.sin(omega * t));
      const w = 100 / 600 - 8 * q - qdot;
      return 1.1 + 100 / 600 * t - w / (600 * (1 / 2 + 2 / 96));
    };
    let lo = 0, hi = .01;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (restAt(mid) <= 1.095) hi = mid; else lo = mid; }
    const arrivals: number[] = [];
    for (const maxInterval of [.1, .002]) {
      const { report } = advanceVerticalSupport(s, .1, { restForces: [100, 100], maxInterval }); closure(report);
      expect(report.restBoundSplits).toBe(2); expect(report.segments.length).toBeLessThan(128);
      let time = 0, arrival = NaN;
      for (const segment of report.segments) {
        time += segment.dt;
        segment.after.legs.forEach(l => expect(l.restLength).toBeGreaterThanOrEqual(1.095));
        if (!Number.isFinite(arrival) && segment.after.legs[0].restLength === 1.095) arrival = time;
      }
      expect(Number.isFinite(arrival)).toBe(true); expect(Math.abs(arrival - hi)).toBeLessThan(1e-4);
      arrivals.push(arrival);
    }
    expect(Math.abs(arrivals[1] - hi)).toBeLessThan(Math.abs(arrivals[0] - hi));
  });
});
