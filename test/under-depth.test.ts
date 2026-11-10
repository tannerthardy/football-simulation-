/** UNDER_DEPTH (defense.ts ZoneCoverage.underCap; experimental, off): an
 * underneath zone dropper takes depth with the routes he sees in his area,
 * not to a fixed landmark over nobody. Tracked hook defenders on shotgun
 * dropbacks let the routes climb to them (lead over the deepest receiver
 * within 6 yd: 5.2 yd at 1.0 s, 0.2 yd at 2.5 s, BDB 2025 weeks 1-3); a
 * vertical through the zone still takes him deep. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const OL = ['LT', 'LG', 'C', 'RG', 'RT'];

/** Median hook-dropper depth and lead over the deepest receiver within 6 yd
 * of him laterally, at time `at`, before any throw. */
async function hooks(flag: string, concept: string, at: number) {
  vi.stubEnv('UNDER_DEPTH', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { ZoneCoverage } = await import('../src/sim/behaviors/defense.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const depth: number[] = [], lead: number[] = [];
  for (let seed = 1; seed <= 4; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const dir = sim.attackDir(sim.offense[0].team);
    while (sim.phase === 'live' && sim.t < at - 1e-9) sim.tick();
    if (sim.throwAt >= 0) continue;
    for (const d of sim.defense) {
      const b = d.behavior;
      if (!(b instanceof ZoneCoverage) || b.deep || !String(b.zone).startsWith('hook')) continue;
      const dd = (d.pos.x - sim.los) * dir;
      const near = sim.offense.filter((o: any) => o !== sim.qb && !OL.includes(o.slot) && Math.abs(o.pos.y - d.pos.y) < 6).map((o: any) => (o.pos.x - sim.los) * dir);
      depth.push(dd);
      if (near.length) lead.push(dd - Math.max(...near));
    }
  }
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  return { n: depth.length, depth: med(depth), lead: med(lead) };
}

describe('UNDER_DEPTH', () => {
  it('on: hook droppers stay with short routes instead of running to the landmark', async () => {
    const off = await hooks('0', 'stick', 2.0), on = await hooks('1', 'stick', 2.0);
    expect(on.n).toBeGreaterThan(3);
    // Legacy test engine, stick at 2.0 s: depth 6.61 -> 5.58, lead 0.88 -> 0.16.
    expect(on.depth).toBeLessThan(off.depth - 0.5);
    expect(on.lead).toBeLessThan(off.lead - 0.4);
  });

  it('on: a vertical through the hook still takes him deep', async () => {
    const off = await hooks('0', 'four_verts', 2.0), on = await hooks('1', 'four_verts', 2.0);
    expect(on.n).toBeGreaterThan(3);
    // Four verticals at 2.0 s: depth 7.09 -> 6.12, lead 0.25 -> -0.42 (under the seam, not left by it).
    expect(on.depth).toBeGreaterThan(off.depth - 1.5);
    expect(on.lead).toBeGreaterThan(-1.5);
  });
});
