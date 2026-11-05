/** STANCE_TELL: DL who took a tell step on OZ/IZ: share, correct-direction share, and requested vs achieved lateral (toward
 * the lean) at 0.2/0.25/0.3/0.4 s, plus support state and facing. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const T = [.2, .25, .3, .4]; const R: any[] = []; let all = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone|inside zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) < 1.6 && Math.abs(d.pos.y - sim.ballY) < 4);
  const rec = new Map<any, any>(); let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    for (const d of DL) { if (d.tags.has('tell-step') && !rec.has(d)) rec.set(d, { lean: 0, at: {} });
      const r = rec.get(d); if (!r) continue;
      for (const t of T) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) r.at[t] = { req: sim.intents[d.idx]?.vel.y ?? 0, v: d.vel.y, st: d.body.support?.state, face: d.body.facing, up: -d.vel.x * d2, reqUp: -(sim.intents[d.idx]?.vel.x ?? 0) * d2 }; } };
  sim.run(); all += DL.length; if (!side) continue;
  for (const [d, r] of rec) { const lean = Math.sign(r.at[.3]?.req ?? r.at[.25]?.req ?? 1) || 1; R.push({ ok: lean === side, lean, at: r.at }); }
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`DL ${all}, took a tell step ${R.length} (${(100 * R.length / all).toFixed(0)}%), stepped toward the actual play side ${(100 * R.filter(r => r.ok).length / Math.max(1, R.length)).toFixed(0)}%`);
for (const t of T) { const S = R.filter(r => r.at[t]); console.log(`t ${t}: lateral toward lean req ${q(S.map(r => r.at[t].req * r.lean))} got ${q(S.map(r => r.at[t].v * r.lean))} | upfield req ${q(S.map(r => r.at[t].reqUp))} got ${q(S.map(r => r.at[t].up))} | support ${JSON.stringify(S.reduce((m: any, r) => (m[r.at[t].st] = (m[r.at[t].st] ?? 0) + 1, m), {}))}`); }
