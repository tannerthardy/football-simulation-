/** SINK_LEAD (defense.ts, experimental, off): a front lineman who sees a
 * blocker closing lowers his pads in time to meet him at the pad level he
 * plays blocks with. Off: he arrives at his running pad level. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function contactPosture(flag: string) {
  vi.stubEnv('SINK_LEAD', flag); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const at: number[] = [];
  for (let seed = 1; seed <= 4; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'iz_strong', seed, roster: 7, formation: 'gun_doubles_11', flip }) as any);
    const dl = sim.defense.filter((d: any) => /^(DE|DT)/.test(d.slot)); const seen = new Set<any>();
    while (sim.phase === 'live' && sim.t < 1.5) { sim.tick(); for (const d of dl) if (d.engagement && !seen.has(d)) { seen.add(d); at.push(d.body.support.posture); } }
  }
  return at.reduce((a, b) => a + b, 0) / at.length;
}

describe('SINK_LEAD: low man at contact', () => {
  it('front linemen meet their first block lower with the flag', async () => {
    const on = await contactPosture('1'), off = await contactPosture('0');
    expect(on).toBeGreaterThan(off + 0.1);
    expect(on).toBeGreaterThan(0.5);
  }, 120_000);
});
