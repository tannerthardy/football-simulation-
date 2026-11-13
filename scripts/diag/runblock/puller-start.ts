/** A puller's first second, tick by tick: requested and achieved velocity,
 * waypoint index, depth relative to the line, and the reaction gate. Observation only.
 * node --import tsx scripts/diag/runblock/puller-start.ts [run=power] [seed=3] [flip=0]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';

const run = process.argv[2] ?? 'power', seed = Number(process.argv[3] ?? 3), flip = process.argv[4] === '1';
const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
  defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
  offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'over' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
const side = playSideSign(sim, RUN_BY_ID[run]);
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
let pullers = sim.offense.filter(() => false);
while (sim.phase === 'live' && sim.t < 1.2) {
  (sim as unknown as { tick(): void }).tick();
  if (!pullers.length) pullers = sim.offense.filter((a) => (a.behavior as any).plan?.kind === 'pull');
  for (const p of pullers) {
    const r = (sim as any).intents[p.idx].vel, b = p.behavior as any;
    console.log(`t ${sim.t.toFixed(2)} ${p.slot} ready ${p.snapReadyAt.toFixed(2)} wp ${b.pullIdx} | req play ${f(r.y * side)} x ${f(r.x)} | ach play ${f(p.vel.y * side)} x ${f(p.vel.x)} | depth ${f(p.pos.x - sim.los)} lat ${f((p.pos.y - (sim.offAlign.spots as any)[p.slot].pos.y) * side)} | facing ${(p.facing * 57.3).toFixed(0)}`);
  }
}
