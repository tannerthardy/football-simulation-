/** Engaged line defenders on inside runs: lateral velocity toward the ball
 * carrier (or the back before the handoff) that the defender requests and
 * achieves, and the blocker's request across him, per 0.3 s window, on the
 * lab's called looks. Do our blocked linemen ask to squeeze the hole and get
 * pushed out, or not ask? Observation only.
 * node --import tsx scripts/diag/gap/squeeze.ts [concepts=duo,power,iz] [seeds=77,1] */
import { CALLED_LOOKS, makeSim, rosters } from '../zone-lab/lab.js';

const concepts = (process.argv[2] ?? 'duo,power,iz').split(',');
const seeds = (process.argv[3] ?? '77,1').split(',').map(Number);
const R = rosters();
const W = [0.6, 0.9, 1.2, 1.5];
type Acc = { n: number; dReq: number; dAch: number; bReq: number; tech: Record<string, number> };
const acc = new Map<string, Acc>();
for (const concept of concepts) for (const look of CALLED_LOOKS) for (const roster of Object.keys(R)) for (const seed of seeds) {
  const formation = concept === 'iz' ? 'ace_12' : 'i_pro_21';
  const sim = makeSim({ concept, dir: 'strong', formation, look, roster, seed }, R);
  const rb = sim.offense.find((a) => a.slot === 'RB')!;
  while (sim.phase === 'live' && sim.t < 1.5) {
    (sim as unknown as { tick(): void }).tick();
    const w = W.find((x) => sim.t <= x + 1e-9); if (w === undefined) break;
    const c = sim.carrier && sim.carrier !== sim.qb ? sim.carrier : rb;
    for (const e of sim.engagements) {
      if (e.type !== 'run' || !/^(DE|DT|NT)/.test(e.defender.slot)) continue;
      const d = e.defender, b = e.blocker;
      const di = (sim as any).intents[d.idx]?.vel, bi = (sim as any).intents[b.idx]?.vel;
      if (!di || !bi) continue;
      const toward = Math.sign(c.pos.y - d.pos.y) || 1;
      const k = `${concept} <=${w.toFixed(1)}`;
      const a = acc.get(k) ?? { n: 0, dReq: 0, dAch: 0, bReq: 0, tech: {} };
      a.n++; a.dReq += di.y * toward; a.dAch += d.vel.y * toward; a.bReq += bi.y * toward;
      const t = d.runFit?.technique ?? 'none'; a.tech[t] = (a.tech[t] ?? 0) + 1;
      acc.set(k, a);
    }
  }
}
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
console.log('lateral toward the carrier (yd/s): defender requests | achieves | blocker requests | defender technique share');
for (const [k, a] of [...acc].sort((p, q) => p[0].localeCompare(q[0])))
  console.log(`${k.padEnd(14)} n ${String(a.n).padStart(5)} | ${f(a.dReq / a.n)} | ${f(a.dAch / a.n)} | ${f(a.bReq / a.n)} | ${Object.entries(a.tech).map(([t, v]) => `${t} ${Math.round(100 * v / a.n)}%`).join(' ')}`);
