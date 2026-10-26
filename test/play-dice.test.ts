/** A play's randomness is split by consumer (PlaySim.dice): an engagement
 * pair's hand fight, a blocker's hold, a tackler's attempt, a receiver's catch,
 * the passer's throw. Each consumer's dice depend only on the play's seed and
 * its own label, so one consumer drawing more or fewer numbers (a changed
 * contest in the trenches) cannot shift another's (a catch downfield).
 * Contracts of the split itself; scene tests that were recorded on the old
 * single stream set PlaySim.recordedSingleStream instead. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const play = (seed = 11) => new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
  defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
  offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
  los: 40, ballY: 26, firstDownX: 50, seed });
const draws = (r: Rng, n = 6) => Array.from({ length: n }, () => r.next());

describe('play dice', () => {
  it('gives each consumer its own stream, the same one every time it asks', () => {
    const sim = play(), lt = sim.slot('LT')!, de = sim.slot('DE_W')!, x = sim.slot('X')!;
    expect(sim.dice('rep', lt, de)).toBe(sim.dice('rep', lt, de));
    const streams = [sim.dice('rep', lt, de), sim.dice('rep', de, lt), sim.dice('hold', lt), sim.dice('catch', x),
      sim.dice('throw', sim.qb), sim.dice('loose-ball'), sim.rng];
    expect(new Set(streams).size).toBe(streams.length);
    const first = streams.map(r => r.next());
    expect(new Set(first).size).toBe(first.length);
  });

  it('is deterministic per play and differs between plays', () => {
    const a = play(11), b = play(11), c = play(12);
    expect(draws(a.dice('catch', a.slot('X')!))).toEqual(draws(b.dice('catch', b.slot('X')!)));
    expect(draws(a.dice('throw', a.qb))).not.toEqual(draws(c.dice('throw', c.qb)));
  });

  it("does not draw from the play's stream or let one consumer shift another", () => {
    const a = play(), b = play(), before = { ...a.rng };
    // In b, the trenches draw a different number of times before the catch.
    for (let k = 0; k < 7; k++) b.dice('rep', b.slot('LT')!, b.slot('DE_W')!).gaussian();
    b.dice('hold', b.slot('RT')!).next();
    expect(draws(b.dice('catch', b.slot('X')!))).toEqual(draws(a.dice('catch', a.slot('X')!)));
    expect(draws(b.dice('throw', b.qb))).toEqual(draws(a.dice('throw', a.qb)));
    expect({ ...a.rng }).toEqual(before);
  });

  it('keeps every in-play draw on a consumer stream', () => {
    // Direct draws from the play's one stream would couple consumers again.
    const files = (dir: string): string[] => readdirSync(dir).flatMap(f => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
    });
    const direct = /\b(?:sim|this)\.rng\.(?:next|nextU32|range|int|chance|gaussian|normal|normalClamped|pick|weighted|shuffle)\(/;
    const offenders = files('src/sim').filter(f => direct.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
    expect(files('src').filter(f => /recordedSingleStream\s*=\s*true/.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});
