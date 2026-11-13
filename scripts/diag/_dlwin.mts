/** Zone-run DL lateral request / achieved toward the play side by window (0.15-0.30, 0.30-0.45, 0.45-0.6 s), split
 * free vs engaged; engaged requests also by engagement stage tags. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const W = [[.15, .3], [.3, .45], [.45, .6], [.6, .9], [.9, 1.3]]; const S: Record<string, { q: number[]; a: number[] }> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !(process.env.FAM === 'IZ' ? /inside zone/i : /outside zone|wide zone/i).test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) < 1.6 && Math.abs(d.pos.y - sim.ballY) < 4);
  const log: any[] = []; let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    if (sim.t > 1.3) return; for (const d of DL) log.push({ t: sim.t, eng: !!d.engagement, zr: d.tags.has('zone-run') && d.engagement, bh2: d.behavior?.kind, rf: d.runFit?.kind ?? 'none', edge: Math.abs(d.pos.y - sim.ballY) > 2.5, bh: d.behavior?.kind, q: sim.intents[d.idx]?.vel.y ?? 0, a: d.vel.y }); };
  sim.run(); if (!side) continue;
  for (const r of log) { const w = W.findIndex(([a, b]) => r.t >= a && r.t < b); if (w < 0) continue;
    for (const k of [`${w} ${r.eng ? 'engaged' : 'free'}`, ...(r.eng ? [`${w} engaged ${r.zr ? 'race' : 'no race'}`] : [`${w} free beh=${r.bh2}`])]) { (S[k] ??= { q: [], a: [] }).q.push(r.q * side); S[k].a.push(r.a * side); } }
}
const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
for (const k of Object.keys(S).sort()) { const [w, ...rest] = k.split(' '); console.log(`${W[+w].join('-')} s ${rest.join(' ')}: n ${S[k].q.length} request ${md(S[k].q)} achieved ${md(S[k].a)}`); }
