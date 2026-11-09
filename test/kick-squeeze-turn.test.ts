import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { norm } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { playSideSign, RunBlocker } from '../src/sim/behaviors/blocking.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(61), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(62), 'D', 'D', { strength: .55 });
afterEach(() => vi.restoreAllMocks());

/** Matched power (develop 85952c95): the kick guard crossed his flat leg at 4.4 yd/s while
 * the end squeezed flat down the line toward him, a yard and a half upfield. His corner
 * followed the end he saw, but the leg after it still ended at the snap landmark, so the
 * square turn up onto the end looked like no turn: he never slowed and ran past under him. */
function scene(endLat: number) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'Power' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 9 });
  const ps = playSideSign(sim, sim.offCall.run!);
  for (const o of sim.agents) { o.body.pos = { x: 80 + o.idx * 2, y: 4 }; o.body.vel = { x: 0, y: 0 }; }
  const guard = sim.slot('LG')!, end = sim.slot('DE_S')!, rb = sim.slot('RB')!;
  guard.body.pos = { x: 38.6, y: CENTER_Y + ps * 1.8 };
  guard.body.vel = { x: 0, y: ps * 4.4 };
  end.body.pos = { x: 40.9, y: CENTER_Y + ps * endLat };
  rb.body.pos = { x: 36, y: CENTER_Y + ps * .5 };
  sim.qb.body.pos = { x: 34, y: CENTER_Y - ps * 2 };
  const puller = new RunBlocker({ kind: 'pull', pullRole: 'kick', target: end, drive: norm({ x: .3, y: ps }),
    pullPath: [{ x: 38.55, y: CENTER_Y + ps * .9 }, { x: 38.65, y: CENTER_Y + ps * 5.35 }, { x: 39.9, y: CENTER_Y + ps * 5.55 }] });
  Reflect.set(puller, 'pullIdx', 1);
  Reflect.set(puller, 'pullCleared', true);
  guard.behavior = puller;
  sim.t = 1.4;
  const pictures = new Map(sim.agents.map(o => [o, { pos: { ...o.pos }, vel: { ...o.vel }, facing: o.facing,
    stance: null, pose: 'up', age: .2, carrying: o === rb } as Perceived]));
  pictures.get(end)!.vel = { x: 0, y: -ps * 1.5 };
  const ordinary = sim.see.bind(sim);
  vi.spyOn(sim, 'see').mockImplementation((observer, target, scale) => observer === guard
    ? structuredClone(pictures.get(target)!) : ordinary(observer, target, scale));
  return { command: puller.update(guard, sim), ps };
}

describe('a kick puller turns up onto an end squeezing toward him', () => {
  it('slows across the line for the square turn instead of running past under him', () => {
    // 3 yd short of the end at 4.4 yd/s across: he holds his speed for the turn
    // (4.4) rather than still accelerating along the line (6.4 before).
    const { command, ps } = scene(4.8);
    expect(command.vel.y * ps).toBeLessThan(5);
  });
});
