/**
 * The coordinator's trips check menu (HNFL-195): Trix on passing downs, Book
 * (Stubbie) when the backside must stay 3-over-2; Saban-style quarters trees
 * default to Stubbie, Fangio-style two-high trees lean Trix; a check the
 * offense keeps beating gives way. The secondary honors the preference.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { DefensiveCoordinator, type Situation } from '../src/game/playcaller.js';
import { generateTeam, pickOffense, type CoverageSystem } from '../src/league/team.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { checkCall, COVERAGE_BY_ID } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { formationStructure } from '../src/playbook/structure.js';

const offense = generateTeam(new Rng(31), 'Offense', 'OFF', { strength: 0.55 });
const base = generateTeam(new Rng(32), 'Defense', 'DEF', { strength: 0.55 });
const firstDown: Situation = { down: 1, distance: 10, yardline: 35, quarter: 1, clock: 600, scoreDiff: 0, ballY: HASH_LEFT_Y, hurry: false };
const thirdLong: Situation = { ...firstDown, down: 3, distance: 9 };

const coordinator = (system: CoverageSystem) =>
  new DefensiveCoordinator({ ...base, coach: { ...base.coach, coverageSystem: system } }, new Rng(`menu:${system}`));
const prefer = (dc: DefensiveCoordinator, s: Situation) =>
  dc.call(s, '11', offense, pickOffense(offense, '11')).call.checkPrefer?.[0];

describe('defensive coordinator trips check menu', () => {
  it('a balanced tree plays Book early and Trix on passing downs; quarters and two-high trees keep their leans', () => {
    const dc = coordinator('single-high');
    expect(prefer(dc, firstDown)).toBe('cover4_stubbie');
    expect(prefer(dc, thirdLong)).toBe('cover4_poach');
    expect(prefer(coordinator('quarters'), thirdLong)).toBe('cover4_stubbie');
    expect(prefer(coordinator('two-high'), firstDown)).toBe('cover4_poach');
  });

  it('switches away from a check the offense keeps beating', () => {
    const dc = coordinator('quarters');
    const called = { personnel: 'nickel' as const, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, label: 'lab' };
    const installed = { ...called, coverage: COVERAGE_BY_ID.cover4_stubbie, check: { from: 'cover4', when: '3x1' } };
    for (let i = 0; i < 6; i++) dc.observe(called, 1, installed);
    expect(prefer(dc, firstDown)).toBe('cover4_poach');
  });

  it('the secondary honors the preference over the coach index, and falls back when it is not offered', () => {
    const trips = formationStructure(alignOffense(FORMATION_BY_ID.gun_trips_11, false, 40, CENTER_Y));
    const call = { personnel: 'nickel' as const, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, label: 'lab', checkPick: 0 };
    expect(checkCall({ ...call, checkPrefer: ['cover4_stubbie', 'cover4_poach'] }, trips).coverage.id).toBe('cover4_stubbie');
    expect(checkCall({ ...call, checkPrefer: ['cover4_poach'] }, trips).coverage.id).toBe('cover4_poach');
    expect(checkCall({ ...call, coverage: COVERAGE_BY_ID.cover4_meg, checkPrefer: ['cover4_stubbie'] }, trips).coverage.id).toBe('cover4_poach');
  });
});
