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
});
