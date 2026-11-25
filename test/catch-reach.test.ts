import { describe, expect, it, vi } from 'vitest';
// BALL_EST pinned to the receivers-only estimator (Coverage C14, 2026-11-25): this file tests the physical reach envelope,
// not perception. The scene jumps from the throw to the catch with no ticks between, so under the honest defender
// (26657: a defender plays only a ball he has sampled) the in-phase defender has never seen the ball and cannot play it.
vi.hoisted(() => { process.env.BALL_EST = '6145'; });
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { resolveCatchOpportunities } from '../src/sim/catching.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

function contest(distance: number) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1 });
  const r = sim.slot('X')!, d = sim.slot('CB_W')!;
  for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
  r.body.pos = { x: 50, y: 26 }; d.body.pos = { x: 50 + distance, y: 26 };
  d.tags.add('looking');
  sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 50, y: 26, z: 2 }, 1.5);
  sim.t = 1.5;
  // Exercise the contested-interception branch. Not exactly 0: Rng.gaussian redraws a zero (while (u === 0)), so any normal
  // draw on this stream (the honest defender's estimator draws them as the catch resolves) never returned (Coverage C14,
  // 2026-11-25, the run with BALL_EST 26657 on hung here). Any probability comparison resolves as with 0.
  sim.rng.next = () => 1e-12;
  resolveCatchOpportunities(sim, { x: 49.9, y: 26, z: 2 }, { x: 50.1, y: 26, z: 2 });
  return { sim, d };
}
describe('physical contested possession', () => {
  it('does not award an interception to a nearby defender who cannot reach the ball', () => {
    const { sim } = contest(2);
    expect(sim.stats.interceptedBy).toBeUndefined();
  });
  it('still allows an in-phase defender inside the ball envelope to intercept', () => {
    const { sim, d } = contest(0.4);
    expect(sim.stats.interceptedBy).toBe(d.player.id);
  });
});
