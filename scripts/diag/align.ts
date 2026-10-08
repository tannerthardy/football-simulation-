import { Rng } from '../../src/core/rng.js';
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { zoneLandmark } from '../../src/playbook/alignment.js';
import { PlaySim } from '../../src/sim/playsim.js';
const [cov = 'cover3', form = 'gun_doubles_11', pers = 'nickel'] = process.argv.slice(2);
const rng = new Rng(5);
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 });
const def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
const formation = FORMATION_BY_ID[form];
const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, pers as any), offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.comebacks, label: '' }, defCall: { personnel: pers as any, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: '' }, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: 1 });
console.log('ballY', sim.ballY, 'strongSign', sim.offAlign.strongSign);
for (const a of sim.offense) console.log('O', a.slot.padEnd(4), (a.pos.x - 35).toFixed(1), a.pos.y.toFixed(1), (sim.offAlign.refOf as any)[a.slot] ?? '');
for (const [slot, sp] of Object.entries(sim.defAlign.spots) as any) {
  const lm = sp.role.kind === 'zone' ? zoneLandmark(sp.role.zone, sim.offAlign) : null;
  console.log('D', slot.padEnd(5), (sp.pos.x - 35).toFixed(1), sp.pos.y.toFixed(1), sp.role.kind, sp.role.zone ?? sp.manTarget ?? '', lm ? `lm=(${(lm.x - 35).toFixed(1)},${lm.y.toFixed(1)})` : '');
}
