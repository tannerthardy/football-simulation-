/** SPACE_STEER (experimental, off): a free player whose path runs into a
 * teammate bends around him rather than only slowing behind him. The same
 * free-movement forecast and acquired peer pictures decide; bodies never
 * touch. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { newSupport } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** A guard from rest asks to run 6 yd/s straight through the spot of a
 * standing teammate 1.1 yd ahead (offset `offset` yd across), for 1.2 s. */
async function run(on: boolean, offset: number) {
  vi.stubEnv('SPACE_STEER', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { World } = await import('../src/physics/world.js');
  const { spaceTeammates } = await import('../src/sim/spacing.js');
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'steer' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'steer' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83,
  });
  const a = sim.slot('LG')!, b = sim.slot('LT')!;
  a.body.pos = { x: 50, y: CENTER_Y }; a.body.vel = { x: 0, y: 0 }; a.body.facing = 0; a.body.support = newSupport();
  b.body.pos = { x: 51.1, y: CENTER_Y + offset }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0; b.body.support = newSupport();
  const world = new World([a.body, b.body]); world.time = 2;
  let closest = Infinity, contacts = 0;
  for (let k = 0; k < 24; k++) {
    const intents: Intent[] = [{ vel: { x: 6, y: 0 } }, { vel: { x: 0, y: 0 } }];
    spaceTeammates([a, b], intents, (_a, target) => target, { now: world.time });
    const report = world.step(intents, .05);
    world.time += .05;
    contacts += report.contacts.length;
    closest = Math.min(closest, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) - (a.profile.radius + b.profile.radius));
  }
  return { progress: a.pos.x - 50, across: a.pos.y - CENTER_Y, closest, contacts };
}

describe('SPACE_STEER', () => {
  it.each([.1, -.1])('off: the guard stalls behind the teammate (offset %s)', async (offset) => {
    const off = await run(false, offset);
    expect(off.progress).toBeLessThan(1);
  });
  it.each([.1, -.1])('on: he bends around him on the open side without touching (offset %s)', async (offset) => {
    const off = await run(false, offset), on = await run(true, offset);
    expect(on.progress).toBeGreaterThan(off.progress + 1);
    expect(on.contacts).toBe(0);
    expect(on.closest).toBeGreaterThan(-.1);
    expect(Math.sign(on.across)).toBe(-Math.sign(offset));
  });
});
