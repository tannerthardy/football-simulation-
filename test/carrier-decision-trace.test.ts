/** The ball carrier's decision is exposed in three separate parts: arrival
 * evidence per threat, the route assessment per heading, and the designed
 * track's stay/exit operands. Recording them changes nothing. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'Trace offense', 'TO', { strength: .55 });
const defense = generateTeam(new Rng(42), 'Trace defense', 'TD', { strength: .55 });
const play = (seed: number, run: keyof typeof RUN_BY_ID) => new PlaySim({
  offense: pickOffense(offense, '12'), defense: pickDefense(defense, 'base43'),
  offCall: { formation: FORMATION_BY_ID.ace_12, kind: 'run', flip: false, run: RUN_BY_ID[run], label: 'trace' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed });

describe('ball carrier decision trace', () => {
  it('records arrival parts, routes and exit operands without changing the play', () => {
    let designed = 0, exits = 0, bonus = 0;
    for (const [seed, run] of [[1, 'iz_strong'], [2, 'duo'], [3, 'power'], [4, 'counter'], [5, 'trap'], [6, 'draw']] as const) {
      const plain = play(seed, run).run();
      const sim = play(seed, run);
      const trace = sim.recordCommands({ actor: { team: 'O', slot: 'RB' }, from: 0, to: 30 });
      const traced = sim.run();
      // Recording is passive: the same play to the event.
      expect(traced.events).toEqual(plain.events);
      expect(traced.yards).toBe(plain.yards);
      const records = trace.steps.flatMap(s => s.carrier ?? []).map(r => r.data);
      for (const r of records) {
        if (r.kind === 'evaluate') {
          expect(r.routes.length).toBeGreaterThan(0);
          for (const th of r.arrival) {
            // `extra` is exactly scenario parking or observed recovery, plus the blocker credit.
            expect(th.extra).toBe((th.parking ?? th.recovery) + th.blockerBonus);
            expect([0, 0.25, 0.7]).toContain(th.blockerBonus);
            if (th.blockerBonus) bonus++;
          }
          if (r.selected) expect(r.routes.some(x => x.score === r.selected!.score)).toBe(true);
          if (r.designed) designed++;
        } else {
          exits++;
          expect(r.exit).toBe(!!r.aimBlocked && r.bestScore! > r.threshold!);
        }
      }
    }
    // The sample exercises the designed phase, its exit gate and the blocker credit.
    expect(designed).toBeGreaterThan(0);
    expect(exits).toBeGreaterThan(0);
    expect(bonus).toBeGreaterThan(0);
  });
});
