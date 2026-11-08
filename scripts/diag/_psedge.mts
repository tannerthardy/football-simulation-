/** Zone runs: the play-side edge (front defender on the line outside the tackle, on the side of the OL's flow). While
 * engaged at 0.6-1.5 s: his upfield request vs achieved (+ = into the backfield), recover/attack/squeeze tags, and his
 * run-fit technique. Depth at 1.5 s. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const G: Record<string, { q: number[]; a: number[] }> = {}; const D: number[] = []; const TQ: Record<string, number> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const oy0 = OL.map((o: any) => o.pos.y); const lo = Math.min(...oy0), hi = Math.max(...oy0), cy = (lo + hi) / 2;
  const ends = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return x >= 0 && x <= 1.6 && (d.pos.y < lo - 0.5 || d.pos.y > hi + 0.5); });
  const y0 = new Map<any, number>(ends.map((e: any) => [e, e.pos.y])); const rows: any[] = []; let ps = 0; let at15: any = null; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (!ps && sim.t >= 1 - 1e-6) ps = Math.sign(OL.reduce((s: number, o: any, i: number) => s + o.pos.y - oy0[i], 0)) || 1;
    if (!at15 && sim.t >= 1.5 - 1e-6) at15 = new Map(ends.map((e: any) => [e, (e.pos.x - los) * d2]));
    if (sim.t < 0.6 || sim.t > 1.5) return;
    for (const e of ends) if (e.engagement) { const q = sim.intents[e.idx]?.vel ?? { x: 0, y: 0 }; rows.push({ e, q: -q.x * d2, a: -e.vel.x * d2, tech: e.runFit?.technique ?? '-', kind: e.runFit?.kind ?? '-' }); } };
  sim.run(); if (!ps || !at15) continue;
  const play = (e: any) => (y0.get(e)! - cy) * ps > 0;
  for (const r of rows) if (play(r.e)) for (const k of ['all', `fit ${r.kind}/${r.tech}`]) { (G[k] ??= { q: [], a: [] }).q.push(r.q); G[k].a.push(r.a); }
  for (const e of ends) if (play(e)) { D.push(at15.get(e)); const k = `${e.runFit?.kind}/${e.runFit?.technique}`; TQ[k] = (TQ[k] ?? 0) + 1; }
}
const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
console.log(`play-side edge n ${D.length}: depth at 1.5 s ${md(D)} (- = in the backfield) | fits ${Object.entries(TQ).map(([k, v]) => `${k} ${v}`).join(', ')}`);
for (const [k, g] of Object.entries(G)) if (g.q.length >= 30) console.log(`  engaged 0.6-1.5 s, ${k}: samples ${g.q.length} upfield request ${md(g.q)} achieved ${md(g.a)}`);
