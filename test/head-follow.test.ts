/** HEAD_FOLLOW (src/sim/head.ts stepHeads; engine-93, Coverage C14 2026-11-24): perception never records a head the body
 * cannot hold. At every perception record of whole plays against man, match and zone calls (where defenders leave zone
 * eyes for man, pursuit or a return, and the passer blocks or pursues after the throw), every recorded head is within
 * the neck's range plus the trunk's twist of that player's body facing (145 deg standing). Off, a head nobody drove kept
 * its last direction while the body turned under it (up to 180 deg). Requests and records only; no outcome is asserted. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function worstOffset(flag: string): Promise<number> {
  vi.resetModules();
  vi.stubEnv('HEAD_FOLLOW', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { TRUNK_RANGE } = await import('../src/physics/kinematics.js');
  const { neckRange } = await import('../src/sim/head.js');
  let worst = 0;
  for (const coverage of ['cover1', 'cover3_match', 'cover0', 'cover2']) for (const concept of ['mesh', 'smash', 'four_verts']) for (const seed of [1, 2, 3]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: seed % 2 === 0 }));
    const rec = sim.recordPerception.bind(sim);
    sim.recordPerception = (...args: unknown[]) => {
      rec(...args);
      if (sim.phase !== 'live') return;
      for (const a of sim.agents) {
        if (a.head === null || a.head === undefined) continue;
        const off = Math.abs(Math.atan2(Math.sin(a.head - a.body.facing), Math.cos(a.head - a.body.facing)));
        worst = Math.max(worst, off - (neckRange(a) + TRUNK_RANGE));
      }
    };
    sim.run();
  }
  return worst * 180 / Math.PI;
}

describe('HEAD_FOLLOW: perception records only heads the body can hold', () => {
  it('on, every recorded head is within the neck plus the trunk twist of the body; off, some are not', async () => {
    const on = await worstOffset('1'), off = await worstOffset('0');
    expect(on).toBeLessThanOrEqual(1e-6);
    expect(off).toBeGreaterThan(10);
  }, 240_000);
});
