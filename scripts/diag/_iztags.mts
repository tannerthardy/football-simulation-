/** IZ DL: share of DL ever tagged with each first-step/engaged branch, and their lateral displacement at 1.5 s by tag. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const R: { tags: Set<string>; lat: number }[] = [];
const WATCH = ['key-step', 'tell-step', 'work-across', 'zone-run', 'squeeze'];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/inside zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const by = OL.reduce((s: number, o: any) => s + o.pos.y, 0) / 5;
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) <= 1.6 && Math.abs(d.pos.y - by) <= 4);
  const y0 = new Map<any, number>(DL.map((d: any) => [d, d.pos.y as number])), y15 = new Map<any, number>(), seen = new Map<any, Set<string>>(DL.map((d: any) => [d, new Set<string>()]));
  let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    if (sim.t <= 1.5) for (const d of DL) for (const t of WATCH) if (d.tags.has(t)) seen.get(d)!.add(t);
    if (!y15.size && sim.t >= 1.5 - 1e-6) for (const d of DL) y15.set(d, d.pos.y); };
  sim.run(); if (!side || !y15.size) continue;
  for (const d of DL) R.push({ tags: seen.get(d)!, lat: (y15.get(d)! - y0.get(d)!) * side });
}
const md = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2) : '-';
console.log(`IZ DL n ${R.length} lat@1.5 p50 ${md(R.map(r => r.lat))}`);
for (const t of WATCH) { const G = R.filter(r => r.tags.has(t)), N = R.filter(r => !r.tags.has(t)); console.log(`  ${t}: ${(100 * G.length / R.length).toFixed(0)}% lat ${md(G.map(r => r.lat))} | without ${md(N.map(r => r.lat))}`); }
