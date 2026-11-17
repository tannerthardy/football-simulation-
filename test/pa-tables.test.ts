/** PA_TABLES (src/playbook/read-compiler/compile.ts, runtime.ts; experimental, off; a repair): a play-action-tagged call
 * is installed from its concept's tables (its coached key and order), as the untagged call is. On the engine defaults
 * (the stack's flags stubbed on, as craft-hold.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plans(on: boolean, id: string, formation: string) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('PA_TABLES', on ? '1' : '0');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  const c = PASS_BY_ID[id];
  // As playcaller.ts's playActionTag builds the tagged call.
  const pa = { ...c, id: `${c.id}+pa`, name: `PA ${c.name}`, family: 'playaction' as const, drop: 'pa' as const, fake: 'insideZone' };
  return { base: installedPlan(c, formation)!, pa: installedPlan(pa, formation)! };
}

describe('PA_TABLES', () => {
  it("off, PA quick outs misses its concept's coached key; on, it carries it", async () => {
    const off = await plans(false, 'quick_outs', 'gun_doubles_11');
    expect(off.base.style).toBe('defender_key');
    expect(off.pa.style).not.toBe('defender_key');
    const on = await plans(true, 'quick_outs', 'gun_doubles_11');
    expect(on.pa.style).toBe('defender_key');
    expect(on.pa.key).toMatchObject({ low: on.base.key!.low, high: on.base.key!.high, role: on.base.key!.role });
  }, 120_000);

  it("on, PA drive keeps its coached key (the weak shallow under the dig), not the geometry's", async () => {
    const on = await plans(true, 'drive', 'gun_doubles_11');
    expect(on.pa.key).toMatchObject({ low: 'W2', high: 'S2' });
  }, 120_000);

  it('the untagged call is unchanged by the flag', async () => {
    expect((await plans(true, 'smash', 'gun_trips_11')).base).toEqual((await plans(false, 'smash', 'gun_trips_11')).base);
  }, 120_000);
});
