/** The key's sitter default (read-compiler runtime.ts `SITS`, data for the QB lane's key-man repair): the plan's key names
 * the route the key man leaves when he neither sinks nor jumps, per concept from its read line, resolved with the key's
 * own refs. On the engine defaults (the stack's flags stubbed on, as craft-hold.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  const fit = await import('../src/game/concept-fit.js');
  return { PASS_BY_ID, installedPlan, fit };
}

describe('key sits', () => {
  it('per concept from the read line: double_slants holds -> #2 slant (high); hitch_out sits -> #2 out (low)', async () => {
    const { PASS_BY_ID, installedPlan } = await load();
    const ds = installedPlan(PASS_BY_ID.double_slants, 'gun_doubles_11')!;
    expect(ds.key!.sits).toBe(ds.key!.high);
    const ho = installedPlan(PASS_BY_ID.hitch_out, 'gun_doubles_11')!;
    expect(ho.key!.sits).toBe(ho.key!.low);
  }, 120_000);

  it("follows the key's refs: drive's shallow; flood with the back as #3, the back's flat", async () => {
    const { PASS_BY_ID, installedPlan, fit } = await load({ BACK_AS_THREE: '1', CONCEPT_FIT: '1' });
    const drive = installedPlan(PASS_BY_ID.drive, 'gun_doubles_11')!;
    expect(drive.key!.sits).toBe(drive.key!.low);
    const flood = installedPlan(fit.asBackThree(PASS_BY_ID.flood), 'gun_doubles_11')!;
    expect(flood.key!.sits).toBe('B');
  }, 120_000);
});
