/** Restaged plays: box LBs (1.6-7 yd deep within 6 yd of the OL centre) who rush (past the LOS by 1.5 s) vs not, depth at the snap. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const B: Record<string, number[]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const cy = OL.reduce((s: number, o: any) => s + o.pos.y, 0) / 5;
  const LB = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return /LB/.test(d.slot) && x >= 1.6 && x <= 7 && Math.abs(d.pos.y - cy) <= 6; });
  const x0 = new Map<any, number>(LB.map((l: any) => [l, (l.pos.x - los) * d2])); let at: any = null; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (!at && sim.t >= 1.5 - 1e-6) at = new Map<any, number>(LB.map((l: any) => [l, (l.pos.x - los) * d2])); };
  sim.run(); if (!at) continue;
  for (const l of LB) (B[`${p.pass ? 'pass' : 'run'} ${at.get(l)! < 0 ? 'rush' : 'no rush'} ${l.behavior?.kind}`] ??= []).push(x0.get(l)!);
}
for (const [k, v] of Object.entries(B).sort()) { v.sort((a, b) => a - b); console.log(`sim ${k}: n ${v.length} depth p10/25/50/75 ${[.1, .25, .5, .75].map(f => v[Math.floor(f * v.length)].toFixed(2)).join('/')}`); }
