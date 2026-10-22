/** FRONT_STRENGTH (alignment.ts frontSign): the front sets to the one
 * attached end whatever the receivers do; without a single attached end the
 * call carries the team's pick (toward the receivers or away). Front players'
 * called sides follow the front; defensive backs keep the coverage's. Off: the
 * front sets to the coverage strength. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot, type DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function align(on: boolean, formation: string, call: Partial<DefensivePlayCall> = {}, personnel: 'base43' | 'nickel' = 'base43') {
  vi.stubEnv('FRONT_STRENGTH', on ? '1' : '0');
  vi.resetModules();
  const { alignDefense, alignOffense, frontSign } = await import('../src/playbook/alignment.js');
  const off = alignOffense(FORMATION_BY_ID[formation], false, 40, CENTER_Y);
  const full: DefensivePlayCall = { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'test', ...call };
  const def = alignDefense(full, off, Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[]);
  // Lateral from the ball, positive toward the offense's (receiver) strength.
  const y = (slot: string) => ((off.spots[slot] ?? def.spots[slot as DefSlot])!.pos.y - CENTER_Y) * off.strongSign;
  return { off, def, y, fs: frontSign(full, off) };
}

describe('the front sets its own strength', () => {
  it('I twins: the front sets to the end, away from the twins; off, to the twins', async () => {
    const on = await align(true, 'i_twins_21'), off = await align(false, 'i_twins_21');
    expect(on.y('Y')).toBeLessThan(0);
    expect(on.fs).toBe(-on.off.strongSign);
    expect(on.y('DT_S')).toBeLessThan(0);
    expect(on.y('DE_S')).toBeLessThan(on.y('Y') + .5);
    expect(off.y('DT_S')).toBeGreaterThan(0);
    // The Will is now on the twins side and walks out over the slot.
    expect(on.y('LB_W')).toBeGreaterThan(on.y('RT') + 1);
  });
  it('with one end to the receivers\' side both strengths agree: unchanged', async () => {
    const on = await align(true, 'i_pro_21'), off = await align(false, 'i_pro_21');
    for (const slot of ['DE_S', 'DT_S', 'DT_W', 'DE_W', 'LB_S', 'LB_M', 'LB_W'] as DefSlot[])
      expect(on.def.spots[slot]!.pos).toEqual(off.def.spots[slot]!.pos);
  });
  it('no attached end: the call\'s pick sets it, toward the receivers or away', async () => {
    const toward = await align(true, 'gun_trips_11', { strength: 'passing' }, 'nickel');
    const away = await align(true, 'gun_trips_11', { strength: 'opposite' }, 'nickel');
    expect(toward.y('DT_S')).toBeGreaterThan(0);
    expect(away.y('DT_S')).toBeLessThan(0);
    expect(away.y('CB_S')).toEqual(toward.y('CB_S'));
  });
  it('front players\' blitz sides follow the front; a defensive back\'s stay', async () => {
    const pressure = { ...PRESSURE_BY_ID.fire_zone };
    const on = await align(true, 'i_twins_21', { pressure });
    const off = await align(false, 'i_twins_21', { pressure });
    const side = (a: typeof on, slot: DefSlot) => { const r = a.def.spots[slot]!.role; return r.kind === 'blitz' ? r.side : r.kind === 'zone' ? r.zone : r.kind; };
    expect(side(off, 'LB_W')).toBe('W');
    expect(side(on, 'LB_W')).toBe('S');
    expect(side(on, 'SS')).toBe(side(off, 'SS'));
    expect(side(off, 'DE_W')).toBe('curl_flat_w');
    expect(side(on, 'DE_W')).toBe('curl_flat_s');
    // The absolute gap is on the Will's own side either way.
    expect(Math.sign(on.def.spots.LB_W!.gapSign)).toBe(Math.sign(on.def.spots.LB_W!.pos.y - CENTER_Y));
  });
});
