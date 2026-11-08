/** Same operator as rgtools/lbdepth.py on restaged plays: box LBs (1.6-7 yd deep within 6 yd of the OL centre),
 * depth at the snap and downhill displacement by 0.4 / 0.9 s (NFL frames 4 / 9 after the one-frame shift = 0.5 / 1.0 s
 * of NFL time), by kind (zone/gap run, pass). usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const KIND: Record<string, string> = { insideZone: 'zone', outsideZone: 'zone', wideZone: 'zone', splitZone: 'zone', duo: 'zone', power: 'gap', counter: 'gap', trap: 'gap' };
const [dir, ...seeds] = process.argv.slice(2); const R: Record<string, number[][]> = {}; const ON: Record<string, (number | null)[]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  const setup: any = restoreSetup(Buffer.from(p.setup, 'base64')); const kind = p.pass ? 'pass' : KIND[setup.offCall?.run?.scheme]; if (!kind) continue;
  const sim: any = new PlaySim(setup as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const cy = OL.reduce((s: number, o: any) => s + o.pos.y, 0) / 5;
  const LB = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return /LB/.test(d.slot) && x >= 1.6 && x <= 7 && Math.abs(d.pos.y - cy) <= 6; });
  const x0 = new Map(LB.map((l: any) => [l, (l.pos.x - los) * d2])), at: Record<number, Map<any, number>> = {}; const t0 = sim.tick.bind(sim);
  const tr = new Map(LB.map((l: any) => [l, [(l.pos.x - los) * d2]])); let k = 1;
  sim.tick = () => { t0(); if (k <= 21 && sim.t >= 0.1 * k - 1e-6) { for (const [l, v] of tr) v.push((l.pos.x - los) * d2); k++; } for (const T of [0.4, 0.9]) if (!at[T] && sim.t >= T - 1e-6) at[T] = new Map(LB.map((l: any) => [l, (l.pos.x - los) * d2])); };
  sim.run(); if (!at[0.9]) continue;
  for (const l of LB) { (R[kind] ??= []).push([x0.get(l)!, x0.get(l)! - at[0.4].get(l)!, x0.get(l)! - at[0.9].get(l)!]);
    const v = tr.get(l)!; const dh = (f: number) => -(v[f + 1] - v[f - 1]) / .2; let on: number | null = null;
    for (let f = 2; f < Math.min(20, v.length - 2); f++) if (dh(f) >= .5 && dh(f + 1) >= .5) { on = f / 10; break; }
    (ON[kind] ??= []).push(on); }
}
const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2);
for (const [k, v] of Object.entries(R)) console.log(`sim ${k} n ${v.length} depth ${md(v.map(x => x[0]))} | downhill by 0.5/1.0 s (NFL clock) ${md(v.map(x => x[1]))}/${md(v.map(x => x[2]))}`);
for (const [k, v] of Object.entries(ON)) { const got = v.filter((x): x is number => x !== null).sort((a, b) => a - b);
  console.log(`sim ${k} n ${v.length} downhill onset p25/50/75 ${[.25, .5, .75].map(f => got[Math.floor(f * got.length)]?.toFixed(1)).join('/')} s (of movers) | moving by 0.6 s ${Math.round(100 * got.filter(x => x <= .6).length / v.length)}% by 1.0 s ${Math.round(100 * got.filter(x => x <= 1.0).length / v.length)}% never by 2 s ${Math.round(100 * (v.length - got.length) / v.length)}%`); }
