/** CLOUD_KILL (src/sim/qbmind.ts; experimental, off): "never throw a now screen against press or cloud". The now
 * screen's installed kill takes a corner seen squatting over the screen receiver (2.2-5 yd, inside-out to outside
 * leverage), as the press kill takes a pressed one. Against Cover 2 (squat corners) the now screen is killed almost
 * always with the flag and never without; against Cover 3 (the corner bails) it is thrown either way. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function killed(flag: string, cov: string) {
  vi.resetModules();
  vi.stubEnv('CLOUD_KILL', flag);
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { SCREEN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
  let n = 0, k = 0;
  for (let seed = 1; seed <= 6; seed++) for (const flip of [false, true]) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip, kind: 'pass', pass: SCREEN_BY_ID.wide_now_screen, label: 'now' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
      los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 + (flip ? 1 : 0) });
    n++; if (sim.offCall.pass?.id !== 'wide_now_screen') k++;
  }
  return k / n;
}

describe('CLOUD_KILL', () => {
  it('kills the now screen against squat corners, not against a bailing corner', async () => {
    expect(await killed('0', 'cover2')).toBe(0);
    expect(await killed('1', 'cover2')).toBeGreaterThan(0.75);
    expect(await killed('1', 'cover3')).toBe(0);
  }, 60000);
});
