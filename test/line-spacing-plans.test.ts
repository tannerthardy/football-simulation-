/** Run-blocking windows are measured in the line's own spacing: the tracked
 * line (OL_ALIGN) moves every body outward with its wider splits, and each
 * man must keep his gap and his blocker. Found by the playbook session's
 * assignment audit (scripts/diag/run-plans.ts, same construction): counter
 * vs Odd left the backside 5 technique unblocked and the fullback idle;
 * counter vs Over sent the tackle across the guard's face. */
import { afterEach, describe, expect, it, vi } from 'vitest';
// FRONT_ALIGN moves the front off its installed spots; this scene is staged on them.
vi.hoisted(() => { process.env.FRONT_ALIGN = '0'; });

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plans(on: boolean, concept: string, front: string) {
  vi.stubEnv('OL_ALIGN', on ? '1' : '0');
  vi.resetModules();
  const { HASH_LEFT_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { planRunBlocking } = await import('../src/sim/behaviors/blocking.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const rng = new Rng(3);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng, 'Away', 'AWY', { strength: 0.55 });
  const formation = FORMATION_BY_ID.i_pro_21, f = FRONT_BY_ID[front], personnel = f.personnel[0];
  const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID[concept], label: concept },
    defCall: { personnel, front: f, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: rng.nextU32() });
  const out: Record<string, string> = {};
  for (const [a, p] of planRunBlocking(sim, RUN_BY_ID[concept]))
    if (p.kind !== 'stalk') out[a.slot] = `${p.kind}:${p.target?.slot ?? '-'}`;
  return out;
}

describe('run-blocking assignments follow the line that is there', () => {
  it.each([['counter', 'odd'], ['counter', 'over'], ['power', 'over'], ['trap', 'over']])(
    '%s vs %s: the same blocker takes the same man on the tracked line', async (concept, front) => {
      expect(await plans(true, concept, front)).toEqual(await plans(false, concept, front));
    }, 60000);
});
