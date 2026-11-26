import { it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
it('probe', () => {
  const rng = new Rng(7); const offense = generateTeam(rng, 'O', 'O', { strength: .6 }), defense = generateTeam(rng, 'D', 'D', { strength: .6 });
  for (const flip of [false, true]) {
    const formation = FORMATION_BY_ID.ace_11;
    const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'), offCall: { formation, flip, kind: 'run', run: RUN_BY_ID.counter, label: '' },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
    console.log('P', flip, 'LG', (sim.slot('LG')!.pos.y - CENTER_Y).toFixed(1), sim.defense.filter((d) => d.slot.startsWith('LB')).map((d) => `${d.slot} y${(d.pos.y - CENTER_Y).toFixed(1)} ${d.runFit!.kind}:${d.runFit!.gap}${d.runFit!.side > 0 ? '+' : '-'}${d.runFit!.inside ? '(' + d.runFit!.inside.gap + ')' : ''}`).join(', '));
  }
});
