/** SLANT_LEAN (src/playbook/routes.ts; experimental, off): the slant rolls through its first point (no plant) and
 * flattens at its catch depth; off, the authored planted slant is unchanged. A slant in a staged dropback leans in
 * before it is 2 yd past his start with the flag on, and not with it off. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function slant(on: boolean) {
  vi.stubEnv('SLANT_LEAN', on ? '1' : '0');
  vi.resetModules();
  const { getRoute } = await import('../src/playbook/routes.js');
  return getRoute('slant');
}

describe('SLANT_LEAN', () => {
  it('declares the first point a roll, 45 deg to 6 yd, then flat; off, the plant at 2 yd', async () => {
    const off = await slant(false), on = await slant(true);
    expect(off.points[0].d).toBe(2);
    expect(off.points[off.points.length - 1].d).toBe(8.5);
    expect(on.points[0].cut).toBeUndefined();
    expect(on.points[0].s).toBe(1);
    expect(on.points[1]).toMatchObject({ d: 6, l: -3.5 });
    expect(on.points[2].d - on.points[1].d).toBeLessThanOrEqual(0.5);
  });
});
