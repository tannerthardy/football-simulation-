/** BALL_EST bit 2048 (the glance rule): no knowledge of the flight without the ball in his own eyes. On real plays,
 * every tick, a player with no sample of this flight has an empty belief (peek) and does not know it; one who knows it
 * has held it for at least his dwell; the belief is the flight plus a bounded error, never exact at range. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('BALL_EST glance (bit 2048)', () => {
  it('without the ball in his eyes he knows nothing of the flight; knowing it takes his dwell', async () => {
    vi.stubEnv('BALL_EST', '2049');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const B = await import('../src/sim/ball-estimate.js');
    let unseen = 0, known = 0, thrown = 0;
    for (const concept of ['four_verts', 'curl_flat', 'mesh']) for (let seed = 1; seed <= 4; seed++) {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3_match', concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        if (sim.ball.kind !== 'air') return;
        thrown++;
        for (const a of sim.agents) {
          const n = sim.ballEstimates.samplesOf(a);
          if (n === 0) {
            unseen++;
            expect(sim.ballEstimates.glanceKnows(a, sim)).toBe(false);
            // A prior (his route, the release he saw) may shape a belief; the flight's own path may not.
            const path = sim.ballEstimates.peek(a, sim);
            if (path.length) { const b = sim.ball.flight.pos; expect(Math.hypot(path[0].x - b.x, path[0].y - b.y)).toBeGreaterThan(1e-6); }
          }
          if (sim.ballEstimates.glanceKnows(a, sim)) {
            known++;
            expect(n).toBeGreaterThanOrEqual(2);
          }
        }
      };
      sim.run();
    }
    expect(thrown).toBeGreaterThan(0);
    expect(unseen).toBeGreaterThan(0);
    expect(known).toBeGreaterThan(0);
  }, 120_000);
  it('the error is larger in depth than across, grows with range and with time looked away, shrinks with time held', async () => {
    const { glanceSd } = await import('../src/sim/ball-estimate.js');
    const a = glanceSd(20, 0.5, 0, 0), far = glanceSd(40, 0.5, 0, 0), held = glanceSd(20, 0.5, 1, 0), away = glanceSd(20, 0.5, 0, 0.5);
    expect(a.depth).toBeGreaterThan(3 * a.across);
    expect(far.depth).toBeCloseTo(2 * a.depth, 6);
    expect(held.depth).toBeLessThan(a.depth);
    expect(away.depth).toBeCloseTo(2 * a.depth, 6);
    expect(glanceSd(20, 1, 0, 0).depth).toBeLessThan(glanceSd(20, 0, 0, 0).depth);
  });
});

describe('BALL_CALL heard call', () => {
  it('a call reaches only a defender within earshot of a teammate with the ball in his own samples, after the sound and his delay', async () => {
    vi.stubEnv('BALL_EST', '26657'); vi.stubEnv('HEAD_RIDE', '1'); vi.stubEnv('ACQ_SEEN', '1'); vi.stubEnv('TRACKED_CATCH', '1');
    vi.stubEnv('ARM_LOOK', '1'); vi.stubEnv('BALL_CALL', '1');
    // Pinned: with NECK_FULL on, these 12 plays leave no defender unsampled when a call is due (nothing to hear).
    vi.stubEnv('NECK_FULL', '0');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const { releaseBelief } = await import('../src/sim/release-belief.js');
    let calls = 0, deaf = 0;
    // Wider than the glance case: on engine-74 these coverages are needed for a call to be due at all.
    for (const coverage of ['cover3_match', 'cover2', 'cover4']) for (const concept of ['four_verts', 'curl_flat', 'mesh']) for (let seed = 1; seed <= 4; seed++) {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
      const tick = sim.tick.bind(sim), heard = new Set<any>();
      sim.tick = () => {
        tick();
        if (sim.ball.kind !== 'air') return;
        const E = sim.ballEstimates;
        for (const d of sim.defense) {
          const rb = releaseBelief(sim, d);
          const callers = sim.defense.filter((o: any) => o !== d && E.firstSeenAt(o) !== undefined
            && Math.hypot(sim.see(d, o).pos.x - d.pos.x, sim.see(d, o).pos.y - d.pos.y) <= 20 && E.firstSeenAt(o) + o.profile.reactionTime <= sim.t);
          // Checked on the tick he first holds it: the belief persists after, while the caller may run out of earshot.
          if (rb.source === 'call' && !heard.has(d)) { heard.add(d); calls++; expect(callers.length).toBeGreaterThan(0); expect(rb.releasedAt!).toBeGreaterThan(Math.min(...callers.map((o: any) => E.firstSeenAt(o)))); }
          // Deaf range and no sight: nothing heard, and the call never gives the flight itself.
          if (!callers.length && E.samplesOf(d) === 0 && !heard.has(d)) { deaf++; expect(rb.source).not.toBe('call'); }
          if (rb.source === 'call' && E.samplesOf(d) === 0) expect(E.glanceKnows(d, sim)).toBe(false);
        }
      };
      sim.run();
    }
    expect(calls).toBeGreaterThan(0);
    expect(deaf).toBeGreaterThan(0);
  }, 120000);
});
