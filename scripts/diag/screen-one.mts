// One screen snap: print events and the screen receiver/blockers around the throw.
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { SCREEN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const [id, form, cov, seedS, pres] = process.argv.slice(2);
const concept = SCREEN_BY_ID[id], formation = FORMATION_BY_ID[form], seed = Number(seedS);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
  offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: concept, label: concept.name },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: pres ? PRESSURE_BY_ID[pres] : null, label: cov },
  los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
const t0 = sim.tick.bind(sim); let last = -1;
sim.tick = () => { t0(); const k = Math.round(sim.t * 4); if (k !== last && Math.abs(sim.t * 4 - k) < 1e-6) { last = k;
  const off = sim.offense.filter((a: any) => a.behavior?.kind === 'screen-block' || ['route','track-ball','carrier'].includes(a.behavior?.kind) || a === sim.carrier);
  console.log(`t ${sim.t.toFixed(2)} ball ${sim.ball.kind} | ` + off.map((a: any) => `${a.slot}:${a.behavior.kind}@(${(a.pos.x - sim.los).toFixed(1)},${a.pos.y.toFixed(1)})${a.behavior.target ? '->' + a.behavior.target.slot : ''}${a.engagement ? '[E ' + a.engagement.defender.slot + ']' : ''}`).join(' ')); } };
const res = sim.run();
console.log('result', res.outcome, res.yards);
for (const e of sim.events) if (!/block_contact|snap$|carrier_contact/.test(e.type)) console.log(`  ${e.t} ${e.type} ${e.a !== undefined ? sim.agents[e.a].team + sim.agents[e.a].slot : ''} ${e.b !== undefined ? sim.agents[e.b].team + sim.agents[e.b].slot : ''} ${e.note ?? ''}`);
