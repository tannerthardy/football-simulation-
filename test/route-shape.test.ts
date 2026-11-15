/** ROUTE_SHAPE (src/playbook/routes.ts; experimental, off): the in and out breaks rolled as taught; the short in stays square. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function routes(shape: boolean, effort: boolean) {
  vi.stubEnv('ROUTE_SHAPE', shape ? '1' : '0'); vi.stubEnv('ROUTE_EFFORT', effort ? '1' : '0');
  vi.resetModules();
  return (await import('../src/playbook/routes.js')).ROUTES;
}
describe('ROUTE_SHAPE', () => {
  it('off: as authored; on: dig / out / deep out / speed out are rolls (no cut) and the short in is still a square cut', async () => {
    const off = await routes(false, true), on = await routes(true, true);
    expect(off.dig.points[0]).toMatchObject({ d: 12, cut: true });
    for (const id of ['dig', 'out', 'deep_out', 'quick_out']) {
      expect(on[id].points).toHaveLength(3);
      expect(on[id].points.some((p) => p.cut)).toBe(false);
      expect(on[id].points[0].s).toBe(1);
    }
    expect(on.dig.points.map((p) => p.d)).toEqual([10, 12, 12.3]);
    expect(on.short_in).toEqual(off.short_in);
    const plain = await routes(true, false);
    expect(plain.out.points).toEqual(on.out.points);
  });
});
