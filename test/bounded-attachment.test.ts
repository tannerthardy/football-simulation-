import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import { boundedAttachment, inverseBoundedAttachment, type AttachmentDerivative } from '../src/physics/bounded-attachment.js';

const apply = (m: AttachmentDerivative, v: Vec2): Vec2 => ({ x: m.xx * v.x + m.xy * v.y, y: m.xy * v.x + m.yy * v.y });
const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const expectVector = (actual: Vec2, expected: Vec2, tolerance: number): void => {
  expect(Math.hypot(actual.x - expected.x, actual.y - expected.y)).toBeLessThanOrEqual(tolerance);
};

describe('bounded lower-attachment coordinates', () => {
  it('has the identity derivative at zero and preserves very small acquired offsets', () => {
    expect(boundedAttachment({ x: 0, y: 0 }, 1.07)).toEqual({ offset: { x: 0, y: 0 }, derivative: { xx: 1, xy: 0, yy: 1 } });
    for (const z of [{ x: 1e-14, y: -2e-14 }, { x: 2e-7, y: 3e-7 }, { x: Number.MIN_VALUE, y: 0 }]) {
      const mapped = boundedAttachment(z, 1.07);
      expectVector(mapped.offset, z, 1e-19);
      expect(mapped.derivative.xx).toBeCloseTo(1, 12);
      expect(mapped.derivative.yy).toBeCloseTo(1, 12);
      expectVector(inverseBoundedAttachment(mapped.offset, 1.07)!, z, 1e-19);
    }
  });

  it('matches independent central finite differences across direction, scale and extension', () => {
    for (const limit of [0.3, 1.07, 3.2]) for (const relative of [
      { x: 1e-7, y: -2e-7 }, { x: 0.4, y: 0 }, { x: 0, y: -0.7 },
      { x: 0.6, y: -0.8 }, { x: 3.1, y: 1.7 },
    ]) {
      const z = { x: relative.x * limit, y: relative.y * limit }, h = limit * 1e-5;
      const { derivative } = boundedAttachment(z, limit);
      for (const direction of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0.6, y: -0.8 }]) {
        const plus = boundedAttachment({ x: z.x + h * direction.x, y: z.y + h * direction.y }, limit).offset;
        const minus = boundedAttachment({ x: z.x - h * direction.x, y: z.y - h * direction.y }, limit).offset;
        const finiteDifference = { x: (plus.x - minus.x) / (2 * h), y: (plus.y - minus.y) / (2 * h) };
        expectVector(apply(derivative, direction), finiteDifference, 2e-9);
      }
    }
  });

  it('transmits the same virtual work through geometry and the shared projected force', () => {
    const share = 0.63, correctionVelocity = { x: 1.3, y: -0.7 }, force = { x: -230, y: 94 };
    for (const z of [{ x: 0, y: 0 }, { x: -0.8, y: 0.31 }, { x: 4.7, y: -2.9 }]) {
      const mapped = boundedAttachment(z, 1.07), h = 1e-6;
      const plus = boundedAttachment({ x: z.x + h * share * correctionVelocity.x, y: z.y + h * share * correctionVelocity.y }, 1.07).offset;
      const minus = boundedAttachment({ x: z.x - h * share * correctionVelocity.x, y: z.y - h * share * correctionVelocity.y }, 1.07).offset;
      const actualPointVelocity = { x: (plus.x - minus.x) / (2 * h), y: (plus.y - minus.y) / (2 * h) };
      const projected = apply(mapped.derivative, force);
      expect(dot(actualPointVelocity, force)).toBeCloseTo(share * dot(correctionVelocity, projected), 7);
    }
  });

  it('round-trips acquisition coordinates including strictly near-bound points', () => {
    for (const limit of [0.3, 1.07, 3.2]) for (const fraction of [0, 1e-8, 0.3, 0.85, 1 - 1e-12, 1 - Number.EPSILON]) {
      for (const direction of [{ x: 1, y: 0 }, { x: -0.6, y: 0.8 }]) {
        const point = { x: direction.x * limit * fraction, y: direction.y * limit * fraction };
        const coordinate = inverseBoundedAttachment(point, limit);
        expect(coordinate).not.toBeNull();
        expectVector(boundedAttachment(coordinate!, limit).offset, point, limit * 8e-16);
      }
    }
  });

  it('reflects its point and full derivative without choosing a preferred field side', () => {
    const z = { x: 0.71, y: -1.3 }, reflected = boundedAttachment({ x: z.x, y: -z.y }, 1.07);
    const original = boundedAttachment(z, 1.07);
    expect(reflected.offset).toEqual({ x: original.offset.x, y: -original.offset.y });
    expect(reflected.derivative).toEqual({ xx: original.derivative.xx, xy: -original.derivative.xy, yy: original.derivative.yy });
    const input = { x: -0.31, y: 0.7 };
    expect(inverseBoundedAttachment({ x: input.x, y: -input.y }, 1.07)).toEqual({
      x: inverseBoundedAttachment(input, 1.07)!.x, y: -inverseBoundedAttachment(input, 1.07)!.y,
    });
  });

  it('remains bounded and contracts radial and tangential movement at large extension', () => {
    for (const z of [{ x: 1e8, y: -2e8 }, { x: Number.MAX_VALUE, y: Number.MAX_VALUE }]) {
      const mapped = boundedAttachment(z, 1.07);
      expect(Math.hypot(mapped.offset.x, mapped.offset.y)).toBeLessThanOrEqual(1.07 * (1 + Number.EPSILON));
      expect(Object.values(mapped.derivative).every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...Object.values(apply(mapped.derivative, { x: 1, y: -1 })))).toBeLessThan(1e-7);
    }
    const coordinate = { x: 2, y: -1 }, mapped = boundedAttachment(coordinate, 1.07);
    const radial = { x: 2 / Math.sqrt(5), y: -1 / Math.sqrt(5) }, tangent = { x: -radial.y, y: radial.x };
    const radialResponse = dot(radial, apply(mapped.derivative, radial));
    const tangentResponse = dot(tangent, apply(mapped.derivative, tangent));
    expect(radialResponse).toBeGreaterThan(0);
    expect(radialResponse).toBeLessThan(tangentResponse);
    expect(tangentResponse).toBeLessThan(1);
  });

  it('rejects invalid acquisition rather than silently moving or clamping a live point', () => {
    for (const limit of [0, -1, NaN, Infinity]) {
      expect(inverseBoundedAttachment({ x: 0, y: 0 }, limit)).toBeNull();
      expect(() => boundedAttachment({ x: 0, y: 0 }, limit)).toThrow(RangeError);
    }
    for (const offset of [{ x: 1.07, y: 0 }, { x: 1.08, y: 0 }, { x: 0.8, y: 0.8 },
      { x: NaN, y: 0 }, { x: 0, y: Infinity }]) {
      expect(inverseBoundedAttachment(offset, 1.07)).toBeNull();
    }
    for (const z of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }]) {
      expect(() => boundedAttachment(z, 1.07)).toThrow(RangeError);
    }
  });

  it('does not mutate or alias caller-owned coordinate objects', () => {
    const z = Object.freeze({ x: 0.7, y: -0.3 }), point = Object.freeze({ x: 0.1, y: 0.3 });
    const mapped = boundedAttachment(z, 1.07), inverse = inverseBoundedAttachment(point, 1.07)!;
    mapped.offset.x = 5; inverse.y = 2;
    expect(z).toEqual({ x: 0.7, y: -0.3 });
    expect(point).toEqual({ x: 0.1, y: 0.3 });
  });
});
