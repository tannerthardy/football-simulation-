/** Print a receiver's and a defender's path in a scripted pass snap (development aid).
 *   node --import tsx scripts/diag/route-trace.ts [coverage] [weak2route] [rx] [dx] */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { COVERAGE_BY_ID } from '../../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { PassConcept } from '../../src/playbook/types.js';
import { CoverageDefender } from '../../src/sim/coverage/defender.js';
import { PlaySim } from '../../src/sim/playsim.js';
const [cov = 'cover4_palms', w2 = 'quick_out', rs = 'H', ds = 'CB_W', fs = 'FS'] = process.argv.slice(2);
const offense = generateTeam(new Rng(21), 'Offense', 'OFF', { strength: 0.6 });
const defense = generateTeam(new Rng(22), 'Defense', 'DEF', { strength: 0.6 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const concept: PassConcept = { id: 'lab', name: 'lab', family: 'dropback', drop: 'gun5', strong: { 1: 'go', 2: 'go' }, weak: { 1: 'go', 2: w2 }, back: 'block', progression: ['S1'], beats: [] };
const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
  offCall: { formation, flip: false, kind: 'pass', pass: concept, label: 'lab' },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, zoneStyle: 'match', label: 'lab', checkPick: 0 },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
const r = sim.slot(rs)!, d = sim.slot(ds)!;
sim.throwBall = () => undefined;
const step = sim as unknown as { tick(): void };
while (sim.phase === 'live' && sim.t < Number(process.argv[7] ?? 2.4) && sim.throwAt < 0) {
  step.tick();
  const b = d.behavior;
  const job = b instanceof CoverageDefender ? b.history.map((h) => h.job).join(',') : '';
  const f = sim.slot(fs)!, fb = f.behavior;
  const fjob = fb instanceof CoverageDefender ? fb.history.map((h) => h.job).join(',') : '';
  if (Math.round(sim.t * 20) % 2 === 0) console.log(`${fjob} | ${sim.t.toFixed(2)} ${rs}(${r.pos.x.toFixed(2)},${r.pos.y.toFixed(2)} v${r.vel.x.toFixed(1)},${r.vel.y.toFixed(1)}) ${ds}(${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)} v${d.vel.x.toFixed(1)},${d.vel.y.toFixed(1)}) ${job}`);
}

