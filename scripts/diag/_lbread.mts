/** Box LBs on designed runs: time he commits run, and from then his request vs achieved speed (and the downhill part)
 * at +0 / +0.2 / +0.4 / +0.6 s, his facing relative to the request, and posture. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const W = [0, .2, .4, .6]; const S = W.map(() => ({ q: [] as number[], a: [] as number[], qd: [] as number[], ad: [] as number[], off: [] as number[] })); const tr: number[] = []; const BY: Record<string, number[]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const cy = OL.reduce((s: number, o: any) => s + o.pos.y, 0) / 5;
  const LB = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return /LB/.test(d.slot) && x >= 1.6 && x <= 7 && Math.abs(d.pos.y - cy) <= 6 && d.behavior?.kind !== 'blitz'; });
  const st = new Map<any, any>(); const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); for (const l of LB) { let s = st.get(l); if (!s && l.recog?.read === 'run') { s = { t: sim.t, k: 0 }; st.set(l, s); tr.push(sim.t); const r: any = l.recog; const pb = r.prior > 1 ? 'prior pass-strong' : r.prior > 0.3 ? 'prior pass-lean' : r.prior < -0.3 ? 'prior run-lean' : 'prior even';
      for (const k of [`beh ${l.behavior?.kind}`, pb, `changedMind ${r.changedMind}`, `down ${sim.down ?? (sim as any).setup?.down}`]) (BY[k] ??= []).push(sim.t); }
    if (!s) continue; while (s.k < W.length && sim.t >= s.t + W[s.k] - 1e-6) { const q = sim.intents[l.idx]?.vel ?? { x: 0, y: 0 }, qs = Math.hypot(q.x, q.y);
      const off = qs > .3 ? Math.abs(Math.atan2(Math.sin(Math.atan2(q.y, q.x) - l.facing), Math.cos(Math.atan2(q.y, q.x) - l.facing))) * 180 / Math.PI : NaN;
      const o = S[s.k]; o.q.push(qs); o.a.push(Math.hypot(l.vel.x, l.vel.y)); o.qd.push(-q.x * d2); o.ad.push(-l.vel.x * d2); if (!isNaN(off)) o.off.push(off); s.k++; } } };
  sim.run();
}
const md = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2) : '-';
console.log(`box LBs reading run: n ${tr.length}, run read at p25/50/75 ${[.25, .5, .75].map(f => [...tr].sort((a, b) => a - b)[Math.floor(f * tr.length)].toFixed(2)).join('/')} s`);
W.forEach((w, i) => console.log(`  +${w}s: request ${md(S[i].q)} (downhill ${md(S[i].qd)}) achieved ${md(S[i].a)} (downhill ${md(S[i].ad)}) | request vs facing ${md(S[i].off)} deg`));
for (const [k, v] of Object.entries(BY).sort()) if (v.length >= 20) console.log(`  ${k}: n ${v.length} run read p25/50/75 ${[.25, .5, .75].map(f => [...v].sort((a, b) => a - b)[Math.floor(f * v.length)].toFixed(2)).join('/')} s`);
