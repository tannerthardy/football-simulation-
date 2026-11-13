/** LB_GUARD_STEP (defense.ts / run-fits.ts, experimental, off): an unsure box
 * backer whose guards both step the same way (no pass set) steps with them,
 * read at their first visible movement. Runs: backers flow earlier. Dropbacks:
 * guards setting back give no step. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string, concept: string) {
  vi.stubEnv('LB_GUARD_STEP', flag); vi.stubEnv('LB_LINE_FLOW', '1'); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  let tagged = 0, n = 0, lat = 0, m = 0;
  for (let seed = 1; seed <= 6; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: 7, formation: 'gun_doubles_11', flip }) as any);
    const lbs = sim.defense.filter((d: any) => /LB/.test(d.slot)); const ol = ['LT', 'LG', 'C', 'RG', 'RT'].map((s: string) => sim.slot(s)); const y0 = ol.map((o: any) => o.pos.y);
    const seen = new Set<any>();
    while (sim.phase === 'live' && sim.t < 0.6) { sim.tick();
      for (const d of lbs) if (d.tags.has('lb-guard-step')) seen.add(d);
      if (Math.abs(sim.t - 0.6) < sim.dt) { const ps = Math.sign(ol.reduce((a: number, o: any, i: number) => a + o.pos.y - y0[i], 0)); for (const d of lbs) { lat += d.vel.y * ps; m++; } } }
    tagged += seen.size; n += lbs.length;
  }
  return { share: tagged / n, lat: lat / Math.max(m, 1) };
}

describe('LB_GUARD_STEP: guards to backs', () => {
  it('on outside zone, backers flow with the guards earlier with the flag', async () => {
    const on = await run('1', 'oz_strong'), off = await run('0', 'oz_strong');
    expect(on.share).toBeGreaterThan(0.3);
    expect(off.share).toBe(0);
    expect(on.lat).toBeGreaterThan(off.lat);
  }, 120_000);
  it('on a dropback, guards setting back rarely give a step', async () => {
    const pass = await run('1', 'smash'), oz = await run('1', 'oz_strong');
    expect(pass.share).toBeLessThan(oz.share / 2);
  }, 120_000);
});
