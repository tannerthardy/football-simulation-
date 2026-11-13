/** IZ box LBs (1.6-7 yd deep within 6 yd of the OL centre): lateral displacement toward the play side (play side from the
 * OL's mean lateral motion over 1 s, Run Game's convention) at 1.0 / 1.5 s, by run-fit kind and gap, and by whether he
 * read run before 0.6 s. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const G: Record<string, number[][]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/inside zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const oy0 = OL.map((o: any) => o.pos.y); const cy = oy0.reduce((a: number, b: number) => a + b, 0) / 5;
  const LB = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return /LB/.test(d.slot) && x >= 1.6 && x <= 7 && Math.abs(d.pos.y - cy) <= 6 && d.behavior?.kind !== 'blitz'; });
  const y0 = new Map<any, number>(LB.map((l: any) => [l, l.pos.y])), at: Record<string, Map<any, number>> = {}; let ps = 0; const rr = new Map<any, number>(); const fit = new Map<any, string>(); const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); for (const l of LB) { if (!rr.has(l) && l.recog?.read === 'run') rr.set(l, sim.t); if (!fit.has(l) && l.runFit) fit.set(l, `${l.runFit.kind}/${l.runFit.gap}`); }
    if (!ps && sim.t >= 1.0 - 1e-6) ps = Math.sign(OL.reduce((s: number, o: any, i: number) => s + o.pos.y - oy0[i], 0)) || 1;
    for (const T of ['1.0', '1.5']) if (!at[T] && sim.t >= +T - 1e-6) at[T] = new Map<any, number>(LB.map((l: any) => [l, l.pos.y])); };
  sim.run(); if (!at['1.5']) continue;
  for (const l of LB) { const v = [(at['1.0'].get(l)! - y0.get(l)!) * ps, (at['1.5'].get(l)! - y0.get(l)!) * ps];
    for (const k of ['all', `fit ${fit.get(l) ?? 'none'}`, `read ${rr.has(l) && rr.get(l)! < 0.6 ? 'early' : 'late/none'}`, `side ${Math.sign((y0.get(l)! - cy) * ps) > 0 ? 'play' : 'back'}`]) (G[k] ??= []).push(v); }
}
const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2);
for (const [k, v] of Object.entries(G).sort()) if (v.length >= 15) console.log(`${k}: n ${v.length} lateral to play at 1.0/1.5 s ${md(v.map(x => x[0]))}/${md(v.map(x => x[1]))}`);
