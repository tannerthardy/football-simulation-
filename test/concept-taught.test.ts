/** CONCEPT_TAUGHT (src/playbook/concepts.ts; experimental, off): five concepts installed as taught (levels, slant_flat,
 * quick_outs, flood, mesh). On: the taught routes and back assignments. Off: unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.resetModules();
  vi.stubEnv('CONCEPT_TAUGHT', on ? '1' : '0');
  return (await import('../src/playbook/concepts.js')).PASS_BY_ID;
}

describe('CONCEPT_TAUGHT', () => {
  it('on: the taught installs', async () => {
    const c = await load(true);
    expect(c.levels.strong[1]).toBe('short_in');
    expect(c.levels.strong[2]).toBe('dig');
    expect(c.slant_flat.back).toBe('check');
    expect(c.slant_flat.progression.at(-1)).toBe('B');
    expect(c.quick_outs.back).toBe('back_flat');
    expect(c.flood.weak[1]).toBe('slant');
    expect(c.mesh.weak[1]).toBe('corner');
  });
  it('off: as before', async () => {
    const c = await load(false);
    expect(c.levels.strong[1]).toBe('dig');
    expect(c.levels.strong[2]).toBe('short_in');
    expect(c.slant_flat.back).toBe('block');
    expect(c.quick_outs.back).toBe('block');
    expect(c.flood.weak[1]).toBe('dig');
    expect(c.mesh.weak[1]).toBe('go');
  });
});
