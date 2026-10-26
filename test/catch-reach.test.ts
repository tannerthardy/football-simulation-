import { describe, expect, it } from 'vitest';
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
  sim.rng.next = () => 0; // Exercise the contested-interception branch.
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
