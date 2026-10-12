/** Trace the play-side end, his blockers and the back on one native stretch
 * input (positions relative to the ball, play side positive; depth past the
 * line positive). Observation only.
 * node --import tsx scripts/diag/zone/trace-end.ts run seed rosterO rosterD front flip
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runReads } from '../../../src/sim/run-read.js';

const [run = 'oz_strong', seed = '3', o = '31', d = '32', front = 'under', flip = 'flip'] = process.argv.slice(2);
const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(+o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
  defense: pickDefense(generateTeam(new Rng(+d), 'D', 'D', { strength: .55 }), 'base43'),
  offCall: { formation: FORMATION_BY_ID.ace_11, flip: flip === 'flip', kind: 'run', run: RUN_BY_ID[run], label: run },
  defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed: +seed });
const ps = playSideSign(sim, RUN_BY_ID[run]), dir = sim.attackDir('O');
const P = (a: Agent) => `(${((a.pos.x - sim.los) * dir).toFixed(1)},${((a.pos.y - sim.ballY) * ps).toFixed(1)})`;
const end = sim.slot('DE_S')!, rb = sim.slot('RB')!;
const ends = [...new Set(sim.defense.filter((x) => x.slot.startsWith('DE')))];
const show = sim.offense.filter((a) => ['RT', 'LT', 'Y'].includes(a.slot));
let seen = 0;
while (sim.phase === 'live' && sim.t < 4) {
  sim.tick();
  const evs = sim.events.slice(seen).filter((e) => e.type !== 'holding'); seen = sim.events.length;
  if (Math.round(sim.t * 100) % 10 === 0 || evs.length) {
    const eng = (x: Agent) => sim.engagements.filter((e) => e.defender === x).map((e) => `${e.blocker.slot}${e.helpers.length ? '+' + e.helpers.map((h) => h.slot).join('+') : ''}`).join(',') || '-';
    console.log(`t ${sim.t.toFixed(2)} RB ${P(rb)} v(${(rb.vel.x * dir).toFixed(1)},${(rb.vel.y * ps).toFixed(1)}) | ${ends.map((x) => `${x.slot} ${P(x)} by ${eng(x)} req(${((sim.intents[x.idx]?.vel.x ?? 0) * dir).toFixed(1)},${((sim.intents[x.idx]?.vel.y ?? 0) * ps).toFixed(1)})`).join(' | ')} | ${show.map((a) => `${a.slot} ${P(a)}`).join(' ')}`
      + (() => { const r = runReads.get(rb); return r ? ` | read key ${r.key?.slot ?? '-'} blk ${r.blocker?.slot ?? '-'} fit ${r.fitter?.slot ?? '-'} lev ${r.leverage?.toFixed(2)} ${r.answer ?? 'pressing'}${r.answer ? ' ' + r.why : ''} risks ${Object.entries(r.risks).map(([k, v]) => k + ' ' + (v as number).toFixed(1)).join(' ')}` : ''; })()
      + (evs.length ? ` | ${evs.map((e) => `${e.type}:${e.a !== undefined ? sim.agents[e.a].slot : ''}>${e.b !== undefined ? sim.agents[e.b].slot : ''}${e.note ? ' ' + e.note : ''}`).join('; ')}` : ''));
  }
}
void end;
