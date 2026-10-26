/** The QB's scramble lane check uses what he can know: his own run timed
 * from his current velocity, and each defender as his delayed picture has
 * him, not where the defender truly is. A defender coming at him counts at
 * once, along the whole path; one sitting in coverage starts only after he
 * sees the QB leave the pocket. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { timeToReach } from '../src/physics/reach.js';
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

describe('QB scramble lane check', () => {
  it('times his own run from the velocity he has: a set QB is promised less than one already running', () => {
    const { sim, qb, settle, decide } = scene();
    const d = sim.defense[0];
    const lane = { x: Math.max(qb.pos.x + 4, sim.los + 1), y: qb.pos.y };
    // One defender straight upfield of the lanes, seen there and coming
    // at him. Somewhere along that line he closes the lanes on a QB starting
    // from rest but not on the same QB already running at speed (a constant
    // own speed gives both the same answer at every distance).
    d.body.vel = { x: -1.5, y: 0 };
    const answers: { off: number; rest: boolean; moving: boolean }[] = [];
    for (let off = 0.5; off <= 16; off += 0.25) {
      d.body.pos = { x: lane.x + off, y: lane.y };
      settle();
      qb.body.vel = { x: 0, y: 0 };
      const rest = decide();
      qb.body.vel = { x: 0.9 * qb.profile.vmax, y: 0 };
      answers.push({ off, rest, moving: decide() });
    }
    expect(answers.some((x) => !x.rest && x.moving)).toBe(true);
    // Never the reverse: speed toward the lanes only helps.
    expect(answers.some((x) => x.rest && !x.moving)).toBe(false);
    // Far enough away, both see open lanes.
    expect(answers.at(-1)).toMatchObject({ rest: true, moving: true });
  });

  it('ignores a defender he has not seen move, and answers one he has', () => {
    const { sim, qb, settle, decide } = scene();
    expect(decide()).toBe(true);
    // Move one defender's body onto the lanes, coming at him, without the
    // QB seeing it.
    const d = sim.defense[0];
    const lane = { x: Math.max(qb.pos.x + 4, sim.los + 1), y: qb.pos.y };
    d.body.pos = { ...lane };
    d.body.vel = { x: -1.5, y: 0 };
    // A reader of true positions would close every lane: he is nearer each
    // lane point than the QB's own run allows.
    for (const dy of [-4, -2, 0, 2, 4]) {
      const q = { x: lane.x, y: lane.y + dy };
      const me = timeToReach({ pos: qb.pos, vel: qb.body.vel, profile: qb.profile, speedScale: qb.speedScale }, q);
      expect(timeToReach({ pos: d.pos, vel: d.body.vel, profile: d.profile, speedScale: d.speedScale }, q, 1) - me).toBeLessThan(0.35);
    }
    // Pictures frozen: the decision does not change.
    expect(decide()).toBe(true);
    // Once his picture shows the defender there, the lanes are closed.
    settle();
    expect(decide()).toBe(false);
  });

  it('a defender sitting in coverage waits for the QB to leave the pocket; the same man coming at him does not', () => {
    const { sim, qb, settle, decide } = scene();
    const d = sim.defense[0];
    const lane = { x: Math.max(qb.pos.x + 4, sim.los + 1), y: qb.pos.y };
    const me = { pos: qb.pos, vel: qb.body.vel, profile: qb.profile, speedScale: qb.speedScale };
    // Standing 8 yd past the lanes: started now, he would beat the set QB
    // to every lane point by more than the margin.
    d.body.pos = { x: lane.x + 8, y: lane.y };
    d.body.vel = { x: 0, y: 0 };
    settle();
    for (const dy of [-4, -2, 0, 2, 4]) {
      const q = { x: lane.x, y: lane.y + dy };
      expect(timeToReach({ pos: d.pos, vel: d.body.vel, profile: d.profile, speedScale: d.speedScale }, q, 1)
        - timeToReach(me, q)).toBeLessThan(0.35);
    }
    // In his drop he only starts once the QB's run shows: the lanes are there.
    expect(decide()).toBe(true);
    // Seen already coming at the QB, he closes them.
    d.body.vel = { x: -2, y: 0 };
    settle();
    expect(decide()).toBe(false);
  });

  it('a rusher beside his path closes the lanes even when he cannot beat him to the line', () => {
    const { sim, qb, settle, decide } = scene();
    const d = sim.defense[0];
    const me = { pos: qb.pos, vel: qb.body.vel, profile: qb.profile, speedScale: qb.speedScale };
    const lanes = [-4, -2, 0, 2, 4].map((dy) => ({ x: Math.max(qb.pos.x + 4, sim.los + 1), y: qb.pos.y + dy }));
    // A slow rusher just behind the QB's shoulder, coming at him.
    d.profile.vmax = 0.5 * qb.profile.vmax;
    d.body.pos = { x: qb.pos.x - 1.2, y: qb.pos.y + 1 };
    d.body.vel = { x: 1, y: -1 };
    settle();
    // Racing to the lane points, he loses every one by more than the margin.
    for (const q of lanes) {
      expect(timeToReach({ pos: d.pos, vel: d.body.vel, profile: d.profile, speedScale: d.speedScale }, q, 1)
        - timeToReach(me, q)).toBeGreaterThan(0.35);
    }
    // But he is on the QB before the QB is clear of him.
    expect(decide()).toBe(false);
    // Out of reach of the path's start, he no longer closes it.
    d.body.pos = { x: qb.pos.x - 6, y: qb.pos.y + 1 };
    settle();
    expect(decide()).toBe(true);
  });
});
