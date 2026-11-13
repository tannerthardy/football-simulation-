/** OZ/WZ box LBs by behavior: share, lateral request/achieved toward the play side at 0.6/0.9/1.2 s, zero-request share,
 * request reversals (>120 deg, both > 1 yd/s) in 0.4-1.4 s, and run read time. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const R: any[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const LB = sim.defense.filter((d: any) => d.slot.startsWith('LB') && (d.pos.x - sim.los) * d2 >= 2.5 && (d.pos.x - sim.los) * d2 <= 7);
  const log = new Map<any, any[]>(LB.map((l: any) => [l, []])); let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    if (sim.t > 1.4) return; for (const l of LB) log.get(l)!.push({ t: sim.t, b: l.behavior?.kind, req: sim.intents[l.idx]?.vel ?? { x: 0, y: 0 }, v: l.vel.y, read: l.recog?.read }); };
  sim.run(); if (!side) continue;
  for (const [l, L] of log) {
    const at = (t: number) => L.reduce((b: any, x: any) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b, L[0]);
    let rev = 0; for (let i = 1; i < L.length; i++) { const a = L[i - 1].req, b = L[i].req; if (L[i].t < .4) continue;
      if (Math.hypot(a.x, a.y) > 1 && Math.hypot(b.x, b.y) > 1 && (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y)) < -0.5) rev++; }
    const zero = L.filter((x: any) => x.t >= .4 && x.t <= 1.0 && Math.hypot(x.req.x, x.req.y) < .1).length / Math.max(1, L.filter((x: any) => x.t >= .4 && x.t <= 1.0).length);
    R.push({ beh: at(.6).b, rq6: at(.6).req.y * side, v6: at(.6).v * side, rq9: at(.9).req.y * side, v9: at(.9).v * side, rq12: at(1.2).req.y * side, v12: at(1.2).v * side, rev, zero, runAt: L.find((x: any) => x.read === 'run')?.t ?? NaN });
  }
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
for (const b of ['all', ...new Set(R.map(r => r.beh))]) { const S = b === 'all' ? R : R.filter(r => r.beh === b); if (S.length < 10) continue;
  console.log(`${String(b).padEnd(9)} n ${String(S.length).padStart(4)} (${(100 * S.length / R.length).toFixed(0)}%) | req/got 0.6 ${q(S.map(r => r.rq6))}/${q(S.map(r => r.v6))} 0.9 ${q(S.map(r => r.rq9))}/${q(S.map(r => r.v9))} 1.2 ${q(S.map(r => r.rq12))}/${q(S.map(r => r.v12))} | zero-request share 0.4-1.0 s ${q(S.map(r => r.zero))} | reversals ${(100 * S.filter(r => r.rev > 0).length / S.length).toFixed(0)}% | run read at ${q(S.map(r => r.runAt))}`); }
