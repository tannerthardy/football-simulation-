import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { alignDefense, alignOffense } from '../src/playbook/alignment.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot, type DefensivePlayCall } from '../src/playbook/types.js';

const slotsFor = (p: keyof typeof DEF_PERSONNEL) => Object.keys(DEF_PERSONNEL[p]) as DefSlot[];

describe('offensive alignment', () => {
  it('numbers receivers outside-in and finds trips strength', () => {
    const off = alignOffense(FORMATION_BY_ID.gun_trips_11, false, 35, HASH_LEFT_Y);
    expect(off.strong).toBe('R');
    expect(off.numbering.S1).toBe('Z');
    expect(off.numbering.S2).toBe('H');
    expect(off.numbering.S3).toBe('Y');
    expect(off.numbering.W1).toBe('X');
    expect(off.numbering.B).toBe('RB');
    // Flipping mirrors strength.
    const flipped = alignOffense(FORMATION_BY_ID.gun_trips_11, true, 35, HASH_LEFT_Y);
    expect(flipped.strong).toBe('L');
  });

  it('keeps everyone in bounds and on the correct side of the LOS', () => {
    const off = alignOffense(FORMATION_BY_ID.gun_empty_11, false, 30, HASH_LEFT_Y);
    for (const s of Object.values(off.spots)) {
      expect(s.pos.x).toBeLessThan(30);
      expect(s.pos.y).toBeGreaterThan(0);
    }
  });
});

describe('defensive alignment', () => {
  const call = (front: string, cov: string, personnel: keyof typeof DEF_PERSONNEL, pressure?: string): DefensivePlayCall => ({
    personnel,
    front: FRONT_BY_ID[front],
    coverage: COVERAGE_BY_ID[cov],
    pressure: pressure ? PRESSURE_BY_ID[pressure] : null,
    label: '',
  });

  it('spread formations empty the box', () => {
    const heavy = alignOffense(FORMATION_BY_ID.i_pro_21, false, 40, 26.67);
    const spread = alignOffense(FORMATION_BY_ID.gun_spread_10, false, 40, 26.67);
    const dHeavy = alignDefense(call('over', 'cover3', 'base43'), heavy, slotsFor('base43'));
    const dSpread = alignDefense(call('over', 'cover3', 'nickel'), spread, slotsFor('nickel'));
    expect(dHeavy.boxCount).toBeGreaterThan(dSpread.boxCount);
  });

  it('assigns every receiver in Cover 1 and keeps a deep-middle safety', () => {
    const off = alignOffense(FORMATION_BY_ID.gun_trips_11, false, 40, 26.67);
    const d = alignDefense(call('over', 'cover1', 'nickel'), off, slotsFor('nickel'));
    const covered = new Set(Object.values(d.spots).map((s) => s!.manTarget).filter(Boolean));
    for (const slot of ['X', 'Z', 'H', 'Y', 'RB']) expect(covered.has(slot as never)).toBe(true);
    expect(d.spots.FS!.zone).toBe('deep_mid');
    expect(d.spots.CB_S!.manTarget).toBe('Z');
  });

  it('fills underneath zones in Cover 3 and rushes four', () => {
    const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, 26.67);
    const d = alignDefense(call('over', 'cover3', 'nickel'), off, slotsFor('nickel'));
    expect(d.rushers.length).toBe(4);
    const zones = Object.values(d.spots).map((s) => s!.zone).filter(Boolean);
    expect(zones).toContain('deep_mid');
    expect(zones).toContain('curl_flat_s');
    expect(zones).toContain('hook_mid');
  });

  it('pressures add rushers', () => {
    const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, 26.67);
    const d = alignDefense(call('over', 'cover0', 'nickel', 'zero_6'), off, slotsFor('nickel'));
    expect(d.rushers.length).toBe(7);
  });
});
