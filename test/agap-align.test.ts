/** AGAP_ALIGN (alignment.ts alignDefense, with FRONT_ALIGN): a lineman's 1
 * technique stands at his team's habit along the centre-guard split; off, on
 * the centre's shoulder. The call's gap is unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function over(on: boolean, aGap?: number) {
  vi.stubEnv('FRONT_ALIGN', '1');
  vi.stubEnv('AGAP_ALIGN', on ? '1' : '0');
  // The expected spots are staged on the installed 1.3 yd line splits.
  vi.stubEnv('OL_SPLITS', '0');
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const off = alignOffense(FORMATION_BY_ID.i_pro_21, false, 40, CENTER_Y);
  const def = alignDefense({ personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'over' },
    off, Object.keys(DEF_PERSONNEL.base43) as DefSlot[], {}, { aGap });
  // The 1 technique's distance from the centre, as a share of the split to his guard.
  const at = (slot: string) => (off.spots[slot] ?? def.spots[slot as DefSlot])!.pos.y;
  const c = at('C'), g = [at('LG'), at('RG')].find(y => (y - c) * (at('DT_W') - c) > 0)!;
  return { share: Math.abs(at('DT_W') - c) / Math.abs(g - c), gap: def.spots.DT_W!.gap, dt3: at('DT_S') };
}

describe('the 1 technique stands at the team habit along the split', () => {
  it('off: on the centre\'s shoulder', async () => {
    expect((await over(false, .8)).share).toBeCloseTo(.57 / 1.3, 9);
  });
  it('on: at the team\'s share, else the league\'s; gap and the 3 technique unchanged', async () => {
    const shade = await over(true, .3), twoI = await over(true, .82), league = await over(true), off = await over(false);
    expect(shade.share).toBeCloseTo(.3, 9);
    expect(twoI.share).toBeCloseTo(.82, 9);
    expect(league.share).toBeCloseTo(.63, 9);
    expect([shade.gap, twoI.gap]).toEqual([off.gap, off.gap]);
    expect(twoI.dt3).toBe(off.dt3);
  });
});
