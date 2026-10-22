/** The play-side guard's first 0.8 s on zone runs: requested vs achieved
 * velocity (across = toward the play side, up = upfield) and his facing
 * relative to his travel, per 0.1 s, on the lab's called looks. Which part
 * of a slow lateral start is the request and which the body? Observation only.
 * node --import tsx scripts/diag/zone/guard-start.ts [concept=oz] [seeds=77,1] */
import { CALLED_LOOKS, makeSim, rosters } from '../zone-lab/lab.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';

const concept = process.argv[2] ?? 'oz';
const seeds = (process.argv[3] ?? '77,1').split(',').map(Number);
const R = rosters();
const bins = new Map<number, { n: number; rA: number; rU: number; aA: number; aU: number; off: number; spd: number }>();
for (const look of CALLED_LOOKS) for (const roster of Object.keys(R)) for (const seed of seeds) for (const dir of ['strong', 'weak'] as const) {
  const sim = makeSim({ concept, dir, formation: 'ace_12', look, roster, seed }, R);
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const g = sim.offense.find((a) => a.slot === (ps * (sim.offAlign.spots.RG!.pos.y - sim.ballY) > 0 ? 'RG' : 'LG'))!;
  while (sim.phase === 'live' && sim.t < .8) {
    (sim as unknown as { tick(): void }).tick();
    const req = (sim as any).intents[g.idx]?.vel; if (!req) continue;
    const b = Math.min(7, Math.floor(sim.t * 10 + 1e-9));
    const s = bins.get(b) ?? { n: 0, rA: 0, rU: 0, aA: 0, aU: 0, off: 0, spd: 0 };
    s.n++; s.rA += req.y * ps; s.rU += req.x * ad; s.aA += g.vel.y * ps; s.aU += g.vel.x * ad;
    const travel = Math.atan2(g.vel.y, g.vel.x), sp = Math.hypot(g.vel.x, g.vel.y);
    s.off += sp > .3 ? Math.abs(Math.atan2(Math.sin(g.facing - travel), Math.cos(g.facing - travel))) * 180 / Math.PI : 0;
    s.spd += sp; bins.set(b, s);
  }
}
console.log(`${concept}: play-side guard, mean per 0.1 s (yd/s): request across/up | achieved across/up | speed | facing off travel (deg)`);
for (const [b, s] of [...bins].sort((p, q) => p[0] - q[0]))
  console.log(`  ${(b / 10).toFixed(1)}-${((b + 1) / 10).toFixed(1)} s  ${(s.rA / s.n).toFixed(2)} / ${(s.rU / s.n).toFixed(2)} | ${(s.aA / s.n).toFixed(2)} / ${(s.aU / s.n).toFixed(2)} | ${(s.spd / s.n).toFixed(2)} | ${(s.off / s.n).toFixed(0)}`);
