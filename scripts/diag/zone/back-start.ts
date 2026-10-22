/** The running back's first 2 s on zone runs, under center: requested vs
 * achieved velocity (across = toward the play side, up = upfield), speed and
 * who holds the ball, per 0.2 s, on the lab's called looks. Is a slow mesh
 * the back's request, his body, or the exchange? Observation only.
 * node --import tsx scripts/diag/zone/back-start.ts [concept=oz] [seeds=77,1] */
import { CALLED_LOOKS, makeSim, rosters } from '../zone-lab/lab.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';

const concept = process.argv[2] ?? 'oz';
const seeds = (process.argv[3] ?? '77,1').split(',').map(Number);
const R = rosters();
const bins = new Map<number, { n: number; rA: number; rU: number; aA: number; aU: number; spd: number; req: number; held: number; kind: Record<string, number> }>();
for (const look of CALLED_LOOKS) for (const roster of Object.keys(R)) for (const seed of seeds) for (const dir of ['strong', 'weak'] as const) {
  const sim = makeSim({ concept, dir, formation: 'ace_12', look, roster, seed }, R);
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const rb = sim.offense.find((a) => a.slot === 'RB')!;
  while (sim.phase === 'live' && sim.t < 2) {
    (sim as unknown as { tick(): void }).tick();
    const req = (sim as any).intents[rb.idx]?.vel; if (!req) continue;
    const b = Math.min(9, Math.floor(sim.t * 5 + 1e-9));
    const s = bins.get(b) ?? { n: 0, rA: 0, rU: 0, aA: 0, aU: 0, spd: 0, req: 0, held: 0, kind: {} };
    s.n++; s.rA += req.y * ps; s.rU += req.x * ad; s.aA += rb.vel.y * ps; s.aU += rb.vel.x * ad;
    s.spd += Math.hypot(rb.vel.x, rb.vel.y); s.req += Math.hypot(req.x, req.y);
    if (sim.carrier === rb) s.held++;
    s.kind[rb.behavior.kind] = (s.kind[rb.behavior.kind] ?? 0) + 1;
    bins.set(b, s);
  }
}
console.log(`${concept}: running back, mean per 0.2 s (yd/s): request across/up |req| | achieved across/up speed | has the ball | behavior`);
for (const [b, s] of [...bins].sort((p, q) => p[0] - q[0]))
  console.log(`  ${(b / 5).toFixed(1)}-${((b + 1) / 5).toFixed(1)} s  ${(s.rA / s.n).toFixed(2)} / ${(s.rU / s.n).toFixed(2)} ${(s.req / s.n).toFixed(2)} | ${(s.aA / s.n).toFixed(2)} / ${(s.aU / s.n).toFixed(2)} ${(s.spd / s.n).toFixed(2)} | ${(100 * s.held / s.n).toFixed(0)}% | ${Object.entries(s.kind).map(([k, v]) => `${k} ${Math.round(100 * v / s.n)}%`).join(' ')}`);
