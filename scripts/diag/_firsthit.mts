/** Designed runs: the first carrier contact (carrier_contact / tackle_wrap after the handoff): who (slot group), how far
 * behind or past the LOS, and the play's yards; plus box-LB depth quantiles at the snap. JSON-free summary. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); let n = 0, deep = 0, deepLB = 0, deepStop = 0, stops = 0; const depth: number[] = []; const by: Record<string, number> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const cy = OL.reduce((s: number, o: any) => s + o.pos.y, 0) / 5;
  for (const d of sim.defense) { const x = (d.pos.x - los) * d2; if (/LB/.test(d.slot) && x >= 1.6 && x <= 7 && Math.abs(d.pos.y - cy) <= 6) depth.push(x); }
  let first: any = null; const e0 = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => { if (!first && (type === 'carrier_contact' || type === 'tackle_wrap') && sim.carrier && sim.carrier !== sim.qb && a?.team !== sim.offense[0].team)
    first = { who: a?.slot ?? '?', x: (sim.carrier.pos.x - los) * d2 }; return e0(type, a, b, note); };
  const r = sim.run(); n++; const y = r?.yards ?? 0; if (y <= 0) stops++;
  if (first && first.x < -1) { deep++; if (y <= 0) deepStop++; const g = /LB/.test(first.who) ? 'LB' : /^(DE|DT|NT)/.test(first.who) ? 'DL' : 'DB'; by[g] = (by[g] ?? 0) + 1; if (g === 'LB') deepLB++; }
}
depth.sort((a, b) => a - b);
console.log(`runs ${n} | box LB depth p10/25/50/75 ${[.1, .25, .5, .75].map(f => depth[Math.floor(f * depth.length)].toFixed(2)).join('/')} | stops <=0 ${(100 * stops / n).toFixed(0)}% | first contact >1 yd behind LOS ${(100 * deep / n).toFixed(0)}% (of those <=0 ${(100 * deepStop / Math.max(1, deep)).toFixed(0)}%) by ${Object.entries(by).map(([k, v]) => `${k} ${(100 * v / Math.max(1, deep)).toFixed(0)}%`).join(' ')}`);
