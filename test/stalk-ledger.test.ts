import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

function stalks(formation: string, run: string, front: string, personnel: string, coverage: string, flip: boolean) {
  const f = FORMATION_BY_ID[formation];
  const sim = new PlaySim({ offense: pickOffense(offense, f.personnel), defense: pickDefense(defense, personnel as never),
    offCall: { formation: f, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: personnel as never, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[coverage], pressure: null, label: front },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  return sim.offense.filter((a) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'stalk')
    .map((a) => (a.behavior as RunBlocker).plan.target?.slot ?? null);
}

describe('receivers share one stalk ledger', () => {
  const cases = [
    ['ace_trips_11', 'iz_strong', 'over', 'nickel', 'cover3'],
    ['gun_trips_11', 'iz_strong', 'wide9', 'nickel', 'cover3'],
    ['gun_spread_10', 'counter', 'wide9', 'nickel', 'cover2'],
    ['ace_11', 'trap', 'over', 'base43', 'cover3'],
  ] as const;
  it.each(cases.flatMap((c) => [[...c, false], [...c, true]]))('%s %s vs %s: no two receivers stalk one man, flip=%s', (formation, run, front, personnel, coverage, flip) => {
    const targets = stalks(formation, run, front, personnel, coverage, flip as boolean);
    expect(targets.length).toBeGreaterThan(1);
    expect(new Set(targets).size).toBe(targets.length);
  });
});
