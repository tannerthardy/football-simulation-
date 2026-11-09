/** SAM_ON_TE (alignment.ts + playcaller.ts, experimental, off): a "Sam on"
 * call in an Over or Even front stands the Sam on the line on an attached
 * TE's outside shoulder; the Mike and Will then align as a two-backer
 * front. Without the flag or the call: unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function align(flag: boolean, samOn: boolean, front: 'over' | 'even', formation = 'i_pro_21') {
  vi.stubEnv('SAM_ON_TE', flag ? '1' : '0');
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const off = alignOffense(FORMATION_BY_ID[formation], false, 40, CENTER_Y);
  const def = alignDefense({ personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'sam', samOn },
    off, Object.keys(DEF_PERSONNEL.base43) as DefSlot[]);
  return { off, def };
}

describe('SAM_ON_TE: the Sam walks onto the line on the tight end', () => {
  for (const front of ['over', 'even'] as const) it(`${front}: on the line outside the TE only with flag and call`, async () => {
    const on = await align(true, true, front), noCall = await align(true, false, front), off = await align(false, true, front);
    const te = Object.values(on.off.spots).find((p: any) => p.inline && p.role === 'TE') as any
      ?? (Object.entries(on.off.spots).find(([k]) => k.startsWith('TE'))?.[1] as any);
    const sam = on.def.spots.LB_S!.pos;
    expect(sam.x - 40).toBeCloseTo(1.0, 6);
    if (te) expect(Math.abs(sam.y - CENTER_Y)).toBeGreaterThan(Math.abs(te.pos.y - CENTER_Y));
    expect(noCall.def.spots.LB_S!.pos.x - 40).toBeGreaterThan(2);
    for (const s of Object.keys(off.def.spots) as DefSlot[]) expect(off.def.spots[s]!.pos).toEqual(noCall.def.spots[s]!.pos);
    for (const s of ['LB_M', 'LB_W'] as DefSlot[]) expect(on.def.spots[s]!.pos.x - 40).toBeGreaterThan(2);
  });
  it('stays off the ball with no attached TE on his side', async () => {
    const on = await align(true, true, 'over', 'gun_spread_10'), noCall = await align(true, false, 'over', 'gun_spread_10');
    expect(on.def.spots.LB_S!.pos).toEqual(noCall.def.spots.LB_S!.pos);
  });
});
