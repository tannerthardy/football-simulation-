/** CROSS_OVER (src/playbook/routes.ts, read-compiler/features.ts; experimental, off): the over released inside on a
 * diagonal to its 18-22 yd landmark, declared as a crosser (not a vertical), so the read plans keep their timing. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function load(on: boolean) {
  vi.stubEnv('CROSS_OVER', on ? '1' : '0');
  vi.stubEnv('BACK_FRONT', '1');
  vi.resetModules();
  const { ROUTES } = await import('../src/playbook/routes.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  return { ROUTES, plan: (id: string) => installedPlan(PASS_BY_ID[id], 'gun_doubles_11')! };
}

describe('CROSS_OVER', () => {
  it('the release is inside from the line, the landmark 18-22, and it keeps running', async () => {
    const off = await load(false);
    expect(off.ROUTES.cross.points[0]).toMatchObject({ d: 6, l: -1 });
    const on = await load(true);
    const p = on.ROUTES.cross.points;
    expect(p[0].d).toBeLessThanOrEqual(4);
    expect(p[0].l).toBeLessThanOrEqual(-3);
    expect(Math.max(...p.map((q) => q.d))).toBeGreaterThanOrEqual(18);
    expect(Math.max(...p.map((q) => q.d))).toBeLessThanOrEqual(22);
    expect(on.ROUTES.cross.end).toBe('continue');
  });
  it('the read plans that share the cross keep their order and its ready time (within 0.15 s)', async () => {
    const ids = ['y_cross', 'post_cross', 'pa_flood', 'hitch_cross'];
    const crossRef: Record<string, string> = { y_cross: 'S2', post_cross: 'S2', hitch_cross: 'S2', pa_flood: 'W1' };
    const off = await load(false), before = Object.fromEntries(ids.map((id) => [id, off.plan(id)]));
    const on = await load(true);
    for (const id of ids) {
      const a = before[id], b = on.plan(id);
      expect(b.order.slice(0, 2)).toEqual(a.order.slice(0, 2));
      const ref = crossRef[id];
      const ra = a.rhythm.find((r) => r.ref === ref)!, rb = b.rhythm.find((r) => r.ref === ref)!;
      expect(Math.abs(rb.ready - ra.ready)).toBeLessThanOrEqual(0.15);
      expect(rb.at).toBe(ra.at);
    }
  }, 120000);
});
