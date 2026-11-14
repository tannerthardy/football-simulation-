/** CUT_WALL (coverage/rules.ts cutWall, techniques.ts CrossWall; experimental, off). Off is the unset path on every
 * tick; on, a hook defender against a shallow crosser walls him (CrossWall) rather than carrying him man. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function trace(flag?: string, onTick?: (sim: any) => void) {
  vi.resetModules();
  if (flag !== undefined) vi.stubEnv('CUT_WALL', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: number[] = [];
  for (const coverage of ['cover3_match', 'cover2_match']) for (let seed = 1; seed <= 3; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'mesh', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); onTick?.(sim); for (const a of sim.agents) out.push(a.pos.x, a.pos.y); };
    sim.run();
  }
  return out;
}

describe('CUT_WALL', () => {
  it('off: the unset path on every tick', async () => {
    const unset = await trace(), zero = await trace('0');
    expect(zero.length).toBeGreaterThan(1000);
    expect(zero).toEqual(unset);
  });
  it('on: a hook walls a shallow crosser instead of carrying him man', async () => {
    const seen = new Set<string>();
    await trace('1', (sim) => { for (const d of sim.defense) { const n = d.behavior?.sub?.constructor?.name; if (n) seen.add(n); } });
    expect(seen.has('CrossWall')).toBe(true);
  });
});
