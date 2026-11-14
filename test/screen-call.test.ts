/** SCREEN_CALL (game/playcaller.ts; experimental, off): the quick screens and the screen RPO in the caller's pool, as
 * calls of their own at the NFL's rate for the down and distance (pool admission only). Over many calls of one team:
 * - off, no quick screen or RPO is ever called;
 * - on, quick screens come only from formations that fit them (bubble from trips, bunch now from bunch, now screen
 *   from 2x2, tunnel from 2x2 or trips), without motion, at a rate near the table's; the RPO only from 11 personnel in
 *   gun doubles, inside zone with the now screen tagged;
 * - the rest of the call is drawn as before: the non-screen calls keep their share of each concept. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function calls(flag: string, down: number, distance: number, n = 3000) {
  vi.resetModules();
  vi.stubEnv('SCREEN_CALL', flag);
  const { OffensiveCoordinator } = await import('../src/game/playcaller.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const team = generateTeam(new Rng(7), 'Ironmen', 'IRN', { strength: 0.55 }), defense = generateTeam(new Rng(8), 'Comets', 'COM', { strength: 0.55 });
  const oc = new OffensiveCoordinator(team, new Rng(11));
  const out: any[] = [];
  for (let i = 0; i < n; i++) out.push(oc.call({ down, distance, yardline: 40, quarter: 2, clock: 600, scoreDiff: 0, ballY: 26.6, hurry: false }, defense));
  return out;
}
const QUICK = new Set(['bubble_screen', 'bunch_now_screen', 'wide_now_screen', 'tunnel_screen']);

describe('SCREEN_CALL', () => {
  it('off: no quick screen or RPO is called', async () => {
    const off = await calls('0', 1, 10);
    expect(off.some((c) => c.kind === 'pass' && QUICK.has(c.pass.id))).toBe(false);
    expect(off.some((c) => c.rpo)).toBe(false);
  }, 60000);

  it('on: screens from formations that fit, without motion, near the rate; the RPO from gun doubles 11', async () => {
    const on = await calls('1', 2, 10);
    const passes = on.filter((c) => c.kind === 'pass'), screens = passes.filter((c) => QUICK.has(c.pass.id));
    expect(screens.length).toBeGreaterThan(20);
    for (const c of screens) {
      const t: string[] = c.formation.tags;
      expect(c.motion).toBeUndefined();
      if (c.pass.id === 'bunch_now_screen') expect(t).toContain('bunch');
      if (c.pass.id === 'bubble_screen') { expect(t).toContain('trips'); expect(t).not.toContain('bunch'); }
      if (c.pass.id === 'wide_now_screen') expect(t).toContain('2x2');
      if (c.pass.id === 'tunnel_screen') expect(t.includes('2x2') || (t.includes('trips') && !t.includes('bunch'))).toBe(true);
    }
    // 2nd and long: 0.055 of the calls whose formation fits (binomial; wide bounds).
    const fit = passes.filter((c) => { const t: string[] = c.formation.tags; return t.includes('2x2') || t.includes('trips') || t.includes('bunch'); });
    const rate = screens.length / fit.length;
    expect(rate).toBeGreaterThan(0.025); expect(rate).toBeLessThan(0.1);
    const rpo = on.filter((c) => c.rpo);
    expect(rpo.length).toBeGreaterThan(20);
    for (const c of rpo) { expect(c.formation.id).toBe('gun_doubles_11'); expect(c.run.id).toBe('iz_strong'); expect(c.rpo.id).toBe('wide_now_screen'); expect(c.kind).toBe('run'); }
  }, 60000);
});
