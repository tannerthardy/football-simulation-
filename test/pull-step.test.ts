/** PULL_STEP (src/sim/behaviors/blocking.ts): the pull step opens to the play
 * side and gains depth on the way, with the hips toward the play side,
 * instead of dropping straight back and turning to face his own backfield. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function pull(step: boolean, run: 'power' | 'counter', flip: boolean) {
  vi.stubEnv('PULL_STEP', step ? '1' : '0');
  vi.stubEnv('GAIT_STEP', '0.3');
  vi.resetModules();
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const ps = playSideSign(sim, RUN_BY_ID[run]);
  const p = sim.offense.find(a => (a.behavior as { plan?: { kind: string } }).plan?.kind === 'pull')!;
  const y0 = p.pos.y;
  let turned = 0, lateral = 0;
  while (sim.phase === 'live' && sim.t < .5 - 1e-9) {
    sim.tick();
    turned = Math.max(turned, Math.abs(p.facing));
    lateral = (p.pos.y - y0) * ps;
  }
  return { slot: p.slot, turned: turned * 180 / Math.PI, lateral };
}

describe('PULL_STEP: the puller opens to the play side', () => {
  it.each([['power', false], ['power', true], ['counter', false], ['counter', true]] as const)('%s, flip=%s', async (run, flip) => {
    const off = await pull(false, run, flip), on = await pull(true, run, flip);
    expect(on.slot).toBe(off.slot);
    // He gains ground toward the hole on the first step (NFL tracking: about
    // 0.5 yd by 0.5 s; the square drop leaves him near his own width).
    expect(on.lateral).toBeGreaterThan(off.lateral + .08);
    expect(on.lateral).toBeGreaterThan(.2);
    // Hips open to the play side, not turned toward his own backfield.
    expect(on.turned).toBeLessThan(100);
  }, 60000);
});
