/** RELEASE_PACE (src/sim/route-motion.ts; experimental, off): one get-off for every route. On, the get-off share no
 * longer depends on how deep the route first breaks (every route gets off like the go); off, it rises with that depth. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(release: boolean) {
  vi.stubEnv('RELEASE_PACE', release ? '1' : '0');
  vi.resetModules();
  return import('../src/sim/route-motion.js');
}

describe('RELEASE_PACE', () => {
  it('gets off every route like the go', async () => {
    const off = await load(false), on = await load(true);
    expect(off.getOffDrive(0.5, 3, 6)).toBeLessThan(off.getOffDrive(0.5, 10, 6));
    expect(on.getOffDrive(0.5, 3, 6)).toBeCloseTo(off.getOffDrive(0.5, 10, 6), 9);
    expect(on.getOffDrive(0.5, 0, 2)).toBeCloseTo(off.getOffDrive(0.5, 10, 2), 9);
  });
});
