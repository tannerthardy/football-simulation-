/** Vertical drive blocks: in engaged run reps on a line defender, the
 * velocity each side requests and achieves along the attack direction
 * (+ = toward the defense's end zone), per 0.5 s window, single vs doubled,
 * on the lab's called looks. Does a driven-back defender ask to hold his
 * ground and lose it, or not ask? Observation only.
 * node --import tsx scripts/diag/gap/drive-push.ts [concepts=duo,iz,power] [seeds=77,1,2] */
import { CALLED_LOOKS, makeSim, rosters } from '../zone-lab/lab.js';

const concepts = (process.argv[2] ?? 'duo,iz,power').split(',');
const seeds = (process.argv[3] ?? '77,1,2').split(',').map(Number);
const R = rosters();
const W = [0.5, 1.0, 1.5, 2.0, 2.5];
type Acc = { n: number; bReq: number; dReq: number; ach: number; load: number };
const acc = new Map<string, Acc>();
for (const concept of concepts) for (const look of CALLED_LOOKS) for (const roster of Object.keys(R)) for (const seed of seeds) {
  const formation = concept === 'iz' ? 'ace_12' : 'i_pro_21';
  const sim = makeSim({ concept, dir: 'strong', formation, look, roster, seed }, R);
  const ad = sim.attackDir('O');
  while (sim.phase === 'live' && sim.t < 2.5) {
    (sim as unknown as { tick(): void }).tick();
    const w = W.find((x) => sim.t <= x + 1e-9); if (w === undefined) break;
    for (const e of sim.engagements) {
      if (e.type !== 'run' || !/^(DE|DT|NT)/.test(e.defender.slot)) continue;
      const bi = (sim as any).intents[e.blocker.idx]?.vel, di = (sim as any).intents[e.defender.idx]?.vel;
      if (!bi || !di) continue;
      const k = `${concept} <=${w.toFixed(1)} ${e.helpers.length ? 'double' : 'single'}`;
      const a = acc.get(k) ?? { n: 0, bReq: 0, dReq: 0, ach: 0, load: 0 };
      a.n++; a.bReq += bi.x * ad; a.dReq += di.x * ad; a.ach += e.defender.vel.x * ad;
      a.load += Math.hypot(e.hands?.normalForce ?? 0, e.hands?.tangentForce ?? 0);
      acc.set(k, a);
    }
  }
}
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
console.log('along the attack (+ = toward the defense): blocker request, defender request, defender achieved (yd/s); mean hand load (N)');
for (const [k, a] of [...acc].sort((p, q) => p[0].localeCompare(q[0])))
  console.log(`${k.padEnd(22)} n ${String(a.n).padStart(5)} | blocker ${f(a.bReq / a.n)} | defender asks ${f(a.dReq / a.n)} gets ${f(a.ach / a.n)} | load ${(a.load / a.n).toFixed(0)}`);
