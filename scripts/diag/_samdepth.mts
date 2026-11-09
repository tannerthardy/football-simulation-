/** Same operator as rgtools/samdepth.py on restaged runs: defenders in LB slots aligned over an attached TE/wing (an
 * offensive non-OL, non-QB within 1.0 yd laterally, within 3 yd of the LOS, outside the tackles), outside the tackles
 * with no TE, or inside; depth bands at the snap. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const R: Record<string, number[]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const ys = OL.map((o: any) => o.pos.y).sort((a: number, b: number) => a - b); const cy = ys.reduce((a: number, b: number) => a + b, 0) / 5;
  const att = sim.offense.filter((o: any) => !OL.includes(o) && o !== sim.qb && Math.abs((o.pos.x - los) * d2) <= 3 && (o.pos.y < ys[0] - .5 || o.pos.y > ys[4] + .5) && Math.min(Math.abs(o.pos.y - ys[0]), Math.abs(o.pos.y - ys[4])) < 3.5);
  for (const d of sim.defense) { if (!/LB/.test(d.slot)) continue; const x = (d.pos.x - los) * d2; if (x < 0 || x > 7 || Math.abs(d.pos.y - cy) > 8) continue;
    const over = att.some((t: any) => Math.abs(t.pos.y - d.pos.y) <= 1), out = d.pos.y < ys[0] - .5 || d.pos.y > ys[4] + .5;
    (R[over ? 'over attached TE/wing' : out ? 'outside tackles, no TE' : 'inside tackles'] ??= []).push(x); }
}
for (const [k, v] of Object.entries(R).sort()) { v.sort((a, b) => a - b); const n = v.length; const band = (a: number, b: number) => Math.round(100 * v.filter(x => x >= a && x < b).length / n);
  console.log(`sim run ${k}: n ${n} depth p10/25/50/75/90 ${[.1, .25, .5, .75, .9].map(f => v[Math.floor(f * n)].toFixed(2)).join('/')} | bands <1.6/1.6-2.5/2.5-3.5/3.5+ ${band(-9, 1.6)}/${band(1.6, 2.5)}/${band(2.5, 3.5)}/${band(3.5, 99)}%`); }
