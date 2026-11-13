/** OZ/WZ solo reach leverage (Run Game's measure): engaged DL-OL pairs with no helper; share where the blocker is at least
 * 0.3*sep past the DL's play-side shoulder, and the DL's lateral speed, at 0.9/1.2/1.5 s. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const T = [.9, 1.2, 1.5]; const R: Record<number, { win: number; n: number; v: number[] }> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const snaps: any[] = []; let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    for (const t of T) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) for (const e of sim.engagements ?? []) {
      if (!/^(DE|DT|NT)/.test(e.defender.slot) || e.helpers?.length) continue;
      const d = e.defender, b = e.blocker; snaps.push({ t, rel: b.pos.y - d.pos.y, sep: b.profile.radius + d.profile.radius, v: d.vel.y }); } };
  sim.run(); if (!side) continue;
  for (const s of snaps) { const r = (R[s.t] ??= { win: 0, n: 0, v: [] }); r.n++; if (s.rel * side >= 0.3 * s.sep) r.win++; r.v.push(s.v * side); }
}
const q = (v: number[]) => { const z = [...v].sort((a, b) => a - b); return z[Math.floor((z.length - 1) / 2)]; };
console.log(T.map(t => `${t}s blocker past DL play-side shoulder ${(100 * R[t].win / R[t].n).toFixed(0)}% (n ${R[t].n}) DL lateral ${q(R[t].v).toFixed(2)}`).join(' | '));
