/** A defender who does not see the ball cannot play it with his hands (catching.ts defenderPlay). Staged like
 * test/catch-hands.test.ts: a ball passes a defender at chest height with no receiver in the window; every dice
 * roll is pinned to u, swept over a grid. Blind and within arm's reach but clear of his body: nothing happens
 * (before, 12% of u broke it up). Blind with the ball through his body: it comes off him, recorded as a
 * deflection off his body, not a PBU or a pass defensed. Facing the ball: he plays it as before. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stageSight } from './helpers/hands-sight.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function scene(dy: number, facing: number) {
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  PlaySim.recordedSingleStream = true;
  const out: string[] = []; const defended: unknown[] = [];
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
    cb.body.pos = { x: 49.4, y: 26 + dy }; cb.body.facing = facing; cb.tags.delete('looking');
    sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 61.7, y: 26, z: 1.3 }, 1.0);
    sim.t = 1.0;
    if (facing === Math.PI) stageSight(sim, cb); // HANDS_SEEN: the facing defender has seen the ball coming
    sim.rng.next = () => u;
    const events: string[] = []; const ev = sim.event.bind(sim);
    (sim as any).event = (type: string, a: any, b: any, note?: string) => { if (a === cb) events.push(type + (note ? `:${note}` : '')); return (ev as any)(type, a, b, note); };
    resolveCatchOpportunities(sim, { x: 48.4, y: 26, z: 1.3 }, { x: 50.3, y: 26, z: 1.3 });
    const picked = sim.ball.kind === 'held' && sim.ball.carrier === cb;
    out.push(picked ? 'int' : events[0] ?? 'none');
    defended.push(sim.stats.passDefendedBy);
  }
  const share = (k: string) => out.filter(x => x.startsWith(k)).length / out.length;
  return { out, none: share('none'), pbu: share('pbu'), body: share('deflection:off his body'), int: share('int'),
    defended: defended.filter(Boolean).length };
}

describe('blind defender', () => {
  it('back to the ball, within arm\'s reach but clear of his body: no play on it', async () => {
    const s = await scene(0.8, 0);
    expect(s.none).toBe(1);
  });
  it('back to the ball, the ball through his body: it comes off him, not a PBU', async () => {
    const s = await scene(0.1, 0);
    expect(s.body).toBe(1);
    expect(s.pbu).toBe(0);
    expect(s.defended).toBe(0);
  });
  it('facing the ball within arm\'s reach: he plays it as before', async () => {
    const s = await scene(0.8, Math.PI);
    expect(s.pbu + s.int).toBeGreaterThan(0.3);
  });
});
