import { describe, expect, it } from 'vitest';
import { advanceVerticalSupport, newVerticalSupport, type VerticalSupportReport,
  type VerticalSupportState } from '../../src/physics/vertical-support.js';

function standing(): VerticalSupportState {
  const leg = { restLength: 1.1, stiffness: 4800, forceCap: 1600, damping: 30, dampingCap: 300 };
  const series = { drag: 600, rateCap: 1, minLength: .6, maxLength: 1.4 };
  return newVerticalSupport({ torsoMass: 96, footMass: [2, 2], gravity: 10,
    torso: { position: 1, velocity: 0 }, feet: [{ id: 0, position: 0, velocity: 0 }, { id: 1, position: 0, velocity: 0 }],
    legs: [leg, { ...leg }], series: [series, { ...series }], actuator: { forceCap: 2500, powerCap: 1e6 } });
}
function closure(r: VerticalSupportReport): void {
  expect(r.reason).toBeNull(); expect(r.accepted).toBe(true);
  expect(Math.abs(r.workResidual)).toBeLessThan(1e-7);
  expect(Math.abs(r.momentumResidual)).toBeLessThan(1e-7);
  expect(r.seriesDragWork.every(w => w <= 1e-10)).toBe(true);
  expect(r.seriesLimitWork.every(w => w <= 1e-10)).toBe(true);
}
describe('backdrivable finite leg control', () => {
  it('holds quiet posture through actual muscle force while static support performs no work', () => {
    const s = standing(); s.actuator.powerCap = 0;
    const { state, report } = advanceVerticalSupport(s, .1, { restForces: [480, 480], maxInterval: .01 });
    closure(report);
    expect(state.torso.position).toBeCloseTo(1, 10); expect(state.torso.velocity).toBeCloseTo(0, 10);
    expect(state.legs[0].restLength).toBeCloseTo(1.1, 10);
    expect(report.restMotorWork.reduce((sum, w) => sum + Math.abs(w), 0)).toBeLessThan(1e-8);
    expect(report.normalImpulse[0] + report.normalImpulse[1]).toBeCloseTo(100, 9);
  });
  it('gives way under load when the actuator cannot hold the same posture', () => {
    const strong = standing(), weak = standing(); weak.actuator.forceCap = 300;
    const a = advanceVerticalSupport(strong, .08, { restForces: [480, 480], maxInterval: .005 });
    const b = advanceVerticalSupport(weak, .08, { restForces: [480, 480], maxInterval: .005 });
    closure(a.report); closure(b.report);
    expect(b.report.appliedRestForces).toEqual([150, 150]);
    expect(b.state.legs[0].restLength).toBeLessThan(a.state.legs[0].restLength - .01);
    expect(b.state.torso.position).toBeLessThan(a.state.torso.position);
    expect(b.report.seriesDragWork[0]).toBeLessThan(0);
    expect(b.report.restMotorWork[0]).toBeLessThan(0);
  });
  it('lets an unpowered leg shorten through passive backdrive without deleting its stored energy', () => {
    const s = standing(), before = structuredClone(s);
    const { state, report } = advanceVerticalSupport(s, .05, { maxInterval: .005 }); closure(report);
    expect(state.legs[0].restLength).toBeLessThan(s.legs[0].restLength);
    expect(report.motorWork).toBe(0); expect(report.restMotorWork).toEqual([0, 0]);
    expect(report.seriesDragWork[0]).toBeLessThan(0);
    expect(report.energyAfter).toBeLessThan(report.energyBefore);
    expect(s).toEqual(before);
  });
  it('raises the body by paying for bounded leg extension in the same interval', () => {
    const s = standing(), { state, report } = advanceVerticalSupport(s, .1,
      { restForces: [700, 700], maxInterval: .005 }); closure(report);
    expect(state.legs[0].restLength).toBeGreaterThan(s.legs[0].restLength);
    expect(state.torso.position).toBeGreaterThan(s.torso.position);
    expect(report.restMotorWork[0]).toBeGreaterThan(0);
    expect(report.energyAfter).toBeGreaterThan(report.energyBefore);
    for (const segment of report.segments) if (segment.dt > 0) {
      for (let i = 0; i < 2; i++) expect(Math.abs(segment.restRates[i])).toBeLessThanOrEqual(s.series![i].rateCap + 1e-9);
    }
  });
  it('keeps physical travel limits and accounts for the work removed by their reaction', () => {
    let state = standing(); state.series!.forEach(c => { c.minLength = 1.09; c.rateCap = .05; });
    let constraintWork = 0;
    for (let i = 0; i < 30; i++) {
      const r = advanceVerticalSupport(state, .01, { maxInterval: .005 }); closure(r.report);
      state = r.state; constraintWork += r.report.seriesLimitWork[0] + r.report.seriesLimitWork[1];
      state.legs.forEach(l => expect(l.restLength).toBeGreaterThanOrEqual(1.09 - 1e-12));
    }
    expect(state.legs[0].restLength).toBeCloseTo(1.09, 10);
    expect(constraintWork).toBeLessThan(0);
  });
  it('reaches a structural stop before it applies the stop reaction', () => {
    const s = standing();
    s.legs.forEach(l => { l.forceCap = 0; l.damping = 0; l.dampingCap = 0; });
    s.series!.forEach(c => { c.drag = 200; c.rateCap = 1; c.maxLength = 1.105; });
    const { state, report } = advanceVerticalSupport(s, .1, { restForces: [100, 0], maxInterval: .1 });
    closure(report);
    expect(state.legs[0].restLength).toBeCloseTo(1.105, 12);
    expect(report.restMotorWork[0]).toBeCloseTo(.5, 9);
    // The shaft moves at 0.5 yd/s for 0.01s, then stops. A range reaction
    // cannot dissipate work by slowing it throughout the pre-contact interval.
    expect(report.seriesDragWork[0]).toBeCloseTo(-.5, 9);
    expect(report.seriesLimitWork[0]).toBeCloseTo(0, 9);
    let time = 0, arrival = NaN;
    for (const segment of report.segments) {
      time += segment.dt;
      if (Number.isNaN(arrival) && segment.after.legs[0].restLength === s.series![0].maxLength) arrival = time;
    }
    expect(arrival).toBeCloseTo(.01, 9);
  });
  it('shares force and positive work across direct foot drive and rest actuation', () => {
    const s = standing(); s.actuator.forceCap = 1200; s.actuator.powerCap = 0;
    const before = structuredClone(s), r = advanceVerticalSupport(s, .01,
      { motorForces: [200, 0], restForces: [700, 700], maxInterval: .005 });
    const force = [...r.report.appliedMotorForces, ...r.report.appliedRestForces].reduce((sum, f) => sum + Math.abs(f), 0);
    expect(force).toBeLessThanOrEqual(1200 + 1e-10);
    expect(r.report.positiveMotorWork).toBeGreaterThan(0);
    expect(r.report.accepted).toBe(false); expect(r.report.reason).toMatch(/power budget/);
    expect(r.state).toEqual(before); expect(s).toEqual(before);
  });
  it('opposes a real lift progressively through the same body, leg, and ground forces', () => {
    const heights = [0, 40, 100].map(opposition => {
      let state = standing(), externalWork = 0;
      for (let i = 0; i < 30; i++) {
        const r = advanceVerticalSupport(state, .01, { maxInterval: .005,
          motorForces: [100, 0], restForces: [-200, 960], externalForces: [0, -opposition, 0] });
        closure(r.report); state = r.state; externalWork += r.report.externalWork;
      }
      expect(externalWork).toBeLessThanOrEqual(1e-10);
      expect(state.feet[1].position).toBe(0);
      return state.feet[0].position;
    });
    expect(heights[0]).toBeGreaterThan(.01);
    expect(heights[1]).toBeGreaterThan(0); expect(heights[1]).toBeLessThan(heights[0]);
    expect(heights[2]).toBe(0);
  });
  it('rejects rest control on a fixed spring and impossible series configuration', () => {
    const s = standing(); delete s.series;
    expect(() => advanceVerticalSupport(s, .01, { restForces: [10, 0] })).toThrow(RangeError);
    const invalid = standing(); invalid.series![0].maxLength = .9;
    expect(() => newVerticalSupport(invalid)).toThrow(RangeError);
  });
});
