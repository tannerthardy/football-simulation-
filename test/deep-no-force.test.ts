/** DEEP_NO_FORCE (run-fits.ts buildRunFits): without a flat seat the force
 * fallback no longer picks a deep-zone defender, who would leave the post
 * to sprint to the line outside the back. Off: any available defender. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { isDeepZone } from '../src/playbook/alignment.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(81), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(82), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** For each force player under this coverage: is he a deep-zone defender? */
async function forces(enabled: boolean, coverage: string) {
  vi.stubEnv('DEEP_NO_FORCE', enabled ? '1' : '0');
  vi.resetModules();
  const { buildRunFits } = await import('../src/sim/run-fits.js');
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Force' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  return [...buildRunFits(sim)].filter(([, j]) => j.kind === 'force').map(([d]) => {
    const role = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]!.role;
    return role.kind === 'zone' && isDeepZone(role.zone);
  });
}

describe('the force fallback leaves deep zones deep', () => {
  it('off: 2-man forces with both deep-half safeties', async () => {
    expect(await forces(false, 'cover2man')).toEqual([true, true]);
  });
  it('on: no deep-zone force; flat-seat calls unchanged', async () => {
    expect(await forces(true, 'cover2man')).not.toContain(true);
    expect(await forces(true, 'cover3')).toEqual(await forces(false, 'cover3'));
  });
});
