/** PURSUIT_SPACING_SMOOTH (src/sim/spacing.ts; experimental, off; with SPACING_SMOOTH): a pursuer gets the same
 * inside-the-gates ramp on the teammate closing limit. A pursuing defender closing on a teammate ahead is swept across
 * the old touch gate in 0.01 yd steps of lateral offset: with SPACING_SMOOTH alone (pursuers exempt) his spaced
 * request jumps at the gate; with this flag too it changes continuously, and he still slows for a teammate in his
 * path and keeps a clear lane. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function sweep(flag: string) {
  vi.resetModules();
  vi.stubEnv('SPACING_SMOOTH', '1');
  vi.stubEnv('PURSUIT_SPACING_SMOOTH', flag);
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense, pickDefense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { spaceTeammates } = await import('../src/sim/spacing.js');
  const out: { vx: number; vy: number }[] = [];
  for (let k = 0; k <= 120; k++) {
    const offset = 0.4 + k * 0.01;
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(11), 'O', 'OFF'), '11'),
      defense: pickDefense(generateTeam(new Rng(12), 'D', 'DEF'), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 'test' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: 'test' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 77 });
    const a = sim.defense[0], b = sim.defense[1];
    (a as { behavior: unknown }).behavior = { kind: 'pursuit' };
    a.body.pos = { x: 50, y: CENTER_Y }; a.body.vel = { x: -5, y: 0 }; a.body.facing = Math.PI;
    b.body.pos = { x: 48.5, y: CENTER_Y + offset }; b.body.vel = { x: 0, y: 0 };
    const intents = [{ vel: { x: -5, y: 0 } }, { vel: { x: 0, y: 0 } }];
    spaceTeammates([a, b], intents);
    out.push({ vx: intents[0].vel.x, vy: intents[0].vel.y });
  }
  let jump = 0;
  for (let i = 1; i < out.length; i++) jump = Math.max(jump, Math.hypot(out[i].vx - out[i - 1].vx, out[i].vy - out[i - 1].vy));
  return { out, jump };
}

describe('PURSUIT_SPACING_SMOOTH: a pursuer\'s teammate closing limit is continuous, not a gate', () => {
  it('SPACING_SMOOTH alone: the pursuer keeps the gate and his request jumps at it', async () => {
    const { jump } = await sweep('0');
    expect(jump).toBeGreaterThan(0.5);
  }, 60_000);
  it('with PURSUIT_SPACING_SMOOTH: under 0.15 yd/s per 0.01 yd step, slows for a teammate in his path, clear lane untouched', async () => {
    const { out, jump } = await sweep('1');
    expect(jump).toBeLessThan(0.15);
    expect(out[0].vx).toBeGreaterThan(-4.5);
    expect(out[out.length - 1].vx).toBeCloseTo(-5);
  }, 60_000);
});
