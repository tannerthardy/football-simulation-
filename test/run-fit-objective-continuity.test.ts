import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { liveGap } from '../src/sim/live-gaps.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { executeRunFit, type RunFitJob } from '../src/sim/run-fits.js';
import * as steering from '../src/sim/behaviors/common.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Explicit acquired pictures isolate action adoption from information arrival.
 * This is a controller contract, not a native reconstruction or new sighting. */
function fixture(side: number, flowing: boolean, technique: RunFitJob['technique'] = 'attack') {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Fit contract' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('LB_M')!, rb = sim.slot('RB')!;
  sim.t = 1;
  a.runFit = { gap: 'A', side, kind: 'insert', technique, edge: 'box', pace: 'stack' };
  Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
  const picture = new Map(sim.offense.map(o => [o, { pos: { ...sim.offAlign.spots[o.slot].pos },
    vel: { x: 0, y: 0 }, age: .2, pose: 'up', carrying: o === rb, stance: null, facing: 0 } as Perceived]));
  const see = sim.see.bind(sim);
  sim.see = (observer, target, delay) => picture.get(target) ?? see(observer, target, delay);
  const gap = liveGap(sim, a, 'A', side);
  a.body.pos = { x: 41.5, y: gap.y + side * .1 };
  a.body.vel = { x: 0, y: -side * 1.5 };
  const cue = picture.get(rb)!;
  cue.pos = { x: 36, y: gap.y + side * 3 };
  cue.vel.y = flowing ? side * 2 : 0;
  return { sim, a, rb, cue, read: () => executeRunFit(a, sim, 'A', side, { target: rb, cue }) };
}

afterEach(() => vi.restoreAllMocks());

describe('a free run-fit adopts its destination and lateral planner together', () => {
  it.each([-1, 1])('does not amplify an old still-gap action when flow first appears, side=%s', side => {
    const f = fixture(side, false), first = f.read();
    f.sim.t += .05; f.cue.vel.y = side * 2;
    expect(f.read()).toEqual(first);
    // The next existing decision beat adopts the genuinely new destination.
    f.sim.t = 1 + f.a.mind.decisionInterval + .01;
    expect(f.read().vel.y * side).toBeGreaterThan(2);
  });

  it.each([-1, 1])('retains the moving-fit planner until its held destination is replaced, side=%s', side => {
    const f = fixture(side, true), first = f.read();
    f.sim.t += .05; f.cue.vel.y = 0;
    expect(f.read()).toEqual(first);
    f.sim.t = 1 + f.a.mind.decisionInterval + .01;
    expect(f.read().vel.y * side).toBeLessThan(0);
  });

  it('continues using current own-body feedback rather than holding the velocity request', () => {
    const f = fixture(1, true);
    // Shorten the acquired offset so this test does not merely hit the cap.
    f.cue.pos.y = f.a.pos.y + 1.1;
    f.a.body.vel.y = 0;
    const first = f.read();
    f.sim.t += .05; f.a.body.vel.y = 3;
    expect(f.read().vel.y).toBeLessThan(first.vel.y);
  });

  it.each([-1, 1])('allows an acquired genuine opposite flow at the next decision, side=%s', side => {
    const f = fixture(side, true);
    expect(f.read().vel.y * side).toBeGreaterThan(0);
    f.cue.pos.y = f.a.pos.y - side * 3; f.cue.vel.y = -side * 2;
    f.sim.t = 1 + f.a.mind.decisionInterval + .01;
    expect(f.read().vel.y * side).toBeLessThan(0);
  });

  it('keeps immediate declared-runner pursuit ahead of a held fit action', () => {
    const f = fixture(1, false); f.read();
    f.sim.t += .05; f.cue.pos = { x: 38.8, y: f.a.pos.y }; f.cue.vel = { x: 3, y: 0 };
    const chase = vi.spyOn(steering, 'chase'); f.read();
    expect(chase).toHaveBeenCalledWith(f.sim, f.a, f.rb, 2);
  });

  it('does not use hidden carrier motion to update an unchanged acquired objective', () => {
    const f = fixture(1, true), first = f.read();
    f.sim.t += .05; f.rb.body.pos = { x: 70, y: 2 }; f.rb.body.vel = { x: 9, y: -9 };
    f.sim.ball = { kind: 'held', carrier: f.sim.qb }; f.sim.handoffAt = -1;
    expect(f.read()).toEqual(first);
  });
});
