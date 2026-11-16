/** CONCEPT_DROPS (src/playbook/concepts.ts; experimental, off): concepts whose first read is a square-in, post, corner,
 * crosser or deep comeback are marked 'five' (read 1 on the hitch); those whose first read is an out, curl, flat or hitch
 * keep the gun five-step and read on the set (docs/reviews/2026-11-15-concept-drops.md); off, nothing changes. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function drops(flag: string) {
  vi.resetModules();
  vi.stubEnv('CONCEPT_DROPS', flag);
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  return (id: string) => PASS_BY_ID[id].drop;
}

describe('CONCEPT_DROPS', () => {
  it('marks the concepts read on the hitch five-step and leaves those read on the set, and the quick game, alone', async () => {
    const off = await drops('0'), on = await drops('1');
    expect(off('smash')).toBe('gun5'); expect(off('comebacks')).toBe('seven');
    for (const id of ['smash', 'drive', 'corner_flat', 'levels', 'comebacks']) expect(on(id)).toBe('five');
    // First read an out or the flat: read on the set, as installed.
    for (const id of ['flood', 'sail_corner', 'double_outs', 'trips_sail', 'trips_outs']) expect(on(id)).toBe(off(id));
    // Mesh reads the corner on the fifth step and the two crossers in one look on the reset: the gun five-step.
    expect(on('mesh')).toBe(off('mesh'));
    // The verticals are VERTS_QUICK's, not this flag's.
    for (const id of ['four_verts', 'verts_hitch']) expect(on(id)).toBe(off(id));
    for (const id of ['slant_flat', 'stick', 'curl_flat']) expect(on(id)).toBe(off(id));
  });
  it('VERTS_QUICK moves the two verticals to the gun three-step and nothing else', async () => {
    const at = async (flag: string) => { vi.resetModules(); vi.stubEnv('CONCEPT_DROPS', '0'); vi.stubEnv('VERTS_QUICK', flag); const { PASS_BY_ID } = await import('../src/playbook/concepts.js'); return (id: string) => PASS_BY_ID[id].drop; };
    const off = await at('0'), on = await at('1');
    expect(off('four_verts')).toBe('gun5'); expect(on('four_verts')).toBe('gun3'); expect(on('verts_hitch')).toBe('gun3');
    for (const id of ['smash', 'dagger', 'stick', 'comebacks']) expect(on(id)).toBe(off(id));
  });
});
