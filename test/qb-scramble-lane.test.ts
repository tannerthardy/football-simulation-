/** The QB's scramble check asks the ball carrier's own evaluator, from what
 * he can know: his own run timed from his current velocity, and each
 * defender as his delayed picture has him, not where the defender truly is
 * or how quickly he truly reacts. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';

function scene() {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(91), 'Lane offense', 'LO'), '11'),
    defense: pickDefense(generateTeam(new Rng(92), 'Lane defense', 'LD'), 'nickel'),
    seed: 5, audibles: false,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lane' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lane' },
    los: 40, ballY: 26, firstDownX: 50,
  });
  const qb = sim.qb;
  // A mobile QB, so the non-panic mobility gate is not what decides.
  qb.player.measurables.forty = 4.5;
  // Every defender far downfield and standing: the lanes are open.
  sim.defense.forEach((d, i) => { d.body.pos = { x: sim.los + 25, y: 4 + 4 * i }; d.body.vel = { x: 0, y: 0 }; });
  const settle = () => { for (let i = 0; i < 30; i++) sim.perception.record(sim.agents, null); };
  settle();
  const decide = () => (qb.behavior as unknown as { shouldScramble(a: Agent, s: PlaySim, panic: boolean): boolean })
    .shouldScramble(qb, sim, false);
  return { sim, qb, settle, decide };
}

/** Defenders on an arc of radius `r` around the QB, from his left
 * (-pi/2 off upfield) round to `to`, standing. */
function arc(sim: PlaySim, qb: Agent, r: number, to: number) {
  const n = sim.defense.length;
  sim.defense.forEach((d, i) => {
    const th = -Math.PI / 2 + (to + Math.PI / 2) * i / (n - 1);
    d.body.pos = { x: qb.pos.x + r * Math.cos(th), y: qb.pos.y + r * Math.sin(th) };
    d.body.vel = { x: 0, y: 0 };
  });
}

describe('QB scramble lane check', () => {
  it('times his own run from the velocity he has: a set QB is promised less than one already running', () => {
    const { sim, qb, settle, decide } = scene();
    // A wall of defenders on his left and upfield, open only on his right.
    // Close in, the gap is a lane for a QB already running at it, not for
    // one starting from rest.
    const answers: { r: number; rest: boolean; moving: boolean }[] = [];
    for (const r of [4, 5, 6, 7, 8, 10, 12]) for (const to of [0.25, 0.5]) {
      arc(sim, qb, r, to);
      settle();
      qb.body.vel = { x: 0, y: 0 };
      const rest = decide();
      qb.body.vel = { x: 0, y: 0.9 * qb.profile.vmax };
      answers.push({ r, rest, moving: decide() });
    }
    expect(answers.some((x) => !x.rest && x.moving)).toBe(true);
    // Never the reverse: speed toward the gap only helps.
    expect(answers.some((x) => x.rest && !x.moving)).toBe(false);
    // Far enough away, both see an open lane.
    expect(answers.at(-1)).toMatchObject({ rest: true, moving: true });
  });

  it('ignores defenders he has not seen move, and answers ones he has', () => {
    const { sim, qb, settle, decide } = scene();
    expect(decide()).toBe(true);
    // Close every lane around him with true bodies he has not seen yet.
    arc(sim, qb, 3, Math.PI / 2);
    // Pictures frozen: the decision does not change.
    expect(decide()).toBe(true);
    // Once his pictures show them there, there is no lane.
    settle();
    expect(decide()).toBe(false);
  });

  it('runs for yards only on a lane past the line; under pressure, out of the rush is enough', () => {
    const { sim, qb, settle } = scene();
    const decide = (panic: boolean) => (qb.behavior as unknown as { shouldScramble(a: Agent, s: PlaySim, panic: boolean): boolean })
      .shouldScramble(qb, sim, panic);
    // Rushers across his front: only the sideways lanes are free.
    sim.defense.forEach((d, i) => {
      const th = -0.4 + 0.8 * i / (sim.defense.length - 1);
      d.body.pos = { x: qb.pos.x + 6 * Math.cos(th), y: qb.pos.y + 6 * Math.sin(th) };
      d.body.vel = { x: 0, y: 0 };
    });
    settle();
    expect(decide(false)).toBe(false);
    expect(decide(true)).toBe(true);
  });

  it('lets a coverage defender wait for the run to show, at a typical reaction, not his own', () => {
    const { sim, qb } = scene();
    type Box = { front: number; lo: number; hi: number };
    const qbb = qb.behavior as unknown as { pocketBox(a: Agent, s: PlaySim): Box;
      startLag(a: Agent, s: PlaySim, box: Box, seen: { pos: { x: number; y: number }; vel: { x: number; y: number } }, h: number): number };
    const box = qbb.pocketBox(qb, sim);
    const lag = (x: number, y: number, h: number, vx = 0) => qbb.startLag(qb, sim, box, { pos: { x, y }, vel: { x: vx, y: 0 } }, h);
    // At or behind the line, or coming at him, a defender is already rushing.
    expect(lag(sim.los, qb.pos.y + 3, 0)).toBe(0);
    expect(lag(sim.los + 6, qb.pos.y, 0, -3)).toBe(0);
    // A defender dropped in coverage starts once the run shows: later for a
    // run that stays in the pocket longer, never before a reaction.
    const up = lag(sim.los + 6, qb.pos.y, 0), side = lag(sim.los + 6, qb.pos.y, Math.PI / 2), wide = lag(sim.los + 6, qb.pos.y, 1.2);
    expect(Math.min(up, side, wide)).toBeGreaterThan(0.2);
    expect(new Set([up, side, wide]).size).toBe(3);
    // His own reaction time does not enter what the QB allows him.
    for (const d of sim.defense) d.profile.reactionTime = 2;
    expect(lag(sim.los + 6, qb.pos.y, 0)).toBe(up);
  });
});
