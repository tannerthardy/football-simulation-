import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game } from '../src/game/game.js';
import * as clocks from '../src/game/clock-rules.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';

afterEach(() => vi.restoreAllMocks());
const offense = generateTeam(new Rng(31), 'Home', 'HOM', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Away', 'AWY', { strength: .55 });
function native(afterTwoMinuteWarning: boolean): PlaySim {
  const formation = FORMATION_BY_ID.ace_11;
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'ordinary toss boundary' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' }, los: 40, ballY: CENTER_Y, firstDownX: 50,
    seed: 3, record: false, afterTwoMinuteWarning });
}
function place(a: Agent, x: number, y: number): void {
  a.body.pos = { x, y }; a.body.vel = { x: 0, y: 0 }; a.downUntil = -1; a.snapReadyAt = 0;
  a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
}
/** An ordinary native backward toss, not a declared intent to conserve time.
 * Its target is outside the field; actual flight/contact must end it OOB. */
function ordinaryPitchExit(sim: PlaySim, afterChange = false): void {
  for (const a of sim.agents) place(a, 75 + a.idx % 5 * 3, 3 + Math.floor(a.idx / 5) * 3);
  place(sim.qb, sim.los - 3, .2); sim.t = .5;
  let from = sim.qb, to = sim.slot('RB')!;
  if (afterChange) {
    sim.throwBall(sim.qb, to, { x: 10, y: 0, z: 3 }, { x: sim.los + 5, y: .2, z: 1 }, 2);
    from = sim.slot('FS')!; place(from, sim.los - 3, .2); sim.possess(from, 'interception');
    expect(sim.carrier).toBe(from); place(sim.qb, 80, CENTER_Y);
    to = sim.slot('SS')!;
  }
  place(to, from.pos.x + (from.team === 'O' ? -1 : 1), -2);
  expect(sim.pitchBall(from, to)).toBe(true);
  for (let tick = 0; tick < 20 && sim.phase === 'live'; tick++) sim.tick();
  expect(sim.outcome).toBe('oob');
  expect(sim.events.some(e => e.type === 'pitch')).toBe(true);
}

describe('native backward pass OOB and late-half clock', () => {
  it.each([
    { warning: false, changed: false, label: 'before the warning' },
    { warning: true, changed: true, label: 'after a prior possession change' },
  ])('keeps an ordinary toss legal $label', ({ warning, changed }) => {
    const sim = native(warning); ordinaryPitchExit(sim, changed);
    expect(sim.penalties.some(p => p.kind === 'illegal_backward_pass')).toBe(false);
  });

  it('flags the actual after-warning ordinary pitch exit, loses a down and reaches Game ten-second runoff', () => {
    const ruling = vi.spyOn(clocks, 'resolveFoulClock');
    let result: ReturnType<PlaySim['buildResult']> | undefined;
    const game = new Game(offense, defense, { seed: 5, record: false, hooks: {
      preSnapFoul: () => null,
      playResult: sim => { ordinaryPitchExit(sim); result = sim.buildResult(); return result; },
    } });
    game.setState({ quarter: 4, clock: 78, possession: 'home', yardline: 30, down: 1, distance: 10,
      score: { home: 0, away: 7 }, timeouts: { home: 0, away: 0 } });
    game.step();
    expect(result).toBeDefined();
    expect(result!.penalties).toContainEqual(expect.objectContaining({ kind: 'illegal_backward_pass',
      rule: '8-7-2', lossDown: true, yards: 5, phase: 'live', basicSpotX: 37 }));
    // 14-4-6(b): the backward pass is behind LOS, so the previous spot
    // governs even though the actual boundary/contact point is farther back.
    expect(game.state).toMatchObject({ possession: 'home', yardline: 25, down: 2, distance: 15 });
    expect(game.result().box.team(offense.abbr)).toMatchObject({ penalties: 1, penaltyYds: 5 });
    expect(ruling).toHaveBeenCalledWith(expect.objectContaining({ afterTwoMinuteWarning: true, wasRunning: true }));
    expect(ruling.mock.results.some(r => r.type === 'return' && r.value.runoff === 10)).toBe(true);
  });
});
