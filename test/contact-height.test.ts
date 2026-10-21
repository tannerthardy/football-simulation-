import { describe, expect, it } from 'vitest';
import { heightPulse, steadyHands } from '../src/lab/contact-height.js';

describe('contact height and supported moments', () => {
  it('changes pitch direction with height while keeping the same pair impulse', () => {
    const low = heightPulse({ offset: -0.3 }), center = heightPulse({ offset: 0 }), high = heightPulse({ offset: 0.3 });
    for (const r of [low, center, high]) {
      expect(r.velocity).toBeCloseTo(0.4, 10);
      expect(r.momentumError).toBeLessThan(1e-9);
      expect(r.state).toBe('up');
    }
    expect(low.tipAcceleration).toBeLessThan(0);
    expect(center.tipAcceleration).toBe(0);
    expect(high.tipAcceleration).toBeGreaterThan(0);
    expect(low.deviation).toBeLessThan(-0.05);
    expect(high.deviation).toBeGreaterThan(center.deviation + 0.05);
  });

  it('has the same response after rotation or reflection', () => {
    for (const offset of [-0.3, 0, 0.3]) {
      const base = heightPulse({ offset });
      for (const [angle, side] of [[0.7, 1], [1.4, -1]]) {
        const r = heightPulse({ offset, angle, side });
        expect(r.deviation).toBeCloseTo(base.deviation, 10);
        expect(r.velocity).toBeCloseTo(base.velocity, 10);
        expect(Math.abs(r.lateralDeviation)).toBeLessThan(1e-10);
      }
    }
  });

  it('converges for both high hits and low trips', () => {
    for (const offset of [-0.3, 0.3]) {
      const coarse = heightPulse({ offset, substeps: 12 }), middle = heightPulse({ offset, substeps: 24 }), fine = heightPulse({ offset, substeps: 48 });
      expect(Math.abs(coarse.deviation - fine.deviation)).toBeLessThan(0.004);
      expect(Math.abs(middle.deviation - fine.deviation)).toBeLessThan(Math.abs(coarse.deviation - fine.deviation));
    }
  });

  it('sustains ordinary hand pressure without endlessly accumulating a tipping impulse', () => {
    for (const posture of [0.2, 0.8]) {
      const r = steadyHands(posture);
      expect(r.falls).toBe(0);
      expect(r.peak).toBeLessThan(0.3);
      expect(r.momentumError).toBeLessThan(1e-8);
      expect(r.separation).toBeGreaterThan(0.5);
    }
    expect(steadyHands(0.8).peak).toBeLessThan(steadyHands(0.2).peak);
  });
});
