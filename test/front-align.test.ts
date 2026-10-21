/** FRONT_ALIGN (alignment.ts alignDefense, the front): shaded techniques sit
 * on their blocker's shoulder; each side's end man sets the edge outside the
 * surface (outside the tackle with no end there, at least on an end with
 * one), and his build moves him a notch. Off: the installed spots. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function front(on: boolean, frontId = 'over', personnel: 'base43' | 'nickel' = 'base43', mass: Partial<Record<DefSlot, number>> = {}) {
  vi.stubEnv('FRONT_ALIGN', on ? '1' : '0');
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const los = 40, off = alignOffense(FORMATION_BY_ID.i_pro_21, false, los, CENTER_Y);
  const def = alignDefense({ personnel, front: FRONT_BY_ID[frontId], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: frontId },
    off, Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[], {}, { mass });
  // Across the field from the ball, strong (the end's side) positive.
  const y = (slot: string) => ((off.spots[slot] ?? def.spots[slot as DefSlot])!.pos.y - CENTER_Y) * off.strongSign;
  const strongG = Math.max(y('LG'), y('RG')), weakT = -Math.min(y('LT'), y('RT')), E = y('Y');
  return { y, def, strongG, weakT, E };
}

describe('the front aligns on bodies and its end men by who they are', () => {
  it('off: the installed Over front', async () => {
    const f = await front(false);
    expect(-f.y('DE_W') - f.weakT).toBeCloseTo(.65, 9);
    expect(f.y('DT_S') - f.strongG).toBeCloseTo(.65, 9);
  });
  it('on: a 3 technique sits on the guard\'s outside shoulder', async () => {
    const f = await front(true);
    expect(f.y('DT_S') - f.strongG).toBeCloseTo(.57, 9);
  });
  it('on: with no end on his side the end man aligns outside the tackle, not on his shoulder', async () => {
    const f = await front(true);
    expect(-f.y('DE_W') - f.weakT).toBeGreaterThanOrEqual(1.6);
  });
  it('on: an end man inside a tight end moves onto him', async () => {
    const off = await front(false, 'under', 'nickel'), on = await front(true, 'under', 'nickel');
    expect(off.y('DE_S')).toBeLessThan(off.E - .5);
    expect(on.y('DE_S')).toBeGreaterThanOrEqual(on.E - 1e-9);
  });
  it('on: a light end aligns wider than a heavy one; the call\'s gap is unchanged', async () => {
    const light = await front(true, 'over', 'base43', { DE_S: 105, DE_W: 105 });
    const heavy = await front(true, 'over', 'base43', { DE_S: 130, DE_W: 130 });
    expect(light.y('DE_S')).toBeGreaterThan(heavy.y('DE_S'));
    expect(-light.y('DE_W')).toBeGreaterThan(-heavy.y('DE_W'));
    expect(light.def.spots.DE_W!.gap).toBe(heavy.def.spots.DE_W!.gap);
  });
});
