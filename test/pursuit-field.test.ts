/** PURSUIT_FIELD (src/sim/coverage-space.ts; experimental, off): coverage containment keeps a drop or carry in the
 * field by zeroing velocity toward the sideline he could not stop before on half his lateral traction. A coverage
 * player pursuing a ball carrier he has seen is no longer covering: on, his pursuit request is left alone. The drop
 * near the sideline stays contained. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flag: string) {
  vi.resetModules();
  vi.stubEnv('PURSUIT_FIELD', flag);
  return await import('../src/sim/coverage-space.js');
}

// 5 yd inside the near sideline (y small), running toward it at 5 yd/s.
const body = (y: number, vy: number) => ({ profile: { radius: 0.35, brake: 6, lateral: 4, vmax: 8 }, pos: { x: 40, y }, vel: { x: 2, y: vy } }) as never;
const toward = { vel: { x: 3, y: -6 } };

describe('PURSUIT_FIELD: a seen-carrier pursuit is not contained as coverage', () => {
  it('off: the pursuit toward the sideline 5 yd away has its lateral request bounded to the stopping-speed cap, and is not marked', async () => {
    const { containCoverage, asCarrierPursuit, isCarrierPursuit } = await load('0');
    expect(isCarrierPursuit(asCarrierPursuit(toward))).toBe(false);
    expect(containCoverage(body(5, -5), asCarrierPursuit(toward)).vel.y).toBeCloseTo(-Math.sqrt(2 * 2 * 4.15), 6); // the stopping-speed cap for his room (a continuous bound, engine-73), below the -6 asked
  });
  it('on: the marked pursuit keeps its request; an unmarked (coverage) request is still contained', async () => {
    const { containCoverage, asCarrierPursuit } = await load('1');
    expect(containCoverage(body(5, -5), asCarrierPursuit(toward)).vel).toEqual(toward.vel);
    expect(containCoverage(body(5, -5), toward).vel.y).toBeCloseTo(-Math.sqrt(2 * 2 * 4.15), 6);
  });

  it('natural plays: on, pursueIfLive marks its seen-carrier pursuits and containment leaves them alone; unmarked, containment would have changed some', async () => {
    vi.resetModules();
    vi.stubEnv('PURSUIT_FIELD', '1');
    const { Rng } = await import('../src/core/rng.js');
    const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
    const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
    const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
    const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { pursueIfLive } = await import('../src/sim/behaviors/defense.js');
    const { containCoverage, isCarrierPursuit } = await import('../src/sim/coverage-space.js');
    const offense = generateTeam(new Rng(101), 'Field O', 'FLO', { strength: .55 });
    const defense = generateTeam(new Rng(102), 'Field D', 'FLD', { strength: .55 });
    let pursuits = 0, kept = 0, unmarkedChanged = 0;
    const moved = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) > 1e-9;
    // engine-76: seeds 1-24 (were 1-12); with one reaction on the arm read (ARM_BREAK 1) seeds 1-12 no longer produce a
    // seen-carrier pursuit that containment would have changed unmarked, the premise of the last expectation.
    for (const concept of ['curl_flat', 'stick'] as const) for (let seed = 1; seed <= 24; seed++) {
      const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
        offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: 'pf' },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'pf' },
        los: 40, ballY: 8, firstDownX: 50, seed });
      while (sim.t < 4) {
        sim.tick();
        if (sim.ball.kind !== 'held' || sim.ball.carrier === sim.qb || sim.ball.carrier.team !== 'O') continue;
        for (const d of sim.defense) {
          if (d.behavior?.kind !== 'zone' || d.engagement || d.isDown(sim.t)) continue;
          const cmd = pursueIfLive(sim, d);
          if (!cmd || !isCarrierPursuit(cmd) || Math.hypot(cmd.vel.x, cmd.vel.y) < 1) continue;
          pursuits++;
          if (!moved(containCoverage(d, cmd).vel, cmd.vel)) kept++;
          // the same request without the mark (symbol keys dropped): what containment did before
          const plain = Object.fromEntries(Object.entries(cmd)) as typeof cmd;
          if (moved(containCoverage(d, plain).vel, cmd.vel)) unmarkedChanged++;
        }
      }
    }
    expect(pursuits).toBeGreaterThan(20);
    expect(kept).toBe(pursuits);
    expect(unmarkedChanged).toBeGreaterThan(0);
  }, 180_000);
});
