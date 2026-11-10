/** THROW_HORIZON (coverage-leverage.ts DeepCoverage.choose; experimental,
 * off): a defender protecting depth judges safety against a throw made now
 * (his reaction plus the throw's natural flight), not an endless race, and
 * takes the slowest safe pace. Over a receiver who throttles underneath him,
 * he stops bailing instead of racing on; a vertical still takes him deep. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Median downfield speed of deep-protecting zone defenders (deep thirds and
 * quarters) at time `at`, before any throw. */
async function deepPace(flag: string, concept: string, coverage: string, at: number) {
  vi.stubEnv('THROW_HORIZON', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const v: number[] = [];
  for (let seed = 1; seed <= 4; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const dir = sim.attackDir(sim.offense[0].team);
    while (sim.phase === 'live' && sim.t < at - 1e-9) sim.tick();
    if (sim.throwAt >= 0) continue;
    for (const d of sim.defense) if (/^(CB|S)/.test(d.slot) && (d.pos.x - sim.los) * dir > 7) v.push(d.vel.x * dir);
  }
  v.sort((a, b) => a - b);
  return { n: v.length, p50: v[Math.floor(v.length / 2)] };
}

describe('THROW_HORIZON', () => {
  it('on: deep defenders over curls stop racing before the throw', async () => {
    const off = await deepPace('0', 'curl_flat', 'cover3', 1.8), on = await deepPace('1', 'curl_flat', 'cover3', 1.8);
    // Legacy test engine at 1.8 s: 5.56 -> 4.06 yd/s.
    expect(on.n).toBeGreaterThan(8);
    expect(on.p50).toBeLessThan(off.p50 - 0.3);
  });

  it('on: four verticals still take them deep', async () => {
    const off = await deepPace('0', 'four_verts', 'cover3', 1.8), on = await deepPace('1', 'four_verts', 'cover3', 1.8);
    // 5.66 -> 4.19 yd/s: they spend cushion on verticals too (the stutter-go cost).
    expect(on.p50).toBeGreaterThan(3);
  });
});
