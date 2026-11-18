/** ROUTE_VARY (src/sim/behaviors/receiver.ts; experimental, off): each rep's execution is drawn once from the play's
 * own stream, by his skill. Off, every receiver runs the drawn route (no depth shift, lean factor 1); on, the draws are
 * within their clips, the same seed draws the same rep, and different seeds draw different reps. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function draws(on: boolean, seed: number) {
  vi.stubEnv('ROUTE_VARY', on ? '1' : '0');
  vi.stubEnv('RELEASE_PLAN', '1');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'double_slants', seed, roster: 1, formation: 'gun_doubles_11', flip: false }));
  for (let i = 0; i < 5; i++) sim.tick();
  return sim.offense.filter((r: any) => r.behavior?.varyDepth !== undefined)
    .map((r: any) => ({ slot: r.slot, d: r.behavior.varyDepth, k: r.behavior.varyLean, l: r.behavior.varyLev }));
}

describe('ROUTE_VARY', () => {
  it('draws nothing off; on, bounded draws, repeatable by seed and different across seeds', async () => {
    const off = await draws(false, 1);
    expect(off.length).toBeGreaterThan(0);
    expect(off.every((x: any) => x.d === 0 && x.k === 1 && x.l === 0)).toBe(true);
    const a = await draws(true, 1), b = await draws(true, 1), c = await draws(true, 2);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.every((x: any) => Math.abs(x.d) <= 1.2 && x.k >= 0.2 && x.k <= 1.6 && Math.abs(x.l) <= 1.5)).toBe(true);
    expect(a.some((x: any) => x.d !== 0)).toBe(true);
  }, 120000);
});
