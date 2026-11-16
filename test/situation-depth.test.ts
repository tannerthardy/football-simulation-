/** SITU_DEPTH: deep safeties and zone corners set their depth by down,
 * distance and offensive personnel (BDB 2025 PFF-assignment medians,
 * docs/reviews/2026-11-09-coverage-spacing.md). */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { situationDepth } from '../src/playbook/alignment.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
function depths(coverage: string, formation: string, down: number, distance: number) {
  const f = FORMATION_BY_ID[formation], pers = /12|21/.test(f.personnel) ? 'base43' : 'nickel';
  const sim = new PlaySim({ offense: pickOffense(offense, f.personnel), defense: pickDefense(defense, pers),
    offCall: { formation: f, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'depth' },
    defCall: { personnel: pers, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: coverage },
    los: 40, ballY: 26.65, firstDownX: 40 + distance, down, seed: 5, audibles: false });
  const d = (slot: string) => +(sim.defAlign.spots[slot as keyof typeof sim.defAlign.spots]!.pos.x - sim.los).toFixed(2);
  return { FS: d('FS'), SS: d('SS'), CB_S: d('CB_S') };
}

describe('situational depth of the deep secondary', () => {
  it('reads the measured table: short yardage and heavy personnel tighten, 3rd & long backs the corners off', () => {
    expect(situationDepth('quarter', { down: 1, distance: 10, toGoal: 60, personnel: '11' })).toBe(0);
    expect(situationDepth('quarter', { down: 3, distance: 1, toGoal: 60, personnel: '11' })).toBeCloseTo(-1.1);
    expect(situationDepth('quarter', { down: 1, distance: 10, toGoal: 60, personnel: '21' })).toBeCloseTo(-1.0);
    expect(situationDepth('quarter', { down: 3, distance: 1, toGoal: 60, personnel: '13' })).toBeCloseTo(-2.7);
    expect(situationDepth('thirdCB', { down: 3, distance: 12, toGoal: 60, personnel: '11' })).toBeCloseTo(0.6);
    expect(situationDepth('post', { down: 4, distance: 2, toGoal: 60, personnel: '10' })).toBeCloseTo(-1.2);
  });

  it('moves the aligned quarters safeties and Cover 3 post/corners, and nothing on 1st & 10 vs 11', () => {
    // Re-recorded on the engine defaults (2026-11-15): ALIGN_HABIT gives each off-ball defender his own depth habit and
    // a per-snap scatter (here SS sits 1.36 yd shallow at 1st & 10), the same for one player and seed in every call,
    // so the table is read as each situation's change from 1st & 10 vs 11 personnel.
    const base = depths('cover4', 'gun_doubles_11', 1, 10);
    expect(base.FS).toBe(12); expect(Math.abs(base.SS - 12)).toBeLessThanOrEqual(2.0);
    const short = depths('cover4', 'gun_doubles_11', 3, 1);
    expect(short.FS - base.FS).toBeCloseTo(-1.1); expect(short.SS - base.SS).toBeCloseTo(-1.1);
    const heavy = depths('cover4', 'i_pro_21', 1, 10);
    expect(heavy.FS - base.FS).toBeCloseTo(-1.0);
    const c3 = depths('cover3', 'gun_doubles_11', 3, 12), c3base = depths('cover3', 'gun_doubles_11', 1, 10);
    expect(c3.CB_S - c3base.CB_S).toBeCloseTo(0.6);
    expect(c3.FS).toBeCloseTo(c3base.FS); // the post holds on 3rd & long
  });
});
