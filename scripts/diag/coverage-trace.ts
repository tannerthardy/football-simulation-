/** Reproduce an individual coverage-lab rep with movement and ball targets.
 * node --import tsx scripts/diag/coverage-trace.ts [coverage=cover3_buzz] [concept=curl_flat] [seed=2775387510] [roster=7] [formation=gun_doubles_11] [flip=false]
 */
import { Rng } from '../../src/core/rng.js';
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { CoverageDefender } from '../../src/sim/coverage/defender.js';
import { catchSpot } from '../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../src/sim/playsim.js';
const coverage = process.argv[2] ?? 'cover3_buzz', concept = process.argv[3] ?? 'curl_flat';
const seed = Number(process.argv[4] ?? 2775387510), roster = Number(process.argv[5] ?? 7);
const formation = FORMATION_BY_ID[process.argv[6] ?? 'gun_doubles_11'], flip = process.argv[7] === 'true';
const rng = new Rng(roster);
const ot = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.6 });
const dt = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.6 });
const sim = new PlaySim({ offense: pickOffense(ot, formation.personnel), defense: pickDefense(dt, 'nickel'),
  offCall: { formation, flip, kind: 'pass', pass: PASS_BY_ID[concept], label: '' },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, zoneStyle: 'match', label: '' },
  los: 40, ballY: HASH_LEFT_Y, firstDownX: 50, seed, down: 1 });
const trace = [];
while (sim.phase === 'live' && sim.t < 8) {
  sim.tick();
  if (Math.round(sim.t / sim.dt) % 4 !== 0) continue;
  trace.push({ t: sim.t, phase: sim.ball.kind, throwAt: sim.throwAt, catchAt: sim.catchAt,
    offense: sim.offense.filter(a => ['X', 'Z', 'H', 'Y'].includes(a.slot)).map(a => ({ slot: a.slot, pos: a.pos, vel: a.vel })),
    defense: sim.defense.filter(a => !a.slot.startsWith('D')).map(a => ({ slot: a.slot, pos: a.pos, vel: a.vel,
      facing: a.facing, job: a.behavior instanceof CoverageDefender ? a.behavior.job : a.behavior.kind,
      judgment: a.behavior instanceof CoverageDefender ? a.behavior.judgment?.reason : undefined,
      ballSpot: sim.ball.kind === 'air' ? catchSpot(a, sim) : undefined })) });
}
console.log(JSON.stringify({ setup: { coverage, concept, seed, roster, formation: formation.id, flip }, stats: sim.stats, events: sim.events, trace }));
