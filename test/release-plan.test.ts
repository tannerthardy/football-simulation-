/** RELEASE_PLAN (src/sim/behaviors/receiver.ts; experimental, off): the release off the line is chosen once at the snap
 * from the man's leverage and the route's break side. Slants against Cover 1 from doubles: on, each release is decided
 * once, a slant against outside leverage releases inside, and the route's points are unchanged; off, none plans. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(on: boolean) {
  vi.stubEnv('RELEASE_PLAN', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'double_slants', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  const first = new Map<any, number>(); let changed = 0;
  const points = new Map<any, string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const r of sim.offense) {
      const b = r.behavior; if (!b || b.releasePlan === undefined) continue;
      if (!points.has(r) && b.route) points.set(r, JSON.stringify(b.route.points));
      if (b.releasePlan === null) continue;
      if (!first.has(r)) first.set(r, b.releasePlan); else if (first.get(r) !== b.releasePlan) changed++;
    }
  };
  sim.run();
  const routesSame = [...points.entries()].every(([r, p]) => JSON.stringify(r.behavior?.route?.points ?? JSON.parse(p)) === p);
  return { plans: [...first.values()], changed, routesSame };
}

describe('RELEASE_PLAN', () => {
  it('decides each release once, within a yard of the first leg, and leaves the route points alone', async () => {
    const off = await run(false), on = await run(true);
    expect(off.plans.length).toBe(0);
    expect(on.plans.length).toBeGreaterThan(0);
    expect(on.plans.every((p) => Math.abs(p) <= 1)).toBe(true);
    expect(on.changed).toBe(0);
    expect(on.routesSame).toBe(true);
  }, 120000);
});
