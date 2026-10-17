import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Vec2, Vec3 } from '../src/core/vec.js';
import { closestCatchOpportunity, type CatchEnvelope, type CatchOpportunity } from '../src/physics/catch-opportunity.js';

const envelope = { reach: 1.3, low: .1, top: 3 };
const at = (x: number, y = 0, z = 1) => ({ x, y, z });

describe('same-time closest catch opportunity', () => {
  it('rejects the analytic frozen-final-body false opportunity', () => {
    // 50ms: ball20yd/s, body5yd/s, common separation1.5+.75s.
    // Freezing the final body instead would grant1.25yd at the old ball point.
    expect(Math.abs(-1.25 - 0)).toBeLessThan(envelope.reach);
    expect(closestCatchOpportunity(at(-1.5), at(-1.25), at(0), at(1), envelope)).toBeNull();
  });

  it('preserves a static receiver and selects closest rather than earliest reach', () => {
    const r = closestCatchOpportunity(at(.5, .4), at(.5, .4), at(0), at(1), { ...envelope, reach: .5 });
    expect(r).toEqual({ s: .5, dh: .4, z: 1 });
    // First reach would be at .2; changing to that point would change difficulty.
    expect(r!.s).not.toBeCloseTo(.2, 12);
  });

  it('admits moving bodies meeting a moving or stationary ball at the same instant', () => {
    expect(closestCatchOpportunity(at(.5, 1), at(.5, -1), at(0), at(1), envelope))
      .toEqual({ s: .5, dh: 0, z: 1 });
    expect(closestCatchOpportunity(at(-1), at(1), at(0), at(0), { ...envelope, reach: .1 }))
      .toEqual({ s: .5, dh: 0, z: 1 });
  });

  it('intersects height and horizontal reach at one time, in either height direction', () => {
    // Planar closest is s=.5 at height2; legal top1 begins only at s=.75.
    const descending = [at(-1, 0, 4), at(1, 0, 0)] as const;
    const limits = { reach: .5, low: .1, top: 1 };
    expect(closestCatchOpportunity(at(0), at(0), ...descending, limits))
      .toEqual({ s: .75, dh: .5, z: 1 });
    expect(closestCatchOpportunity(at(0), at(0), ...descending, { ...limits, reach: .49 })).toBeNull();
    expect(closestCatchOpportunity(at(0), at(0), descending[1], descending[0], limits))
      .toEqual({ s: .25, dh: .5, z: 1 });
    expect(closestCatchOpportunity(at(0), at(0), at(0, 0, -.5), at(0, 0, 0), limits)).toBeNull();
  });

  it('handles zero relative motion, including a later legal height interval', () => {
    expect(closestCatchOpportunity(at(0), at(2), at(.5), at(2.5), envelope))
      .toEqual({ s: 0, dh: .5, z: 1 });
    expect(closestCatchOpportunity(at(0), at(2), at(.5, 2), at(2.5, 2), envelope)).toBeNull();
    expect(closestCatchOpportunity(at(0), at(2), at(.5, 0, 2), at(2.5, 0, 0), { ...envelope, top: 1 }))
      .toEqual({ s: .5, dh: .5, z: 1 });
  });

  it('includes legal endpoints and boundary reach, and rejects empty/invalid envelopes', () => {
    expect(closestCatchOpportunity(at(0), at(0), at(1.3, 0, .1), at(2, 0, 0), envelope))
      .toEqual({ s: 0, dh: 1.3, z: .1 });
    expect(closestCatchOpportunity(at(0), at(0), at(2, 0, 4), at(1.3, 0, 3), envelope))
      .toEqual({ s: 1, dh: 1.3, z: 3 });
    expect(closestCatchOpportunity(at(0), at(0), at(0), at(0), { ...envelope, top: 0 })).toBeNull();
    expect(closestCatchOpportunity(at(0), at(0), at(0), at(0), { ...envelope, reach: -1 })).toBeNull();
    expect(closestCatchOpportunity(at(NaN), at(0), at(0), at(0), envelope)).toBeNull();
  });

  it('is invariant under common translation, velocity and reflection', () => {
    const plain = closestCatchOpportunity(at(.5, 1), at(.5, -1), at(0), at(1), envelope);
    // Add the same endpoint displacement (uniform frame velocity) to both paths.
    const shifted = closestCatchOpportunity(at(10.5, -4), at(12.5, -2), at(10, -3), at(13, -3), envelope);
    expect(shifted).toEqual(plain);
  });

  const native = JSON.parse(readFileSync(new URL('./fixtures/same-time-catch.json', import.meta.url), 'utf8')) as {
    cases: Array<{ id: string; body0: Vec2; body1: Vec2; ball0: Vec3; ball1: Vec3; envelope: CatchEnvelope; old: CatchOpportunity }>;
  };
  it.each(native.cases)('retains the exact saved geometry contract for $id', c => {
    const opportunity = closestCatchOpportunity(c.body0, c.body1, c.ball0, c.ball1, c.envelope);
    if (c.id === 'G1-P020') {
      // Exact data: final-body distance1.292149 grants the old opportunity;
      // same-time minimum1.508345 while legally high is beyond reach1.317361.
      expect(c.old.dh).toBeLessThan(c.envelope.reach);
      expect(opportunity).toBeNull();
    } else {
      // These native controls reach at the final instant in both operators.
      expect(opportunity!.s).toBe(1);
      expect(opportunity!.dh).toBeCloseTo(c.old.dh, 12);
      expect(opportunity!.z).toBe(c.old.z);
      expect(opportunity!.dh).toBeLessThan(c.envelope.reach);
    }
  });
});
