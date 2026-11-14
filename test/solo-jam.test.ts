/** SOLO_JAM (behaviors/defense.ts ManCoverage, behaviors/receiver.ts; experimental, off). Off is the unset path. */
import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function trace(flag?: string) {
  vi.resetModules();
  if (flag !== undefined) vi.stubEnv('SOLO_JAM', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: number[] = [];
  for (const coverage of ['cover1', 'cover3_mable']) for (let seed = 1; seed <= 3; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation: 'gun_trips_11', flip: false }));
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); for (const a of sim.agents) out.push(a.pos.x, a.pos.y); };
    sim.run();
  }
  return out;
}
describe('SOLO_JAM', () => {
  it('off: the unset path on every tick', async () => {
    const unset = await trace(), zero = await trace('0');
    expect(zero.length).toBeGreaterThan(1000);
    expect(zero).toEqual(unset);
  });
});
