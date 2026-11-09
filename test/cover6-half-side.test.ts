/**
 * Cover 6 tools (fangio-system.md E4): Area vs trips with #2/#3 aligned
 * close (HNFL-073/052/195), and the half side's vertical curl (HNFL-097).
 * Assertions read who took whom on film.
 */
import { describe, expect, it, vi } from 'vitest';
// The wing, end and weak #2 must get off the line to ask these questions.
// Under the candidate profile, SNAP_REACT's get-off and FRONT_ALIGN's end
// over the wing hold them at the line (the end's flat reads as a block until
// 1.5 s; the wing's seam is 3.8 yd deep at 3.0 s). The scenes are staged on
// the installed front; `released` asserts each route got off as written, so
// a staging break fails as staging, not as coverage.
// OL_STAGGER sets the line deeper; this timed scene is staged on the flat line.
vi.hoisted(() => { process.env.FRONT_ALIGN = '0'; process.env.SNAP_REACT = '0'; process.env.OL_STAGGER = '0'; });
import { CENTER_Y } from '../src/core/field.js';
import { filmScene, jobsOf, type SceneFilm } from '../src/lab/coverage-scene.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { COVERAGE_BY_ID, installCoverage } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { formationStructure } from '../src/playbook/structure.js';
import type { SkillSlot } from '../src/playbook/types.js';
import type { PlaySim } from '../src/sim/playsim.js';

/** How far `ref` has gone upfield and outward (toward his own sideline) from his installed spot. */
function released(f: SceneFilm & { sim: PlaySim }, ref: string) {
  const slot = f.numbering[ref]!, start = f.sim.offAlign.spots[slot].pos, now = f.sim.slot(slot as SkillSlot)!.pos;
  return { up: now.x - start.x, out: (now.y - start.y) * Math.sign(start.y - f.sim.offAlign.ballY) };
}
/** The rep ran to `until` with the ball still in the quarterback's hands. */
const ran = (f: SceneFilm & { sim: PlaySim }, until: number) => f.sim.phase === 'live' && f.sim.ball.kind === 'held' && f.sim.t >= until - 0.05;
const bySeat = (f: SceneFilm, rule: string) => Object.values(f.defenders).find(d => d.rule === rule)!.slot;
const aligned = (formation: string) => alignOffense(FORMATION_BY_ID[formation], false, 40, CENTER_Y);
const install = (formation: string, coverage: string) =>
  installCoverage({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'lab' },
    aligned(formation)).coverage.id;

describe('Cover 6 Area vs close #2/#3', () => {
  it('a wing on the end reads as a close #2/#3; spread trips do not', () => {
    expect(formationStructure(aligned('gun_wing_12')).tags).toContain('close_23');
    expect(formationStructure(aligned('gun_trips_11')).tags).not.toContain('close_23');
    expect(install('gun_wing_12', 'cover6')).toBe('cover6_area');
    expect(install('gun_trips_11', 'cover6')).toBe('cover6_book');
  });

  it('exchange: the nickel takes the end to the flat and the hook takes the wing inside; Book leaves that flat open', () => {
    const routes = { strong: { 1: 'go', 2: 'slant', 3: 'flat' }, weak: { 1: 'go' }, until: 2.8 } as const;
    const f = filmScene({ formation: 'gun_wing_12', coverage: 'cover6', ...routes });
    expect(f.played).toBe('cover6_area');
    expect(ran(f, 2.8)).toBe(true);
    expect(released(f, 'S3').out).toBeGreaterThan(3);
    expect(released(f, 'S2').out).toBeLessThan(-1);
    expect(jobsOf(f, bySeat(f, 'area_flat'))).toContain(`man:${f.numbering.S3}`);
    expect(jobsOf(f, bySeat(f, 'area_hook'))).toContain(`man:${f.numbering.S2}`);
    // Control: Book's MUSH nickel and read hook both zone off the end's flat.
    const book = filmScene({ formation: 'gun_wing_12', coverage: 'cover6_book', ...routes });
    expect(Object.values(book.defenders).some(d => d.jobs.some(j => j.startsWith(`man:${book.numbering.S3}`)))).toBe(false);
  });

  it('the Topper tops the one that goes deep; the hook does not carry a seam', () => {
    const f = filmScene({ formation: 'gun_wing_12', coverage: 'cover6', strong: { 1: 'go', 2: 'seam', 3: 'flat' }, weak: { 1: 'go' }, until: 3.0 });
    expect(ran(f, 3.0)).toBe(true);
    expect(released(f, 'S2').up).toBeGreaterThan(8);
    expect(jobsOf(f, 'SS').at(-1)).toBe(`man:${f.numbering.S2}`);
    expect(jobsOf(f, bySeat(f, 'area_hook')).at(-1)).not.toBe(`man:${f.numbering.S2}`);
    expect(jobsOf(f, bySeat(f, 'area_flat'))).toContain(`man:${f.numbering.S3}`);
  });
});

describe('Cover 6 half side: vertical curl (HNFL-097)', () => {
  it('walls weak #2 up the seam and matches his dig', () => {
    const seam = filmScene({ formation: 'gun_spread_10', coverage: 'cover6', weak: { 1: 'go', 2: 'seam' }, until: 2.6 });
    const curl = bySeat(seam, 'c2_hook');
    expect(ran(seam, 2.6)).toBe(true);
    expect(released(seam, 'W2').up).toBeGreaterThan(8);
    expect(jobsOf(seam, curl)).toContain(`wall:${seam.numbering.W2}`);
    // Observed through 3.3 s: a rusher who keeps moving the step he sheds his
    // block (RELEASE_REDECIDE) gets home at 3.35 s on this snap.
    const dig = filmScene({ formation: 'gun_spread_10', coverage: 'cover6', weak: { 1: 'go', 2: 'lab_in9' }, until: 3.3 });
    expect(ran(dig, 3.3)).toBe(true);
    expect(released(dig, 'W2').up).toBeGreaterThan(7);
    expect(released(dig, 'W2').out).toBeLessThan(-1);
    expect(jobsOf(dig, curl)).toContain(`man:${dig.numbering.W2}`);
  });
});
