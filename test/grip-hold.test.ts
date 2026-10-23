/** GRIP_HOLD (tackle.ts): a tackle hold keeps the grip it acquired when the
 * arms extend, and a hand hold holds what two hands on a jersey can. Closing
 * still works a grip toward a wrap; the hold still slides out while slipping
 * and breaks past reach. Off: grip follows the current extension, and hand
 * holds use the arm-push law. KNOWN_PROBLEMS TKL-1. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { G } from '../src/core/units.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { GraspJoint, Intent } from '../src/physics/world.js';
import { PlaySim } from '../src/sim/playsim.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function tackle(on: boolean) {
  vi.stubEnv('GRIP_HOLD', on ? '1' : '0');
  vi.resetModules();
  return import('../src/sim/tackle.js');
}

/** An acquired hold from behind: the runner at 6 yd/s, the holder `gap` yd
 * behind his center at `speed`, with hold quality `q`. */
async function hold(on: boolean, gap: number, q: number, speed: number, side = 1) {
  const { afterStep, gripForce, updateBond } = await tackle(on);
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'acquired rear hold' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover6,
      pressure: null, label: 'acquired rear hold' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const carrier = sim.slot('Y')!, defender = sim.slot('SS')!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 };
  }
  const body = carrier.profile.radius + defender.profile.radius;
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: 6, y: 0 };
  defender.body.pos = { x: 50 - body - gap * defender.profile.reach, y: CENTER_Y + side * .15 };
  defender.body.vel = { x: speed, y: 0 };
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier }; sim.catchAt = 0; sim.phase = 'live';
  const distance = Math.hypot(carrier.pos.x - defender.pos.x, carrier.pos.y - defender.pos.y);
  const reach = body + defender.profile.reach * .9;
  const joint: GraspJoint = { kind: 'grasp', a: defender.body, b: carrier.body, hold: distance,
    reach: Math.max(reach, distance + .15), capacity: gripForce(defender, q), legs: .3,
    pull: 1.2 + 1.2 * defender.r('tackling'), origin: 'reach+behind' };
  sim.world.joints.push(joint);
  sim.bond = { carrier, tacklers: [defender], start: 2, progressX: 50, down: false, stalled: 0,
    grip: new Map([[defender, q]]), holds: new Map([[defender, joint]]), execution: new Map([[defender, 1]]) };
  const run = (seconds: number) => {
    const out = { speed: carrier.speed, held: 0, maxGripDrop: 0, broke: false, y: carrier.pos.y };
    for (let t = 0; t < seconds - 1e-9; t += sim.dt) {
      const intents: Intent[] = sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
      intents[carrier.idx] = { vel: { x: 8, y: 0 }, effort: 1 };
      intents[defender.idx] = { vel: { x: 8, y: 0 }, effort: 1 };
      const before = sim.bond?.grip?.get(defender);
      if (sim.bond) updateBond(sim, sim.bond, intents);
      const after = sim.bond?.grip?.get(defender);
      if (before !== undefined && after !== undefined) out.maxGripDrop = Math.max(out.maxGripDrop, before - after);
      const r = sim.world.step(intents, sim.dt);
      // Energy and arm budgets: a kept grip must not invent work.
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
      expect(r.passiveGraspWork).toBeLessThanOrEqual(1e-8);
      expect(r.armImpulse[defender.idx]).toBeLessThanOrEqual(r.armImpulseLimit[defender.idx] + 1e-8);
      afterStep(sim);
      sim.t += sim.dt;
      if (joint.broken) { out.broke = true; break; }
      out.held += sim.dt;
      if (sim.phase !== 'live') break;
    }
    out.speed = carrier.speed; out.y = carrier.pos.y - CENTER_Y;
    return out;
  };
  return { sim, carrier, defender, joint, gripForce, run };
}

describe('a hand hold holds what two hands on a jersey can', () => {
  it('on: a mid-quality hand hold is near the holder\'s body weight, off: about half of it', async () => {
    const off = await hold(false, .45, .45, 5), on = await hold(true, .45, .45, 5);
    const bw = off.defender.profile.massKg * G;
    expect(off.gripForce(off.defender, .45) / bw).toBeLessThan(.65);
    expect(on.gripForce(on.defender, .45) / bw).toBeGreaterThan(.65);
    expect(on.gripForce(on.defender, .45) / bw).toBeLessThan(1.1);
  });
  it('a locked wrap keeps the arm law; a fingertip pinch stays weak', async () => {
    const off = await hold(false, .45, .45, 5), on = await hold(true, .45, .45, 5);
    expect(on.gripForce(on.defender, 1)).toBe(off.gripForce(off.defender, 1));
    expect(on.gripForce(on.defender, 0) / (on.defender.profile.massKg * G)).toBeLessThan(.3);
  });
  it('tackling is technique, not hand strength', async () => {
    const f = await hold(true, .45, .45, 5);
    const r = f.defender.player.ratings;
    const was = r.tackling;
    r.tackling = 0; const low = f.gripForce(f.defender, .45);
    r.tackling = 100; const high = f.gripForce(f.defender, .45);
    r.tackling = was;
    expect(high).toBe(low);
  });
});

describe('a hold keeps the grip it acquired when the arms extend', () => {
  it('on: the acquired grip does not fall as the arms extend; off: it follows extension', async () => {
    const on = await hold(true, .6, .9, 4.5), off = await hold(false, .6, .9, 4.5);
    expect(on.run(.6).maxGripDrop).toBe(0);
    expect(off.run(.6).maxGripDrop).toBeGreaterThan(0);
  });
  it('a held runner pays for a trailing holder: he slows instead of speeding up', async () => {
    const on = await hold(true, .3, .3, 5);
    const r = on.run(1);
    expect(r.speed).toBeLessThan(6);
  });
  it('control: a fingertip grab at full stretch on a faster runner still breaks', async () => {
    const r = (await hold(true, .8, .15, 3.4)).run(1);
    expect(r.broke).toBe(true);
    expect(r.held).toBeLessThan(.3);
  });
  it('a wrap pulled out to arm\'s length is a hand hold again: the lock follows the arms, the hands keep their grip', async () => {
    const f = await hold(true, .6, .9, 4.5);
    const r = f.run(.3);
    expect(r.broke).toBe(false);
    const grip = f.sim.bond!.grip!.get(f.defender)!, control = f.sim.bond!.control!.get(f.defender)!;
    expect(grip).toBeGreaterThan(control);
    expect(f.joint.capacity).toBeLessThan(f.gripForce(f.defender, grip));
    expect(f.joint.capacity).toBeGreaterThanOrEqual(f.gripForce(f.defender, grip, 0));
  });
  it('mirrored holds stay mirrored', async () => {
    const a = (await hold(true, .45, .45, 5, 1)).run(1), b = (await hold(true, .45, .45, 5, -1)).run(1);
    expect(b.speed).toBeCloseTo(a.speed, 9);
    expect(b.y).toBeCloseTo(-a.y, 9);
  });
});
