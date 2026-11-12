import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

function stage(side = 1) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const receiver = sim.slot('X')!;
  receiver.body.pos = { x: 50, y: CENTER_Y };
  receiver.body.vel = { x: 6, y: side };
  sim.t = 2;
  sim.ball = { kind: 'air', flight: { pos: { x: 49, y: CENTER_Y, z: 2 }, vel: { x: 20, y: side, z: -1 }, drag: 0 },
    thrower: sim.qb, target: receiver, releaseT: 1, releaseX: 35, intended: { x: 52.4, y: CENTER_Y + side * .4, z: 1.5 },
    arrivalT: 2.9, deflected: false, throwaway: false };
  sim.ballPath = [{ t: 2.6, x: 50.4, y: CENTER_Y + side * .05, z: 1.5 },
    { t: 2.9, x: 52.4, y: CENTER_Y + side * .4, z: 1.5 }];
  vi.spyOn(sim.rng, 'normal').mockReturnValue(0);
  return { sim, receiver };
}
async function tracking(enabled: boolean, side = 1) {
  vi.stubEnv('IN_STRIDE_CATCH', enabled ? '1' : '0'); vi.resetModules();
  const { TrackBall } = await import('../src/sim/behaviors/receiver.js');
  const f = stage(side);
  const fallback = { kind: 'idle' as const, update: () => ({ vel: { x: 0, y: 0 } }) };
  const behavior = new TrackBall(f.receiver, f.sim, fallback);
  f.sim.t = 2.5;
  return { ...f, behavior };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('default-off preservation of the in-stride catch experiment', () => {
  it.each([-1, 1])('retains a reachable running line instead of waiting for its earlier point, side=%s', async side => {
    const old = await tracking(false, side), next = await tracking(true, side);
    const body = structuredClone(next.receiver.body), ball = next.sim.ball;
    if (ball.kind !== 'air') throw Error('Expected flight');
    const flight = structuredClone(ball.flight);
    const original = old.behavior.update(old.receiver, old.sim), command = next.behavior.update(next.receiver, next.sim);
    expect(command.vel.x).toBeCloseTo(6, 10);
    expect(command.vel.y).toBeCloseTo(side, 10);
    expect(command.vel.x).toBeGreaterThan(original.vel.x);
    expect(next.receiver.body).toEqual(body); expect(next.sim.ball).toBe(ball);
    expect(ball.flight).toEqual(flight);
    expect(next.sim.stats.completed).toBeFalsy();
  });

  it('still requests a return for a short ball', async () => {
    const f = await tracking(true);
    f.sim.ballPath = [{ t: 2.9, x: 49.5, y: CENTER_Y, z: 1.5 }];
    expect(f.behavior.update(f.receiver, f.sim).vel.x).toBeLessThan(0);
  });

  it('a ball clearly behind his running line makes him slow for it, not run through it', async () => {
    const f = await tracking(true);
    // His running line puts him at x 52.4 by 2.9 s; the ball comes down 1.2 yd short of that.
    f.sim.ballPath = [{ t: 2.9, x: 51.2, y: CENTER_Y, z: 1.5 }];
    const v = f.behavior.update(f.receiver, f.sim).vel.x;
    expect(v).toBeLessThan(6);
    expect(v).toBeGreaterThan(0);
  });

  it('does not select an in-stride point above the existing catch envelope', async () => {
    const old = await tracking(false), next = await tracking(true);
    for (const f of [old, next]) f.sim.ballPath[1].z = f.receiver.profile.maxCatchHeight + 1;
    expect(next.behavior.update(next.receiver, next.sim).vel.x).toBeLessThan(6);
  });
});
