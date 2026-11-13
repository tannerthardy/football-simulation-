import { describe, expect, it } from 'vitest';
import { hypot2 } from '../src/core/vec.js';

describe('allocation-free two-component hypot', () => {
  it('matches the pinned runtime at zeros, nonfinite values and floating-point extremes', () => {
    const values = [0, -0, 1, -1, Number.MIN_VALUE, -Number.MIN_VALUE,
      Number.MAX_VALUE, -Number.MAX_VALUE, Infinity, -Infinity, NaN,
      2 ** -1022, 2 ** -500, 2 ** 500, 1e-150, 1e150, .35, 2.5, 6];
    for (const x of values) for (const y of values)
      expect(hypot2(x, y), `hypot(${x}, ${y})`).toBe(Math.hypot(x, y));
  });

  it('matches independent norms for full-range and close-magnitude represented doubles', () => {
    const bytes = new DataView(new ArrayBuffer(16));
    let seed = 0x12345678;
    const word = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
    for (let i = 0; i < 8192; i++) {
      for (let k = 0; k < 4; k++) bytes.setUint32(k * 4, word(), true);
      let x = bytes.getFloat64(0, true), y = bytes.getFloat64(8, true);
      expect(hypot2(x, y)).toBe(Math.hypot(x, y));
      // Equal exponents exercise comparable contributions rather than only
      // pairs where one component disappears below the other's precision.
      const exponent = (word() % 2047) << 20;
      bytes.setUint32(4, (word() & 0x800fffff) | exponent, true);
      bytes.setUint32(12, (word() & 0x800fffff) | exponent, true);
      x = bytes.getFloat64(0, true); y = bytes.getFloat64(8, true);
      expect(hypot2(x, y)).toBe(Math.hypot(x, y));
    }
  });
});
