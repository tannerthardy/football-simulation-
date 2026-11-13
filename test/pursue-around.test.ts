/** PURSUE_AROUND (on; PURSUE_AROUND=0 for comparison): a free pursuer the
 * runner has already passed works around an offensive body on his path
 * instead of requesting velocity into it. A defender in front of the runner
 * keeps his request (taking on a lead blocker is a fit, not pursuit). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

interface Scene { carrier: [number, number, number, number]; defender: [number, number, number, number]; body?: [number, number] }

/** One runner, one defender, optionally one standing offensive body; everyone else far away. */
async function command(on: boolean, s: Scene) {
  vi.stubEnv('PURSUE_AROUND', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { chase } = await import('../src/sim/behaviors/common.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(11), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(12), 'D', 'DEF'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 'test' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'test' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 77 });
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + a.idx * .1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
    a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  const c = sim.slot('Z')!, d = sim.slot('DT_W')!, o = sim.slot('LG')!;
  c.downUntil = d.downUntil = -1; sim.t = 2; sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  c.body.pos = { x: s.carrier[0], y: s.carrier[1] }; c.body.vel = { x: s.carrier[2], y: s.carrier[3] };
  d.body.pos = { x: s.defender[0], y: s.defender[1] }; d.body.vel = { x: s.defender[2], y: s.defender[3] };
  if (s.body) { o.downUntil = -1; o.body.pos = { x: s.body[0], y: s.body[1] }; }
  // A consistent constant-velocity past for the delayed pictures.
  for (let k = 0; k < 24; k++) {
    const lag = (23 - k) * sim.dt;
    sim.perception.record(sim.agents.map(a => ({ pos: { x: a.pos.x - a.vel.x * lag, y: a.pos.y - a.vel.y * lag },
      vel: a.vel, facing: a.facing, stance: a.stance, pose: a.pose })));
  }
  return { cmd: chase(sim, d, c), d, o };
}

/** How far the requested straight line passes from the body's centre, minus the two bodies' contact distance. */
const clearance = (r: Awaited<ReturnType<typeof command>>) => {
  const dx = r.o.pos.x - r.d.pos.x, dy = r.o.pos.y - r.d.pos.y, v = Math.hypot(r.cmd.vel.x, r.cmd.vel.y);
  return Math.abs(dx * r.cmd.vel.y - dy * r.cmd.vel.x) / v - (r.d.profile.radius + r.o.profile.radius);
};
const speed = (r: Awaited<ReturnType<typeof command>>) => Math.hypot(r.cmd.vel.x, r.cmd.vel.y);

describe('PURSUE_AROUND', () => {
  it.each([-1, 1])('a trailing pursuer goes around a body on his path instead of into it, side=%s', async (side) => {
    // The runner is 4 yd past him; a lineman stands 1.1 yd ahead, just off the straight line.
    const scene: Scene = { carrier: [50, CENTER_Y, 6, 0], defender: [46, CENTER_Y, 2, 0], body: [47.1, CENTER_Y + side * .1] };
    const off = await command(false, scene), on = await command(true, scene);
    expect(clearance(off)).toBeLessThan(0);
    expect(clearance(on)).toBeGreaterThan(0);
    // Same urgency; he passes on the side away from the body.
    expect(speed(on)).toBeCloseTo(speed(off), 6);
    expect(Math.sign(on.cmd.vel.y)).toBe(-side);
  });

  it('keeps the request of a defender in front of the runner (a lead blocker is a fit)', async () => {
    const scene: Scene = { carrier: [46, CENTER_Y, 6, 0], defender: [52, CENTER_Y, -2, 0], body: [50.9, CENTER_Y + .1] };
    const off = await command(false, scene), on = await command(true, scene);
    expect(on.cmd.vel).toEqual(off.cmd.vel);
  });

  it('keeps the request when no body is on his path', async () => {
    const scene: Scene = { carrier: [50, CENTER_Y, 6, 0], defender: [46, CENTER_Y, 2, 0], body: [47, CENTER_Y + 4] };
    const off = await command(false, scene), on = await command(true, scene);
    expect(on.cmd.vel).toEqual(off.cmd.vel);
  });
});
