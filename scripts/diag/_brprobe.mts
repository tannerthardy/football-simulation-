import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
for (const [pers, front, cov] of [['nickel','over','cover3'],['nickel','over','cover1'],['dime','over','cover2'],['base43','over','cover3'],['nickel','under','cover4']] as const) {
  const f = FRONT_BY_ID[front], c = COVERAGE_BY_ID[cov]; if (!f || !c) { console.log('missing', front, cov); continue; }
  for (const id of ['stick', 'curl_flat']) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, pers),
      offCall: { formation, kind: 'pass', flip: false, pass: PASS_BY_ID[id], label: id },
      defCall: { personnel: pers, front: f, coverage: c, pressure: null, label: '' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false });
    sim.tick();
    const rb = sim.slot('RB'); const b = rb.behavior;
    const box = sim.defense.filter((d: any) => d.pos.x - 40 > 0 && d.pos.x - 40 <= 6).length;
    console.log(pers, front, cov, id, 'depth0-6 count', box, '->', b.kind, b.route?.id ?? b.releaseTo ? 'check' : '');
  }
}
