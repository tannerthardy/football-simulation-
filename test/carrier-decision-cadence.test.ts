import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { BallCarrier, type CarrierOptions } from '../src/sim/behaviors/carrier.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });
type Inspect = { evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean): unknown };

/** A held-body controller scene, not a prescribed football outcome. A visible
 * threat can change while the player's chosen lane stays committed; the
 * existing evaluator, cognitive capacities and public physical profile remain
 * real. We do not integrate a fixed body into a new trajectory in this test. */
function scene(opts: CarrierOptions = {}) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, kind: 'run', flip: false, run: RUN_BY_ID.iz_strong, label: 'decision beat' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false });
  const rb = sim.slot('RB')!, threat = sim.slot('LB_M')!;
  for (const a of sim.agents) { a.body.pos = { x: 100 + a.idx, y: 5 }; a.body.vel = { x: 0, y: 0 }; }
  rb.body.pos = { x: 55, y: CENTER_Y }; rb.body.vel = { x: 4, y: 0 };
  rb.mind.focus = 1; rb.mind.stress = 0;
  threat.body.pos = { x: 58, y: CENTER_Y + 1 };
  let side = 1, present = true;
  sim.see = (_a, target) => ({ pos: target === threat && present
    ? { x: 58, y: CENTER_Y + side } : { ...target.pos }, vel: { ...target.vel },
    stance: null, facing: 0, pose: 'up', age: .2 } satisfies Perceived);
  const carrier = new BallCarrier(opts, rb), inspected = carrier as unknown as Inspect;
  const evaluate = inspected.evaluate, beats: Array<{ t: number; designed: boolean }> = [];
  inspected.evaluate = function (a, s, dir, designed) {
    beats.push({ t: s.t, designed });
    return evaluate.call(this, a, s, dir, designed);
  };
  const at = (t: number) => { sim.t = t; return carrier.update(rb, sim); };
  return { sim, rb, threat, carrier, beats, at, setSide: (s: number) => { side = s; },
    removeThreat: () => { present = false; threat.body.pos = { x: 150, y: 5 }; } };
}

describe('carrier choices use the existing finite decision beat', () => {
  it.each([-1, 1])('holds a chosen lane despite an opposite new threat until the next beat, mirror %s', side => {
    const s = scene(); s.setSide(side);
    const interval = s.rb.mind.decisionInterval, first = s.at(0);
    s.setSide(-side);
    for (const t of [.05, .1, .15]) {
      expect(t).toBeLessThan(interval);
      expect(s.at(t)).toEqual(first);
    }
    expect(s.beats).toEqual([{ t: 0, designed: false }]);
    const reconsidered = s.at(Math.ceil(interval / .05) * .05);
    expect(s.beats).toHaveLength(2);
    expect(reconsidered.vel.y).not.toBe(first.vel.y);
  });

  it('stress and low focus lengthen commitment without changing physical capacities', () => {
    const clear = scene(), loaded = scene();
    loaded.rb.mind.focus = .25; loaded.rb.mind.stress = 1;
    expect(loaded.rb.mind.decisionInterval).toBeGreaterThan(clear.rb.mind.decisionInterval);
    const clearProfile = structuredClone(clear.rb.profile), loadedProfile = structuredClone(loaded.rb.profile);
    expect(loadedProfile).toEqual(clearProfile);
    for (const t of [0, .05, .1, .15, .2, .25, .3, .35, .4, .45, .5, .55, .6]) { clear.at(t); loaded.at(t); }
    expect(clear.beats.length).toBeGreaterThan(loaded.beats.length);
    expect(clear.rb.profile).toEqual(clearProfile);
    expect(loaded.rb.profile).toEqual(loadedProfile);
  });

  it('uses the same cadence while pressing a design, then reads immediately on release of that responsibility', () => {
    const opts: CarrierOptions = { aim: { x: 40.5, y: CENTER_Y + 2 }, aimUntil: 3 };
    const s = scene(opts); s.removeThreat(); s.rb.body.pos = { x: 38, y: CENTER_Y };
    const first = s.at(2);
    expect(s.beats).toEqual([{ t: 2, designed: true }]);
    expect(s.at(2.05)).toEqual(first);
    expect(s.beats).toHaveLength(1);
    opts.aimUntil = 2.10;
    const freed = s.at(2.10);
    expect(s.beats).toEqual([{ t: 2, designed: true }, { t: 2.10, designed: false }]);
    expect(freed.vel.y).not.toBe(first.vel.y);
  });

  it('a new possession starts its first read rather than inheriting the previous carrier commitment', () => {
    const s = scene(); s.at(0); s.setSide(-1); s.sim.t = .05;
    const newlyHolding = new BallCarrier({}, s.rb) as unknown as Inspect;
    const evaluate = newlyHolding.evaluate;
    let calls = 0;
    newlyHolding.evaluate = function (...args) { calls++; return evaluate.apply(this, args); };
    (newlyHolding as unknown as BallCarrier).update(s.rb, s.sim);
    expect(calls).toBe(1);
    expect(s.beats).toHaveLength(1);
  });

  it('boundary recovery remains a per-tick motor action while the lane choice is held', () => {
    const s = scene(); s.removeThreat(); s.rb.body.pos.y = 3; s.rb.body.vel.y = -.2;
    s.at(0);
    // Own achieved momentum/position can require urgent braking without a new
    // tactical scan. Shared World still decides whether the save is attainable.
    s.rb.body.pos.y = .3; s.rb.body.vel.y = -3;
    const recovery = s.at(.05);
    expect(s.beats).toHaveLength(1);
    expect(recovery.vel.y).toBeGreaterThanOrEqual(3);
    expect(recovery.vel.x).toBe(s.rb.vel.x);
  });
});
