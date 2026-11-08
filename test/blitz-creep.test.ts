/** BLITZ_CREEP (alignment.ts, experimental, off): a backer with a blitz
 * assignment stands at the tracked rusher depth (2.4 yd) instead of the
 * front's backer depth; backers without one are unchanged. Off: unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function align(on: boolean) {
  vi.stubEnv('BLITZ_CREEP', on ? '1' : '0');
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, CENTER_Y);
  const pressure = PRESSURE_BY_ID.will_b;
  const def = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure, label: 'creep' },
    off, Object.keys(DEF_PERSONNEL.nickel) as DefSlot[]);
  return { def, blitzers: Object.keys(pressure.blitzers) as DefSlot[] };
}

describe('BLITZ_CREEP: a blitzing backer stands where tracked rushers stand', () => {
  it('walks the blitzing backer up to 2.4 yd only with the flag; others keep their depth', async () => {
    const on = await align(true), off = await align(false);
    const lbBlitzers = on.blitzers.filter(s => s.startsWith('LB') && on.def.spots[s]);
    expect(lbBlitzers.length).toBeGreaterThan(0);
    for (const s of lbBlitzers) {
      expect(on.def.spots[s]!.pos.x - 40).toBeCloseTo(2.4, 6);
      expect(off.def.spots[s]!.pos.x - 40).toBeGreaterThan(2.4);
    }
    for (const s of Object.keys(on.def.spots) as DefSlot[]) if (!on.blitzers.includes(s)) expect(on.def.spots[s]!.pos).toEqual(off.def.spots[s]!.pos);
  });
});
