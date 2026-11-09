/** IZ play-side box LBs (non-blitz, play side of the OL centre at the snap): at 0.8 / 1.0 / 1.3 s his lateral request
 * and achieved speed toward the play, engaged share, run read, and fit tags. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const T = [.8, 1.0, 1.3]; const S: any[] = T.map(() => ({ q: [] as number[], a: [] as number[], eng: 0, run: 0, n: 0, tags: {} as Record<string, number> }));
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/inside zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const oy0 = OL.map((o: any) => o.pos.y); const cy = oy0.reduce((a: number, b: number) => a + b, 0) / 5;
  const LB = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return /LB/.test(d.slot) && x >= 1.6 && x <= 7 && Math.abs(d.pos.y - cy) <= 6 && d.behavior?.kind !== 'blitz'; });
  const y0 = new Map<any, number>(LB.map((l: any) => [l, l.pos.y])); const rows: any[] = []; let k = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (k < T.length && sim.t >= T[k] - 1e-6) { rows.push(LB.map((l: any) => ({ l, q: sim.intents[l.idx]?.vel.y ?? 0, a: l.vel.y, eng: !!l.engagement, run: l.recog?.read === 'run', tags: [...l.tags].filter((t: string) => /fit|scrape|flow|fill|insert|gap|spill|squeeze|run-through|shed|work/.test(t)).slice(-2).join('+') || 'none' }))); k++; } };
  sim.run(); if (rows.length < T.length) continue;
  const ps = Math.sign(OL.reduce((s: number, o: any, i: number) => s + o.pos.y - oy0[i], 0)) || 1;
  rows.forEach((r: any[], i: number) => { for (const x of r) { if ((y0.get(x.l)! - cy) * ps <= 0) continue; const s = S[i]; s.n++; s.q.push(x.q * ps); s.a.push(x.a * ps); if (x.eng) s.eng++; if (x.run) s.run++; s.tags[x.tags] = (s.tags[x.tags] ?? 0) + 1; } });
}
const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
T.forEach((t, i) => { const s = S[i]; console.log(`${t}s: n ${s.n} lateral request ${md(s.q)} achieved ${md(s.a)} | engaged ${Math.round(100 * s.eng / s.n)}% run read ${Math.round(100 * s.run / s.n)}% | tags ${Object.entries(s.tags).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(', ')}`); });
