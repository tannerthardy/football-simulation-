/** CHEST_SHOULDERS: a torso's chest segment lies across his shoulders (hips plus the TRUNK_TWIST trunk), so a twisted body's
 * segment rotates by the twist and an untwisted body's is unchanged to the digit; off, it lies across the hips. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function half(env: Record<string, string>, facing: number, trunk: number | undefined) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { chestHalf } = await import('../src/physics/world.js');
  return chestHalf({ facing, trunk } as never);
}

describe('CHEST_SHOULDERS: the chest segment across the shoulders', () => {
  it('rotates a twisted body\'s segment by the twist', async () => {
    const f = 0.3, tw = 0.5;
    const h = await half({ TRUNK_TWIST: '1', CHEST_SHOULDERS: '1' }, f, tw);
    const L = Math.hypot(h.x, h.y);
    expect(Math.atan2(h.y, h.x)).toBeCloseTo(f + tw + Math.PI / 2, 12);
    expect(L).toBeCloseTo(0.12, 12);
  });
  it('leaves an untwisted body unchanged to the digit', async () => {
    for (const trunk of [undefined, 0]) {
      const on = await half({ TRUNK_TWIST: '1', CHEST_SHOULDERS: '1' }, 1.1, trunk);
      const off = await half({ TRUNK_TWIST: '1' }, 1.1, trunk);
      expect(on.x).toBe(off.x); expect(on.y).toBe(off.y);
    }
  });
  it('off, lies across the hips whatever the trunk', async () => {
    // Off is asked for, not inherited from the legacy pin (CHEST_SHOULDERS is on by default since engine-68).
    const twisted = await half({ TRUNK_TWIST: '1', CHEST_SHOULDERS: '0' }, 0.3, 0.5), straight = await half({ TRUNK_TWIST: '1', CHEST_SHOULDERS: '0' }, 0.3, 0);
    expect(twisted.x).toBe(straight.x); expect(twisted.y).toBe(straight.y);
  });
  it('requires TRUNK_TWIST', async () => {
    vi.resetModules(); vi.stubEnv('CHEST_SHOULDERS', '1'); vi.stubEnv('TRUNK_TWIST', '0');
    await expect(import('../src/physics/world.js')).rejects.toThrow(/requires TRUNK_TWIST/);
  });
});
