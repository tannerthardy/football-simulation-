// SIGHT_BALL (Flex with Coverage and Defense, 2026-11-25): one definition of a player's own sight of the ball. A glimpse is the
// ball in his head's view cone with a clear line; sight is the same within his eye range; "sees it now" is a sample this tick
// or the last, the hands gate, which a look he has turned away from does not pass.
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function scene() {
  vi.stubEnv('SIGHT_BALL', '1'); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const be = await import('../src/sim/ball-estimate.js');
  const sim = new PlaySim({ ...nativeTraceSetup({ coverage: 'cover3', concept: 'stick', seed: 7, roster: 7, formation: 'gun_doubles_11', flip: false }), audibles: false }) as any;
  const d = sim.slot('LB_W')!, other = sim.slot('LB_M')!;
  for (const a of sim.agents) { a.body.vel = { x: 0, y: 0 }; if (a !== d && a !== other) a.body.pos = { x: 10, y: 1 + (a.idx % 20) * 0.5 }; }
  d.body.pos = { x: 45, y: 26 }; d.body.facing = Math.PI; d.head = Math.PI; other.body.pos = { x: 60, y: 1 };
  for (let i = 0; i < 6; i++) sim.recordPerception();
  return { sim, d, other, be };
}

describe('SIGHT_BALL: one definition of sight of the ball', () => {
  it('a glimpse needs the view cone and a clear line; sight needs the eye range', async () => {
    const { sim, d, other, be } = await scene();
    const ball = { x: 38, y: 26, z: 2 }; // straight ahead of his head, 7 yd
    expect(be.glimpsesBall(sim, d, 0, ball)).toBe(true);
    expect(be.seesBallAt(sim, d, 0, ball)).toBe(true);
    const wide = { x: 41, y: 22, z: 2 }; // about 45 deg off his head: in view, not in his eye range
    expect(be.glimpsesBall(sim, d, 0, wide)).toBe(true);
    expect(be.seesBallAt(sim, d, 0, wide)).toBe(false);
    expect(be.glimpsesBall(sim, d, 0, { x: 50, y: 26, z: 2 })).toBe(false); // behind him
    other.body.pos = { x: 42, y: 26 }; sim.recordPerception(); // a body across the line
    expect(be.glimpsesBall(sim, d, 0, ball)).toBe(false);
    expect(be.seesBallAt(sim, d, 0, ball)).toBe(false);
  });

  it('the hands gate: a defender who looked and turned away has an estimate but does not see the ball', async () => {
    vi.stubEnv('BALL_EST', '2049'); vi.stubEnv('SIGHT_BALL', '1'); vi.resetModules();
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    let away = 0, readyAway = 0, seesAway = 0;
    for (const [concept, coverage] of [['curl_flat', 'cover3'], ['stick', 'cover3'], ['slant_flat', 'cover1']] as const) for (let seed = 1; seed <= 6; seed++) {
      const sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false })) as any;
      for (let i = 0; i < 400 && sim.phase === 'live'; i++) {
        sim.tick();
        if (sim.ball.kind !== 'air') continue;
        const b = sim.ball.flight.pos;
        for (const a of sim.defense) {
          if (!sim.ballEstimates.samplesOf(a)) continue;
          const h = a.head ?? a.facing, brg = Math.atan2(b.y - a.pos.y, b.x - a.pos.x);
          if (Math.abs(Math.atan2(Math.sin(brg - h), Math.cos(brg - h))) < Math.PI / 2) continue;
          away++; if (sim.ballEstimates.hasEstimate(a, sim)) readyAway++; if (sim.ballEstimates.seesBall(a, sim)) seesAway++;
        }
      }
    }
    expect(away).toBeGreaterThan(20);
    expect(readyAway / away).toBeGreaterThan(0.1); // "has an estimate" survives the turn
    expect(seesAway / away).toBeLessThan(0.05); // "sees it now" does not
  }, 300_000);
});
