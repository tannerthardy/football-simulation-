/** PLAN_ROLES (src/playbook/read-compiler/compile.ts; experimental, off): a declared clear-out enters as a motif, by route,
 * and is not read as the high of a high-low. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function flood(on: boolean) {
  vi.stubEnv('PLAN_ROLES', on ? '1' : '0');
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { compile } = await import('../src/playbook/read-compiler/compile.js');
  const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
  return compile(PASS_BY_ID.flood, 'gun_doubles_11', false, off, def);
}

describe('PLAN_ROLES', () => {
  it("flood's go is a declared clear-out for the out, and the out is read before the go", async () => {
    const off = await flood(false), on = await flood(true);
    const clear = (c: any) => c.motifs.some((m: any) => m.kind === 'clearout' && m.why.includes('declared'));
    expect(clear(off)).toBe(false);
    expect(clear(on)).toBe(true);
    const order = on.chosen!.order.map((s) => s.ref);
    const go = on.routes.find((r) => r.routeId === 'go' && r.side === 'S')!.ref, out = on.routes.find((r) => r.routeId === 'out')!.ref;
    expect(order.indexOf(out)).toBeLessThan(order.indexOf(go));
  }, 120000);
  it('declares the sourced keys and orders (docs/reviews/2026-11-15-plan-orders.md)', async () => {
    const plan = async (on: boolean, id: string) => {
      vi.stubEnv('PLAN_ROLES', on ? '1' : '0');
      // The engine default (the suites pin the legacy engine): the keys and the outlet last are on.
      vi.stubEnv('PLAN_KEYS', '1'); vi.stubEnv('PLAN_KEYS_2', '1'); vi.stubEnv('PLAN_KEYS_3', '1'); vi.stubEnv('OUTLET_LAST', '1');
      vi.resetModules();
      const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
      const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
      return installedPlan(PASS_BY_ID[id], 'gun_doubles_11')!;
    };
    // Hitch-cross keys the Mike between the shallow (low) and the cross (high), as Drive does.
    const hc = await plan(true, 'hitch_cross');
    expect(hc.key).toMatchObject({ role: 'hook', low: 'W2', high: 'S2' });
    expect((await plan(false, 'hitch_cross')).key).toBeNull();
    // Curl-flat: the strong side's pair, then the back, then the backside.
    const cf = await plan(true, 'curl_flat');
    expect(cf.order.slice(0, 3)).toEqual(['S2', 'S1', 'B']);
    expect((await plan(false, 'curl_flat')).order).not.toContain('B');
    // Comebacks (analogue): the authored progression as a declared pure order.
    expect((await plan(true, 'comebacks')).order.slice(0, 3)).toEqual(['S1', 'W1', 'S2']);
  }, 120000);
});
