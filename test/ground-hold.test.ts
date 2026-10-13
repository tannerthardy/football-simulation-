/** GROUND_HOLD (experimental, off): the tackle controller requests the
 * proposed `stayDown` intent only while a downed holder is performing the
 * finish (a live grasp on an upright carrier), and stops when that ends. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { GraspJoint, Intent } from '../src/physics/world.js';

type StayIntent = Intent & { stayDown?: boolean };
async function held(flag: string, holder: 'up' | 'down', carrier: 'up' | 'down' = 'up', broken = false) {
  vi.stubEnv('GROUND_HOLD', flag); vi.stubEnv('TACKLE_ROLL', '0'); vi.stubEnv('TACKLE_DROP', '0');
  vi.resetModules();
  const { updateBond } = await import('../src/sim/tackle.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(61), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(62), 'D', 'D'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'hold' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'hold' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 7 });
  const c = sim.slot('RB')!, d = sim.defense.find((a) => a.slot === 'MLB' || a.slot.startsWith('LB'))!;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: 2, y: 0 };
  d.body.pos = { x: 49.1, y: CENTER_Y }; d.body.vel = { x: 2, y: 0 };
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier: c } as never;
  const joint: GraspJoint = { kind: 'grasp', a: d.body, b: c.body, reach: 1.6, capacity: 900, legs: 0.5, pull: 1, hold: 0.9 };
  if (broken) joint.broken = true;
  sim.world.joints.push(joint);
  sim.bond = { carrier: c, tacklers: [d], start: 1.8, progressX: 50, down: false, stalled: 0,
    grip: new Map([[d, 0.9]]), holds: new Map([[d, joint]]), execution: new Map([[d, 1]]) };
  d.body.support!.state = holder; d.body.support!.since = 1.9;
  c.body.support!.state = carrier; c.body.support!.since = 1.9;
  for (const a of sim.agents) sim.intents[a.idx] = { vel: { x: 0, y: 0 } };
  updateBond(sim, sim.bond, sim.intents);
  return { sim, d, intent: sim.intents[d.idx] as StayIntent | undefined };
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('ground finish request (GROUND_HOLD)', () => {
  it('is never requested by default', async () => {
    expect((await held('0', 'down')).intent?.stayDown).toBeUndefined();
  });
  it('a downed holder with a live grip on an upright carrier stays down on it', async () => {
    expect((await held('1', 'down')).intent?.stayDown).toBe(true);
  });
  it('an upright holder is not asked to stay down', async () => {
    expect((await held('1', 'up')).intent?.stayDown).toBeUndefined();
  });
  it('ends once the carrier is down: ordinary recovery applies', async () => {
    expect((await held('1', 'down', 'down')).intent?.stayDown).toBeUndefined();
  });
  it('ends when the grip breaks: he leaves the bond and is not asked', async () => {
    const f = await held('1', 'down', 'up', true);
    expect(f.sim.bond).toBeNull();
    expect(f.intent?.stayDown).toBeUndefined();
  });
});
