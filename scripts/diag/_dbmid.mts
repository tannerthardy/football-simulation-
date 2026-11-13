/** Designed runs: DBs 5-10 yd deep at the snap. At 1.0 s: slot, behavior, his read (recog), his request and achieved
 * downhill speed (+ = toward the LOS), and his man/zone target's downhill motion. Grouped medians. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const G: Record<string, { q: number[]; a: number[]; n: number }> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const DB = sim.defense.filter((d: any) => /^(CB|FS|SS|NB)/.test(d.slot) && (d.pos.x - los) * d2 >= 5 && (d.pos.x - los) * d2 < 10);
  let done = false; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (done || sim.t < 1.0) return; done = true;
    for (const d of DB) { const q = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
      for (const k of [`${d.slot.replace(/_.*/, '')} ${d.behavior?.kind} read=${d.recog?.read ?? '-'}`, `ALL read=${d.recog?.read ?? '-'}`, `ALL beh=${d.behavior?.kind}`]) {
        const g = (G[k] ??= { q: [], a: [], n: 0 }); g.n++; g.q.push(-q.x * d2); g.a.push(-d.vel.x * d2); } } };
  sim.run();
}
const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
for (const k of Object.keys(G).sort()) if (G[k].n >= 15) console.log(`${k}: n ${G[k].n} downhill request ${md(G[k].q)} achieved ${md(G[k].a)}`);
