/** TIP_AWAY (experimental, off): a defender who breaks up a pass cannot also
 * catch that deflection. Staged like test/catch-reach.test.ts: a corner 2 yd
 * from the catch contests a ball he cannot reach (a breakup), then the
 * tumbling ball passes through his hands 0.3 s later. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function breakupThenTip(flag: string) {
  vi.stubEnv('TIP_AWAY', flag);
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  // Scene recorded, and roll forced, on the play's single random stream (see PlaySim.dice).
  PlaySim.recordedSingleStream = true;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1 });
  const r = sim.slot('X')!, d = sim.slot('CB_W')!;
  for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
  // Re-staged on the engine defaults (2026-11-15): with CATCH_HANDS a defender plays the ball only inside his own
  // envelope with his hands, so the breakup is a real one: the corner in front of the receiver, turned to the ball,
  // which reaches his hands first (a roll at which he gets a hand on it but does not secure it). The tumbling ball then comes back
  // through the same hands 0.3 s later, every roll low.
  r.body.pos = { x: 50, y: 26 }; d.body.pos = { x: 49.3, y: 26 }; d.body.facing = Math.PI;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  d.tags.add('looking');
  sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 50, y: 26, z: 2 }, 1.5);
  sim.t = 1.5;
  sim.rng.next = () => 0.6;
  resolveCatchOpportunities(sim, { x: 49.1, y: 26, z: 1.6 }, { x: 49.5, y: 26, z: 1.6 });
  const brokeUp = sim.stats.passDefendedBy === d.player.id && sim.ball.kind === 'air' && sim.ball.deflected;
  // The tumbling ball comes through the same defender's hands a beat later.
  sim.t = 1.8;
  sim.rng.next = () => 0;
  resolveCatchOpportunities(sim, { x: 49.2, y: 26, z: 1.2 }, { x: 49.4, y: 26, z: 1.2 });
  return { brokeUp, intercepted: sim.stats.interceptedBy === d.player.id };
}

describe('TIP_AWAY', () => {
  it('off: the defender who broke it up can intercept his own deflection', async () => {
    const f = await breakupThenTip('0');
    expect(f.brokeUp).toBe(true);
    expect(f.intercepted).toBe(true);
  });

  it('on: the breakup sends the ball away from his hands for the rest of the flight', async () => {
    const f = await breakupThenTip('1');
    expect(f.brokeUp).toBe(true);
    expect(f.intercepted).toBe(false);
  });
});
