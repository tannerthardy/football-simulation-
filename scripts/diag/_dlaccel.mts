/** Zone-run DL: from his first lateral request > 0.5 to the play side, requested vs achieved lateral (toward the
 * request) at +0.05/0.1/0.15/0.2/0.3 s, his posture, facing, and whether engaged. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const W = [0, .05, .1, .15, .2, .3]; const A: number[][] = W.map(() => []), Q: number[][] = W.map(() => []), E: number[] = W.map(() => 0), Up: number[][] = W.map(() => []);
let n = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) < 1.6 && Math.abs(d.pos.y - sim.ballY) < 4);
  const st = new Map<any, any>(); const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (sim.t > 1.2) return;
    for (const d of DL) { const r = sim.intents[d.idx]?.vel; if (!r) continue; let s = st.get(d);
      if (!s && Math.abs(r.y) > .5 && sim.t < .8) { s = { t: sim.t, side: Math.sign(r.y), k: 0 }; st.set(d, s); n++; }
      if (!s) continue; while (s.k < W.length && sim.t >= s.t + W[s.k] - 1e-6) { A[s.k].push(d.vel.y * s.side); Q[s.k].push(r.y * s.side); Up[s.k].push(-d.vel.x * d2); if (d.engagement) E[s.k]++; s.k++; } } };
  sim.run();
}
const md = (v: number[]) => { const z = [...v].sort((a, b) => a - b); return z[z.length >> 1]?.toFixed(2); };
console.log(`DL n ${n} | after first lateral request: ` + W.map((w, k) => `+${w}s req ${md(Q[k])} got ${md(A[k])} up ${md(Up[k])} eng ${(100 * E[k] / A[k].length).toFixed(0)}%`).join(' | '));
