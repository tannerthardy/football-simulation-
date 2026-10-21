/** RUN_ARMS (src/sim/behaviors/carrier.ts): an engaged defender's block
 * holds his feet, not his arms. The runner's lane forecast gives him the
 * engagement allowance only for ground he must cover beyond his reach, so a
 * lane brushing past a blocked defender is not read as open. Most stuffs end
 * "reached from the block" (docs/reviews/run-offense.md). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Agent } from '../src/sim/agent.js';
import type { PlaySim } from '../src/sim/playsim.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Decision = { heading: number; score: number; blocked: boolean; exits: boolean };
type InspectCarrier = { evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean): Decision };

/** Staged controller slice: a runner at speed and one defender beside his
 * straight lane, locked with a blocker (the block itself is not simulated). */
async function decide(arms: boolean, side: number, engaged: boolean, lateral: number) {
  vi.stubEnv('RUN_ARMS', arms ? '1' : '0');
  vi.resetModules();
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { BallCarrier } = await import('../src/sim/behaviors/carrier.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, kind: 'run', flip: false, run: RUN_BY_ID.iz_strong, label: 'run arms' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'run arms' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false });
  const rb = sim.slot('RB')!, end = sim.slot('DE_S')!;
  sim.t = 2;
  for (const agent of sim.agents) { agent.body.pos = { x: 100 + agent.idx, y: 5 }; agent.body.vel = { x: 0, y: 0 }; }
  rb.body.pos = { x: 38, y: CENTER_Y }; rb.body.vel = { x: 5, y: 0 };
  end.body.pos = { x: 40, y: CENTER_Y + side * lateral };
  if (engaged) end.engagement = { win: .3 } as never;
  sim.see = (_a, target) => ({ pos: { ...target.pos }, vel: { ...target.vel }, stance: null,
    facing: target.facing, age: .2, pose: 'up' });
  return (new BallCarrier({}, rb) as unknown as InspectCarrier).evaluate(rb, sim, 1, false);
}

describe('RUN_ARMS: a blocked defender still has his arms', () => {
  it.each([-1, 1])('a lane through his reach is not open, side %s', async side => {
    const off = await decide(false, side, true, 1.2), on = await decide(true, side, true, 1.2);
    // Before: the engagement allowance made the brush-by lane look free.
    expect(Math.abs(off.heading)).toBeLessThan(.15);
    // Now the runner takes a lane away from the defender's arms.
    expect(on.heading * side).toBeLessThan(-.15);
  }, 60000);

  it.each([-1, 1])('a blocked defender out of reach still needs to get off the block, side %s', async side => {
    // Two arm's lengths and more away the allowance is unchanged.
    const off = await decide(false, side, true, 3.5), on = await decide(true, side, true, 3.5);
    expect(on.heading).toBeCloseTo(off.heading, 9);
    expect(on.score).toBeCloseTo(off.score, 9);
  }, 60000);

  it('changes nothing for a free defender', async () => {
    const off = await decide(false, 1, false, 1.2), on = await decide(true, 1, false, 1.2);
    expect(on).toEqual(off);
  }, 60000);
});
