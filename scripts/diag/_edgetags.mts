/** OZ/WZ play-side edge (DL lined up > 4 yd play side of the OL centre): which edge-fit tags he carries by 0.6 s, and his
 * lateral request at 0.4/0.6 s per tag. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const R: any[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team);
  const ol = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)).filter(Boolean); const cy = ol.reduce((s: number, o: any) => s + o.pos.y, 0) / ol.length;
  const DL = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot) && Math.abs((d.pos.x - sim.los) * d2) <= 1.6);
  const y0 = new Map<any, number>(DL.map((d: any) => [d, d.pos.y])); const at: any = new Map(); let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    for (const d of DL) for (const t of [.4, .6]) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) { const m = at.get(d) ?? {}; m[t] = { req: sim.intents[d.idx]?.vel.y ?? 0, tags: [...d.tags].filter((x: string) => /fit-|squeeze|key-|edge|replace|contain|tell|kick/.test(x)).sort().join(','), beh: d.behavior?.kind, job: d.runFit?.kind }; at.set(d, m); } };
  sim.run(); if (!side) continue;
  for (const d of DL) { const off = ((y0.get(d) as number) - cy) * side; if (off <= 4) continue; const m = at.get(d); if (!m?.[.6]) continue; R.push({ tags: m[.6].tags || '-', job: m[.6].job, r4: (m[.4]?.req ?? 0) * side, r6: m[.6].req * side }); }
}
const q = (v: number[]) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
const G: Record<string, any[]> = {}; for (const r of R) (G[`${r.job} | ${r.tags}`] ??= []).push(r);
console.log(`play-side edges n ${R.length}`); for (const [k, v] of Object.entries(G).sort((a, b) => b[1].length - a[1].length).slice(0, 10)) console.log(`${String(v.length).padStart(4)}  ${k.padEnd(60)} req toward play 0.4 ${q(v.map(x => x.r4))} 0.6 ${q(v.map(x => x.r6))}`);
