/** THROW_REACT: in the QB's window estimate, a defender facing him breaks on
 * the ball when it is out (or a reaction after the motion starts, in zone),
 * as defenders do; he does not break at the motion's start. */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function windowP(flag: string): Promise<number> {
  vi.resetModules();
  vi.stubEnv('THROW_REACT', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const home = generateTeam(new Rng(91), 'Estimate offense', 'EOF'), away = generateTeam(new Rng(92), 'Estimate defense', 'EDF');
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'curl' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  const qbAgent = sim.qb, r = sim.slot('X')!;
  sim.t = 2;
  qbAgent.body.pos = { x: sim.los - 7, y: sim.ballY }; qbAgent.body.vel = { x: 0, y: 0 };
  r.body.pos = { x: sim.los + 12, y: 12 }; r.body.vel = { x: 0, y: 0 };
  for (const d of sim.defense) { d.body.pos = { x: sim.los + 40, y: 50 }; d.body.vel = { x: 0, y: 0 }; }
  // One defender 3 yd off the window, standing, facing the QB.
  const near = sim.slot('CB_S') ?? sim.defense[0];
  near.body.pos = { x: sim.los + 12, y: 15 }; near.body.facing = Math.PI;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  (sim.qbMind as unknown as { memory: Map<unknown, unknown> }).memory.clear();
  const window = (qbAgent.behavior as unknown as { window: (...a: unknown[]) => { P: number } }).window.bind(qbAgent.behavior);
  // A 0.4 s motion and a 0.9 s flight.
  return window(qbAgent, sim, r, { x: qbAgent.pos.x, y: qbAgent.pos.y, z: 2.2 }, { x: sim.los + 12, y: 12, z: 1.2 }, 0.9, 0.4, 0).P;
}
afterEach(() => vi.unstubAllEnvs());

describe('THROW_REACT: facing defenders break on the ball, not on the motion start', () => {
  it('rates the same window more open when the facing defender cannot leave before the ball', async () => {
    const off = await windowP('0'), on = await windowP('1');
    // Staged: 0.056 off, 0.076 on.
    expect(on).toBeGreaterThan(off * 1.2);
  });
});
