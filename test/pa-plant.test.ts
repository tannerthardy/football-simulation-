/** Play action's read 1 decided on the plant (read-compiler runtime.ts; data for the QB lane's bit 16): a play-action plan
 * carries `plantAt` (the QB's set out of the fake) and marks its first place `decided: 'plant'`; a dropback plan carries
 * neither. On the engine defaults (the stack's flags stubbed on, as craft-hold.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('play action decided on the plant', () => {
  it('pa_post_dig: the FS key pair is read 1, decided on the plant; plantAt is the set out of the fake', async () => {
    vi.resetModules();
    for (const k of stackOn) vi.stubEnv(k, '1');
    const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
    const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
    const pa = installedPlan(PASS_BY_ID.pa_post_dig, 'ace_12')!;
    expect(pa.plantAt).toBeGreaterThan(1);
    const first = pa.rhythm.filter((r) => r.n === 0);
    expect(first.length).toBeGreaterThan(0);
    for (const r of first) expect(r.decided).toBe('plant');
    for (const r of pa.rhythm.filter((r) => r.n > 0)) expect(r.decided).toBeUndefined();
    // Unready at the plant is still read 1: the throw is on its own ready.
    expect(first.some((r) => r.ready > pa.plantAt!)).toBe(true);
    const drop = installedPlan(PASS_BY_ID.smash, 'gun_doubles_11')!;
    expect(drop.plantAt).toBeUndefined();
    for (const r of drop.rhythm) expect(r.decided).toBeUndefined();
  }, 120_000);
});
