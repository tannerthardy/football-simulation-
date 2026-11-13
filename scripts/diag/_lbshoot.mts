/** Zone runs: box backers (2.5-7 yd deep, within 6 yd of the ball) at/behind the LOS (<= 0.5 yd) at 1.2/1.5/2.0 s by play/back
 * side, share 'free'; first contact behind the LOS (<= -0.5 yd) by hitter group/side; yards. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const T = [1.2, 1.5, 2.0];
const A: Record<string, number[]> = {}; const H: Record<string, number> = {}; const Y: Record<string, number[]> = {}; const N: Record<string, number> = {}; const RT: Record<string, number> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const fam = /outside zone|wide zone/i.test(p.call) ? 'OZ' : /inside zone/i.test(p.call) ? 'IZ' : null; if (!fam) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team);
  const LB = sim.defense.filter((d: any) => d.slot.startsWith('LB') && (d.pos.x - sim.los) * d2 >= 2.5 && (d.pos.x - sim.los) * d2 <= 7 && Math.abs(d.pos.y - sim.ballY) <= 6);
  const y0 = new Map<any, number>(sim.defense.map((d: any) => [d, d.pos.y])); const snaps: any[] = []; let ho = -1, hy = 0, side = 0, first: any = null;
  const t0 = sim.tick.bind(sim); const ev0 = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => { if (!first && type === 'carrier_contact' && a && b) first = { d: b, x: (a.pos.x - sim.los) * d2 }; return ev0(type, a, b, note); };
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    for (const t of T) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) for (const l of LB) snaps.push({ rt: l.tags.has('run-through'), l, t, depth: (l.pos.x - sim.los) * d2, free: !l.engagement }); };
  const r = sim.run(); if (!side) continue; N[fam] = (N[fam] ?? 0) + 1; (Y[fam] ??= []).push(r.yards);
  for (const s of snaps) { const sd = ((y0.get(s.l) as number) - sim.ballY) * side > 0 ? 'play' : 'back'; const k = `${fam}|${sd}|${s.t}`; (A[k] ??= [0, 0, 0]); A[k][0]++; if (s.rt) RT[fam] = (RT[fam] ?? 0) + 1; if (s.depth <= .5) { A[k][1]++; if (s.free) A[k][2]++; } }
  if (first && first.x <= -0.5) { const d = first.d, g = /^(DE|DT|NT)/.test(d.slot) ? 'DL' : d.slot.startsWith('LB') ? 'LB' : 'DB'; const sd = ((y0.get(d) as number) - sim.ballY) * side > 0 ? 'play' : 'back'; H[`${fam}|${g} ${sd}`] = (H[`${fam}|${g} ${sd}`] ?? 0) + 1; }
}
for (const fam of ['OZ', 'IZ']) { if (!N[fam]) continue;
  for (const sd of ['play', 'back']) console.log(`${fam} ${sd}-side box LBs: ` + T.map(t => { const a = A[`${fam}|${sd}|${t}`] ?? [1, 0, 0]; return `${t}s at/behind LOS ${(100 * a[1] / a[0]).toFixed(0)}% (free ${(100 * a[2] / a[0]).toFixed(0)}%)`; }).join(' | '));
  const y = Y[fam]; console.log(`${fam} run-through tagged LB-samples ${RT[fam] ?? 0} | runs ${N[fam]} mean ${(y.reduce((s, x) => s + x, 0) / y.length).toFixed(2)} | backfield first contact by: ` + ['DL play', 'DL back', 'LB play', 'LB back', 'DB play', 'DB back'].map(k => `${k} ${(100 * (H[`${fam}|${k}`] ?? 0) / N[fam]).toFixed(1)}%`).join(' ')); }
