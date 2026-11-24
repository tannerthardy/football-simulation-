/** SEAM_LANDMARK (src/playbook/routes.ts; experimental, off): the seam stems to its field landmark (halfway between the
 * top of the numbers and the hash, 16.3 yd from his sideline) and carries the installed middle read whose open answer
 * stays on his line and bends inside. Off: the old fixed line just inside his alignment, and no read. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.resetModules();
  vi.stubEnv('SEAM_LANDMARK', on ? '1' : '0');
  const { getRoute } = await import('../src/playbook/routes.js');
  const { routePath } = await import('../src/sim/route-motion.js');
  const { FIELD_WIDTH } = await import('../src/core/field.js');
  return { getRoute, routePath, W: FIELD_WIDTH };
}
const LOS = 40;

describe('SEAM_LANDMARK', () => {
  it('a #2 inside the landmark stems out to it by 12 yd and runs up it', async () => {
    const { getRoute, routePath, W } = await load(true);
    const r = getRoute('seam');
    const start = { x: LOS - 0.5, y: W - 18.6 }; // 18.6 yd from his (+y) sideline
    const path = routePath(start, LOS, 1, r.points, false, r.family);
    const at12 = path.find((p) => Math.abs(p.p.x - (LOS + 12)) < 1e-6)!;
    expect(W - at12.p.y).toBeCloseTo((9 + 70.75 / 3) / 2, 6);
    expect(r.read?.key).toBe('middle');
  });
  it('a #2 already outside the landmark keeps his line', async () => {
    const { getRoute, routePath, W } = await load(true);
    const r = getRoute('seam');
    const start = { x: LOS - 0.5, y: W - 12 };
    const path = routePath(start, LOS, 1, r.points, false, r.family);
    for (const p of path) expect(p.p.y).toBeCloseTo(start.y, 6);
  });
  it('off: the old line and no read', async () => {
    const { getRoute } = await load(false);
    const r = getRoute('seam');
    expect(r.read).toBeUndefined();
    expect(r.points[0].l).toBe(-0.4);
  });
});
