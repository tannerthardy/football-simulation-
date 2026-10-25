/**
 * Deuce (HNFL-302/373): a five-man zone pressure from the two-high shell that
 * brings its own coverage, two deep and four under. Corners soft-squat keying
 * #2 to #1, apexes wall #2, halves safeties prioritize #2 deep; vs trips the
 * backside plays DOT and a squat corner. Read on film.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { filmScene, jobsOf } from '../src/lab/coverage-scene.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { pressureIsInstallable } from '../src/playbook/call-integrity.js';
import { COVERAGE_BY_ID, installCoverage } from '../src/playbook/coverages.js';
import { FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const deuce = PRESSURE_BY_ID.deuce;

describe('Deuce (on by default)', () => {
  const was = process.env.DEUCE;
  beforeAll(() => { process.env.DEUCE = '1'; });
  afterAll(() => { if (was === undefined) delete process.env.DEUCE; else process.env.DEUCE = was; });

  it('with DEUCE=0 no call can install it', () => {
    process.env.DEUCE = '0';
    expect(pressureIsInstallable('nickel', FRONT_BY_ID.over, COVERAGE_BY_ID.cover4, deuce)).toBe(false);
    process.env.DEUCE = '1';
  });

  it('is a five-man pressure off two-high calls only, and installs its own coverage (DOT vs trips)', () => {
    for (const id of ['cover4', 'cover6', 'cover2_match']) expect(pressureIsInstallable('nickel', FRONT_BY_ID.over, COVERAGE_BY_ID[id], deuce)).toBe(true);
    for (const id of ['cover3', 'cover1', 'tampa2']) expect(pressureIsInstallable('nickel', FRONT_BY_ID.over, COVERAGE_BY_ID[id], deuce)).toBe(false);
    const install = (formation: string) => installCoverage({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover6,
      pressure: deuce, zeus: 'Z', label: 'lab' }, alignOffense(FORMATION_BY_ID[formation], false, 40, CENTER_Y)).coverage.id;
    expect(install('gun_spread_10')).toBe('deuce');
    expect(install('gun_trips_11')).toBe('deuce_dot');
  });

  it('vs a quick out by #2 the corner traps it and the safety replaces over #1; a seam by #2 is the safety\'s', () => {
    const f = filmScene({ formation: 'gun_spread_10', coverage: 'cover4', strong: { 1: 'go', 2: 'quick_out' }, weak: { 1: 'go', 2: 'seam' },
      until: 2.8, call: { pressure: deuce } });
    expect(f.played).toBe('deuce');
    expect(jobsOf(f, 'LB_M')).toEqual(['blitz']);
    expect(jobsOf(f, 'CB_S')).toContain(`trap:${f.numbering.S2}`);
    expect(jobsOf(f, 'SS').at(-1)).toBe(`man:${f.numbering.S1}`);
    expect(jobsOf(f, 'FS').at(-1)).toBe(`man:${f.numbering.W2}`);
  });
});
