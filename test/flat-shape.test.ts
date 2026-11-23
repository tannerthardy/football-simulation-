/** FLAT_SHAPE (src/sim/route-motion.ts, src/playbook/routes.ts; experimental, off): the flat as taught. On, the back's
 * flat holds a shallow line and both flats finish at the sideline margin instead of turning upfield; off, the flat
 * family turns up at the margin. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function paths(on: boolean) {
  vi.stubEnv('FLAT_SHAPE', on ? '1' : '0');
  vi.resetModules();
  const { getRoute } = await import('../src/playbook/routes.js');
  const { routePath } = await import('../src/sim/route-motion.js');
  const start = { x: 38, y: 20 };
  const build = (id: string) => { const r = getRoute(id); return routePath(start, 40, -1, r.points, r.end === 'continue', r.family); };
  return { flat: build('flat'), backFlat: build('back_flat'), backDef: getRoute('back_flat') };
}

describe('FLAT_SHAPE', () => {
  it('finishes the flat at the margin and keeps the back flat shallow', async () => {
    const off = await paths(false), on = await paths(true);
    const deepest = (p: { p: { x: number } }[]) => Math.max(...p.map((q) => q.p.x));
    expect(deepest(off.flat)).toBeGreaterThan(deepest(on.flat) + 3);
    expect(on.flat[on.flat.length - 1].s).toBe(0);
    expect(on.backDef.points[on.backDef.points.length - 1].d).toBe(-3.6);
    expect(deepest(on.backFlat)).toBeLessThan(40 - 3);
  });
});
