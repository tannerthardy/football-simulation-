import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { CENTER_Y } from '../src/core/field.js';
import { World } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { playBall } from '../src/sim/behaviors/defense.js';

function stage(side = 1, runnerSpeed = 8) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  const r = sim.slot('X')!, d = sim.slot('CB_W')!;
  for (const a of sim.agents) a.body.pos = { x: 10, y: 2 };
  r.body.pos = { x: 50, y: CENTER_Y }; r.body.vel = { x: runnerSpeed, y: side };
  d.body.pos = { x: 49.6, y: CENTER_Y + side * .5 }; d.body.vel = { ...r.vel };
  r.body.facing = d.body.facing = Math.atan2(side, runnerSpeed);
  const rp = { ...r.pos }, dp = { ...d.pos };
  for (let i = 0; i < 24; i++) {
    const age = (23 - i) * sim.dt;
    r.body.pos = { x: rp.x - r.vel.x * age, y: rp.y - r.vel.y * age };
    d.body.pos = { x: dp.x - d.vel.x * age, y: dp.y - d.vel.y * age };
    sim.perception.record(sim.agents);
  }
  sim.t = 2; sim.throwAt = 1;
  sim.ball = { kind: 'air', flight: { pos: { x: 49, y: CENTER_Y, z: 2 }, vel: { x: 20, y: side, z: -1 }, drag: 0 },
    thrower: sim.qb, target: r, releaseT: 1, releaseX: 35,
    intended: { x: 51.2, y: CENTER_Y + side * .15, z: 1.5 }, arrivalT: 2.15, deflected: false, throwaway: false }; sim.throwSight.stageRelease(sim, sim.throwAt);
  sim.ballPath = [{ t: 2.15, x: 51.2, y: CENTER_Y + side * .15, z: 1.5 }];
  // Head-turn availability is held fixed; this checks the motion request.
  d.tags.add('looking');
  return { sim, r, d };
}

describe('running phase at an observed receiver catch', () => {
  it.each([-1, 1])('preserves a nearby running receiver through the real World, mirror %s', side => {
    const { sim, r, d } = stage(side);
    const command = playBall(d, sim, null);
    const world = new World([r.body, d.body]);
    const initial = Math.hypot(r.pos.x - d.pos.x, r.pos.y - d.pos.y);
    // A fixed-point gather unnecessarily requests less forward motion than
    // the runner even though both bodies already travel together.
    expect(command.vel.x).toBeGreaterThanOrEqual(r.vel.x);
    for (let i = 0; i < 3; i++) world.step([{ vel: { x: 8, y: side } }, command], .05);
    expect(d.body.support!.state).toBe('up');
    expect(Math.hypot(r.pos.x - d.pos.x, r.pos.y - d.pos.y)).toBeLessThan(initial + .1);
  });

  it('retains an earlier reachable ball opportunity', () => {
    const { sim, d } = stage();
    d.body.pos.x = 49;
    // Outside the receiver's full tracking-hand envelope; only the defender
    // can reach this earlier point. The following point remains catchable.
    sim.ballPath.unshift({ t: 2.05, x: 48.5, y: CENTER_Y + .5, z: 1.5 });
    expect(playBall(d, sim, null).vel.x).toBeLessThan(0);
  });

  it('recognizes a catch within moving hand reach without requiring a stop at the ball point', () => {
    const { sim, d } = stage();
    sim.ballPath = [{ t: 2.15, x: 50.8, y: CENTER_Y + 1.2, z: 1.5 }];
    expect(playBall(d, sim, null).vel.x).toBeGreaterThanOrEqual(8);
  });

  it('keeps stationary catches as a fixed-point arrival', () => {
    const { sim, r, d } = stage(1, 0);
    r.body.vel = d.body.vel = { x: 0, y: 0 };
    for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
    const speed = Math.hypot(...Object.values(playBall(d, sim, null).vel));
    expect(speed).toBeLessThan(d.profile.vmax / 2);
  });

  it('uses the observed catcher rather than hidden intended target or unseen motion', () => {
    const { sim, r, d } = stage();
    const before = playBall(d, sim, null);
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    sim.ball.target = sim.slot('H')!;
    r.body.pos = { x: 80, y: 4 }; r.body.vel = { x: 0, y: -8 };
    expect(playBall(d, sim, null)).toEqual(before);
  });

  it('redirects a free moving arrival from its acquired picture without seeing the later catcher state', () => {
    const { sim, r, d } = stage();
    d.body.pos = { x: 55, y: CENTER_Y + 3 };
    d.body.vel = { x: -3, y: -3 };
    d.body.facing = Math.atan2(-3, -3);
    const profile = { ...d.profile }, body = structuredClone(d.body);
    const command = playBall(d, sim, null);
    // The receiver is coming through this visible window. A stationary-point
    // drive would keep asking the defender to run the opposite way.
    expect(command.vel.x).toBeGreaterThan(0);
    expect(d.body).toEqual(body);
    expect(d.profile).toEqual(profile);
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    sim.ball.target = sim.slot('H')!;
    r.body.pos = { x: 80, y: 4 }; r.body.vel = { x: 0, y: -8 };
    expect(playBall(d, sim, null)).toEqual(command);
  });
});
