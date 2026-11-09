/** Zone-run DL displacement from the snap for rgtools/izdepth.py: DL within 1.6 yd of the LOS and 4 yd of the OL
 * centre; at 0.4/0.6/1.0/1.5/2.0 s, lateral toward the play side and depth change (+ = into the backfield). JSON lines.
 * usage: <capDir> <out.jsonl> <seed>... */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, out, ...seeds] = process.argv.slice(2); const T = [.4, .6, 1, 1.5, 2]; const lines: string[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone|inside zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const by = OL.reduce((s: number, o: any) => s + o.pos.y, 0) / 5;
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) <= 1.6 && Math.abs(d.pos.y - by) <= 4);
  const at = new Map<any, any[]>([...DL, ...OL].map((d: any) => [d, [{ ...d.pos }]])); let ho = -1, hy = 0, side = 0, k = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    if (k < T.length && sim.t >= T[k] - 1e-6) { for (const [d, L] of at) L.push(sim.ended ? null : { ...d.pos }); k++; } };
  sim.run(); if (!side) continue;
  for (const [d, L] of at) { const p0 = L[0]; lines.push(JSON.stringify({ fam: (/inside/i.test(p.call) ? 'IZ' : 'OZ') + (OL.includes(d) ? ' OL' : ''),
    lat: L.slice(1).map((q: any) => q ? (q.y - p0.y) * side : null), dep: L.slice(1).map((q: any) => q ? -(q.x - p0.x) * d2 : null) })); }
}
writeFileSync(out, lines.join('\n') + '\n');
