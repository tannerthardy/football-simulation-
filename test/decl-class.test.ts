/** DECL_CLASS (experimental, off; with DECLARED_BREAK): a route with a declared break takes its class from its declaration
 * (src/playbook/read-compiler/features.ts), not from the half second after its break. On the engine defaults (the stack's
 * flags stubbed on, as craft-hold.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function compiled(on: boolean, concept: string, flip: boolean) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('DECL_CLASS', on ? '1' : '0');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { compile } = await import('../src/playbook/read-compiler/compile.js');
  const p = compile(PASS_BY_ID[concept], 'gun_doubles_11', flip, generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 }));
  return { plan: p.chosen && { style: p.chosen.style, order: p.chosen.order.map((s) => s.ref) }, routes: p.routes };
}

describe('DECL_CLASS', () => {
  it('a declared vertical is a vertical; a cut is a vertical only if the leg leaving its vertex runs downfield', async () => {
    const { routes } = await compiled(true, 'pa_flood', false);
    const cls = Object.fromEntries(routes.map((r) => [r.routeId, r.declaredClass]));
    expect(cls.go).toBe('vertical');
    expect(cls.deep_out).toBe('breaking');
    const quick = await compiled(true, 'slant_flat', false);
    expect(quick.routes.find((r) => r.routeId === 'slant')?.declaredClass).toBe('breaking');
    const off = await compiled(false, 'pa_flood', false);
    expect(off.routes.every((r) => r.declaredClass === undefined)).toBe(true);
  }, 120000);

  it("pa_flood's deep out no longer tips the plan: the formation and its mirror compile the same plan", async () => {
    const a = await compiled(true, 'pa_flood', false), b = await compiled(true, 'pa_flood', true);
    expect(a.plan).toEqual(b.plan);
  }, 120000);
});
