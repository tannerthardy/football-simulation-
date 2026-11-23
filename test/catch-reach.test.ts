import { afterEach, describe, expect, it, vi } from 'vitest';

// Test-only pin (2026-11-18, the joint catch landing): one call puts the ball at him, so under DEF_CATCH he has had no
// time since first seeing it; these scenes test the reach rule of the off law. test/def-catch.test.ts covers the catch
// law. Owner: Coverage (catch reach), noted by Flex.
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function load() {
  vi.resetModules(); vi.stubEnv('DEF_CATCH', '0'); vi.stubEnv('BALL_SIGHT', '0');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  // Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
  PlaySim.recordedSingleStream = true;
  return { Rng, generateTeam, pickDefense, pickOffense, PASS_BY_ID, COVERAGE_BY_ID, FRONT_BY_ID, FORMATION_BY_ID, resolveCatchOpportunities, PlaySim };
}

async function contest(distance: number) {
  const { Rng, generateTeam, pickDefense, pickOffense, PASS_BY_ID, COVERAGE_BY_ID, FRONT_BY_ID, FORMATION_BY_ID, resolveCatchOpportunities, PlaySim } = await load();
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1 });
  const r = sim.slot('X')!, d = sim.slot('CB_W')!;
  for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
  r.body.pos = { x: 50, y: 26 }; d.body.pos = { x: 50 + distance, y: 26 };
  d.tags.add('looking');
  sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 50, y: 26, z: 2 }, 1.5);
  sim.t = 1.5;
  sim.rng.next = () => 0; // Exercise the contested-interception branch.
  resolveCatchOpportunities(sim, { x: 49.9, y: 26, z: 2 }, { x: 50.1, y: 26, z: 2 });
  return { sim, d };
}
describe('physical contested possession', () => {
  it('does not award an interception to a nearby defender who cannot reach the ball', async () => {
    const { sim } = await contest(2);
    expect(sim.stats.interceptedBy).toBeUndefined();
  });
  it('still allows an in-phase defender inside the ball envelope to intercept', async () => {
    const { sim, d } = await contest(0.4);
    expect(sim.stats.interceptedBy).toBe(d.player.id);
  });
});
