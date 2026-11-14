/** ROUTE_EFFORT (src/sim/route-motion.ts routeEffort; experimental, off): every route family at full speed; a route's
 * own tracked pace is unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function load(on: boolean) {
  vi.stubEnv('ROUTE_EFFORT', on ? '1' : '0');
  vi.resetModules();
  return import('../src/sim/route-motion.js');
}

describe('ROUTE_EFFORT', () => {
  it('off: the fitted family constants; on: 1 for every family and route runner', async () => {
    const off = await load(false);
    expect(off.routeEffort('quick', 0.5)).toBeCloseTo(0.78, 9);
    expect(off.routeEffort('deep', 0.5)).toBeCloseTo(0.94, 9);
    const on = await load(true);
    for (const f of ['quick', 'flat', 'back', 'cross', 'intermediate', 'deep'] as const) for (const rr of [0, 0.5, 1]) expect(on.routeEffort(f, rr)).toBe(1);
  });
});
