/** Call description, step 1 (src/playbook/ir/): today's presets → description → today's objects, and the alignments
 * they produce are identical, across the whole catalog. The description is the only input the rebuilt call takes, so an
 * equal alignment says the description carries everything alignment reads. Counts are printed for the report. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { alignDefense, alignOffense } from '../src/playbook/alignment.js';
import { PASS_CONCEPTS, RUN_CONCEPTS, SCREEN_CONCEPTS } from '../src/playbook/concepts.js';
import { COVERAGES, FRONTS, PRESSURES } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { describeDefense, describeFormation, describePass, describeRun } from '../src/playbook/ir/describe.js';
import { lowerDefense, lowerFormation, lowerPass, lowerRun } from '../src/playbook/ir/lower.js';
import { DEF_PERSONNEL, type Coverage, type DefensivePlayCall, type DefSlot, type Pressure } from '../src/playbook/types.js';

const LOS = 40, BALLS = [CENTER_Y, CENTER_Y - 6.2, CENTER_Y + 6.2];
const run = <T>(f: () => T): { ok: T } | { err: string } => { try { return { ok: f() }; } catch (e) { return { err: String((e as Error).message) }; } };
const roundTrip = (call: DefensivePlayCall) => lowerDefense(describeDefense(call));
const fits = (p: Pressure, c: Coverage) => p.coverages.includes(c.id) || (!!c.family && p.coverages.includes(c.family));

describe('call description round-trips today\'s catalog', () => {
  it('formations: every formation, flipped and not, at each ball spot', () => {
    let n = 0;
    for (const f of FORMATIONS) for (const flip of [false, true]) for (const y of BALLS) {
      expect(lowerFormation(describeFormation(f))).toEqual(f);
      expect(alignOffense(lowerFormation(describeFormation(f)), flip, LOS, y), `${f.id} ${flip} ${y}`).toEqual(alignOffense(f, flip, LOS, y));
      n++;
    }
    console.log(`ir round-trip: formations ${FORMATIONS.length}, alignments ${n}`);
  });

  it('defense: every formation x front x the front\'s personnel x coverage', () => {
    let n = 0, threw = 0; const bad: string[] = [];
    for (const f of FORMATIONS) {
      const off = alignOffense(f, false, LOS, CENTER_Y);
      for (const front of FRONTS) for (const personnel of front.personnel) for (const coverage of COVERAGES) {
        const call: DefensivePlayCall = { personnel, front, coverage, pressure: null, label: `${front.id} ${coverage.id}` };
        const present = Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[];
        const a = run(() => alignDefense(call, off, present)), b = run(() => alignDefense(roundTrip(call), off, present));
        n++; if ('err' in a) threw++;
        try { expect(b).toEqual(a); } catch { bad.push(`${f.id} ${front.id} ${personnel} ${coverage.id}`); }
      }
    }
    console.log(`ir round-trip: fronts ${FRONTS.length}, coverages ${COVERAGES.length}, combinations ${n} (${threw} throw identically on both sides), unequal ${bad.length}`);
    expect(bad).toEqual([]);
  });

  it('pressures: every pressure x its compatible coverages x every front and personnel, on 2x2 and 3x1', () => {
    let n = 0; const bad: string[] = [];
    for (const fid of ['gun_doubles_11', 'gun_trips_11']) {
      const f = FORMATIONS.find((x) => x.id === fid)!, off = alignOffense(f, false, LOS, CENTER_Y);
      for (const pressure of PRESSURES) for (const coverage of COVERAGES.filter((c) => fits(pressure, c))) for (const front of FRONTS) for (const personnel of front.personnel) {
        const call: DefensivePlayCall = { personnel, front, coverage, pressure, label: pressure.id };
        const present = Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[];
        const a = run(() => alignDefense(call, off, present)), b = run(() => alignDefense(roundTrip(call), off, present));
        n++;
        try { expect(b).toEqual(a); } catch { bad.push(`${fid} ${pressure.id} ${coverage.id} ${front.id} ${personnel}`); }
      }
    }
    console.log(`ir round-trip: pressures ${PRESSURES.length}, combinations ${n}, unequal ${bad.length}`);
    expect(bad).toEqual([]);
  });

  it('disguise: every coverage shown as every other, over and nickel, 2x2', () => {
    let n = 0; const bad: string[] = [];
    const off = alignOffense(FORMATIONS.find((x) => x.id === 'gun_doubles_11')!, false, LOS, CENTER_Y);
    const front = FRONTS.find((x) => x.id === 'over')!, present = Object.keys(DEF_PERSONNEL.nickel) as DefSlot[];
    for (const coverage of COVERAGES) for (const shown of COVERAGES) {
      if (shown.id === coverage.id) continue;
      const call: DefensivePlayCall = { personnel: 'nickel', front, coverage, shown, pressure: null, label: 'shown' };
      const a = run(() => alignDefense(call, off, present)), b = run(() => alignDefense(roundTrip(call), off, present));
      n++;
      try { expect(b).toEqual(a); } catch { bad.push(`${coverage.id} shown as ${shown.id}`); }
    }
    console.log(`ir round-trip: disguised pairs ${n}, unequal ${bad.length}`);
    expect(bad).toEqual([]);
  });

  it('concepts: every pass, screen and run concept', () => {
    for (const c of [...PASS_CONCEPTS, ...SCREEN_CONCEPTS]) expect(lowerPass(describePass(c)), c.id).toEqual(c);
    for (const c of RUN_CONCEPTS) expect(lowerRun(describeRun(c)), c.id).toEqual(c);
    console.log(`ir round-trip: concepts pass ${PASS_CONCEPTS.length}, screen ${SCREEN_CONCEPTS.length}, run ${RUN_CONCEPTS.length}`);
  });
});
