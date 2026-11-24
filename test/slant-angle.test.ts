/** SLANT_ANGLE (src/playbook/routes.ts; experimental, off): the slant leaves its break at about 34 deg against the line
 * (off: the drawn 45 deg leg), with the same stem and break. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function legDeg(on: boolean) {
  vi.stubEnv('SLANT_ANGLE', on ? '1' : '0');
  vi.resetModules();
  const { getRoute } = await import('../src/playbook/routes.js');
  const [a, b] = getRoute('slant').points;
  return { a, deg: Math.atan2(b.d - a.d, Math.abs(b.l - a.l)) * 180 / Math.PI };
}

describe('SLANT_ANGLE', () => {
  it('a flatter leg off the same break', async () => {
    const off = await legDeg(false), on = await legDeg(true);
    expect(off.deg).toBeGreaterThan(44);
    expect(on.deg).toBeGreaterThan(30);
    expect(on.deg).toBeLessThan(38);
    expect(on.a).toEqual(off.a);
  });
});
