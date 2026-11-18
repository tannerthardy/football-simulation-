/** The protecting back in the quarters-trips-rules protection control (gun_spread_10 vs cover4, seed 1): per 0.2 s his depth, velocity, assignment and the nearest rusher, against the QB's depth. Read-only.
 *   [BACKFIELD_DEPTH=0] [PASS_KICK=0] node --import tsx scripts/diag/body/back-pro.ts */
import { sceneSim } from '../../../src/lab/coverage-scene.js';
const sim: any = sceneSim({ formation: 'gun_spread_10', coverage: 'cover4', strong: { 1: 'go', 2: 'slant' }, weak: { 1: 'go', 2: 'seam' }, until: 4.0, seed: 1 } as never);
const dir = sim.attackDir('O'), rows: string[] = [];
const back = sim.agents.find((a: any) => a.team === 'O' && a.slot === 'RB'), qb = sim.qb;
while (sim.phase === 'live' && sim.t < 4.0 && sim.throwAt < 0) {
  sim.tick();
  if (Math.abs(sim.t * 5 - Math.round(sim.t * 5)) > 1e-6) continue;
  const rel = (a: any) => ((a.pos.x - sim.los) * dir);
  let near: any = null, dn = 99; for (const d of sim.defense) { const q = Math.hypot(d.pos.x - back.pos.x, d.pos.y - back.pos.y); if (q < dn) { dn = q; near = d; } }
  const asg = back.behavior?.recordedTarget?.(back);
  const it = sim.intents[back.idx];
  rows.push(`t=${sim.t.toFixed(1)} back depth ${rel(back).toFixed(1)} v(${(back.vel.x * dir).toFixed(1)},${back.vel.y.toFixed(1)}) req(${((it?.vel.x ?? 0) * dir).toFixed(1)},${(it?.vel.y ?? 0).toFixed(1)}) kind=${back.behavior?.kind} assigned=${asg !== null && asg !== undefined ? sim.agents[asg]?.slot : '-'} eng=${back.engagement ? back.engagement.defender.slot : '-'} | QB depth ${rel(qb).toFixed(1)} | nearest D ${near.slot} ${dn.toFixed(1)} at depth ${rel(near).toFixed(1)} v ${(near.vel.x * dir).toFixed(1)} | tags ${[...back.tags].join(',')}`);
}
console.log(rows.join('\n'));
