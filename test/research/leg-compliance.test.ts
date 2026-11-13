import { describe, expect, it } from 'vitest';
import { axialLegChangingRestForce, axialLegConfigurationWork, axialLegDamping, axialLegDiscreteForce, axialLegForce,
  axialLegPotential, type AxialLegCompliance } from '../../src/physics/leg-compliance.js';

const leg: AxialLegCompliance = { restLength: 1.1, stiffness: 6000, forceCap: 900, damping: 80, dampingCap: 250 };
describe('persistent finite axial compliance', () => {
  it('stores the work actually transmitted on either side of saturation and slack', () => {
    for (const [a, b] of [[1.3, 1.2], [1.2, 1.05], [1.08, 1], [1, .9], [.8, .7], [.7, 1.2], [1.2, .7]]) {
      const force = axialLegDiscreteForce(a, b, leg);
      expect(force).toBeGreaterThanOrEqual(0); expect(force).toBeLessThanOrEqual(leg.forceCap + 1e-10);
      expect(force * (b - a) + axialLegPotential(b, leg) - axialLegPotential(a, leg)).toBeCloseTo(0, 10);
      expect(axialLegDiscreteForce(b, a, leg)).toBe(force);
    }
  });
  it('returns the same elastic energy over a closed compression and recovery cycle', () => {
    const lengths = [1.2, 1.05, .9, .75, .95, 1.1, 1.2];
    let work = 0;
    for (let i = 1; i < lengths.length; i++) work += axialLegDiscreteForce(lengths[i - 1], lengths[i], leg)
      * (lengths[i] - lengths[i - 1]);
    expect(work).toBeCloseTo(0, 10);
  });
  it('sustains a finite static load with finite compression, without consuming fresh work', () => {
    const load = 550, compression = load / leg.stiffness;
    expect(axialLegForce(leg.restLength - compression, leg)).toBeCloseTo(load, 10);
    expect(axialLegPotential(leg.restLength - compression, leg)).toBeCloseTo(.5 * load * compression, 10);
    expect(axialLegDiscreteForce(.8, .8, leg)).toBe(900);
  });
  it('remains stable for tiny strokes and an elastic material with zero force capacity', () => {
    const tiny = 1e-12;
    expect(axialLegDiscreteForce(1, 1 + tiny, leg)).toBeCloseTo(axialLegForce(1 + tiny / 2, leg), 7);
    const noSpring = { ...leg, forceCap: 0 };
    expect(axialLegPotential(.1, noSpring)).toBe(0);
    expect(axialLegDiscreteForce(.1, 1.3, noSpring)).toBe(0);
  });
  it('dissipates finite work when extending or compressing, including after elastic unloading', () => {
    for (const rate of [-20, -1, 0, 1, 20]) {
      const force = axialLegDamping(rate, leg);
      expect(force * rate).toBeLessThanOrEqual(0);
      expect(Math.abs(force)).toBeLessThanOrEqual(leg.dampingCap);
    }
  });
  it('charges for changing posture or stiffness while storing elastic energy', () => {
    const raised = { ...leg, restLength: leg.restLength + .05 };
    const positive = axialLegConfigurationWork(1, leg, raised);
    expect(positive).toBeGreaterThan(0);
    expect(positive + axialLegConfigurationWork(1, raised, leg)).toBeCloseTo(0, 12);
    expect(axialLegConfigurationWork(1.3, leg, raised)).toBe(0);
    const stiffer = { ...leg, stiffness: 2 * leg.stiffness };
    expect(axialLegConfigurationWork(1.08, leg, stiffer)).toBeGreaterThan(0);
  });
  it('accounts for active rest-length work during the same physical compression stroke', () => {
    for (const [a, b, rest] of [[1, 1.05, 1.15], [.95, .8, 1.12], [.8, 1.2, 1.3], [1.2, .7, .9]]) {
      const force = axialLegChangingRestForce(a, b, leg, rest), after = { ...leg, restLength: rest };
      const change = axialLegPotential(b, after) - axialLegPotential(a, leg);
      expect(force * (b - a) + change - force * (rest - leg.restLength)).toBeCloseTo(0, 10);
    }
    // Constant compression while raising the hip costs work against the load.
    expect(axialLegChangingRestForce(1, 1.05, leg, 1.15)).toBeCloseTo(600, 10);
  });
  it('rejects nonphysical material configuration instead of silently clipping it', () => {
    expect(() => axialLegPotential(-.1, leg)).toThrow(RangeError);
    expect(() => axialLegForce(1, { ...leg, stiffness: 0 })).toThrow(RangeError);
    expect(() => axialLegDamping(NaN, leg)).toThrow(RangeError);
  });
});
