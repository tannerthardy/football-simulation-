/** One ground-force budget (physics/world.ts feet()): gait and lean share the
 * feet's cap, and the force the ground delivers never exceeds it. Gait is
 * served first and lean fills what is left, but when gait alone is over the
 * cap and lean opposes it, clipping gait by itself used to leave a positive
 * lean share on top. The witness is a real play (seed 11 restage, DE_S at
 * 0.70 s): zero traction, yet a force of (-483.76, 122.13) remained. A law on
 * the pure allocation, not an outcome target. Forces are kg·yd/s². */
import { describe, expect, it } from 'vitest';
import { allocateGroundForce } from '../src/physics/world.js';

const alloc = (lx: number, ly: number, leanX: number, leanY: number, cap: number) => {
  const [gx, gy, px, py, r] = allocateGroundForce(new Float64Array(5), lx, ly, leanX, leanY, cap);
  return { gx, gy, px, py, r, net: Math.hypot(gx + px, gy + py) };
};
const GAIT = { x: 585.468, y: 280.753 }, LEAN = { x: -897.932, y: 226.690 };

describe('ground-force allocation', () => {
  it('delivers no force at zero traction when gait and lean oppose', () => {
    const a = alloc(GAIT.x, GAIT.y, LEAN.x, LEAN.y, 0);
    expect(a.net).toBe(0);
    expect(Math.hypot(a.px, a.py)).toBe(0);
    expect(a.r).toBe(0);
  });

  it('keeps the net within a positive cap when gait alone is over it', () => {
    for (const cap of [50, 200, 400, 600]) {
      const a = alloc(GAIT.x, GAIT.y, LEAN.x, LEAN.y, cap);
      expect(a.net).toBeLessThanOrEqual(cap + 1e-9);
    }
  });

  it('leaves gait and lean unchanged when they agree and fit under the cap', () => {
    const a = alloc(300, 100, 150, 50, 1000);
    expect([a.gx, a.gy, a.px, a.py, a.r]).toEqual([300, 100, 150, 50, 1]);
  });

  it('is mirror-symmetric', () => {
    for (const cap of [0, 200, 600]) {
      const a = alloc(GAIT.x, GAIT.y, LEAN.x, LEAN.y, cap), m = alloc(-GAIT.x, GAIT.y, -LEAN.x, LEAN.y, cap);
      expect(m.gx).toBeCloseTo(-a.gx, 9); expect(m.gy).toBeCloseTo(a.gy, 9);
      expect(m.px).toBeCloseTo(-a.px, 9); expect(m.py).toBeCloseTo(a.py, 9);
      expect(m.net).toBeCloseTo(a.net, 9);
    }
  });
});
