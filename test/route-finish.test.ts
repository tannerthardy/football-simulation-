/** ROUTE_FINISH (src/sim/route-motion.ts; experimental, off): an outward route that runs out of field stops at the margin. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function path(on: boolean, id: string) {
  vi.stubEnv('ROUTE_FINISH', on ? '1' : '0');
  vi.resetModules();
  const { ROUTES } = await import('../src/playbook/routes.js');
  const { routePath } = await import('../src/sim/route-motion.js');
  const r = ROUTES[id];
  return routePath({ x: 39, y: 26.65 + 13 }, 40, 1, r.points, r.end === 'continue', r.family);
}

describe('ROUTE_FINISH', () => {
  it('off: the back flat turns up 40 yd; on: it stops at the margin; an inward route is unchanged', async () => {
    const off = await path(false, 'back_flat'), on = await path(true, 'back_flat');
    expect(off[off.length - 1].p.x - 40).toBeGreaterThan(30);
    expect(on[on.length - 1]).toMatchObject({ s: 0, finish: true });
    expect(on[on.length - 1].p.x - 40).toBeLessThan(10);
    const outOn = await path(true, 'out');
    expect(outOn[outOn.length - 1].finish).toBe(true);
    const dOff = await path(false, 'dig'), dOn = await path(true, 'dig');
    expect(dOn).toEqual(dOff);
  });
});
