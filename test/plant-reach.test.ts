/** PLANT_REACH (experimental, off): a planted break is reached before the route follower moves past it. The out's exit leg
 * comes back toward the line (10 -> 9.5 yd), so off, a receiver 1.7 yd short of the plant and a little outside his stem is
 * "past" it (within 2 yd and ahead along the next leg) and is sent at the exit's far point at its through speed. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function approach(on: boolean) {
  vi.resetModules();
  vi.stubEnv('PLANT_REACH', on ? '1' : '0');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { steerRoute } = await import('../src/sim/route-motion.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1 });
  const r = sim.slot('X')!;
  // The out from his spot: a planted break at 10 yd, then 12 yd toward the sideline, back to 9.5 yd.
  const path = [{ p: { x: 50, y: 10 }, s: 0.4, cut: true }, { p: { x: 49.5, y: 1 }, s: 0.9 }];
  r.body.pos = { x: 48.3, y: 9.8 }; r.body.vel = { x: 6, y: 0 };
  const st = { idx: 0, from: { x: 40, y: 10 } };
  const cmd = steerRoute(r.body, st, path, 'continue', 0.86, 0.6, 0.8)!;
  return { idx: st.idx, speed: Math.hypot(cmd.vel.x, cmd.vel.y) };
}

describe('PLANT_REACH', () => {
  it('off: 1.7 yd short of the out\'s plant he is moved past it and asked for more speed; on: he keeps braking into it', async () => {
    const off = await approach(false), on = await approach(true);
    expect(off.idx).toBe(1);
    expect(on.idx).toBe(0);
    expect(on.speed).toBeLessThan(off.speed - 1);
  });
});
