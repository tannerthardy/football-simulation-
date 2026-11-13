/** BACK_PATHS (playbook/routes.ts; experimental, off): the back's flat, angle and out on their tracked paths
 * (docs/reviews/2026-11-13-back-paths.md). As installed (routePath from a back's gun alignment): the flat stays behind
 * the line while it widens and climbs only late, the angle and out break at the line, not past it; off, the flat goes
 * to the line at once. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function paths(flag: string) {
  vi.resetModules();
  vi.stubEnv('BACK_PATHS', flag);
  const { getRoute } = await import('../src/playbook/routes.js');
  const { routePath } = await import('../src/sim/route-motion.js');
  const los = 40, start = { x: los - 4.5, y: 25 };
  const at = (id: string) => { const r = getRoute(id); return routePath(start, los, 1, r.points, false, r.family).map((p) => ({ d: p.p.x - los, w: p.p.y - start.y })); };
  return { flat: at('back_flat'), angle: at('angle'), out: at('back_out'), flatPace: getRoute('back_flat').pace };
}

describe('BACK_PATHS', () => {
  it('the flat is run behind the line, widening; the angle and out break at the line', async () => {
    const on = await paths('1'), off = await paths('0');
    // Flat: every point but the last behind the line by 3+ yd, at least 10 yd of width before it climbs.
    for (const p of on.flat.slice(0, -1)) expect(p.d).toBeLessThan(-3);
    expect(on.flat[on.flat.length - 2].w).toBeGreaterThanOrEqual(10);
    expect(on.flat[on.flat.length - 1].d).toBeLessThan(0);
    // The flat is run under control on: the NFL back widens at about 4.2 yd/s (pace 0.55); off, the family's effort.
    expect(on.flatPace).toBeLessThan(0.7);
    expect(off.flatPace).toBeUndefined();
    // Off, the flat is at the line by its first point.
    expect(off.flat[0].d).toBeGreaterThanOrEqual(0);
    // Angle and out: the break is at the line on, past it off.
    expect(on.angle[0].d).toBeLessThanOrEqual(0);
    expect(off.angle[0].d).toBeGreaterThan(1);
    expect(Math.max(...on.out.map((p) => p.d))).toBeLessThanOrEqual(2);
    expect(Math.max(...off.out.map((p) => p.d))).toBeGreaterThanOrEqual(4.5);
  });
});
