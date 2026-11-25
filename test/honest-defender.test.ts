/** The honest defender (BALL_EST 26657 with ACQ_SEEN, TRACKED_CATCH, ARM_LOOK and ARM_RUN; Coverage C14): no defender's decision
 * reads the true flight. On real plays, every read of `sim.ballPath` (the true path, acquireFlight's oracle copy) made
 * inside a defender's decision while the ball is in the air is counted; the honest arm makes none. The default
 * (receivers-only estimator, 6145) is the control: the same trap catches its defenders reading the true path. A
 * defender with no sample of the ball has no flight from the true path (the glance test's peek rule). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function trap(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let defReads = 0, airTicks = 0, unseen = 0;
  for (const concept of ['four_verts', 'curl_flat', 'mesh', 'double_slants']) for (let seed = 1; seed <= 3; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: seed % 2 ? 'cover3_match' : 'cover1', concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    let inDef = false, path = sim.ballPath;
    Object.defineProperty(sim, 'ballPath', {
      get() { if (inDef && sim.ball.kind === 'air') defReads++; return path; },
      set(v) { path = v; },
    });
    const decide = sim.decide.bind(sim);
    sim.decide = (i: number, t: number) => { inDef = sim.agents[i].team === 'D'; try { decide(i, t); } finally { inDef = false; } };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.ball.kind !== 'air') return;
      airTicks++;
      for (const a of sim.defense) {
        if (sim.ballEstimates.samplesOf(a) !== 0) continue;
        const est = sim.ballEstimates.peek(a, sim);
        if (!est.length) continue;
        unseen++;
        const b = sim.ball.flight.pos;
        expect(Math.hypot(est[0].x - b.x, est[0].y - b.y)).toBeGreaterThan(1e-6);
      }
    };
    sim.run();
  }
  return { defReads, airTicks, unseen };
}

describe('the honest defender: no decision reads the true flight', () => {
  it('honest arm: zero true-path reads in defenders\' decisions in flight', async () => {
    const r = await trap({ BALL_EST: '26657', ACQ_SEEN: '1', TRACKED_CATCH: '1', ARM_LOOK: '1', ARM_RUN: '1' });
    expect(r.airTicks).toBeGreaterThan(0);
    expect(r.defReads).toBe(0);
  }, 180_000);
  it('control: the receivers-only default lets defenders read it (the trap works)', async () => {
    const r = await trap({ BALL_EST: '6145' });
    expect(r.airTicks).toBeGreaterThan(0);
    expect(r.defReads).toBeGreaterThan(0);
  }, 180_000);
});
