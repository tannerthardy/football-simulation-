/** CONCEPT_DROPS's depth and time (src/sim/called-drop.ts; experimental, off): the five-step class is a deeper, later
 * set than 'gun5' from both alignments; off, 'five' is the drop it was; the other classes do not move. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function spec(flag: string) {
  vi.resetModules();
  vi.stubEnv('CONCEPT_DROPS', flag);
  const { dropSpec } = await import('../src/sim/called-drop.js');
  return dropSpec;
}

describe('CONCEPT_DROPS: the five-step drop', () => {
  it('off: the five-step is the drop it was', async () => {
    const d = await spec('0');
    expect(d('five', 0, 0, true)).toEqual({ x: -8.0, time: 1.4 });
    expect(d('five', 0, 0, false)).toEqual({ x: -8.0, time: 1.8 });
  });
  it('on: it is deeper and later than gun5 from both alignments, and shallower and earlier than the seven-step', async () => {
    const d = await spec('1'), off = await spec('0');
    for (const gun of [true, false]) {
      const five = (await spec('1'))('five', 0, 0, gun), g5 = d('gun5', 0, 0, gun), seven = d('seven', 0, 0, gun);
      expect(five.x).toBeLessThan(g5.x - 0.5); expect(five.time).toBeGreaterThan(g5.time + 0.2);
      expect(five.x).toBeGreaterThan(seven.x); expect(five.time).toBeLessThanOrEqual(seven.time);
      for (const k of ['quick', 'gun3', 'gun5', 'seven', 'pa'] as const) expect(d(k, 0, 0, gun)).toEqual(off(k, 0, 0, gun));
    }
  });
});
