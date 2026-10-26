import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { GraspJoint, Intent } from '../src/physics/world.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

function stage(distance: number, speed: number) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'touch' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'touch' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83 });
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  for (const a of sim.agents) { a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  c.downUntil = d.downUntil = -1;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: speed, y: 0 };
  d.body.pos = { x: 50 + distance, y: CENTER_Y }; d.body.facing = Math.PI;
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  sim.intents[d.idx] = { vel: { x: 0, y: 0 }, facing: Math.PI };
  for (let k = 0; k < 24; k++) {
    const lag = (23 - k) * sim.dt;
    sim.perception.record(sim.agents.map(a => ({ pos: { x: a.pos.x - a.vel.x * lag, y: a.pos.y - a.vel.y * lag },
      vel: a.vel, facing: a.facing, stance: a.stance, pose: a.pose })));
  }
  return { sim, c, d };
}
async function acquire(enabled: boolean, distance: number, speed: number) {
  vi.stubEnv('TACKLE_TOUCH', enabled ? '1' : '0'); vi.stubEnv('REACH_CONTACT', '0');
  vi.resetModules();
  const { tryTackles } = await import('../src/sim/tackle.js');
  const f = stage(distance, speed);
  const chance = vi.spyOn(f.sim.rng, 'chance').mockReturnValue(false);
  const strike = vi.spyOn(f.sim, 'lungeAt'), dive = vi.spyOn(f.sim, 'diveAt');
  tryTackles(f.sim);
  return { ...f, chance, strike, dive };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('early hand contact preserves a coherent committed approach', () => {
  it('acquires an ordinary standing hold when the default waits', async () => {
    const off = await acquire(false, 1.4, 8);
    expect(off.sim.bond).toBeNull(); expect(off.chance).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    const on = await acquire(true, 1.4, 8), j = on.sim.bond?.holds?.get(on.d);
    expect(j).toBeDefined(); expect(on.strike).not.toHaveBeenCalled(); expect(on.dive).not.toHaveBeenCalled();
    expect(j?.brace).toBeUndefined(); expect(j?.pull).toBeGreaterThan(0);
    expect(on.chance).toHaveBeenCalledTimes(2); // existing miss and fumble attempts
    expect(on.sim.bond?.down).toBe(false); // Contact does not award a finish.
  });

  it('preserves the ordinary committed body strike at a tight wrap', async () => {
    const off = await acquire(false, .72, -3);
    expect(off.strike).toHaveBeenCalledOnce();
    const original = structuredClone(off.strike.mock.calls[0][1]);
    vi.restoreAllMocks();
    const on = await acquire(true, .72, -3);
    expect(on.sim.bond?.holds?.get(on.d)).toBeDefined(); expect(on.strike).toHaveBeenCalledOnce();
    expect(on.strike.mock.calls[0][1]).toEqual(original);
  });

  it('keeps the existing strike for a last reachable opportunity', async () => {
    const f = await acquire(true, 1.4, -4);
    expect(f.sim.bond?.holds?.get(f.d)).toBeDefined(); expect(f.strike).toHaveBeenCalledOnce();
  });

  it('does not add a hold outside physical standing reach', async () => {
    const f = await acquire(true, 3, 8);
    expect(f.sim.bond).toBeNull(); expect(f.strike).not.toHaveBeenCalled(); expect(f.chance).not.toHaveBeenCalled();
  });
});

describe('an extended hold does not replace active strike footwork with pile braking', () => {
  it.each(['queued', 'ongoing', 'none', 'tight'] as const)('keeps the correct transition for %s', async phase => {
    vi.stubEnv('TACKLE_TOUCH', '1'); vi.stubEnv('REACH_CONTACT', '0'); vi.stubEnv('TACKLE_ROLL', '0');
    vi.resetModules();
    const { updateBond, gripForce } = await import('../src/sim/tackle.js');
    const f = stage(1.4, 6);
    f.d.body.pos = { x: phase === 'tight' ? 49.45 : 48.6, y: CENTER_Y };
    f.d.body.vel = { x: 8, y: 0 };
    const j: GraspJoint = { kind: 'grasp', a: f.d.body, b: f.c.body, reach: 1.7,
      hold: 1.4, capacity: gripForce(f.d, .4), legs: .2, pull: 2 };
    f.sim.world.joints.push(j);
    f.sim.bond = { carrier: f.c, tacklers: [f.d], start: 2, progressX: 50, down: false,
      holds: new Map([[f.d, j]]), grip: new Map([[f.d, .4]]), execution: new Map([[f.d, 1]]) };
    const intents: Intent[] = f.sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
    const requested = { x: 9, y: .2 };
    intents[f.d.idx] = { vel: requested, cutSkill: 1.1, effort: .9,
      lunge: phase === 'queued' || phase === 'tight' ? { x: 2, y: .3 } : undefined };
    if (phase === 'ongoing') f.d.body.support!.strike = { x: .4, y: .1 };
    updateBond(f.sim, f.sim.bond, intents);
    if (phase === 'queued' || phase === 'ongoing') {
      expect(intents[f.d.idx].vel).toEqual(requested);
      expect(intents[f.d.idx].cutSkill).toBe(1.1); expect(intents[f.d.idx].effort).toBe(.9);
    } else expect(intents[f.d.idx].vel.x).toBeLessThan(requested.x);
    expect(j.legs).toBe(.2); expect(j.pull).toBe(2); expect(j.brace).toBeUndefined();
    expect(f.sim.bond.down).toBe(false);
  });
});
