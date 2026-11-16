/** SCREEN_DECLARE (src/playbook/read-compiler/features.ts; experimental, off): a screen route with a break declares on it,
 * ahead of `moved` (5 yd with the line crossed, which a screen behind the line may never reach). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function bubbleReady(on: boolean) {
  vi.stubEnv('SCREEN_DECLARE', on ? '1' : '0');
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { SCREEN_BY_ID } = await import('../src/playbook/concepts.js');
  const { sampleRoutes } = await import('../src/playbook/read-compiler/features.js');
  const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
  const s = sampleRoutes(SCREEN_BY_ID.bubble_screen, 'gun_trips_11', false, off, def);
  const r = s.routes.find((x) => x.ref === 'S2')!;
  return { ready: r.window.ready, breakT: r.breakT };
}

describe('SCREEN_DECLARE', () => {
  it("the trips bubble declares on his turn up (its break), not on crossing the line 5 yd from his start", async () => {
    const off = await bubbleReady(false), on = await bubbleReady(true);
    console.log(`bubble S2 ready: off ${off.ready}, on ${on.ready}; break ${on.breakT}`);
    expect(on.breakT).not.toBeNull();
    expect(on.ready).toBeLessThan(off.ready - 0.5);
    expect(on.ready).toBeLessThanOrEqual(Math.max(on.breakT! + 0.1, 0) + 0.3);
  }, 120000);
});
