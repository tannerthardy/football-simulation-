import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { stand } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const LOS = 40;

/** A released climber (C) on his way to LB_M, the man he left (DT_W) with the carrying back coming at him, everyone else
 * parked far away and idle. Every picture is recorded from these bodies; no engagement exists anywhere. */
function stage(keeper: Vec2 | null) {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) };
  }
  const place = (a: Agent, pos: Vec2, vel: Vec2 = { x: 0, y: 0 }) => { a.body.pos = { ...pos }; a.body.vel = { ...vel }; };
  const climber = sim.slot('C')!, backer = sim.slot('LB_M')!, man = sim.slot('DT_W')!, runner = sim.slot('RB')!;
  place(climber, { x: LOS + .3, y: CENTER_Y });
  place(backer, { x: LOS + 5, y: CENTER_Y + 4.3 });
  place(man, { x: LOS - .4, y: CENTER_Y - 1.07 });
  place(runner, { x: LOS - 2.5, y: CENTER_Y - 1.2 }, { x: 2, y: 0 });
  // The keeper at arm's length on the man's far side: not nearer to him than the climber by half a yard.
  if (keeper) place(sim.slot('RG')!, keeper);
  const behavior = new RunBlocker({ kind: 'climb', target: backer, drive: { x: 1, y: 0 } });
  climber.behavior = behavior;
  sim.ball = { kind: 'held', carrier: runner } as typeof sim.ball;
  sim.t = sim.world.time = 2;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents, runner.idx);
  return { sim, climber, behavior, backer, man };
}

describe('a released climber leaves the man his keeper is on', () => {
  it('keeps his backer when he sees a teammate in contact range of the man near the runner', () => {
    const f = stage({ x: LOS - 1.3, y: CENTER_Y - 1.07 });
    f.behavior.update(f.climber, f.sim);
    expect(f.behavior.plan.target).toBe(f.backer);
    expect(f.sim.events.some(e => e.type === 'block_threat')).toBe(false);
  });

  it('takes the same man when nobody is on him', () => {
    const f = stage(null);
    f.behavior.update(f.climber, f.sim);
    expect(f.behavior.plan.target).toBe(f.man);
    expect(f.sim.events.some(e => e.type === 'block_threat')).toBe(true);
  });
});
