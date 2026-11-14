/** CONCEPT_DROPS (src/playbook/concepts.ts; experimental, off): the concepts whose first read is not ready until
 * 2.4-2.9 s are marked five-step ('five'); the rest keep their drops; off, nothing changes. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function drops(flag: string) {
  vi.resetModules();
  vi.stubEnv('CONCEPT_DROPS', flag);
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  return (id: string) => PASS_BY_ID[id].drop;
}

describe('CONCEPT_DROPS', () => {
  it('marks the late-first-read concepts five-step and leaves the quick game alone', async () => {
    const off = await drops('0'), on = await drops('1');
    expect(off('smash')).toBe('gun5'); expect(off('comebacks')).toBe('seven');
    for (const id of ['smash', 'mesh', 'flood', 'drive', 'comebacks']) expect(on(id)).toBe('five_deep');
    // The concepts already on 'five' keep it, and the verticals are VERTS_QUICK's, not this flag's.
    for (const id of ['dagger', 'y_cross', 'four_verts', 'verts_hitch']) expect(on(id)).toBe(off(id));
    for (const id of ['slant_flat', 'stick', 'curl_flat', 'levels']) expect(on(id)).toBe(off(id));
  });
  it('VERTS_QUICK moves the two verticals to the gun three-step and nothing else', async () => {
    const at = async (flag: string) => { vi.resetModules(); vi.stubEnv('CONCEPT_DROPS', '0'); vi.stubEnv('VERTS_QUICK', flag); const { PASS_BY_ID } = await import('../src/playbook/concepts.js'); return (id: string) => PASS_BY_ID[id].drop; };
    const off = await at('0'), on = await at('1');
    expect(off('four_verts')).toBe('gun5'); expect(on('four_verts')).toBe('gun3'); expect(on('verts_hitch')).toBe('gun3');
    for (const id of ['smash', 'dagger', 'stick', 'comebacks']) expect(on(id)).toBe(off(id));
  });
});
