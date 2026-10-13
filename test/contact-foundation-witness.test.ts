import { describe, expect, it } from 'vitest';
import { World } from '../src/physics/world.js';
import { captureFirstGrip, firstRowReference, frozenInterval } from '../scripts/diag/physics/contact-foundations.js';

describe('contact checkpoint isolation', () => {
  it.each([1, -1] as const)('preserves native execution and the acquired checkpoint across local solves, side %s', side => {
    const prototype = World.prototype as any, step = prototype.step, interval = prototype.integrateSubstep;
    const c = captureFirstGrip({ angle: 45, speed: 8, cut: false, difficulty: 'difficult' }, 'patch', side);
    expect(c.observerParity).toBe(true); // Includes results AND final bodies/joints/pending strikes.
    expect(prototype.step).toBe(step);
    expect(prototype.integrateSubstep).toBe(interval);
    const before = structuredClone(c.saved), h = .05 / 12;
    const first = frozenInterval(c.saved, 1, 'full', h);
    frozenInterval(c.saved, 8, 'grip-only', h);
    frozenInterval(c.saved, 8, 'ground-only', h);
    expect(frozenInterval(c.saved, 1, 'full', h)).toEqual(first);
    expect(c.saved).toEqual(before);
    expect(Math.abs(first.energyError)).toBeLessThan(1e-7);
    expect(first.momentumError).toBeLessThan(1e-7);
    // A linearized reference is only eligible with no normal-force sharing,
    // active placement or ground yaw; controls outside it receive no estimate.
    const reference = firstRowReference(c.saved, first);
    if (reference) {
      expect(Number.isFinite(reference.holderFacing)).toBe(true);
      expect(Math.abs(reference.impulse)).toBeLessThanOrEqual(first.rows[0].capacity * h + 1e-9);
      expect(reference.forceTransportFraction).toBeGreaterThanOrEqual(.5 - 1e-9);
      expect(reference.forceTransportFraction).toBeLessThanOrEqual(1 + 1e-9);
    }
    expect(firstRowReference(c.saved, frozenInterval(c.saved, 8, 'full', h))).toBeNull();
    expect(() => frozenInterval(c.saved, 0, 'full', h)).toThrow(RangeError);
    expect(() => frozenInterval(c.saved, 1, 'full', .1)).toThrow(RangeError);
  });
});
