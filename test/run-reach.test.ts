/**
 * RUN_REACH (src/sim/behaviors/carrier.ts): the runner's lane check gives a
 * defender's body part of his arm's reach. A lane that passes a defender's
 * chest just outside his torso is not open: he reaches out and takes the
 * runner (docs/reviews/run-game-v3.md, Part 15).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function entry(reach: boolean, m: 1 | -1) {
  vi.stubEnv('RUN_REACH', reach ? '1' : '0');
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense, pickDefense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { CENTER_Y } = await import('../src/core/field.js');
  const { runReadAim } = await import('../src/sim/behaviors/carrier.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.ace_11, LOS = 40;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, kind: 'run', flip: false, run: RUN_BY_ID.iz_strong, label: 'reach' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'reach' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5, record: false });
  for (const a of sim.agents) { a.body.pos = { x: 5 + a.idx, y: 2 }; a.body.vel = { x: 0, y: 0 }; }
  const put = (slot: string, x: number, y: number) => { const a = sim.slot(slot as never)!; a.body.pos = { x, y: CENTER_Y + m * y }; return a; };
  for (const [s, y] of [['C', 0], ['LG', -1.4], ['RG', 1.4], ['LT', -2.8], ['RT', 2.8]] as const) put(s, LOS - .5, y);
  const back = put('RB', LOS - 3, 2.1);
  back.body.vel = { x: 6, y: 0 };
  // A tackle beside the runner's track, being run away from the called lane:
  // his torso clears the track by a quarter yard; his arms do not.
  put('DT_S', LOS - 1.3, 2.1 + .3 + .3 + .15).body.vel = { x: 0, y: 4 * m };
  sim.see = (_a, t) => ({ pos: { ...t.pos }, vel: { ...t.vel }, stance: null, facing: 0, pose: 'up', age: .1 });
  sim.ball = { kind: 'held', carrier: back } as never;
  const e = runReadAim(back, sim, { aim: { x: LOS + .6, y: CENTER_Y + m * 2.1 }, run: { scheme: 'insideZone', side: m } } as never)!;
  return (e.y - CENTER_Y) * m;
}

describe('RUN_REACH: a defender\'s arms close a lane his torso leaves', () => {
  it('the runner leaves a lane that passes within a defender\'s reach', async () => {
    for (const m of [1, -1] as const) {
      const off = await entry(false, m), on = await entry(true, m);
      // Without the reach he takes the called lane past the tackle's hands;
      // with it he takes the open lane inside the guard.
      expect(Math.abs(off - 2.1)).toBeLessThan(.4);
      expect(Math.abs(on - 2.1)).toBeGreaterThan(.6);
    }
  });
});
