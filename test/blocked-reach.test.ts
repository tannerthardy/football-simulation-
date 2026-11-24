/** BLOCKED_REACH (tackle.ts tryTackles): a blocked defender who has not beaten
 * the block may still reach for a carrier passing him with his free arm. The
 * reach shrinks as the blocker's inside hands are latched; the attempt itself
 * keeps the ordinary engaged miss penalty. Only the arm away from the blocker
 * is free: a blocker head-up or on the runner's side leaves the installed
 * gate. Off: the installed win gate. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Engagement } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';
import { recordPicture, tackleNow } from './helpers/tackle-now.js';
import { reachTo } from '../src/sim/tackle-reach.js';

/** The carrier passes a blocked tackle 0.55 of an arm beyond body contact. */
function stage(control: number, blocker: 'free' | 'covered' | 'square') {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'D'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'reach' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'reach' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83 });
  const c = sim.slot('RB')!, d = sim.slot('DT_S')!, b = sim.slot('RG')!;
  for (const a of sim.agents) { a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  c.downUntil = d.downUntil = -1;
  const gap = reachTo(d, c, .55);
  d.body.pos = { x: 41, y: CENTER_Y }; d.body.facing = Math.PI / 2;
  c.body.pos = { x: 41, y: CENTER_Y + gap }; c.body.vel = { x: 1, y: 0 };
  // In front of him, offset away from the runner, toward him, or head-up.
  b.body.pos = { x: 40.2, y: CENTER_Y + { free: -.6, covered: .6, square: 0 }[blocker] };
  d.engagement = { blocker: b, defender: d, helpers: [], start: 0, type: 'run', win: .3, control, phi: .1, side: 1,
    baseB: 1, baseD: 1 } as unknown as Engagement;
  sim.t = sim.world.time = 1.2; sim.ball = { kind: 'held', carrier: c };
  sim.intents[d.idx] = { vel: { x: 0, y: 0 }, facing: Math.PI / 2 };
  return { sim, c, d };
}
async function reach(enabled: boolean, control: number, blocker: 'free' | 'covered' | 'square' = 'free') {
  vi.stubEnv('BLOCKED_REACH', enabled ? '1' : '0');
  vi.stubEnv('TACKLE_TOUCH', '0'); vi.stubEnv('REACH_CONTACT', '0');
  vi.resetModules();
  const T = await import('../src/sim/tackle.js'); const { tryTackles } = T;
  const f = stage(control, blocker);
  const chance = vi.spyOn(f.sim.rng, 'chance').mockReturnValue(true);
  const strike = vi.spyOn(f.sim, 'lungeAt');
  recordPicture(f.sim); tackleNow(f.sim, T);
  return { reached: chance.mock.calls.length > 0 || strike.mock.calls.length > 0 || !!f.sim.bond, ...f };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('a blocked defender reaches with his free arm', () => {
  it('off: a defender losing nothing to the block never reaches', async () => {
    expect((await reach(false, 0)).reached).toBe(false);
  });
  it('on: his free arm reaches a carrier passing within it', async () => {
    expect((await reach(true, 0)).reached).toBe(true);
  });
  it('on: latched inside hands pull that arm in', async () => {
    expect((await reach(true, 1)).reached).toBe(false);
  });
  it.each(['covered', 'square'] as const)('on: a blocker %s occupies that arm', async blocker => {
    // FREE_ARM_2D: a square blocker in front of him does not cover a runner passing 90 deg to his side (the review's
    // point); only a blocker within 60 deg of the runner's line ('covered') occupies that arm.
    const free2d = process.env.FREE_ARM_2D === '1' && blocker === 'square';
    expect((await reach(true, 0, blocker)).reached).toBe(free2d);
  });
});
