import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { playBall, runFit, sawThrow } from '../src/sim/behaviors/defense.js';

/** Real installed controller and declaration reader; only the supplied visual
 * channel is staged. Hidden body changes are deliberately independent of it. */
function stage(side = -1) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(21), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(22), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.mesh, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1_off,
      pressure: null, zoneStyle: 'match', label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 5,
  });
  const a = sim.defense.find(d => d.behavior instanceof CoverageDefender && d.behavior.rule === 'rat')!;
  const behavior = a.behavior as CoverageDefender;
  const r = sim.slot(sim.offAlign.numbering[side === sim.offAlign.strongSign ? 'S2' : 'W2']!)!;
  a.body.pos = { x: 46, y: 26 }; a.body.vel = { x: 0, y: 0 }; a.recog!.read = 'pass';
  let picture: Perceived = { pos: { x: 43.5, y: 26 + side * 4 }, vel: { x: 0, y: -side * 5 },
    facing: -side * Math.PI / 2, stance: null, carrying: false, age: .2 };
  const see = sim.see.bind(sim);
  sim.see = (observer, target, scale) => target === r ? picture : see(observer, target, scale);
  const update = (t: number) => { sim.t = t; return behavior.update(a, sim); };
  const declare = () => { update(1); update(1.1); return update(1.2); };
  return { sim, a, r, behavior, update, declare, picture: () => picture,
    setPicture: (p: Perceived) => { picture = p; } };
}

describe('installed low-hole rat', () => {
  it.each([-1, 1])('cuts a confirmed incoming shallow with head leverage, side=%s', side => {
    const f = stage(side);
    f.update(1); expect(f.behavior.job).toBe('zone:hole');
    f.update(1.1); expect(f.behavior.job).toBe('zone:hole');
    const command = f.update(1.2);
    expect(f.behavior.job).toBe(`man:${f.r.slot}`);
    expect(f.behavior.recordedRule(1.2).reads.find(rd => rd.target === f.r.idx)?.release).toBe('under');
    expect(f.behavior.recordedMan()?.leverage).toBe('head');
    expect(command.vel.x).toBeLessThan(0);
  });

  it('does not convert an away picture, vertical or still-climbing diagonal into a shallow cut', () => {
    for (const velocity of [{ x: 0, y: -5 }, { x: 6, y: 0 }, { x: 4, y: 3 }]) {
      const f = stage(); f.setPicture({ ...f.picture(), vel: velocity, facing: Math.atan2(velocity.y, velocity.x) });
      f.declare(); expect(f.behavior.job).toBe('zone:hole');
      expect(f.behavior.recordedRule(1.2).cut).toBeNull();
    }
  });

  it('cannot infer a cut from hidden motion absent a corresponding acquired declaration', () => {
    const f = stage(); f.setPicture({ ...f.picture(), vel: { x: 0, y: 0 } });
    f.r.body.vel = { x: 0, y: 8 }; f.r.body.pos = { x: 43.5, y: 22 };
    f.declare(); expect(f.behavior.job).toBe('zone:hole');
    expect(f.behavior.recordedRule(1.2).cut).toBeNull();
  });

  it('uses the acquired entry picture across hidden position changes and advancing snapshots', () => {
    const one = stage(), two = stage();
    for (const t of [1, 1.1, 1.2, 1.25]) {
      two.r.body.pos = { x: t < 1.2 ? 80 : 41, y: 4 };
      two.r.body.vel = { x: 9, y: -9 };
      for (const f of [one, two]) f.sim.perception.record(f.sim.agents);
      expect(two.update(t)).toEqual(one.update(t));
      expect(two.behavior.recordedMan()).toEqual(one.behavior.recordedMan());
      expect(two.sim.rng).toEqual(one.sim.rng);
    }
    expect(one.behavior.job).toBe(`man:${one.r.slot}`);
  });

  it('waits for a hidden turn to cross the production sensing delay before changing the acquired match', () => {
    const one = stage(), two = stage();
    for (const f of [one,two]) {
      f.sim.see = PlaySim.prototype.see;
      f.a.mind.observationDelay = () => .2;
      f.a.eyes = { keys: [f.r], peripheral: .15 };
      f.r.body.vel = { x: 0, y: 5 }; f.r.body.facing = Math.PI / 2;
      for (let i=0;i<24;i++) {
        f.r.body.pos = { x: 43.5, y: 22 - (23-i)*.05*5 };
        f.sim.perception.record(f.sim.agents);
      }
      f.declare(); expect(f.behavior.job).toBe(`man:${f.r.slot}`);
    }
    for (let k=1;k<=3;k++) {
      one.r.body.pos = { x: 43.5, y: 22+k*.05*5 };
      two.r.body.pos = { x: 43.5+k*.05*6, y: 22 };
      two.r.body.vel = { x: 6, y: 0 }; two.r.body.facing = 0;
      for (const f of [one,two]) f.sim.perception.record(f.sim.agents);
      expect(two.update(1.2+k*.05)).toEqual(one.update(1.2+k*.05));
      expect(two.sim.rng).toEqual(one.sim.rng);
    }
    for (let k=4;k<=9;k++) {
      one.r.body.pos = { x: 43.5, y: 22+k*.05*5 };
      two.r.body.pos = { x: 43.5+k*.05*6, y: 22 };
      for (const f of [one,two]) { f.sim.perception.record(f.sim.agents); f.update(1.2+k*.05); }
    }
    expect(one.behavior.job).toBe(`man:${one.r.slot}`);
    expect(two.behavior.job).toBe('zone:hole');
  });

  it('returns to the installed hole after an observed outgoing crosser leaves it, even if the defender follows', () => {
    const f = stage(); f.declare();
    // The receiver is now through the fixed installed area; a moving defender
    // must not take that area downfield or out to the sideline with him.
    f.a.body.pos.y = 34;
    f.setPicture({ ...f.picture(), pos: { x: 44, y: 34.5 } });
    f.update(1.25); expect(f.behavior.job).toBe('zone:hole');
    f.update(1.3); expect(f.behavior.job).toBe('zone:hole');
    expect(f.behavior.recordedRule(1.3).cut).toBeNull();
  });

  it('releases on a confirmed upfield turn, allowing its legitimate observation uncertainty', () => {
    const f = stage(); f.declare();
    f.setPicture({ ...f.picture(), pos: { x: 44, y: 25 }, vel: { x: 6, y: 0 }, facing: 0 });
    f.update(1.25); expect(f.behavior.job).toBe(`man:${f.r.slot}`);
    f.update(1.35); f.update(1.45);
    expect(f.behavior.job).toBe('zone:hole');
    expect(f.behavior.recordedRule(1.45).cut).toBeNull();
  });

  it('keeps installed support when a cut is selected and an actual carrying-back picture sustains run belief', () => {
    const f = stage(), rb = f.sim.slot('RB')!, see = f.sim.see.bind(f.sim);
    f.a.recog!.read = 'run';
    const picture: Perceived = { pos: { x: 38, y: 27 }, vel: { x: 2, y: 1 },
      facing: 0, stance: null, carrying: true, age: .2 };
    f.sim.see = (a,r,scale) => r === rb ? picture : see(a,r,scale);
    f.a.runFit = { kind: 'insert', gap: 'B', side: 1, technique: 'attack', edge: 'box', pace: 'stack' };
    const command = f.declare();
    expect(f.behavior.job).toBe(`man:${f.r.slot}`);
    expect(command).toEqual(runFit(f.a, f.sim, 'B', f.sim.offAlign.strongSign, { target: rb, cue: picture }));
  });

  it('preserves a reachable ball contest after existing throw recognition', () => {
    const f = stage(); f.declare();
    f.sim.t = 2; f.sim.throwAt = .5;
    f.sim.ball = { kind: 'air', flight: { pos: { x: 45, y: 26, z: 2 }, vel: { x: 10, y: 0, z: -1 }, drag: 0 },
      thrower: f.sim.qb, target: f.r, releaseT: .5, releaseX: 35,
      intended: { x: 46, y: 26, z: 1.2 }, arrivalT: 2.2, deflected: false, throwaway: false }; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
    f.sim.ballPath = [{ t: 2.2, x: 46, y: 26, z: 1.2 }];
    expect(sawThrow(f.a, f.sim, f.r)).toBe(true);
    const expected = playBall(f.a, f.sim, f.r);
    expect(f.update(2)).toEqual(expected);
  });
});
