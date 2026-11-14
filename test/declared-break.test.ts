/** DECLARED_BREAK (src/playbook/route-breaks.ts, read-compiler/features.ts, receiver-forecast.ts; experimental, off). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function sample(on: boolean, concept: string, form: string) {
  vi.stubEnv('DECLARED_BREAK', on ? '1' : '0');
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { PASS_BY_ID, SCREEN_BY_ID } = await import('../src/playbook/concepts.js');
  const { sampleRoutes } = await import('../src/playbook/read-compiler/features.js');
  const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
  return sampleRoutes((PASS_BY_ID as any)[concept] ?? (SCREEN_BY_ID as any)[concept], form, false, off, def);
}

describe('DECLARED_BREAK', () => {
  it("anchors a plant to today's window, and times a settle route by its install, not its speed", async () => {
    const off = await sample(false, 'hitches', 'gun_doubles_11'), on = await sample(true, 'hitches', 'gun_doubles_11');
    for (const r of on.routes.filter((x) => x.routeId === 'hitch')) {
      const o = off.routes.find((x) => x.ref === r.ref)!;
      expect(r.declaredBreak?.throwFamily).toBe('onBreak');
      expect(Math.abs(r.window.ready - o.window.ready)).toBeLessThanOrEqual(0.11);
      expect(r.settles).toBe(true);
    }
  }, 120000);
  it('a now screen is ready at the snap rather than never', async () => {
    const off = await sample(false, 'wide_now_screen', 'gun_doubles_11'), on = await sample(true, 'wide_now_screen', 'gun_doubles_11');
    const r = on.routes.find((x) => x.routeId === 'now_screen')!, o = off.routes.find((x) => x.ref === r.ref)!;
    expect(o.window.ready).toBeGreaterThan(3.5);
    expect(r.window.ready).toBeLessThan(2);
    expect(r.declaredBreak?.breakWarn).toBe(true);
  }, 120000);
});
