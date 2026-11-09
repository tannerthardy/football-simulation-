/** Split-back shotgun: a back on each side of the QB. The second back is
 * found by alignment, not by slot name, so a fullback, tight end, slot
 * receiver or second running back gets the same backfield jobs. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { PASS_BY_ID, RUN_CONCEPTS } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import type { Formation } from '../src/playbook/types.js';
import { PassProtector, RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const split = FORMATIONS.filter((f) => f.tags.includes('split-backs'));
const second = (f: Formation) => Object.keys(f.slots).find((s) => s !== 'RB' && f.slots[s as keyof typeof f.slots]!.depth >= 3)!;

describe('split-back shotgun', () => {
  it('installs sets for 11, 12, 20 and 21 personnel', () => {
    expect(new Set(split.map((f) => f.personnel))).toEqual(new Set(['11', '12', '20', '21']));
    for (const f of split) expect(f.qb).toBe('gun');
  });

  it.each(split)('$id sets one back on each side of the QB, about level with him', (f) => {
    const two = second(f);
    for (const flip of [false, true]) for (const ballY of [HASH_LEFT_Y, CENTER_Y, HASH_RIGHT_Y]) {
      const a = alignOffense(f, flip, 40, ballY), qb = a.spots.QB, rb = a.spots.RB, b2 = a.spots[two];
      expect(a.numbering.B).toBe('RB');
      expect(a.numbering.B2).toBe(two);
      expect(rb.backfield && b2.backfield).toBe(true);
      expect(Math.sign(rb.pos.y - qb.pos.y)).toBe(-Math.sign(b2.pos.y - qb.pos.y));
      expect(Math.abs(rb.pos.y - qb.pos.y)).toBeCloseTo(2.45);
      expect(Math.abs(b2.pos.y - qb.pos.y)).toBeCloseTo(2.45);
      // An RB or FB sets just behind the QB; a tight end about a yard shallower.
      expect(qb.pos.x - rb.pos.x).toBeCloseTo(.2);
      expect(qb.pos.x - b2.pos.x).toBeCloseTo(f.personnel === '11' && two === 'Y' || f.personnel === '12' ? -.75 : .2);
      expect(a.counts.S + a.counts.W).toBe(3);
    }
  });

  it('leaves every other formation\'s second back as its backfield F', () => {
    for (const f of FORMATIONS.filter((x) => !x.tags.includes('split-backs'))) {
      const a = alignOffense(f, false, 40, CENTER_Y);
      expect(a.numbering.B2, f.id).toBe(a.spots.F?.backfield ? 'F' : undefined);
    }
  });

  it('fills 20 personnel with two different running backs', () => {
    const team = generateTeam(new Rng(5), 'Split', 'SPL');
    const lineup = pickOffense(team, '20');
    expect(lineup.RB.position).toBe('RB');
    expect(lineup.F.position).toBe('RB');
    expect(lineup.F.id).not.toBe(lineup.RB.id);
    expect([lineup.X, lineup.Z, lineup.H].every((p) => p.position === 'WR')).toBe(true);
  });

  describe('whole plays', () => {
    const offense = generateTeam(new Rng(41), 'Split offense', 'SO', { strength: .55 });
    const defense = generateTeam(new Rng(42), 'Split defense', 'SD', { strength: .55 });
    const play = (f: Formation, call: { kind: 'run'; run: typeof RUN_CONCEPTS[number] } | { kind: 'pass'; pass: typeof PASS_BY_ID[string] }, seed: number) => new PlaySim({
      offense: pickOffense(offense, f.personnel), defense: pickDefense(defense, 'nickel'),
      offCall: { formation: f, flip: false, label: 'split', ...call },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });

    it.each(split)('$id runs every run concept, with the second back blocking', (f) => {
      const two = second(f);
      RUN_CONCEPTS.forEach((run, i) => {
        const sim = play(f, { kind: 'run', run }, 100 + i);
        const back = sim.slot(two)!;
        expect(back.behavior, `${f.id} ${run.id}`).toBeInstanceOf(RunBlocker);
        const res = sim.run();
        expect(Number.isFinite(res.yards), `${f.id} ${run.id}`).toBe(true);
      });
    });

    it.each(split)('$id runs pass concepts, with the second back protecting before a check release', (f) => {
      const two = second(f);
      for (const [i, id] of ['stick', 'mesh', 'four_verts', 'smash'].entries()) {
        const pass = PASS_BY_ID[id];
        const sim = play(f, { kind: 'pass', pass }, 200 + i);
        const back = sim.slot(two)!;
        if (pass.back === 'block' || pass.back === 'check' || !pass.back) expect(back.behavior, `${f.id} ${id}`).toBeInstanceOf(PassProtector);
        const res = sim.run();
        expect(Number.isFinite(res.yards), `${f.id} ${id}`).toBe(true);
      }
    });
  });
});
