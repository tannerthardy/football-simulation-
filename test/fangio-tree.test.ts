/**
 * The two-high (Fangio) tree's answers (docs/references/coverage-checks/
 * fangio-system.md): Cover 9 Strap/Clue/Grab, Cover 8 Trix, the squat half
 * side of Cover 6/8, and Zeus resolved against trips. Assertions read who
 * took whom on film.
 */
import { describe, expect, it, vi } from 'vitest';
// The Pounder rep holds the ball to 2.6 s; with FRONT_ALIGN's edges and
// SNAP_REACT's get-off the rush ends it at 2.5, before the safety's rule
// changes. The scene is staged on the installed front.
vi.hoisted(() => { process.env.FRONT_ALIGN = '0'; });
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

describe('Cover 1 Lurk and the two-high home shell', () => {
  it('Lurk brings the weak safety down on weak #2 vs 2x2, and the nickel-side safety on #3 vs trips', () => {
    const doubles = filmScene({ formation: 'gun_spread_10', coverage: 'cover1_lurk', until: 0.3 });
    expect(jobsOf(doubles, 'FS')).toEqual([`man:${doubles.numbering.W2}`]);
    expect(jobsOf(doubles, 'SS')).toEqual(['zone']);
    const trips = filmScene({ formation: 'gun_trips_11', coverage: 'cover1_lurk', until: 0.3 });
    expect(trips.played).toBe('cover1_lurk_trips');
    expect(jobsOf(trips, 'SS')).toEqual([`man:${trips.numbering.S3}`]);
    expect(jobsOf(trips, 'FS')).toEqual(['zone']);
  });

  it('a two-high tree disguises from one quarters home shell and never shows a one-high look', async () => {
    const { DefensiveCoordinator } = await import('../src/game/playcaller.js');
    const { generateTeam, pickOffense } = await import('../src/league/team.js');
    const { Rng } = await import('../src/core/rng.js');
    const off = generateTeam(new Rng(41), 'O', 'OFF', { strength: 0.55 });
    const base = generateTeam(new Rng(42), 'D', 'DEF', { strength: 0.55 });
    const dc = new DefensiveCoordinator({ ...base, coach: { ...base.coach, coverageSystem: 'two-high', disguise: 0.45 } }, new Rng('shell'));
    const shown = new Set<string>();
    let open = 0;
    for (let i = 0; i < 200; i++) {
      const { call } = dc.call({ down: 1 + (i % 3), distance: 10, yardline: 40, quarter: 1, clock: 600, scoreDiff: 0, ballY: CENTER_Y, hurry: false }, '11', off, pickOffense(off, '11'));
      if (call.shown) shown.add(call.shown.id);
      const presented = call.shown ?? call.coverage;
      if ((presented.look ?? presented.shell) === 'two-high') open++;
    }
    expect([...shown]).toEqual(['cover4']);
    // 2025 Eagles: 87% of snaps open pre-snap (fangio-system.md D).
    expect(open / 200).toBeGreaterThan(0.8);
  });
});

describe('Two-deep man: Pounder', () => {
  it('the inside-quarter safety doubles #2 vertical, and helps #1 when #2 breaks out short', () => {
    const vert = filmScene({ formation: 'gun_spread_10', coverage: 'pounder', strong: { 1: 'go', 2: 'seam' }, weak: { 1: 'go', 2: 'seam' }, until: 2.6 });
    expect(jobsOf(vert, 'SS')).toContain(`man:${vert.numbering.S2}`);
    expect(jobsOf(vert, 'NB')).toEqual([`man:${vert.numbering.S2}`]);
    // Re-recorded on the engine defaults (2026-11-15): WR_SNAP starts a wide receiver on the ball he sees move (about
    // 0.15 s after the cadence), so #2's quick out breaks later and the inside-quarter safety takes #1 by 2.8 s, not 2.6.
    const out = filmScene({ formation: 'gun_spread_10', coverage: 'pounder', strong: { 1: 'go', 2: 'quick_out' }, weak: { 1: 'go', 2: 'seam' }, until: 2.8 });
    expect(modeOf(out, 'SS')).toBe('one');
  });
});
