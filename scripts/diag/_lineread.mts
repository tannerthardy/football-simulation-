/** OZ/IZ: when does lineRead fire for box backers, and why not: per sampled tick, the backer's line picture: #OL seen
 * stepping >0.7 each way, any OL seen 'setting' (vel.x*dir < -1). usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
import { lineRead } from '../../src/sim/run-fits.js';
import { linePicture } from '../../src/sim/live-gaps.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const T = [.3, .45, .6, .75, .9]; const R: Record<string, any[]> = {}; const fire: Record<string, number[]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const fam = /outside zone|wide zone/i.test(p.call) ? 'OZ' : /inside zone/i.test(p.call) ? 'IZ' : null; if (!fam) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const LB = sim.defense.filter((d: any) => d.slot.startsWith('LB') && (d.pos.x - sim.los) * d2 >= 2.5 && (d.pos.x - sim.los) * d2 <= 7);
  const first = new Map<any, number>(); const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (sim.t > 1.0) return;
    for (const l of LB) {
      const line = linePicture(sim, l).surface.filter((b: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(b.agent.slot));
      const pos = line.filter((b: any) => b.seen.vel.y > .7).length, neg = line.filter((b: any) => b.seen.vel.y < -.7).length;
      const setting = line.some((b: any) => b.seen.vel.x * d2 < -1);
      for (const t of T) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) (R[`${fam}|${t}`] ??= []).push({ n: line.length, best: Math.max(pos, neg), setting });
      if (!first.has(l) && line.length === 5 && !setting && Math.max(pos, neg) >= 4) first.set(l, sim.t);
    } };
  sim.run(); for (const l of LB) (fire[fam] ??= []).push(first.get(l) ?? NaN);
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
for (const fam of ['OZ', 'IZ']) { if (!fire[fam]) continue;
  console.log(`${fam}: line read condition first met p50 ${q(fire[fam])} s, never by 1.0 s ${(100 * fire[fam].filter(x => !Number.isFinite(x)).length / fire[fam].length).toFixed(0)}%`);
  for (const t of T) { const S = R[`${fam}|${t}`] ?? []; if (!S.length) continue;
    console.log(`   t ${t}: sees all 5 OL ${(100 * S.filter(s => s.n === 5).length / S.length).toFixed(0)}% | max OL stepping one way p50 ${q(S.map(s => s.best))} (>=4: ${(100 * S.filter(s => s.best >= 4).length / S.length).toFixed(0)}%) | an OL 'setting' ${(100 * S.filter(s => s.setting).length / S.length).toFixed(0)}%`); } }
