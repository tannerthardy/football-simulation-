/**
 * Pre-snap coverage checks keyed on the offensive structure, and the
 * area/banjo pickups they install: Quarters Box vs bunch (HNFL-053/331),
 * Book/Read vs empty (HNFL-194), Cover 6 Book vs trips (HNFL-324), Cover 1
 * Banjo vs bunch (HNFL-074 Mini Fist). A check only applies when the players
 * it names are on the field and not spent by the call's pressure.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { filmScene, jobsOf } from '../src/lab/coverage-scene.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { checkCall, COVERAGE_BY_ID } from '../src/playbook/coverages.js';
import { FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { formationStructure } from '../src/playbook/structure.js';
import type { DefensivePlayCall } from '../src/playbook/types.js';

const structure = (id: string) => formationStructure(alignOffense(FORMATION_BY_ID[id], false, 40, CENTER_Y));
const call = (coverage: string, extra: Partial<DefensivePlayCall> = {}): DefensivePlayCall =>
  ({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'lab', ...extra });

describe('structure checks', () => {
  it('Quarters checks Box vs bunch, Book/Read vs empty and keeps its trips checks; 2x2 stays Quarters', () => {
    expect(checkCall(call('cover4'), structure('gun_bunch_11')).coverage.id).toBe('cover4_box');
    expect(checkCall(call('cover4'), structure('gun_empty_11')).coverage.id).toBe('cover4_book_read');
    expect(checkCall(call('cover4'), structure('gun_trips_11')).coverage.id).toBe('cover4_poach');
    expect(checkCall(call('cover4', { checkPick: 1 }), structure('gun_trips_11')).coverage.id).toBe('cover4_stubbie');
    expect(checkCall(call('cover4'), structure('gun_doubles_11')).coverage.id).toBe('cover4');
    expect(checkCall(call('cover6'), structure('gun_trips_11')).coverage.id).toBe('cover6_book');
    expect(checkCall(call('cover4'), structure('gun_bunch_11')).check).toEqual({ from: 'cover4', when: 'bunch_strong' });
  });

  it('a check that needs a blitzing or absent player is not made', () => {
    expect(checkCall(call('cover1'), structure('gun_bunch_11')).coverage.id).toBe('cover1_banjo');
    expect(checkCall(call('cover1', { pressure: PRESSURE_BY_ID.nickel_edge }), structure('gun_bunch_11')).coverage.id).toBe('cover1');
    expect(checkCall(call('cover1', { personnel: 'base43' }), structure('gun_bunch_11')).coverage.id).toBe('cover1');
  });
});

describe('Quarters Box vs bunch', () => {
  it('nickel takes the first out, hook the first in, and a lone vertical gets both deep players', () => {
    // Run with the nickel tagged to trap (flatThreat), the timing this rule scene was built on. By default
    // (hold) he stays 4.5 deep over the bunch before Y declares, then crosses Z's release chasing Y's flat;
    // Z's go is slowed and drifts inside, so no lone vertical develops for the deep players to take. That
    // traffic is physical, not this rule; the default arm below keeps the rest of the Box contract.
    const f = filmScene({ formation: 'gun_bunch_11', coverage: 'cover4', strong: { 1: 'go', 2: 'flat', 3: 'slant' }, weak: { 1: 'go' }, until: 2.8,
      call: { flatThreat: 'trap' } });
    expect(f.played).toBe('cover4_box');
    const { S1, S2, S3 } = f.numbering;
    expect(jobsOf(f, 'NB').at(-1)).toBe(`man:${S2}`);
    const hook = Object.values(f.defenders).find(d => d.rule === 'box_in_low')!.slot;
    expect(jobsOf(f, hook).at(-1)).toBe(`man:${S3}`);
    expect(jobsOf(f, 'CB_S').at(-1)).toBe(`man:${S1}`);
    expect(jobsOf(f, 'SS').at(-1)).toBe(`man:${S1}`);
  });

  it('with the default hold the same Box assignments are made underneath', () => {
    const f = filmScene({ formation: 'gun_bunch_11', coverage: 'cover4', strong: { 1: 'go', 2: 'flat', 3: 'slant' }, weak: { 1: 'go' }, until: 2.8 });
    expect(f.played).toBe('cover4_box');
    const { S2, S3 } = f.numbering;
    expect(jobsOf(f, 'NB').at(-1)).toBe(`man:${S2}`);
    const hook = Object.values(f.defenders).find(d => d.rule === 'box_in_low')!.slot;
    expect(jobsOf(f, hook).at(-1)).toBe(`man:${S3}`);
  });
});

describe('Book/Read vs empty', () => {
  it('the trips side plays Book (nickel stays on #2 through a deep out) and the two side plays Read (corner traps the quick out)', () => {
    const f = filmScene({ formation: 'gun_empty_11', coverage: 'cover4', strong: { 1: 'go', 2: 'lab_out12', 3: 'seam' }, weak: { 1: 'go', 2: 'quick_out' }, until: 2.8 });
    expect(f.played).toBe('cover4_book_read');
    const nb = jobsOf(f, 'NB');
    expect(nb.at(-1)).toBe(`man:${f.numbering.S2}`);
    expect(nb.slice(nb.indexOf(`man:${f.numbering.S2}`)).some(j => j.startsWith('zone:'))).toBe(false);
    expect(jobsOf(f, 'SS')).toContain(`man:${f.numbering.S3}`);
    expect(jobsOf(f, 'CB_W')).toContain(`trap:${f.numbering.W2}`);
  });
});

describe('Cover 1 Banjo vs bunch', () => {
  const banjo = (one: string, three: string) =>
    filmScene({ formation: 'gun_bunch_11', coverage: 'cover1', strong: { 1: one, 2: 'go', 3: three }, weak: { 1: 'go' }, until: 2.8 });

  it('trades crossing releases: the outside man takes the first out, the inside man the other', () => {
    const cross = banjo('slant', 'flat');
    expect(cross.played).toBe('cover1_banjo');
    const { S1, S2, S3 } = cross.numbering;
    expect(jobsOf(cross, 'NB')).toEqual([`man:${S2}`]);
    expect(jobsOf(cross, 'CB_S').at(-1)).toBe(`man:${S3}`);
    expect(jobsOf(cross, 'SS').at(-1)).toBe(`man:${S1}`);
    // Mirrored control: no exchange when the releases do not cross.
    const stay = banjo('flat', 'slant');
    expect(jobsOf(stay, 'CB_S').at(-1)).toBe(`man:${S1}`);
    expect(jobsOf(stay, 'SS').at(-1)).toBe(`man:${S3}`);
  });
});

describe('Cover 3 Clue vs bunch', () => {
  const clue = (one: string, two: string) =>
    filmScene({ formation: 'gun_bunch_11', coverage: 'cover3_match', strong: { 1: one, 2: two, 3: 'slant' }, weak: { 1: 'go' }, until: 2.8 });

  it('the corner keys #2 to #1: locks #1 when #2 breaks, squeezes #2 when only he climbs, plays the third on both', () => {
    const lock = clue('go', 'flat');
    expect(lock.played).toBe('cover3_clue');
    expect(jobsOf(lock, 'CB_S').at(-1)).toBe(`man:${lock.numbering.S1}`);
    const squeeze = clue('slant', 'go');
    expect(jobsOf(squeeze, 'CB_S').at(-1)).toBe(`man:${squeeze.numbering.S2}`);
    // Re-staged for the direction-free start (#353): the SS and nickel now
    // reach their drops sooner and sit 2.6-2.8 yd off #2's line at 1.8 s
    // (2.1-2.6 before), outside the visible-cap width, so the deep-third
    // judgment protects #2's vertical over the top for a few tenths
    // (protect-vertical:Y, 1.8-2.2 s) before returning to the third. Before
    // #353 that same help already fired on seeds 3, 4, 8, 9 and 10; now on
    // seeds 1-10. The Clue rule is the same: it never keys one receiver
    // (mode stays unset), never locks #1, and he finishes in the third.
    const both = clue('go', 'go');
    expect(both.defenders.CB_S.modes).toEqual(['-@0.00']);
    expect(jobsOf(both, 'CB_S')).not.toContain(`man:${both.numbering.S1}`);
    expect(jobsOf(both, 'CB_S').at(-1)).toBe('zone:deep_third_s');
    // The bunch-side underneath players zone off instead of matching.
    expect(lock.defenders.NB.rule).toBeNull();
  });
});
