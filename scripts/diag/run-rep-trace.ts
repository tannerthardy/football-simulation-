/** Trace engagements on one designed run (development aid). node --import tsx scripts/diag/run-rep-trace.ts [seed] [run] */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 3), run = process.argv[3] ?? 'iz_strong';
const sim = new PlaySim({
  offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
  defense: pickDefense(generateTeam(new Rng(8), 'D', 'DEF'), 'base43'),
  offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID[run], label: 'lab' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
});
const tick = sim as unknown as { tick(): void };
while (sim.phase === 'live' && sim.t < 3) {
  const n = sim.events.length;
  tick.tick();
  const reps = sim.engagements.map((e) => {
    const b = e.blocker, d = e.defender;
    return `${b.slot}x${d.slot}[phi${e.phi.toFixed(2)} c${e.control.toFixed(1)} sep${Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y).toFixed(2)} vB${b.vel.x.toFixed(1)},${b.vel.y.toFixed(1)} vD${d.vel.x.toFixed(1)},${d.vel.y.toFixed(1)} drv${e.drive ? e.drive.x.toFixed(2) + ',' + e.drive.y.toFixed(2) : '-'} st${e.sealTarget.toFixed(2)}]`;
  }).join(' ');
  const ev = sim.events.slice(n).filter((e) => e.type !== 'read').map((e) => `${e.type}:${e.a !== undefined ? sim.agents[e.a].slot : ''}${e.b !== undefined ? '/' + sim.agents[e.b].slot : ''}${e.note ? '(' + e.note + ')' : ''}`).join(' ');
  console.log(sim.t.toFixed(2), reps, '|', ev);
}
console.log(sim.outcome, sim.endSpot);
