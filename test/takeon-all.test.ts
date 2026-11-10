/** TAKEON_ALL (defense.ts takeOnClosing; experimental, off): BACKER_TAKEON's
 * break-down for every backer and DB once he reads run (or sees the man
 * blocking), whatever his behaviour. Reproducer: Power vs 2-Man (seed 1905).
 * The Will, in man coverage, reads run and runs into a blocker; off, he is
 * knocked down about 0.25 s into the block. On, he breaks down into it and
 * stays on his feet. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The real engine defaults (the reference stack's promoted flags on), not the
// legacy pin of vitest.config.ts.
const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function snap(flag: string) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('TAKEON_ALL', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense, pickDefense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const o = generateTeam(new Rng(102), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(202), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID.ace_12;
  const sim: any = new PlaySim({ offense: pickOffense(o, formation.personnel), defense: pickDefense(d, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'power' } as any,
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover2man, pressure: null, label: '2man' } as any,
    los: 35, ballY: 23.6, firstDownX: 55, seed: 1905, audibles: false } as any);
  const will = sim.defense.find((a: any) => a.slot === 'LB_W');
  let fellAt = -1, kind = '', maxPads = 0;
  while (sim.t < 3 && !sim.outcome) {
    sim.tick();
    if (!will.engagement) maxPads = Math.max(maxPads, sim.cmds[will.idx]?.posture ?? 0);
    if (fellAt < 0 && will.engagement && will.body.support?.state !== 'up') { fellAt = sim.t; kind = will.behavior.kind; }
  }
  return { fellAt, kind, maxPads };
}

describe('TAKEON_ALL', () => {
  it('off: the Will in man coverage is knocked down by the block; on: he breaks down into it and stays up', async () => {
    const off = await snap('0'), on = await snap('1');
    expect(off.fellAt).toBeGreaterThan(0); expect(off.kind).toBe('man');
    expect(on.fellAt).toBe(-1);
    // He sank to the take-on pads before contact (BACKER_TAKEON's 0.85).
    expect(on.maxPads).toBeGreaterThanOrEqual(0.85); expect(off.maxPads).toBeLessThan(0.85);
  });
});
