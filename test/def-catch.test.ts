/** DEF_CATCH (src/sim/catching.ts defenderCatch) and BALL_SIGHT's sight test: a defender who reaches a ball he sees
 * makes a catch attempt through the receiver's hands model, and only if his time from first seeing this flight covers
 * his reaction and his hands' travel to it. Staged like test/blind-defender.test.ts: a ball passes a corner at chest
 * height 0.8 yd to his side, with no receiver near; every dice roll is pinned to u, swept over a grid.
 *  - Seen early (the flight in his view 0.5 s before it reaches him): he plays it; some of it he catches, some he breaks
 *    up, some he misses.
 *  - Seen only as it reaches him (his first sight on the same tick): no time to react; nothing happens.
 *  - His back to the ball (BALL_SIGHT): he does not see it, so he does not play it with his hands. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function scene(facing: number, seenEarly: boolean) {
  vi.resetModules();
  vi.stubEnv('DEF_CATCH', '1'); vi.stubEnv('BALL_SIGHT', '1');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  PlaySim.recordedSingleStream = true;
  const out: string[] = [];
  for (let i = 0; i < 40; i++) {
    const u = (i + 0.5) / 40;
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
      defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
      los: 40, ballY: 26, firstDownX: 50, seed: 1 });
    const r = sim.slot('X')!;
    for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
    r.body.pos = { x: 62, y: 26 }; r.body.facing = Math.PI; // the target, well downfield of the window
    const cb = sim.defense.find(d => d.player.position === 'CB')!;
    cb.body.pos = { x: 49.4, y: 26.8 }; cb.body.facing = facing; cb.tags.delete('looking');
    sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 61.7, y: 26, z: 1.3 }, 1.0);
    if (seenEarly) {
      // The flight in his view half a second earlier, far from anyone: his first sight of it.
      sim.t = 0.5;
      resolveCatchOpportunities(sim, { x: 41, y: 26, z: 1.3 }, { x: 42, y: 26, z: 1.3 });
    }
    sim.t = 1.0;
    sim.rng.next = () => u;
    const events: string[] = []; const ev = sim.event.bind(sim);
    (sim as any).event = (type: string, a: any, b: any, note?: string) => { if (a === cb) events.push(type); return (ev as any)(type, a, b, note); };
    resolveCatchOpportunities(sim, { x: 48.4, y: 26, z: 1.3 }, { x: 50.3, y: 26, z: 1.3 });
    const picked = sim.ball.kind === 'held' && sim.ball.carrier === cb;
    out.push(picked ? 'int' : events[0] ?? 'none');
  }
  const share = (k: string) => out.filter(x => x === k).length / out.length;
  return { int: share('int'), pbu: share('pbu'), none: share('none') };
}

describe('DEF_CATCH: a defender catches what he reaches in time', () => {
  it('facing the ball, seen early: he plays it, and catches some of it', async () => {
    const s = await scene(Math.PI, true);
    expect(s.int).toBeGreaterThan(0.1);
    expect(s.int + s.pbu).toBeGreaterThan(0.3);
  }, 60_000);
  it('facing the ball, first seen as it reaches him: no time, nothing happens', async () => {
    const s = await scene(Math.PI, false);
    expect(s.none).toBe(1);
  }, 60_000);
  it('his back to the ball (BALL_SIGHT): he does not see it and does not play it', async () => {
    const s = await scene(0, true);
    expect(s.int + s.pbu).toBe(0);
  }, 60_000);
});
