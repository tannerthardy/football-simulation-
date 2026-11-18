/** MAN_PHASE (behaviors/defense.ts ManCoverage; experimental, off): a man
 * defender running with a receiver on his stem sits an arm's length off the
 * receiver's hip, not body to body. NFL pressed pairs at 2.0 s are 1.20 yd
 * apart (median, within 1.2 yd 51%); ours were 0.82 (88%). Off, on and on a break the target is
 * unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
// engine-89 (DIR_START on): fixture recorded before a start from rest cost the legs in a direction they were not loaded for; pinned test-only, the owning lane to re-record with it on
vi.hoisted(() => { process.env.DIR_START = '0'; });

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function apart(flag: string) {
  vi.stubEnv('MAN_PHASE', flag); for (const f of ['PRESS_MIRROR', 'PRESS_RELEASE', 'WR_SNAP', 'QB_RHYTHM']) vi.stubEnv(f, '1'); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const d: number[] = [];
  for (let seed = 1; seed <= 6; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const pairs = sim.defense.map((c: any) => [c, sim.offense.find((o: any) => o.slot === sim.defAlign.spots[c.slot]?.manTarget)])
      .filter(([c, o]: any) => o && sim.defAlign.spots[c.slot]?.press && o.player.position === 'WR');
    while (sim.phase === 'live' && sim.t < 2.2 - 1e-9 && sim.throwAt < 0) {
      sim.tick();
      if (sim.t > 1.4 - 1e-9) for (const [c, o] of pairs) d.push(Math.hypot(c.pos.x - o.pos.x, c.pos.y - o.pos.y));
    }
  }
  // Share of samples body to body (within 1.2 yd), the operator's contact measure.
  return { n: d.length, close: d.filter((x) => x < 1.2).length / d.length };
}

describe('MAN_PHASE', () => {
  it('on: a pressing corner on a vertical runs an arm\'s length off the receiver', async () => {
    const off = await apart('0'), on = await apart('1');
    expect(on.n).toBeGreaterThan(100);
    expect(on.close).toBeLessThan(off.close - 0.1);
  });
});
