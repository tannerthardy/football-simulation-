/** OZ/WZ backside DL (lined up 0.5-6 yd backside of the ball): lateral request vs achieved toward the play at 0.6/1.0/1.5/2.0 s,
 * split engaged solo / engaged double / free, and the tag that set the request. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const T = [.6, 1.0, 1.5, 2.0]; const R: Record<string, any[]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot) && Math.abs((d.pos.x - sim.los) * d2) <= 1.6);
  const y0 = new Map<any, number>(DL.map((d: any) => [d, d.pos.y])); const snaps: any[] = []; let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    for (const t of T) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) for (const d of DL) { const e = d.engagement;
      snaps.push({ d, t, st: !e ? 'free' : e.helpers?.length ? 'double' : 'solo', req: sim.intents[d.idx]?.vel.y ?? 0, v: d.vel.y, run: d.tags.has('zone-run'), shoot: d.tags.has('shoot-cutoff') || d.tags.has('shoot-gap') }); } };
  sim.run(); if (!side) continue;
  for (const s of snaps) { const back = ((y0.get(s.d) as number) - sim.ballY) * side; if (back > -0.5 || back < -6) continue; (R[`${s.t}|${s.st}`] ??= []).push({ req: s.req * side, v: s.v * side, run: s.run, shoot: s.shoot }); }
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
for (const t of T) console.log(`t ${t}: ` + ['double', 'solo', 'free'].map(st => { const S = R[`${t}|${st}`] ?? []; return S.length ? `${st} n ${S.length} req ${q(S.map(s => s.req))} got ${q(S.map(s => s.v))} (race tag ${(100 * S.filter(s => s.run).length / S.length).toFixed(0)}%)` : `${st} -`; }).join(' | '));
