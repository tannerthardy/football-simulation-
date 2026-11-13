/** END_CHASE (experimental, off): a backside edge whose line flows away with no
 * puller squeezes upfield into the backfield instead of sitting at his side of
 * the line (NFL: 0.6-0.7 yd in the backfield by 1.5 s on zone runs). */
import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function backsideEndDepth(flag: string) {
  vi.stubEnv('END_CHASE', flag); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const depths: number[] = []; let tagged = 0;
  for (const coverage of ['cover3', 'cover2']) for (let seed = 1; seed <= 4; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'oz_strong', seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const dir = sim.attackDir(sim.offense[0].team);
    const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map((s: string) => sim.slot(s)); const oy0 = OL.map((o: any) => o.pos.y);
    const ends = sim.defense.filter((d: any) => /^DE/.test(d.slot));
    let ps = 0;
    while (sim.phase === 'live' && sim.t < 1.5) { sim.tick(); if (!ps && sim.t >= 1) ps = Math.sign(OL.reduce((s: number, o: any, i: number) => s + o.pos.y - oy0[i], 0)); }
    if (sim.t < 1.5 - 1e-6 || !ps) continue;
    const cy = oy0.reduce((a: number, b: number) => a + b, 0) / 5;
    for (const e of ends) if ((e.pos.y - cy) * ps < 0 && !e.engagement) { depths.push((e.pos.x - sim.los) * dir); if (e.tags.has('end-chase')) tagged++; }
  }
  depths.sort((a, b) => a - b);
  return { median: depths[depths.length >> 1], n: depths.length, tagged };
}

describe('END_CHASE: the backside end chases upfield on a zone step away', () => {
  it('is in the backfield by 1.5 s with the flag and on his side of the line without', async () => {
    const on = await backsideEndDepth('1'), off = await backsideEndDepth('0');
    expect(on.n).toBeGreaterThan(0);
    expect(on.median).toBeLessThan(0);
    expect(off.median).toBeGreaterThan(on.median);
    expect(on.tagged).toBeGreaterThan(0);
    expect(off.tagged).toBe(0);
  }, 120_000);
});
