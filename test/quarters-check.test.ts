/** QUARTERS_CHECK (src/playbook/coverages.ts, `quartersCheck`; experimental, off): against two-by-two the Cover 6/8 half
 * goes to the boundary (quarters to the field), and quarters checks MOD vs an attached #2, from the alignment the
 * defense sees. On the engine defaults (the stack's flags stubbed on, as quick-hitch.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function installed(on: boolean, coverage: string, flip: boolean) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('QUARTERS_CHECK', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage, concept: 'curl_flat', seed: 1, roster: 1, formation: 'gun_doubles_11', flip }));
  return sim.defCall.coverage.id;
}

describe('QUARTERS_CHECK', () => {
  it('off: the drawn call is installed as drawn', async () => {
    expect(await installed(false, 'cover6', false)).toBe('cover6');
    expect(await installed(false, 'cover6_rev', false)).toBe('cover6_rev');
    expect(await installed(false, 'cover4_palms', false)).toBe('cover4_palms');
  });
  it('on: Cover 6 and Cover 8 install the same call on a given hash, and the other hash flips it; an attached #2 is MOD', async () => {
    for (const flip of [false, true]) expect(await installed(true, 'cover6', flip)).toBe(await installed(true, 'cover6_rev', flip));
    expect(await installed(true, 'cover6', false)).not.toBe(await installed(true, 'cover6', true));
    expect(await installed(true, 'cover4_palms', false)).toBe('cover4');
  });
});
