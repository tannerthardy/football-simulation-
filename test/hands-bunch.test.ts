/**
 * Hands-family answers to bunch (HNFL-074 Mini Fist / Mini Pounder): the
 * nickel locks the point, the corner and the Mike banjo #1 and #3 by release,
 * and the safeties keep the called halves or quarters. Read on film.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { filmScene, jobsOf } from '../src/lab/coverage-scene.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { COVERAGE_BY_ID, installCoverage } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const install = (formation: string, coverage: string, personnel: 'nickel' | 'base43' | 'dime' = 'nickel') =>
  installCoverage({ personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'lab' },
    alignOffense(FORMATION_BY_ID[formation], false, 40, CENTER_Y)).coverage.id;

describe('Hands family vs bunch', () => {
  it('every Hands call checks to its Mini banjo vs bunch only, keeping its safeties', () => {
    for (const id of ['cover2man', 'pounder', 'finger', 'rolex']) {
      expect(install('gun_bunch_11', id)).toBe(`${id}_banjo`);
      expect(install('gun_trips_11', id)).toBe(id);
      const [base, mini] = [COVERAGE_BY_ID[id], COVERAGE_BY_ID[`${id}_banjo`]];
      expect([mini.roles.SS, mini.roles.FS, mini.roles.CB_W]).toEqual([base.roles.SS, base.roles.FS, base.roles.CB_W]);
    }
    // Base has no nickel to lock the point; dime has no Will for the back: both stay man.
    expect(install('gun_bunch_11', 'cover2man', 'base43')).toBe('cover2man');
    expect(install('gun_bunch_11', 'cover2man', 'dime')).toBe('cover2man');
  });

  it('crossing releases trade the pair: the corner takes #3 out, the Mike #1 in; straight #1 out stays with the corner', () => {
    const cross = filmScene({ formation: 'gun_bunch_11', coverage: 'cover2man', strong: { 1: 'slant', 2: 'hitch', 3: 'flat' }, weak: { 1: 'go' }, until: 2.6 });
    expect(jobsOf(cross, 'CB_S').at(-1)).toBe(`man:${cross.numbering.S3}`);
    expect(jobsOf(cross, 'LB_M').at(-1)).toBe(`man:${cross.numbering.S1}`);
    expect(jobsOf(cross, 'NB')).toEqual([`man:${cross.numbering.S2}`]);
    const straight = filmScene({ formation: 'gun_bunch_11', coverage: 'cover2man', strong: { 1: 'flat', 2: 'hitch', 3: 'slant' }, weak: { 1: 'go' }, until: 2.6 });
    expect(jobsOf(straight, 'CB_S').at(-1)).toBe(`man:${straight.numbering.S1}`);
    expect(jobsOf(straight, 'LB_M').at(-1)).toBe(`man:${straight.numbering.S3}`);
  });
});
