/** LB_LANDMARK (run-fits.ts executeRunFit): a stack backer's landmark before
 * the runner declares is 2.25 yd past the line, where tracked backers meet
 * the climbing lineman; off, the installed 1.5 yd. A plug fit keeps its own. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(71), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(72), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Before the handoff, the Mike 5 yd off the ball, the back deep in the
 * backfield. Returns the fit's landmark depth past the line. */
async function landmark(enabled: boolean, pace: 'stack' | 'plug') {
  vi.stubEnv('LB_LANDMARK', enabled ? '1' : '0');
  vi.resetModules();
  const { executeRunFit } = await import('../src/sim/run-fits.js');
  const { movementObjective } = await import('../src/sim/movement-objective.js');
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Landmark' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  sim.t = .8;
  const a = sim.slot('LB_M')!, back = sim.slot('RB')!;
  a.runFit = { gap: 'A', side: 1, kind: 'insert', technique: 'attack', edge: 'box', pace };
  a.body.pos = { x: 45, y: CENTER_Y + .5 }; a.body.vel = { x: 0, y: 0 };
  Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
  const picture = new Map([
    [sim.qb, { pos: { x: 38.6, y: CENTER_Y }, vel: { x: 0, y: 0 }, carrying: true, age: .2, stance: null, facing: 0, pose: 'up' } as Perceived],
    [back, { pos: { x: 34, y: CENTER_Y + .5 }, vel: { x: 2, y: 0 }, carrying: false, age: .2, stance: null, facing: 0, pose: 'up' } as Perceived],
  ]);
  const see = sim.see.bind(sim);
  sim.see = (observer, target, delay) => picture.get(target) ?? see(observer, target, delay);
  return movementObjective(executeRunFit(a, sim, 'A', 1))!.point.x - sim.los;
}

describe('a stack backer fits where tracked backers meet the climber', () => {
  it('off: the installed 1.5 yd', async () => {
    expect(await landmark(false, 'stack')).toBeCloseTo(1.5, 9);
  });
  it('on: 2.25 yd past the line', async () => {
    expect(await landmark(true, 'stack')).toBeCloseTo(2.25, 9);
  });
  it('on: a plug fit keeps its own landmark', async () => {
    expect(await landmark(true, 'plug')).toBeCloseTo(await landmark(false, 'plug'), 9);
  });
});
