/**
 * G3: a zone defender with his eyes on the quarterback breaks on the throwing
 * motion, spot or match alike. His reaction clock starts at the windup (the
 * shoulders and arm, visible), not at the release; where the ball goes is
 * still learned only from the flight. A defender facing away, and a man
 * defender watching his receiver, react to the release as before; one who
 * turns to the QB after the motion began gets no credit for what he missed.
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { ZoneStyle } from '../src/playbook/types.js';
import { ManCoverage, sawThrow, ZoneCoverage } from '../src/sim/behaviors/defense.js';
import { PlaySim } from '../src/sim/playsim.js';

/** A hook defender 9 yd off the ball; the QB started his throwing motion 0.5 s
 * ago and released 0.02 s ago, so only the windup can have been reacted to.
 * His eyes were on the QB for the last `eyesFor` seconds (all of it by
 * default) and away before that. */
function stage(style: ZoneStyle, facingQB: boolean, man = false, eyesFor = Infinity) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(171), 'O', 'OBS'), '11'),
    defense: pickDefense(generateTeam(new Rng(172), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '', zoneStyle: style },
    los: 40, ballY: 26, firstDownX: 50, seed: 19,
  });
  const d = sim.slot('LB_M')!, r = sim.slot('H')!;
  d.body.pos = { x: 49, y: 26 };
  const toQB = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x);
  for (let back = 20; back >= 0; back--) {
    d.body.facing = facingQB && back * sim.dt <= eyesFor ? toQB : 0;
    sim.perception.record(sim.agents, sim.qb.idx);
  }
  d.behavior = man ? new ManCoverage(d, sim, r, false, 'C', 1, {}) : new ZoneCoverage(d, sim, 'hook_mid', 'C', 1, style);
  sim.t = 2;
  sim.windupAt = sim.t - 0.5;
  sim.throwAt = sim.t - 0.02;
  sim.ball = { kind: 'air', flight: { pos: { x: 35, y: 26, z: 2 }, vel: { x: 18, y: 2, z: 2 }, drag: 0 },
    thrower: sim.qb, target: r, releaseT: sim.throwAt, releaseX: 35, intended: { x: 50, y: 28, z: 1.2 },
    arrivalT: sim.t + .8, deflected: false, throwaway: false };
  return { sim, d };
}

describe('zone defenders key the throwing motion', () => {
  it('a match-zone defender facing the QB has already reacted at the release, like a spot dropper', () => {
    for (const style of ['match', 'spot'] as const) {
      const { sim, d } = stage(style, true);
      expect(sawThrow(d, sim, null)).toBe(true);
      expect(d.tags.has('readArm')).toBe(true);
    }
  });

  it('facing away from the QB, or in man on a receiver, he still reacts to the release itself', () => {
    const away = stage('match', false);
    expect(sawThrow(away.d, away.sim, null)).toBe(false);
    const man = stage('match', true, true);
    expect(sawThrow(man.d, man.sim, null)).toBe(false);
  });

  it('eyes that reached the QB after the motion began start the clock then, not at the windup', () => {
    const late = stage('match', true, false, 0.05);
    expect(sawThrow(late.d, late.sim, null)).toBe(false);
    expect(late.d.tags.has('readArm')).toBe(false);
  });

  it('a held ball is never "seen thrown", whatever the windup', () => {
    const { sim, d } = stage('match', true);
    sim.ball = { kind: 'held', carrier: sim.qb };
    expect(sawThrow(d, sim, null)).toBe(false);
  });
});
