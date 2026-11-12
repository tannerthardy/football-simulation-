/** HOLD_SINK (tackle.ts, experimental, off): holding is not running with him.
 * From the grasp, a side/rear holder's request along the runner's path never
 * exceeds the speed he already has there; after his recognition delay he
 * commits a sink by his tackling skill. Fixtures (Integration, 2026-11-12): a
 * holder who grabbed from a standstill beside the runner stays planted without
 * being told to stop (side-wrap-bench.mts asking to stop: about 2.5 yd, down
 * by 0.5 s), and a rear chase at matched speed is not slowed by the rule. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { GraspJoint, Intent } from '../src/physics/world.js';

// The engine as it runs (the reference stack), not the legacy engine the suite is pinned to: HOLD_FINISH, the request
// this flag caps, is part of it.
const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** A hold on a runner at 6 yd/s by a holder beside him (`where` 'side', at `vh` along the runner's path) or behind him
 * ('behind'), grip q. `steps` 0: one bond update, the holder's request along the path; else the World stepped with the
 * bond each tick, the runner asking for 8 yd/s: his travel and when he left his feet. */
async function hold(flag: string, where: 'side' | 'behind', vh: number, q: number, steps = 0, tight = false) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) vi.stubEnv(k, v === 'on' ? '1' : '0');
  vi.stubEnv('HOLD_SINK', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { gripForce, updateBond } = await import('../src/sim/tackle.js');
  const sim: any = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'hold' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover6, pressure: null, label: 'hold' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const carrier = sim.slot('Y')!, defender = sim.slot('SS')!;
  for (const a of sim.agents) { a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; }
  // tight: torsos touching (a wrap, as side-wrap-bench.mts); else an arm's-length hold.
  const body = carrier.profile.radius + defender.profile.radius, gap = tight ? body + 0.1 : body + 0.6 * defender.profile.reach;
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: 6, y: 0 };
  defender.body.pos = where === 'side' ? { x: 50, y: CENTER_Y + gap } : { x: 50 - gap, y: CENTER_Y };
  defender.body.vel = { x: vh, y: 0 };
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier }; sim.catchAt = 0; sim.phase = 'live';
  const joint: GraspJoint = { kind: 'grasp', a: defender.body, b: carrier.body, hold: gap,
    reach: body + defender.profile.reach * 0.9 + 0.15, capacity: gripForce(defender, q), lock: q, legs: 0.5, pull: 1.2, origin: 'reach' };
  sim.world.joints.push(joint);
  sim.bond = { carrier, tacklers: [defender], start: 2, progressX: 50, down: false, stalled: 0,
    grip: new Map([[defender, q]]), control: new Map([[defender, q]]), holds: new Map([[defender, joint]]), execution: new Map([[defender, 1]]) };
  const fresh = () => { const it: Intent[] = sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
    it[carrier.idx] = { vel: { x: 8, y: 0 }, effort: 1, push: 1 }; it[defender.idx] = { vel: { x: 8, y: 0 }, effort: 1 }; return it; };
  if (!steps) { const it = fresh(); updateBond(sim, sim.bond, it); return { along: it[defender.idx].vel.x, travel: 0, fell: -1 }; }
  let fell = -1;
  for (let k = 1; k <= steps; k++) {
    const it = fresh();
    if (sim.bond) updateBond(sim, sim.bond, it);
    sim.world.step(it, sim.dt); sim.t += sim.dt;
    if (fell < 0 && carrier.body.support?.state !== 'up') fell = sim.t - 2;
  }
  return { along: NaN, travel: carrier.body.pos.x - 50, fell };
}

describe('HOLD_SINK', () => {
  it('from the grasp, a holder at a standstill beside him asks for no speed along his path', async () => {
    const on = await hold('1', 'side', 0, 0.8), off = await hold('0', 'side', 0, 0.8);
    expect(on.along).toBeLessThan(0.05);
    expect(off.along).toBeGreaterThan(0.5);           // HOLD_FINISH: the runner's speed x (1 - grip security)
  });

  it('a rear chase at matched speed is not slowed by the rule', async () => {
    const on = await hold('1', 'behind', 6, 0.8), off = await hold('0', 'behind', 6, 0.8);
    expect(on.along).toBeCloseTo(off.along, 9);
  });

  it('stepped, a standstill holder tight beside him plants: the runner is down inside half a second, not run along', async () => {
    const on = await hold('1', 'side', 0, 0.8, 30, true), off = await hold('0', 'side', 0, 0.8, 30, true);
    console.log(`side wrap from a standstill: on travel ${on.travel.toFixed(2)} yd, down at ${on.fell.toFixed(2)} s | off ${off.travel.toFixed(2)} yd, ${off.fell.toFixed(2)} s`);
    // A tight side wrap (torsos touching), grip 0.8: on, down by 0.45 s in 3.2 yd; off (HOLD_FINISH), 0.55 s, 4.1 yd.
    expect(on.fell).toBeGreaterThan(0);
    expect(on.fell).toBeLessThan(0.5);
    expect(on.travel).toBeLessThan(off.travel - 0.5);
  });
});
