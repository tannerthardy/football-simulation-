/** HOLD_FINISH (tackle.ts, experimental, off): a holder beside the runner
 * commits his weight against the runner's travel as hard as his grip lets
 * him, instead of running along with his hands on the man; and an upper hold
 * sits where his hands are (shoulder line to waist), not at the runner's
 * centre of mass. Off: the plant is along his arms only, which beside the
 * runner is across the runner's path, and an upper hold has no height. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { GraspJoint, Intent } from '../src/physics/world.js';
import { PlaySim } from '../src/sim/playsim.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** One bond update for a hold from beside a runner at 6 yd/s: the holder
 * level with him, an arm's length to his side, grip `q`, leg share `legs`. */
async function sideHold(on: boolean, q: number, legs: number) {
  vi.stubEnv('HOLD_FINISH', on ? '1' : '0');
  vi.resetModules();
  const { gripForce, updateBond } = await import('../src/sim/tackle.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'side hold' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover6,
      pressure: null, label: 'side hold' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const carrier = sim.slot('Y')!, defender = sim.slot('SS')!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 };
  }
  const body = carrier.profile.radius + defender.profile.radius;
  const gap = body + 0.6 * defender.profile.reach;
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: 6, y: 0 };
  defender.body.pos = { x: 50, y: CENTER_Y + gap }; defender.body.vel = { x: 6, y: 0 };
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier }; sim.catchAt = 0; sim.phase = 'live';
  const joint: GraspJoint = { kind: 'grasp', a: defender.body, b: carrier.body, hold: gap,
    reach: body + defender.profile.reach * 0.9 + 0.15, capacity: gripForce(defender, q), legs,
    pull: 1.2, origin: 'reach' };
  sim.world.joints.push(joint);
  sim.bond = { carrier, tacklers: [defender], start: 1.5, progressX: 50, down: false, stalled: 0,
    grip: new Map([[defender, q]]), control: new Map([[defender, q]]), holds: new Map([[defender, joint]]),
    execution: new Map([[defender, 1]]) };
  const intents: Intent[] = sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
  intents[carrier.idx] = { vel: { x: 8, y: 0 }, effort: 1 };
  intents[defender.idx] = { vel: { x: 8, y: 0 }, effort: 1 };
  updateBond(sim, sim.bond, intents);
  return { along: intents[defender.idx].vel.x, grip: sim.bond!.grip!.get(defender)!, joint, carrier };
}

describe('HOLD_FINISH', () => {
  it('off: a holder beside the runner asks to run along at his speed', async () => {
    const r = await sideHold(false, 0.9, 0.3);
    expect(r.along).toBeGreaterThan(5.5);
    expect(r.joint.height).toBeUndefined();
  });

  it('on: he plants against the runner\'s travel, harder on a stronger grip', async () => {
    const firm = await sideHold(true, 0.9, 0.3), weak = await sideHold(true, 0.3, 0.3);
    expect(firm.along).toBeCloseTo(6 * (1 - firm.grip), 1);
    expect(firm.along).toBeLessThan(1.5);
    expect(weak.along).toBeGreaterThan(firm.along + 2);
  });

  it('on: an upper hold sits from the shoulder line to the waist; a leg hold keeps the default', async () => {
    const jersey = await sideHold(true, 0.9, 0), waist = await sideHold(true, 0.9, 0.45), legs = await sideHold(true, 0.9, 0.7);
    const stature = jersey.carrier.profile.heightYd;
    expect(jersey.joint.height!).toBeGreaterThan(0.7 * stature);
    expect(jersey.joint.height!).toBeLessThanOrEqual(0.79 * stature + 1e-9);
    expect(waist.joint.height!).toBeLessThan(jersey.joint.height!);
    expect(legs.joint.height).toBeUndefined();
  });
});
