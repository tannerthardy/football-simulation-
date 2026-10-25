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
    // Three deep, four under: two curl-flat players and two hooks.
    expect(zones).toContain('curl_flat_s');
    expect(zones).toContain('curl_flat_w');
    expect(zones).toContain('hook_s');
    expect(zones).toContain('hook_w');
  });

  it('pressures add rushers', () => {
    const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, 26.67);
    const d = alignDefense(call('over', 'cover0', 'nickel', 'zero_6'), off, slotsFor('nickel'));
    expect(d.rushers.length).toBe(6);
    const targets=new Set(Object.values(d.spots).map(s=>s!.manTarget));
    for(const slot of ['X','Z','H','Y','RB'])expect(targets.has(slot as never)).toBe(true);
  });

  it('a disguised shadow trades outside receivers and keeps each marker on his man side',()=>{
    const off=alignOffense(FORMATION_BY_ID.ace_11,false,40,HASH_LEFT_Y);
    const actual={...call('under','cover1','nickel'),shown:COVERAGE_BY_ID.cover6};
    const d=alignDefense(actual,off,slotsFor('nickel'),{overrides:{CB_S:'X'}});
    expect(d.spots.CB_S!.manTarget).toBe('X');
    expect(d.spots.CB_W!.manTarget).toBe('Z');
    for(const spot of Object.values(d.spots)){
      if(spot!.role.kind!=='man'||!spot!.manTarget)continue;
      expect(Math.abs(spot!.pos.y-off.spots[spot!.manTarget].pos.y)).toBeLessThan(1);
    }
  });

  it('zero blitz retains all five eligible matchups against spread and heavy formations',()=>{
    for(const formation of ['gun_trips_11','gun_empty_11','i_pro_21'])for(const personnel of ['base43','nickel'] as const){
      const off=alignOffense(FORMATION_BY_ID[formation],false,40,HASH_LEFT_Y);
      const d=alignDefense({...call('over','cover0',personnel,'zero_6'),shown:COVERAGE_BY_ID.cover2},off,slotsFor(personnel),{overrides:{CB_S:'X'}});
      const covered=new Set(Object.values(d.spots).map(s=>s!.manTarget));
      for(const receiver of Object.keys(off.refOf))expect(covered.has(receiver as never)).toBe(true);
      expect(d.rushers.length).toBe(6);
    }
  });

  it('man pressure replaces optional low help or a bracket with the vacated assignment',()=>{
    const off=alignOffense(FORMATION_BY_ID.gun_doubles_11,false,40,HASH_LEFT_Y);
    for(const coverage of ['cover1','cover1_off','cover1_robber','cover1_double'])for(const pressure of ['mike_a','will_b','nickel_edge']){
      const d=alignDefense(call('over',coverage,'nickel',pressure),off,slotsFor('nickel'));
      const covered=new Set(Object.values(d.spots).map(s=>s!.manTarget));
      for(const receiver of Object.keys(off.refOf))expect(covered.has(receiver as never)).toBe(true);
      expect(d.spots.FS!.zone).toBe('deep_mid');expect(d.rushers.length).toBe(5);
    }
    expect(PRESSURE_BY_ID.double_a.coverages).not.toContain('cover1');
  });

  it('odd fronts budget edge drops to retain eligible matchups and called deep help',()=>{
    const off=alignOffense(FORMATION_BY_ID.gun_empty_11,false,40,HASH_LEFT_Y);
    for(const [coverage,pressure,rushers] of [['cover0','zero_6',6],['cover1','mike_a',5],['cover2man',undefined,4]] as const){
      const d=alignDefense(call('tite',coverage,'base34',pressure),off,slotsFor('base34'));
      const covered=new Set(Object.values(d.spots).map(s=>s!.manTarget));
      for(const receiver of Object.keys(off.refOf))expect(covered.has(receiver as never)).toBe(true);
      expect(d.rushers.length).toBe(rushers);
      if(coverage==='cover1')expect(d.spots.FS!.zone).toBe('deep_mid');
      if(coverage==='cover2man'){
        expect(d.spots.FS!.zone).toBe('deep_half_w');expect(d.spots.SS!.zone).toBe('deep_half_s');
      }
    }
  });
});
