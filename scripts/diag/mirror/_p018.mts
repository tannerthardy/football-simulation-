import { readFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { planRunBlocking } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const saved = JSON.parse(readFileSync('test/fixtures/receiver-run-assignment-g1-p018.json', 'utf8'));
for (const mirror of [false, true]) {
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_bunch_11, flip: mirror ? !saved.installationFlip : saved.installationFlip, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover0, pressure: PRESSURE_BY_ID.zero_6, label: 'press' },
    los: saved.los, ballY: saved.ballY, firstDownX: 55, seed: 3, audibles: false } as any);
  for (const a of sim.agents) { const [x, y] = saved.positions[a.slot]; a.body.pos = { x, y: mirror ? 2 * saved.ballY - y : y }; }
  const plans = planRunBlocking(sim, RUN_BY_ID.oz_strong);
  if (process.env.BRIEF) { const lg: any = plans.get(sim.slot('LG')); console.log(`${mirror} ${lg?.climbTo?.slot === 'LB_M' && plans.get(sim.slot('RT'))?.target?.slot === 'DE_S' ? 'PASS' : 'FAIL'} LG ${lg?.kind}→${lg?.target?.slot}^${lg?.climbTo?.slot ?? '-'}`); continue; }
  const s = (a: any) => a?.slot ?? '-';
  console.log(`mirror ${mirror}: ` + ['LT', 'LG', 'C', 'RG', 'RT', 'Y'].map((sl) => { const p: any = plans.get(sim.slot(sl)); return p ? `${sl}:${p.kind}→${s(p.target)}${p.climbTo ? '^' + s(p.climbTo) : ''}${p.combination ? '[combo ' + s(p.combination.with ?? p.combination.partner) + '/' + s(p.combination.backer) + ']' : ''}` : `${sl}:-`; }).join('  '));
  if (!mirror) console.log('  saved assignments:', JSON.stringify(saved.savedAssignments).slice(0, 400));
  console.log('  D:', sim.defense.map((d: any) => `${d.slot}(${(d.pos.x - saved.los).toFixed(1)},${(d.pos.y - saved.ballY).toFixed(1)})`).join(' '));
}
