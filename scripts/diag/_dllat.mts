/** OZ/WZ DL lateral toward the play side by snap alignment bucket (relative to the OL centre, toward the play): request vs
 * achieved at 0.3/0.5/0.75/1.0 s, engaged vs free, and the share of engaged samples tagged zone-run. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const T = [.3, .5, .75, 1.0]; const R: Record<string, any[]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team);
  const ol = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)).filter(Boolean); const cy = ol.reduce((s: number, o: any) => s + o.pos.y, 0) / ol.length;
  const DL = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot) && Math.abs((d.pos.x - sim.los) * d2) <= 1.6);
  const y0 = new Map<any, number>(DL.map((d: any) => [d, d.pos.y])); const snaps: any[] = []; let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    for (const t of T) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) for (const d of DL) snaps.push({ d, t, eng: !!d.engagement, req: sim.intents[d.idx]?.vel.y ?? 0, v: d.vel.y, race: d.tags.has('zone-run') }); };
  sim.run(); if (!side) continue;
  for (const s of snaps) { const off = ((y0.get(s.d) as number) - cy) * side; const b = off > 4 ? 'PS outside >4' : off > 1 ? 'PS inside 1-4' : off >= -1 ? 'nose +-1' : off >= -4 ? 'BS inside' : 'BS outside';
    (R[`${b}|${s.t}`] ??= []).push({ eng: s.eng, req: s.req * side, v: s.v * side, race: s.race }); }
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
for (const b of ['PS outside >4', 'PS inside 1-4', 'nose +-1', 'BS inside', 'BS outside']) console.log(`${b.padEnd(14)} ` + T.map(t => { const S = R[`${b}|${t}`] ?? []; const E = S.filter(s => s.eng);
  return `${t}s req ${q(S.map(s => s.req))} got ${q(S.map(s => s.v))} | eng ${E.length}/${S.length} req ${q(E.map(s => s.req))} got ${q(E.map(s => s.v))} race ${(100 * E.filter(s => s.race).length / Math.max(1, E.length)).toFixed(0)}%`; }).join(' || '));
