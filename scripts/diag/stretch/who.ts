/** One player's picture through a lab case (observation only): position past
 * the line and from the ball, velocity, the request his behavior made, his
 * run-fit job, engagement partner, and the carrier's position, every N ticks.
 * Flags from the environment.
 * node --import tsx scripts/diag/stretch/who.ts CASE_ID SLOT [FROM=0] [TO=4] [EVERY=3] */
import { makeSim, rosters, type LabCase } from '../zone-lab/lab.js';
const [id, slot, from = '0', to = '4', every = '3'] = process.argv.slice(2);
const [concept, dir, formation, look, roster, seed] = id.split('/');
const sim = makeSim({ concept, dir: dir as 'strong' | 'weak', look, roster, seed: Number(seed), formation } as LabCase, rosters());
const a = sim.agents.find(x => x.slot === slot && x.team === 'D') ?? sim.agents.find(x => x.slot === slot)!;
const sgn = sim.attackDir('O');
const p = (o: { pos: { x: number; y: number } }) => `${((o.pos.x - sim.los) * sgn).toFixed(1).padStart(5)},${(o.pos.y - sim.ballY).toFixed(1).padStart(6)}`;
let k = 0;
while (sim.phase === 'live' && sim.t < Number(to)) {
  sim.tick();
  if (k++ % Number(every) || sim.t < Number(from)) continue;
  const cmd = (sim as any).cmds[a.idx], e = a.engagement as any, it = (sim as any).intents[a.idx];
  const ideg = it?.facing === undefined ? "-" : Math.round(((it.facing - (sgn > 0 ? 0 : Math.PI)) * 180 / Math.PI + 540) % 360 - 180);
  const partner = e ? (e.blocker === a ? e.defender : e.blocker) : null;
  const c = sim.carrier && sim.carrier.team === 'O' ? sim.carrier : sim.slot('RB')!;
  const job = a.runFit ? `${a.runFit.kind}/${a.runFit.gap}/${a.runFit.side}/${a.runFit.edge ?? ''}` : (a.behavior as any).plan?.kind ?? '';
  const fdeg = Math.round(((a.facing - (sgn > 0 ? 0 : Math.PI)) * 180 / Math.PI + 540) % 360 - 180);
  console.log(`t ${sim.t.toFixed(2)} ${slot} ${p(a)} f ${String(fdeg).padStart(4)} v ${a.vel.x.toFixed(1).padStart(4)},${a.vel.y.toFixed(1).padStart(5)} req ${cmd.vel.x.toFixed(1).padStart(4)},${cmd.vel.y.toFixed(1).padStart(5)} int ${it.vel.x.toFixed(1)},${it.vel.y.toFixed(1)} if ${ideg} ${a.behavior.kind}/${job} ${partner ? 'ENG ' + partner.slot + ' ' + p(partner) : 'free'} | ${c.slot} ${p(c)} v ${c.vel.x.toFixed(1)},${c.vel.y.toFixed(1)}${sim.carrier === c ? '' : ' (no ball)'}`);
}
console.log(`gain ${sim.buildResult().offenseYards.toFixed(1)}`);
