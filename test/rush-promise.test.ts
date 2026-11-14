/** RUSH_PROMISE (experimental, off): an added rusher behind three-deep is a
 * five-man zone pressure with three under. Where the front already rushes an
 * extra man (an on-line Sam, a 3-4's fifth lineman, Penny's walked-up Will),
 * Mike-A / Will-B / Nickel Edge in Cover 3 became six rush and two curl-flat
 * players with no one in the middle, by accident. Under the flag the installer
 * refuses that composition; every installable one keeps three underneath. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function composition(flag: string) {
  vi.stubEnv('RUSH_PROMISE', flag);
  vi.resetModules();
  const { alignDefense, alignOffense, isDeepZone } = await import('../src/playbook/alignment.js');
  const { pressureIsInstallable } = await import('../src/playbook/call-integrity.js');
  const { installCoverage } = await import('../src/playbook/coverages.js');
  const { COVERAGE_BY_ID, FRONTS, PRESSURE_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { DEF_PERSONNEL } = await import('../src/playbook/types.js');
  const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 50, HASH_LEFT_Y);
  const rows: Array<{ call: string; rush: number; under: number }> = [];
  for (const id of ['mike_a', 'will_b', 'nickel_edge']) for (const front of FRONTS) for (const pers of front.personnel) {
    const p = PRESSURE_BY_ID[id], cov = COVERAGE_BY_ID.cover3;
    if (!pressureIsInstallable(pers, front, cov, p)) continue;
    const call = installCoverage({ personnel: pers, front, coverage: cov, pressure: p, label: 'rush promise' }, off);
    const d = alignDefense(call, off, Object.keys(DEF_PERSONNEL[pers]) as Parameters<typeof alignDefense>[2]);
    const under = Object.values(d.spots).filter((s) => s?.role.kind === 'zone' && !isDeepZone(s.role.zone)).length;
    rows.push({ call: `${id} ${front.id}/${pers}`, rush: d.rushers.length, under });
  }
  return rows;
}

describe('RUSH_PROMISE', () => {
  it('off: some fronts turn the single-add Cover 3 pressures into six rush, two under', async () => {
    const rows = await composition('0');
    expect(rows.filter((r) => r.rush >= 6).length).toBeGreaterThan(0);
    expect(rows.filter((r) => r.rush >= 6).every((r) => r.under === 2)).toBe(true);
  });

  it('on: every installable one rushes at most five and keeps three underneath', async () => {
    const rows = await composition('1');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.rush, r.call).toBeLessThanOrEqual(5);
      expect(r.under, r.call).toBeGreaterThanOrEqual(3);
    }
  });
});
