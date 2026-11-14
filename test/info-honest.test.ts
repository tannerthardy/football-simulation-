/** INFO_HONEST (defense.ts; off): a bit mask so each coverage honesty item can be read alone. 63 turns them all on. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function items(value: string) {
  vi.resetModules();
  vi.stubEnv('INFO_HONEST', value);
  const { infoHonest } = await import('../src/sim/behaviors/defense.js');
  return [3, 6, 7, 8, 9, 'H'].filter(i => infoHonest(i));
}

describe('INFO_HONEST: per-item bits', () => {
  it('0 is off, 63 is every item, single bits select single items', async () => {
    expect(await items('0')).toEqual([]);
    expect(await items('63')).toEqual([3, 6, 7, 8, 9, 'H']);
    expect(await items('1')).toEqual([3]);
    expect(await items('32')).toEqual(['H']);
    expect(await items('10')).toEqual([6, 8]);
  });
});
