/**
 * The two-high (Fangio) tree's answers (docs/references/coverage-checks/
 * fangio-system.md): Cover 9 Strap/Clue/Grab, Cover 8 Trix, the squat half
 * side of Cover 6/8, and Zeus resolved against trips. Assertions read who
 * took whom on film.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { filmScene, jobsOf, modeOf, type SceneFilm } from '../src/lab/coverage-scene.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { COVERAGE_BY_ID, installCoverage } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall, SkillSlot } from '../src/playbook/types.js';

const bySeat = (f: SceneFilm, rule: string) => Object.values(f.defenders).find(d => d.rule === rule)!.slot;
const install = (formation: string, coverage: string, extra: Partial<DefensivePlayCall> = {}) =>
  installCoverage({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'lab', ...extra },
    alignOffense(FORMATION_BY_ID[formation], false, 40, CENTER_Y)).coverage.id;

describe('Cover 9 (weak rotation from two-high)', () => {
  it('checks Strap vs trips, Clue vs bunch, Grab vs empty, and stays Nine vs 2x2', () => {
    expect(install('gun_trips_11', 'cover9')).toBe('cover9_strap');
    expect(install('gun_bunch_11', 'cover9')).toBe('cover9_clue');
    expect(install('gun_empty_11', 'cover9')).toBe('cover9_grab');
    expect(install('gun_spread_10', 'cover9')).toBe('cover9');
  });

  it('Strap: the #3 receiver hook carries #3 vertical, the bonus hook does not; the rotating safety plays seam/flat on the back', () => {
    const f = filmScene({ formation: 'gun_trips_11', coverage: 'cover9', strong: { 1: 'go', 2: 'seam', 3: 'seam' }, weak: { 1: 'go' }, back: 'flat', until: 2.8 });
    const three = f.numbering.S3;
    expect(jobsOf(f, bySeat(f, 'three_rec_hook'))).toContain(`man:${three}`);
    expect(jobsOf(f, bySeat(f, 'bonus_hook'))).not.toContain(`man:${three}`);
    expect(jobsOf(f, 'FS')).toContain(`read:${f.numbering.B}`);
  });

  it('Strap: when #3 breaks under the linebackers the #3 hook gives him up and the bonus hook takes him', () => {
    const f = filmScene({ formation: 'gun_trips_11', coverage: 'cover9', strong: { 1: 'go', 2: 'seam', 3: 'slant' }, weak: { 1: 'go' }, until: 2.8 });
    expect(modeOf(f, bySeat(f, 'three_rec_hook'))).not.toBe('three');
    expect(jobsOf(f, bySeat(f, 'bonus_hook'))).toContain(`man:${f.numbering.S3}`);
  });
});

describe('Cover 6 / 8 half side and Cover 8 Trix', () => {
  it('Cover 8 checks to Trix vs trips: the backside safety overtakes #3 and the hook walls him', () => {
    const f = filmScene({ formation: 'gun_trips_11', coverage: 'cover6_rev', strong: { 1: 'go', 2: 'seam', 3: 'seam' }, weak: { 1: 'go' }, until: 2.8 });
    expect(f.played).toBe('cover8_trix');
    expect(jobsOf(f, 'FS')).toContain(`man:${f.numbering.S3}`);
    expect(jobsOf(f, bySeat(f, 'read_hook'))).toContain(`wall:${f.numbering.S3}`);
  });

  it('the half-side corner squats: man under #1 with no flat threat (HNFL-324)', () => {
    const f = filmScene({ formation: 'gun_doubles_11', coverage: 'cover6', strong: { 1: 'go', 2: 'go' }, weak: { 1: 'lab_curl7', 2: 'hitch' }, until: 2.6 });
    expect(modeOf(f, 'CB_W')).toBe('under');
    expect(jobsOf(f, 'CB_W')).toContain(`man:${f.numbering.W1}`);
  });
});

describe('Zeus resolved against the structure', () => {
  const zeus = (formation: string, slot: SkillSlot) => install(formation, 'cover6', { zeus: slot });
  it('trips #1 gets Cover 8 Trix, the backside X gets Stuff with Book to the trips, an inside target gets Quads', () => {
    const off = alignOffense(FORMATION_BY_ID.gun_trips_11, false, 40, CENTER_Y);
    expect(zeus('gun_trips_11', off.numbering.S1!)).toBe('cover8_trix');
    expect(zeus('gun_trips_11', off.numbering.W1!)).toBe('cover6_book');
    expect(zeus('gun_spread_10', 'H')).toBe('cover4');
  });
});
