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
  it("the quarterback's forecast times a crosser on his declared rule, not on a speed waypoint", async () => {
    // y_cross's cross eases to s .85 at 14 yd across the field; off, the forecast took that waypoint as his break
    // (about 4.8 s), so the read was never ready while the QB looked at it.
    const at = async (on: boolean) => {
      vi.stubEnv('DECLARED_BREAK', on ? '1' : '0');
      vi.resetModules();
      const { Rng } = await import('../src/core/rng.js');
      const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
      const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
      const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
      const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
      const { getRoute } = await import('../src/playbook/routes.js');
      const { PlaySim } = await import('../src/sim/playsim.js');
      const { installReceiverRoute, ReceiverForecast } = await import('../src/sim/receiver-forecast.js');
      const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(91), 'O', 'O'), '11'), defense: pickDefense(generateTeam(new Rng(92), 'D', 'D'), 'nickel'), seed: 45,
        offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.y_cross, label: 'y_cross' },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: 'Over Cover 3' },
        los: 40, ballY: 26, firstDownX: 50, audibles: false });
      const r = sim.offense.find((o) => (o.behavior as any)?.route?.id === 'cross')!;
      const route = installReceiverRoute(r.pos, sim.los, (r.behavior as any).outside, getRoute('cross'), 0, r.profile, r.r('routeRunning'));
      return new ReceiverForecast({}, route, 0.05).breakAt();
    };
    const off = await at(false), on = await at(true);
    expect(off).toBeGreaterThan(3.5);
    expect(on).not.toBeNull();
    expect(on!).toBeLessThan(2.2);
  }, 120000);
});
