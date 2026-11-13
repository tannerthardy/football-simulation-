import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

// The native stretch rep whose play-side end was freed by a shed roll while
// his blocker still covered the path (oz_strong, rosters 31/32, Under).
function play(flip: boolean) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'OZ' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Under' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  while (sim.phase === 'live' && sim.t < 5) sim.tick();
  return sim;
}

describe('a run shed is a decision the body executes', () => {
  it.each([false, true])('defenders try to get off blocks near the runner, and no roll frees them, flip=%s', (flip) => {
    const sim = play(flip);
    expect(sim.defense.some((d) => d.tags.has('shed-attempt'))).toBe(true);
    expect(sim.events.filter((ev) => ev.type === 'shed' && ev.note === 'run: shed')).toHaveLength(0);
  });
});
