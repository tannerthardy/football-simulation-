/** Possession in the end zone a team attacks is a touchdown at once (11-2-1): the step rules it before that tick's
 * tackles, so the scorer cannot be stripped first. Seed 203 of `sim-export --seed 201` with HANG_AIRBORNE on reached
 * an 8-7-6 recovery from such a strip and threw ("Unsupported NFL 8-7-6"). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.doUnmock('../src/sim/tackle.js'); vi.resetModules(); });

async function stripEveryCarrier() {
  vi.resetModules();
  // Every tackle attempt strips the carrier: if tackles ran first, the scorer would fumble.
  vi.doMock('../src/sim/tackle.js', async (orig) => ({ ...(await orig<object>()),
    tryTackles: (sim: { carrier: unknown; fumble(c: unknown, h: null): void }) => { if (sim.carrier) sim.fumble(sim.carrier, null); } }));
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(710), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(711), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'touchdown before tackle' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 712, audibles: false, down: 1, afterTwoMinuteWarning: true });
  for (const a of sim.agents) { a.body.pos = { x: 60, y: 2 + a.idx }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  sim.t = sim.world.time = 2;
  return { sim, CENTER_Y };
}

describe('touchdown before tackles', () => {
  it('a defender holding the ball in the offense end zone has scored before a tackle can strip him', async () => {
    const { sim, CENTER_Y } = await stripEveryCarrier();
    const scorer = sim.slot('FS')!;
    scorer.body.pos = { x: 8.75, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: scorer };
    sim.possession = 'D';
    sim.tick();
    expect(sim.stats.fumbles ?? []).toHaveLength(0);
    expect(sim.outcome).toBe('touchdown');
    expect(sim.buildResult().score).toEqual({ kind: 'TD', team: 'D' });
  });

  it('control: short of the goal line the same tackle strips him', async () => {
    const { sim, CENTER_Y } = await stripEveryCarrier();
    const carrier = sim.slot('FS')!;
    carrier.body.pos = { x: 12, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier };
    sim.possession = 'D';
    sim.tick();
    expect(sim.stats.fumbles ?? []).toHaveLength(1);
  });
});
