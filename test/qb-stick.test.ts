/** QB_STICK (behaviors/qb.ts): Integration's item (iii), pump part 1, 2026-11-18. A started throw sticks: every pump
 * is on a perceived change since the decision (a defender now on the catch point or in the lane, the receiver down or
 * off his route), recorded by cause, and there are fewer pumps than when re-pricing the same picture pulled throws. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function pumps(flag: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(stack.flags as Record<string, string>)) if (v === 'on') vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('QB_STICK', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let n = 0, caused = 0;
  for (const concept of ['four_verts', 'dagger', 'smash', 'flood']) for (const coverage of ['cover2', 'cover3']) for (const roster of [3, 7]) for (const seed of [1, 2, 3]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false }));
    let b: any = null; const tick0 = sim.tick.bind(sim);
    sim.tick = () => { tick0(); if (sim.qb.behavior?.kind === 'qb-pass') b = sim.qb.behavior; };
    try { sim.run(); } catch { /* a play that cannot finish staging */ }
    n += sim.events.filter((e: any) => e.type === 'pump').length;
    if (b) caused += Object.values((b.stickPumps ?? {}) as Record<string, number>).reduce((s, x) => s + x, 0);
  }
  return { n, caused };
}

describe('QB_STICK', () => {
  it('pumps only on a recorded perceived change, and fewer than re-pricing did', async () => {
    const on = await pumps('1'), off = await pumps('0');
    expect(off.n).toBeGreaterThan(0);
    expect(on.n).toBeLessThan(off.n);
    expect(on.caused).toBe(on.n);
  }, 600_000);
});
