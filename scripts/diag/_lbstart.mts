/** Box LBs (1.6-7 yd deep at the snap, within 6 yd of the OL centre) on designed runs: get-off (snapReadyAt), depth at
 * the snap, and at 0.2/0.4/0.6/0.8 s his read, behavior, request and achieved downhill speed (+ = toward the LOS),
 * grouped by slot and coverage behavior. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const T = [.2, .4, .6, .8]; const G: Record<string, any> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const cy = OL.reduce((s: number, o: any) => s + o.pos.y, 0) / 5;
  const LB = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return /LB/.test(d.slot) && x >= 1.6 && x <= 7 && Math.abs(d.pos.y - cy) <= 6; });
  const rows = new Map<any, any>(LB.map((l: any) => [l, { depth: (l.pos.x - los) * d2, ready: 0, at: [] as any[] }])); let k = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); for (const [l, r] of rows) r.ready = l.snapReadyAt;
    if (k < T.length && sim.t >= T[k] - 1e-6) { for (const [l, r] of rows) { const q = sim.intents[l.idx]?.vel ?? { x: 0, y: 0 };
      r.at.push({ read: l.recog?.read ?? '-', beh: l.behavior?.kind, q: -q.x * d2, a: -l.vel.x * d2, tags: [...l.tags].slice(-2).join('+') }); } k++; } };
  sim.run();
  for (const [l, r] of rows) { const key = `${l.slot} ${r.at[0]?.beh}`; const g = (G[key] ??= { n: 0, depth: [], ready: [], q: T.map(() => [] as number[]), a: T.map(() => [] as number[]), read: T.map(() => ({} as any)) });
    g.n++; g.depth.push(r.depth); g.ready.push(r.ready); r.at.forEach((x: any, i: number) => { g.q[i].push(x.q); g.a[i].push(x.a); g.read[i][x.read] = (g.read[i][x.read] ?? 0) + 1; }); }
}
const md = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2) : '-';
for (const [k, g] of Object.entries(G).sort()) if (g.n >= 20) console.log(`${k}: n ${g.n} depth ${md(g.depth)} get-off ${md(g.ready)} | ` +
  T.map((t, i) => `${t}s req ${md(g.q[i])} got ${md(g.a[i])} run ${Math.round(100 * (g.read[i].run ?? 0) / g.n)}%`).join(' | '));
