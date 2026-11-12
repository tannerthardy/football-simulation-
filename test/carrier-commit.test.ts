/** CARRIER_COMMIT (src/sim/spacing.ts gatherForMotion; experimental, off): a ball carrier's bend around a teammate is
 * a decision that persists. Ticks in sequence with a stationary teammate ahead drifting off his line: off, the bend is
 * re-chosen from the ladder each tick and swings; on, the chosen bend is held; once the straight line clears by the
 * margin, both run straight at full speed again. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The ladder is RB_STEER, on in the reference stack: run on the current engine defaults.
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function sweep(flag: string) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('CARRIER_COMMIT', flag);
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense, pickDefense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { spaceTeammates } = await import('../src/sim/spacing.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(11), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(12), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 't' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: 't' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 77 });
  const a = sim.slot('RB')!, b = sim.slot('LG')!;
  (a as { behavior: unknown }).behavior = { kind: 'carrier' };
  const out: { deg: number; speed: number }[] = [];
  for (const by of [0.3, 0.4, 0.5, 1.2]) {
    a.body.pos = { x: 50, y: CENTER_Y }; a.body.vel = { x: 6, y: 0 }; a.body.facing = 0;
    b.body.pos = { x: 52.2, y: CENTER_Y + by }; b.body.vel = { x: 0, y: 0 };
    const intents = [{ vel: { x: 6, y: 0 } }, { vel: { x: 0, y: 0 } }];
    spaceTeammates([a, b], intents, (_o, p) => p, { now: sim.t });
    out.push({ deg: Math.atan2(intents[0].vel.y, intents[0].vel.x) * 180 / Math.PI, speed: Math.hypot(intents[0].vel.x, intents[0].vel.y) });
  }
  return out;
}

describe('CARRIER_COMMIT: the carrier holds his bend through traffic', () => {
  it('off: the bend is re-chosen each tick and swings by more than 20 deg', async () => {
    const o = await sweep('0');
    expect(Math.max(Math.abs(o[1].deg - o[0].deg), Math.abs(o[2].deg - o[1].deg))).toBeGreaterThan(20);
  }, 60_000);
  it('on: the chosen bend is held (within 5 deg a tick), and he runs straight at full speed once the line clears', async () => {
    const o = await sweep('1');
    expect(Math.abs(o[1].deg - o[0].deg)).toBeLessThan(5);
    expect(Math.abs(o[2].deg - o[1].deg)).toBeLessThan(5);
    expect(Math.abs(o[3].deg)).toBeLessThan(1);
    expect(o[3].speed).toBeCloseTo(6);
  }, 60_000);
});
