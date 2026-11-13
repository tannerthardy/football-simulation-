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

/** G1 P031 in miniature: the power kick-out guard has cleared the wall while
 * the end he must kick has penetrated 3 yd deep, 5 yd across, still running
 * into the backfield. Decision geometry only, from the guard's own pictures. */
function scene(endVel: { x: number; y: number }) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'Power' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 9 });
  const ps = playSideSign(sim, sim.offCall.run!);
  for (const o of sim.agents) { o.body.pos = { x: 80 + o.idx * 2, y: 4 }; o.body.vel = { x: 0, y: 0 }; }
  const guard = sim.slot('LG')!, end = sim.slot('DE_S')!, rb = sim.slot('RB')!;
  guard.body.pos = { x: 38, y: CENTER_Y };
  end.body.pos = { x: 37, y: CENTER_Y + ps * 5 };
  rb.body.pos = { x: 36, y: CENTER_Y + ps * .5 };
  sim.qb.body.pos = { x: 34, y: CENTER_Y - ps * 2 };
  const puller = new RunBlocker({ kind: 'pull', pullRole: 'kick', target: end, drive: norm({ x: .3, y: ps }),
    pullPath: [{ x: 38.75, y: CENTER_Y }, { x: 38.85, y: CENTER_Y + ps * 4.4 }, { x: 39.9, y: CENTER_Y + ps * 4.6 }] });
  Reflect.set(puller, 'pullIdx', 1);
  Reflect.set(puller, 'pullCleared', true);
  guard.behavior = puller;
  sim.t = 1.5;
  const pictures = new Map(sim.agents.map(o => [o, { pos: { ...o.pos }, vel: { ...o.vel }, facing: o.facing,
    stance: null, pose: 'up', age: .2, carrying: o === rb } as Perceived]));
  pictures.get(end)!.vel = endVel;
  const ordinary = sim.see.bind(sim);
  vi.spyOn(sim, 'see').mockImplementation((observer, target, scale) => observer === guard
    ? structuredClone(pictures.get(target)!) : ordinary(observer, target, scale));
  return { command: puller.update(guard, sim), ps, guard, end, rb };
}

describe('a kick-out puller goes for the end\'s path to the runner', () => {
  it('crosses toward a deep penetrating end instead of matching his depth', () => {
    const { command, ps } = scene({ x: -3.5, y: 0 });
    expect(command.vel.y * ps).toBeGreaterThan(Math.abs(command.vel.x));
  });

  it('aims at the runner side of the end, not past him', () => {
    const { command, guard, end, rb } = scene({ x: 0, y: 0 });
    const toEnd = { x: end.pos.x - guard.pos.x, y: end.pos.y - guard.pos.y };
    expect(command.vel.x * toEnd.x + command.vel.y * toEnd.y).toBeGreaterThan(0);
    // The requested heading points nearer the runner than the end's center.
    const heading = Math.atan2(command.vel.y, command.vel.x), center = Math.atan2(toEnd.y, toEnd.x);
    const runnerSide = Math.atan2(rb.pos.y - guard.pos.y, rb.pos.x - guard.pos.x);
    const delta = (u: number, v: number) => Math.abs(Math.atan2(Math.sin(u - v), Math.cos(u - v)));
    expect(delta(heading, runnerSide)).toBeLessThan(delta(center, runnerSide));
  });
});
