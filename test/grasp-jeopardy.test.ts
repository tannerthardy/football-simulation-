/** GRASP_JEOPARDY (tackle.ts; experimental, off): the in-the-grasp whistle
 * is the rule's exception. A pocket QB in a tackler's control is ruled down
 * on the spot only when his safety is in jeopardy (his body going down);
 * otherwise, as for any runner, it takes stopped forward progress (0.8 s
 * held without gaining ground) or a fall. Off, any firm hold of 0.25 s on an
 * upright pocket QB is a sack. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Every sack after a hold on the QB: how long he was held, and whether he
 * was still upright on the last live tick before the whistle. */
async function sacks(flag: string) {
  vi.stubEnv('GRASP_JEOPARDY', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { held: number; upright: boolean }[] = [];
  for (const concept of ['four_verts', 'pa_shot', 'smash']) for (const coverage of ['cover1', 'cover3', 'cover0']) for (let seed = 1; seed <= 12; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
    let start = -1, upright = false;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.phase !== 'live') return;
      const held = sim.bond?.carrier === sim.qb;
      if (held && start < 0) start = sim.t;
      upright = held && sim.qb.body.support?.state === 'up';
    };
    const r = sim.run();
    const sack = r.events.find((e: any) => e.type === 'sack');
    if (sack && start >= 0) out.push({ held: sack.t - start, upright });
  }
  return out;
}

describe('GRASP_JEOPARDY', () => {
  it('off: a firmly held pocket QB is ruled down upright almost at once', async () => {
    const s = await sacks('0');
    expect(s.some((x) => x.upright && x.held < 0.5)).toBe(true);
  });

  it('on: an upright held QB is down only once his progress has stopped; the rest are takedowns', async () => {
    const s = await sacks('1');
    expect(s.length).toBeGreaterThan(0);
    // STALL (0.8 s, tackle.ts) less one tick of whistle timing.
    for (const x of s) if (x.upright) expect(x.held).toBeGreaterThanOrEqual(0.75);
    expect(s.some((x) => !x.upright)).toBe(true);
  });
});
