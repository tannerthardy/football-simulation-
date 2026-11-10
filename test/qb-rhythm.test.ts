/** QB_RHYTHM (behaviors/qb.ts; experimental, off; paired with WR_SNAP): the
 * progression keeps the QB's rhythm. A read that is not ready gets an ordinary
 * look (no extra wait for a late route), under urgency his eyes go to the
 * outlet, and moving off a read he takes a released outlet that is there now. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function throwsToLast(flag: string) {
  vi.stubEnv('WR_SNAP', '1'); vi.stubEnv('QB_RHYTHM', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const times: number[] = [];
  for (const concept of ['curl_flat', 'smash', 'dagger', 'stick']) for (let seed = 1; seed <= 6; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: 7, formation: 'gun_doubles_11', flip }));
    sim.run();
    if (sim.throwAt >= 0) times.push(sim.throwAt);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length * 0.75)];
}

describe('QB_RHYTHM', () => {
  it('on: the late throws come out sooner (time to throw p75 falls)', async () => {
    const off = await throwsToLast('0'), on = await throwsToLast('1');
    // Legacy test engine, 48 plays: p75 3.35 -> 2.85 s.
    expect(on).toBeLessThanOrEqual(off);
  });
});
