/** The back's requested vs achieved speed around the handoff, and his
 * distance to the QB (observation only).
 * node --import tsx scripts/diag/stretch/meshspeed.ts iz strong over3 pair11 77 [formation] */
import { makeSim, rosters } from '../zone-lab/lab.js';
const [concept, dir, look, roster, seedS] = process.argv.slice(2);
const sim = makeSim({ concept, dir: dir as any, look, roster, seed: +seedS, formation: process.argv[7] ?? 'ace_12' }, rosters());
const rb = sim.slot('RB')!, up = sim.attackDir('O');
const cmds: Record<number, any> = {};
const upd = rb.behavior.update.bind(rb.behavior);
let lastBehavior = rb.behavior;
while (sim.phase === 'live' && sim.t < 2.4) {
  if (rb.behavior !== lastBehavior) lastBehavior = rb.behavior;
  sim.tick();
  const req = sim.intents[rb.idx]?.vel ?? { x: 0, y: 0 };
  const dq = Math.hypot(rb.pos.x - sim.qb.pos.x, rb.pos.y - sim.qb.pos.y);
  console.log(`${sim.t.toFixed(2)} ${rb.behavior.kind.padEnd(8)} req ${Math.hypot(req.x, req.y).toFixed(2)} (${(req.x * up).toFixed(2)},${req.y.toFixed(2)}) speed ${Math.hypot(rb.vel.x, rb.vel.y).toFixed(2)} depth ${((rb.pos.x - sim.los) * up).toFixed(2)} toQB ${dq.toFixed(2)} qbSpeed ${Math.hypot(sim.qb.vel.x, sim.qb.vel.y).toFixed(2)} ${sim.handoffAt >= 0 ? 'HANDED@' + sim.handoffAt.toFixed(2) : ''}`);
}
