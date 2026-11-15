/** CROSS_FLAT (src/playbook/routes.ts; experimental, off): the shallow crossers reach their depth in the first leg and
 * run flat; mesh's pair is its own (Y at the linebackers' toes, X a yard under him), not the drag. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function load(on: boolean) {
  vi.stubEnv('CROSS_FLAT', on ? '1' : '0');
  vi.resetModules();
  return { ...(await import('../src/playbook/routes.js')), ...(await import('../src/playbook/concepts.js')) };
}

describe('CROSS_FLAT', () => {
  it('off: the installed shallow climbs to 5 and mesh uses it under the high crosser', async () => {
    const m = await load(false);
    expect(m.ROUTES.shallow.points.at(-1)!.d).toBe(5);
    expect(m.ROUTES.mesh_under).toBeUndefined();
    expect(m.PASS_BY_ID.mesh.strong[2]).toBe('shallow');
  });
  it('on: the drag is flat under 3 yd once across; mesh crosses a yard apart at 4-5', async () => {
    const m = await load(true);
    const pts = m.ROUTES.shallow.points;
    expect(Math.max(...pts.map((p) => p.d))).toBeLessThanOrEqual(3);
    // Depth reached in the first 5 yd across, then flat.
    expect(pts.filter((p) => Math.abs(p.l) > 5).every((p) => Math.abs(p.d - pts.at(-1)!.d) < 0.5)).toBe(true);
    expect(m.PASS_BY_ID.mesh.strong[2]).toBe('mesh_under');
    const hi = m.ROUTES.shallow_high.points.at(-1)!.d, lo = m.ROUTES.mesh_under.points.at(-1)!.d;
    expect(hi - lo).toBeCloseTo(1, 5);
    expect(lo).toBeGreaterThanOrEqual(4);
    // The drag's other concepts keep the drag.
    for (const id of ['drive', 'flood', 'dagger', 'hitch_cross']) expect(Object.values({ ...m.PASS_BY_ID[id].strong, ...m.PASS_BY_ID[id].weak })).toContain('shallow');
  });
});
