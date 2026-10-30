import { it } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
const o = generateTeam(new Rng(11), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(12), 'D', 'D', { strength: .55 });
it('witness', () => {
  for (const [concept, frontId] of [['counter', 'under'], ['trap', 'odd']] as const)
    for (const flip of [false, true]) for (const ballY of [CENTER_Y, HASH_LEFT_Y]) for (const seed of [7, 8, 9, 10, 11]) {
      const formation = FORMATION_BY_ID.i_pro_21, front = FRONT_BY_ID[frontId], personnel = front.personnel[0];
      const sim = new PlaySim({ offense: pickOffense(o, formation.personnel), defense: pickDefense(d, personnel),
        offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[concept], label: concept },
        defCall: { personnel, front, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'test' }, los: 40, ballY, firstDownX: 50, seed });
      const tgt = (s: string) => ((sim.slot(s)!.behavior as RunBlocker).plan?.target?.slot ?? '-');
      const r = sim.run();
      const fc = r.events.find((e: any) => e.type === 'carrier_contact' || e.type === 'tackle_wrap') as any;
      const who = fc ? [fc.a, fc.b].map((i: number) => sim.agents[i]).find((a) => a && a.team === 'D')?.slot : '-';
      console.log('W', concept, frontId, flip ? 'flip' : 'base', ballY === CENTER_Y ? 'mid' : 'hash', seed, 'Z->' + tgt('Z'), 'X->' + tgt('X'), 'first', who, fc ? fc.t.toFixed(2) : '-', 'yd', r.yards.toFixed(1));
    }
});
