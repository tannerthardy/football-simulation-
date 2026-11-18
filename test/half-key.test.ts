/** HALF_KEY (src/sim/behaviors/defense.ts; experimental, off): the Cover 2 half safety keys #1 to #2 (HNFL-334/-097).
 * Smash against Cover 2 from doubles: his #1 runs the hitch, his #2 the corner. On, he reads #1 cancelled and #2
 * vertical from what he sees and ends nearer #2 than with the key off; off, he never reads. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(on: boolean) {
  vi.stubEnv('HALF_KEY', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'smash', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  let read: string[] | null = null, frac = NaN;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.throwAt >= 0 || sim.t > 2.95 || sim.t < 2.85) return;
    const d = sim.defense.find((x: any) => x.behavior?.zone === 'deep_half_s');
    const n = sim.offAlign.numbering;
    const r1 = sim.offense.find((r: any) => r.slot === n.S1), r2 = sim.offense.find((r: any) => r.slot === n.S2);
    read = [...d.behavior.halfKey.c];
    frac = (d.pos.y - r2.pos.y) / (r1.pos.y - r2.pos.y);
  };
  sim.run();
  return { read, frac };
}

describe('HALF_KEY', () => {
  it('reads #1 cancelled and #2 vertical, and plays nearer #2 than without the key', async () => {
    const off = await run(false), on = await run(true);
    expect(off.read).toEqual(['?', '?']);
    expect(on.read).toEqual(['C', 'V']);
    expect(on.frac).toBeLessThan(off.frac - 0.05);
  }, 120000);
});
