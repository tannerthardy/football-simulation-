import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { BallCarrier, liveAim, type CarrierOptions } from '../src/sim/behaviors/carrier.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
type Evaluation = (a: Agent, sim: PlaySim, dir: number, designed: boolean, reference?: Vec2) => unknown;

/** Same acquired surface and own momentum with two historical landmarks.
 * A held controller contract: no tick, contact solve or native run ending. */
function scene(aligned: boolean, movingGap = true) {
  const formation = FORMATION_BY_ID.ace_12;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: true, kind: 'run', run: RUN_BY_ID.wz_strong, label: 'live assessment contract' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over Cover 3' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false });
  const rb = sim.slot('RB')!;
  const displacement = -1.4327105054356863;
  for (const a of sim.offense) if (sim.offAlign.spots[a.slot]?.inline)
    a.body.pos = { ...a.pos, y: a.pos.y + displacement };
  rb.body.pos = { x: 38.43660670587357, y: 21.943303381943352 };
  rb.body.vel = { x: 2.625953161091995, y: -2.2099783891875333 };
  rb.mind.focus = 1; rb.mind.stress = 0;
  sim.t = 2.2;
  const opts: CarrierOptions = { aim: { x: 40.6, y: 22.06666666666667 }, aimUntil: 3,
    ...(movingGap ? { aimGap: { gap: 'D' as const, side: -1, offset: 0 } } : {}) };
  const consumed: Array<{ target: string; seen: Perceived }> = [];
  sim.see = (_a, b) => {
    const seen: Perceived = { pos: { ...b.pos }, vel: { ...b.vel }, facing: b.facing,
      pose: 'up', stance: null, age: b.team === 'O' ? .05 : .25 };
    consumed.push({ target: b.slot, seen });
    return seen;
  };
  const acquired = liveAim(rb, sim, opts)!;
  if (aligned) opts.aim = movingGap ? { ...acquired } : { x: opts.aim!.x, y: opts.aim!.y + displacement };
  consumed.length = 0;
  const carrier = new BallCarrier(opts, rb);
  const evaluate = Reflect.get(carrier, 'evaluate') as Evaluation;
  const evaluations: Array<{ t: number; result: unknown }> = [];
  Reflect.set(carrier, 'evaluate', (...args: Parameters<Evaluation>) => {
    const result = evaluate.apply(carrier, args);
    evaluations.push({ t: sim.t, result });
    return result;
  });
  const at = (t: number) => { sim.t = t; return carrier.update(rb, sim); };
  return { sim, rb, opts, consumed, evaluations, at };
}

describe('designed carrier assessment uses the acquired movement reference', () => {
  it('an obsolete snap landmark cannot change the assessment of an identical live track', () => {
    const stale = scene(false), aligned = scene(true);
    expect(stale.at(2.2)).toEqual(aligned.at(2.2));
    expect(stale.evaluations).toEqual(aligned.evaluations);
    expect(stale.opts.aimUntil).toBe(aligned.opts.aimUntil);
    expect(stale.consumed).toEqual(aligned.consumed);
    expect(stale.rb.profile).toEqual(aligned.rb.profile);
    const count = stale.evaluations.length;
    stale.at(2.25); aligned.at(2.25);
    expect(stale.evaluations).toEqual(aligned.evaluations);
    // Changing reference does not add a read between ordinary decision beats.
    if (stale.opts.aimUntil! > 2.25) expect(stale.evaluations).toHaveLength(count);
  });

  it('a fixed-aim carrier still distinguishes two different actual aiming points', () => {
    const a = scene(false, false), b = scene(true, false);
    expect(a.at(2.2)).not.toEqual(b.at(2.2));
    expect(a.evaluations).not.toEqual(b.evaluations);
  });
});
