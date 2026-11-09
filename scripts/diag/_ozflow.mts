/** Outside/wide zone: DL within 1.6 yd of the LOS and 4 yd of the ball at the snap. Lateral speed toward the play side
 * (carrier's lateral direction handoff -> +1 s), requested (sim.intents) vs achieved, at 0.3/0.6/0.9/1.2/1.5 s, split by
 * engaged or not at that time. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const T = [.3, .6, .9, 1.2, 1.5]; const R: Record<string, { req: number[]; v: number[]; bv: number[] }> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone|stretch|toss/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const dir2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * dir2) < 1.6 && Math.abs(d.pos.y - sim.ballY) < 4);
  const snaps: any[] = []; let ho = -1, hy = 0, cy1: number | null = null; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier;
    if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; }
    if (ho >= 0 && cy1 === null && sim.t >= ho + 1 && c) cy1 = c.pos.y;
    for (const t of T) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) for (const d of DL) snaps.push({ t, tags: [...d.tags].filter((x: string) => /shed|work|squeeze|zone-run|fight|stack|fit-/.test(x)).sort().join(','), eng: !!d.engagement, req: sim.intents[d.idx]?.vel.y ?? 0, v: d.vel.y, bv: d.engagement ? d.engagement.blocker.vel.y : NaN }); };
  sim.run(); if (cy1 === null) continue; const side = Math.sign(cy1 - hy) || 1;
  const TG: Record<string, number> = {}; for (const s of snaps) if (s.eng && s.t >= .9) TG[s.tags || '-'] = (TG[s.tags || '-'] ?? 0) + 1;
  ((globalThis as any).TG ??= []).push(TG);
  for (const s of snaps) { const k = `${s.t}|${s.eng ? 'engaged' : 'free'}`; (R[k] ??= { req: [], v: [], bv: [] }); R[k].req.push(s.req * side); R[k].v.push(s.v * side); if (!isNaN(s.bv)) R[k].bv.push(s.bv * side); }
}
const q = (v: number[]) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)] : NaN; };
for (const t of T) { const row = ['engaged', 'free'].map(e => { const r = R[`${t}|${e}`]; return r ? `${e} n ${r.v.length} req ${q(r.req).toFixed(2)} achieved ${q(r.v).toFixed(2)}${e === 'engaged' ? ` blocker ${q(r.bv).toFixed(2)}` : ''}` : `${e} -`; });
  const all = [...(R[`${t}|engaged`]?.v ?? []), ...(R[`${t}|free`]?.v ?? [])]; console.log(`t ${t} | all achieved ${q(all).toFixed(2)} | ${row.join(' | ')}`); }
const AG: Record<string, number> = {}; for (const m of (globalThis as any).TG ?? []) for (const [k, v] of Object.entries(m)) AG[k] = (AG[k] ?? 0) + (v as number);
console.log('engaged tags t>=0.9', JSON.stringify(Object.entries(AG).sort((a, b) => b[1] - a[1]).slice(0, 12)));
