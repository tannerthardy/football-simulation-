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

describe('ROUTE_EFFORT break table (src/playbook/routes.ts)', () => {
  async function routes(on: boolean) {
    vi.stubEnv('ROUTE_EFFORT', on ? '1' : '0');
    vi.resetModules();
    return (await import('../src/playbook/routes.js')).ROUTES;
  }
  it('off: every route exactly as authored; on: the declared cuts and rolls', async () => {
    const off = await routes(false);
    expect(off.slant.points[0]).toEqual({ d: 2, l: 0, s: 0.75 });
    expect(off.corner.points[0].s).toBe(0.65);
    const on = await routes(true);
    expect(on.slant.points[0]).toMatchObject({ d: 2, l: 0, s: 0.35, cut: true });
    for (const id of ['out', 'deep_out', 'dig', 'short_in']) expect(on[id].points[0]).toMatchObject({ cut: true, s: 0.4 });
    for (const id of ['hitch', 'curl', 'comeback', 'stick', 'hook']) expect(on[id].points[0]).toMatchObject({ cut: true, s: off[id].points[0].s });
    expect(on.corner.points[0].s).toBe(1);
    expect(on.post.points[0].s).toBe(1);
    expect(on.cross.points.slice(0, 2).map((p) => p.s)).toEqual([1, 1]);
    expect(on.quick_out).toEqual(off.quick_out);
    expect(on.go).toEqual(off.go);
    expect(on.swing).toEqual(off.swing);
  });
});
