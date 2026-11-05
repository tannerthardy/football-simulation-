import { afterEach, describe, expect, it, vi } from 'vitest';

// DRAW_READ is read when recognition.ts loads, so each case imports it fresh.
async function load(flag: string | undefined) {
  vi.resetModules();
  if (flag === undefined) vi.stubEnv('DRAW_READ', ''); else vi.stubEnv('DRAW_READ', flag);
  return import('../src/sim/recognition.js');
}
afterEach(() => vi.unstubAllEnvs());

describe('DRAW_READ: a high hat is a pass read only with the ground a pass set gives', () => {
  it('expects the NFL dropback retreat profile (0.20/0.42/0.71/1.07 yd at 0.4/0.6/0.8/1.0 s) within 0.15 yd', async () => {
    const { passSetGround } = await load('1');
    for (const [t, nfl] of [[0.4, 0.20], [0.6, 0.42], [0.8, 0.71], [1.0, 1.07]]) expect(Math.abs(passSetGround(t) - nfl)).toBeLessThan(0.15);
    expect(passSetGround(0.1)).toBe(0);
  });

  it('a line sitting at NFL draw depth weighs its hats far less than a line in a dropback set', async () => {
    const { hatPassWeight } = await load('1');
    // NFL medians at 0.8 s: draws 0.21 yd, throws at 1.8-2.5 s 0.71 yd.
    expect(hatPassWeight(0.21, 0.8)).toBeLessThan(0.35);
    expect(hatPassWeight(0.71, 0.8)).toBeGreaterThan(0.9);
    expect(hatPassWeight(-0.3, 0.8)).toBe(0);
  });

  it('off (the default) leaves the hat alone', async () => {
    const { hatPassWeight } = await load(undefined);
    expect(hatPassWeight(0, 1.0)).toBe(1);
    const off = await load('0');
    expect(off.hatPassWeight(0.21, 0.8)).toBe(1);
  });
});
