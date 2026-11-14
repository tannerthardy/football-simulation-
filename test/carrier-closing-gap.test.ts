/** CARRIER_COMMIT on a natural closing gap (src/sim/spacing.ts, experimental, off): the dither-guard panel's outside
 * zone (ace_12 vs base 4-3 Under, cover 3, seed 5; teams from fixed seeds; reference stack on). Found by
 * scripts/diag/effective-mass/closing-gap-scan.mts: the back's held bend is kept at t 2.30 s while its swept
 * clearance to a teammate has fallen to -0.075 yd (the straight line is at -0.37): he presses into the closing gap
 * instead of re-choosing a lane. On: some held bend is kept below zero clearance, and none below -COMMIT_MARGIN
 * (0.15 yd), where it is dropped. Off: no bend is held. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('CARRIER_COMMIT', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { carrierCommitTrace } = await import('../src/sim/spacing.js');
  const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
  const holds: number[] = [];
  carrierCommitTrace.onHold = (_a, _bend, heldClearance) => { holds.push(heldClearance); };
  const formation = FORMATION_BY_ID.ace_12, seed = 5;
  new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz_strong' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
    los: 35, ballY: 26.65, firstDownX: 45, seed } as never).run();
  carrierCommitTrace.onHold = undefined;
  return holds;
}

describe('CARRIER_COMMIT: a held bend runs into a closing gap, up to the margin', () => {
  it('off: no bend is held', async () => {
    expect(await run('0')).toEqual([]);
  }, 120_000);
  it('on: a held bend is kept below zero clearance on this play, never below -0.15 yd', async () => {
    const holds = await run('1');
    expect(holds.some(c => c < 0)).toBe(true);
    expect(Math.min(...holds)).toBeGreaterThanOrEqual(-0.15);
  }, 120_000);
});
