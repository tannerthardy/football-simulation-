import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });

/** One receiver who has just caught the ball, running across the field
 * (+y) with defenders far away. We record when the carrier's lane read
 * (`evaluate`) first fires and what heading he requests until then. */
async function caughtCrosser(env: string | undefined, vel = { x: 0, y: 4 }) {
  vi.resetModules();
  if (env === undefined) delete process.env.CATCH_EYES; else process.env.CATCH_EYES = env;
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { BallCarrier } = await import('../src/sim/behaviors/carrier.js');
  const formation = FORMATION_BY_ID.ace_11;
  const pass = Object.values(PASS_BY_ID)[0];
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, kind: 'pass', flip: false, pass, label: 'catch eyes' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false });
  const r = sim.slot('X')!;
  for (const a of sim.agents) { a.body.pos = { x: 100 + a.idx, y: 5 }; a.body.vel = { x: 0, y: 0 }; }
  r.body.pos = { x: 50, y: CENTER_Y }; r.body.vel = { ...vel };
  const catchAt = 1.0;
  const carrier = new BallCarrier({ catchAt }, r) as any;
  const reads: number[] = [], evaluate = carrier.evaluate;
  carrier.evaluate = function (...args: unknown[]) { reads.push(sim.t); return evaluate.apply(this, args); };
  const headings: number[] = [];
  for (let t = catchAt; t <= catchAt + 0.6 + 1e-9; t += sim.dt) {
    sim.t = t;
    const cmd = carrier.update(r, sim);
    headings.push(Math.atan2(cmd.vel.y, cmd.vel.x));
  }
  return { reads, headings, catchAt, window: r.profile.reactionTime, dt: sim.dt };
}

afterEach(() => { delete process.env.CATCH_EYES; vi.resetModules(); });

describe('CATCH_EYES: the catcher looks back up the field before his first lane read', () => {
  it('carries his catch line for one reaction time, then makes his first read', async () => {
    const s = await caughtCrosser(undefined);
    expect(s.reads.length).toBeGreaterThan(0);
    expect(s.reads[0]).toBeGreaterThanOrEqual(s.catchAt + s.window - 1e-9);
    const inWindow = Math.floor(s.window / s.dt);
    for (const h of s.headings.slice(0, inWindow)) expect(h).toBeCloseTo(Math.PI / 2, 6);
  });

  it('turns upfield when he caught it standing', async () => {
    const s = await caughtCrosser(undefined, { x: 0, y: 0 });
    expect(s.headings[0]).toBeCloseTo(0, 6);
  });

  it('turns upfield instead of carrying a line back toward the passer', async () => {
    const s = await caughtCrosser(undefined, { x: -3, y: 0.5 });
    expect(s.headings[0]).toBeCloseTo(0, 6);
  });

  it('with CATCH_EYES=0 the first lane read fires on the first update after the catch', async () => {
    const s = await caughtCrosser('0');
    expect(s.reads[0]).toBeCloseTo(s.catchAt, 9);
  });
});
