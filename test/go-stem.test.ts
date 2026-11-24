/** GO_STEM (src/playbook/routes.ts, src/sim/route-motion.ts; experimental, off): the go stems outside and stacks the
 * corner, keeping 5 yd of room to the sideline (or the room he started with). Off, it runs nearly straight up. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function path(on: boolean, y: number) {
  vi.stubEnv('GO_STEM', on ? '1' : '0');
  vi.resetModules();
  const { getRoute } = await import('../src/playbook/routes.js');
  const { routePath } = await import('../src/sim/route-motion.js');
  const r = getRoute('go');
  // outside = -1: his sideline is y = 0.
  return routePath({ x: 38, y }, 40, -1, r.points, r.end === 'continue', r.family).filter((q) => !q.ext).map((q) => q.p.y);
}

describe('GO_STEM', () => {
  it('stems up to 4 yd outside and keeps 5 yd to the sideline', async () => {
    const offWide = await path(false, 12), onWide = await path(true, 12);
    expect(12 - Math.min(...offWide)).toBeLessThan(2);            // off: 1.5 yd by 50 deep
    expect(12 - Math.min(...onWide)).toBeCloseTo(4, 6);          // 12 yd from the sideline: 4 yd outside
    const onTight = await path(true, 7);
    expect(Math.min(...onTight)).toBeCloseTo(5, 6);               // 7 yd off: stops at 5 yd of room
    const onTighter = await path(true, 3.5);
    expect(Math.min(...onTighter)).toBeCloseTo(3.5, 6);           // started closer than 5: keeps the room he had
  });
});
