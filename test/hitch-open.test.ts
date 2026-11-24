/** HITCH_OPEN (src/playbook/routes.ts; experimental, off): the hitch plants at its stem depth and opens inside toward
 * the window instead of coming straight back. Off, it comes back a yard (6 -> 5). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.stubEnv('HITCH_OPEN', on ? '1' : '0');
  vi.resetModules();
  return import('../src/playbook/routes.js');
}

describe('HITCH_OPEN', () => {
  it('opens inside at the plant depth instead of coming back', async () => {
    const off = await load(false), on = await load(true);
    for (const id of ['hitch', 'quick_hitch']) {
      const [a0, b0] = off.getRoute(id).points, [a1, b1] = on.getRoute(id).points;
      expect(b0.d).toBeLessThan(a0.d);                          // off: comes back toward the line
      expect(b1.d).toBeGreaterThanOrEqual(a1.d);                // on: no ground given back
      expect(b1.l).toBeLessThan(-1);                            // on: opens inside, toward the window
      expect(Math.atan2(b1.d - a1.d, Math.abs(b1.l)) * 180 / Math.PI).toBeLessThan(45);  // across more than up
      expect(a1.d).toBe(a0.d);                                  // the stem is unchanged
    }
  });
});
