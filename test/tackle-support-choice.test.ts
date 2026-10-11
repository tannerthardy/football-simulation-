import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { GraspJoint, Intent } from '../src/physics/world.js';
import { PlaySim } from '../src/sim/playsim.js';
import { gripForce, updateBond } from '../src/sim/tackle.js';

/** An already acquired tackle, isolating the support command from uncertain
 * acquisition. No final yardage or guaranteed fall is encoded in this fixture. */
function hold(side: number, location: 'rear' | 'side' | 'front' = 'rear', weak = false) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: side < 0, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'acquired side/rear hold' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover6,
      pressure: null, label: 'acquired side/rear hold' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const carrier = sim.slot('Y')!, defender = sim.slot('SS')!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 };
  }
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: 6, y: 0 };
  defender.body.pos = location === 'side' ? { x: 50, y: CENTER_Y + side * .7 }
    : { x: 50 + (location === 'rear' ? -1 : 1) * (weak ? 1.5 : .7), y: CENTER_Y + side * .1 };
  defender.body.vel = { x: 6, y: 0 };
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier }; sim.catchAt = 0;
  const distance = Math.hypot(carrier.pos.x - defender.pos.x, carrier.pos.y - defender.pos.y);
  const q = weak ? .15 : .8;
  const joint: GraspJoint = { kind: 'grasp', a: defender.body, b: carrier.body,
    hold: distance, reach: Math.max(1.7, distance + .15), capacity: gripForce(defender, q),
    legs: .6, pull: 2, origin: 'reach+behind' };
  sim.world.joints.push(joint);
  sim.bond = { carrier, tacklers: [defender], start: 2, progressX: 50, down: false,
    grip: new Map([[defender, q]]), holds: new Map([[defender, joint]]), execution: new Map([[defender, 1]]) };
  const intents: Intent[] = sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
  intents[carrier.idx] = { vel: { x: 8, y: 0 } };
  intents[defender.idx] = { vel: { x: 6, y: 0 } };
  const request = () => { updateBond(sim, sim.bond!, intents); return intents[defender.idx]; };
  return { sim, carrier, defender, joint, intents, request };
}

describe('a secured tackle preserves achievable foot support', () => {
  it.each([[-1, 'rear'], [1, 'rear'], [-1, 'side'], [1, 'side']] as const)(
    'keeps working the feet into a secured %s/%s hold instead of forcing a dive', (side, location) => {
      const f = hold(side, location), commanded = f.request();
      expect(f.sim.bond!.grip!.get(f.defender)).toBeGreaterThan(.55);
      expect(commanded.dive).toBeUndefined();
      expect(commanded.vel.x).toBeGreaterThanOrEqual(f.carrier.vel.x);
      const beforeRng = { ...f.sim.rng };
      const report = f.sim.world.step(f.intents, f.sim.dt);
      // Contact is allowed to knock either player down; the controller must
      // not order the holder off his feet just because the arms secured.
      expect(f.defender.body.support!.cause).not.toBe('dive');
      expect(report.work.residual).toBeCloseTo(0, 7);
      expect(report.passiveGraspWork).toBeLessThanOrEqual(1e-8);
      expect({ ...f.sim.rng }).toEqual(beforeRng);
    });

  it.each([-1, 1])('preserves an explicitly committed dive, mirror=%s', side => {
    const f = hold(side), dive = { x: 1, y: side * .1 };
    f.intents[f.defender.idx].dive = dive;
    expect(f.request().dive).toEqual(dive);
    f.sim.world.step(f.intents, f.sim.dt);
    expect(f.defender.body.support!.state).toBe('falling');
    expect(f.defender.body.support!.cause).toBe('dive');
  });

  it.each([-1, 1])('preserves the bounded strike already requested, mirror=%s', side => {
    const f = hold(side), lunge = { x: .3, y: side * .1 };
    f.intents[f.defender.idx].lunge = lunge;
    expect(f.request().lunge).toEqual(lunge);
    expect(f.intents[f.defender.idx].dive).toBeUndefined();
  });

  it.each([-1, 1])('does not promote a weak extended grasp or order a fall, mirror=%s', side => {
    const f = hold(side, 'rear', true), commanded = f.request();
    expect(f.sim.bond!.grip!.get(f.defender)).toBeLessThan(.55);
    expect(commanded.dive).toBeUndefined();
    expect(f.joint.capacity).toBe(gripForce(f.defender, f.sim.bond!.grip!.get(f.defender)!));
  });

  it.each([-1, 1])('does not restore standing support to a grounded extended holder, mirror=%s', side => {
    const f = hold(side);
    Object.assign(f.defender.body.support!, { state: 'down', since: 1.9, fall: { x: 1, y: 0 } });
    f.joint.ground = f.joint.reach + .9;
    f.request(); const report = f.sim.world.step(f.intents, f.sim.dt);
    expect(f.defender.body.support!.state).toBe('down');
    expect(report.groundWork[f.defender.idx]).toBeLessThan(0);
    expect(report.work.residual).toBeCloseTo(0, 7);
  });

  it.each([-1, 1])('stays with an already falling carrier, mirror=%s', side => {
    const f = hold(side);
    Object.assign(f.carrier.body.support!, { state: 'falling', since: 1.9, fall: { x: 1, y: 0 } });
    expect(f.request().vel.x).toBeGreaterThan(f.carrier.vel.x);
    expect(f.intents[f.defender.idx].dive).toBeUndefined();
  });

  it.each([-1, 1])('retains front-on drive into an incoming carrier, mirror=%s', side => {
    const f = hold(side, 'front'), commanded = f.request();
    expect(commanded.vel.x).toBeLessThan(0);
    expect(commanded.dive).toBeUndefined();
  });
});
