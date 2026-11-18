/** STEM_WORK (src/sim/behaviors/receiver.ts; experimental, off): the stem is worked toward the leverage of the defender
 * over him, decided once from his own picture, and bounded so his route's points are unchanged. Hitch-heavy quick game
 * against Cover 3: on, some stems take an offset and none re-decides; off, none does. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(on: boolean) {
  vi.stubEnv('STEM_WORK', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'curl_flat', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  const first = new Map<any, number>(); let changed = 0;
  const points = new Map<any, string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const r of sim.offense) {
      const b = r.behavior; if (!b || b.stemWork === undefined) continue;
      if (!points.has(r) && b.route) points.set(r, JSON.stringify(b.route.points));
      if (b.stemWork === null) continue;
      if (!first.has(r)) first.set(r, b.stemWork); else if (first.get(r) !== b.stemWork) changed++;
    }
  };
  sim.run();
  const routesSame = [...points.entries()].every(([r, p]) => JSON.stringify(r.behavior?.route?.points ?? JSON.parse(p)) === p);
  return { offsets: [...first.values()], changed, routesSame };
}

describe('STEM_WORK', () => {
  it('decides each stem once, works some toward a defender, and leaves the route points alone', async () => {
    const off = await run(false), on = await run(true);
    expect(off.offsets.every((o) => o === 0) || off.offsets.length === 0).toBe(true);
    expect(on.offsets.some((o) => o !== 0)).toBe(true);
    expect(on.offsets.every((o) => Math.abs(o) <= 1.5)).toBe(true);
    expect(on.changed).toBe(0);
    expect(on.routesSame).toBe(true);
  }, 120000);
});
