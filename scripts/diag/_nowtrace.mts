// Now screen, one snap: catcher (W1), stalk (W2) and defenders near the catcher every 0.1 s.
//   tsx scripts/diag/_nowtrace.mts cover3 1
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { SCREEN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const [cov, seedS] = process.argv.slice(2); const seed = Number(seedS);
const concept = SCREEN_BY_ID.wide_now_screen, formation = FORMATION_BY_ID.gun_doubles_11;
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
  offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: concept, label: concept.name },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
  los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
const W1 = sim.agents.find((a: any) => a.slot === sim.offAlign.numbering.W1), W2 = sim.agents.find((a: any) => a.slot === sim.offAlign.numbering.W2);
const t0 = sim.tick.bind(sim); let last = -1;
const f = (a: any) => `${a.slot}(${(a.pos.x - sim.los).toFixed(1)},${a.pos.y.toFixed(1)} v${Math.hypot(a.vel.x,a.vel.y).toFixed(1)})`;
sim.tick = () => { t0(); const k = Math.round(sim.t * 10); if (k !== last && Math.abs(sim.t * 10 - k) < 1e-6 && k % 1 === 0 && sim.t < 3.2) { last = k;
  const b = W2.behavior; const near = sim.defense.filter((d: any) => Math.hypot(d.pos.x - W1.pos.x, d.pos.y - W1.pos.y) < 12);
  console.log(`t${sim.t.toFixed(1)} ${sim.ball.kind} W1 ${f(W1)} ${W1.behavior.kind} | W2 ${f(W2)} ${b.kind}${b.target ? '->' + b.target.slot : ''}${W2.engagement ? '[E]' : ''} | ` + near.map(f).join(' ')); } };
const r = sim.run(); console.log(r.yards, sim.events.filter((e: any) => !/tick/.test(e.type)).slice(0, 12).map((e: any) => `${e.type}@${e.t.toFixed(2)}`).join(' '));
