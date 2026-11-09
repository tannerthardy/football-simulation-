/** Backside DL on zone runs (Run Game's operator): DL at snap depth <=1.6 from the LOS, lined up 0.5-6 yd backside of the
 * ball (play side = carrier's lateral direction handoff -> +1 s). Depth vs LOS (negative = in the offense's backfield) and
 * lateral toward the play at 1.0/1.5/2.0 s; share >=1 yd in the backfield at 1.5 s; distance to the carrier at 2.0 s.
 * usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const T = [1.0, 1.5, 2.0]; const R: Record<string, any[]> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const fam = /outside zone|wide zone/i.test(p.call) ? 'OZ' : /inside zone/i.test(p.call) ? 'IZ' : null; if (!fam) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot) && Math.abs((d.pos.x - sim.los) * d2) <= 1.6);
  const y0 = new Map<any, number>(DL.map((d: any) => [d, d.pos.y])); const snaps: any[] = []; let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    for (const t of T) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) for (const d of DL) snaps.push({ d, t, shoot: d.tags.has('shoot-gap'), keystep: d.tags.has('key-step'), eng: !!d.engagement, beh: d.behavior?.kind, depth: (d.pos.x - sim.los) * d2, vy: d.vel.y, dc: c ? Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) : NaN }); };
  sim.run(); if (!side) continue;
  for (const s of snaps) { const back = ((y0.get(s.d) as number) - sim.ballY) * side; if (back > -0.5 || back < -6) continue; (R[`${fam}|${s.t}`] ??= []).push({ ...s, lat: s.vy * side }); }
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
for (const fam of ['OZ', 'IZ']) { const row = T.map(t => { const S = R[`${fam}|${t}`] ?? []; return `${t}s depth ${q(S.map(s => s.depth))} toward play ${q(S.map(s => s.lat))}`; });
  const S15 = R[`${fam}|1.5`] ?? [], S2 = R[`${fam}|2`] ?? [];
  console.log(`${fam} backside DL n ${S15.length} | ${row.join(' | ')} | >=1 yd in backfield at 1.5 s ${(100 * S15.filter(s => s.depth <= -1).length / Math.max(1, S15.length)).toFixed(0)}% | to carrier at 2.0 s ${q(S2.map(s => s.dc))}`); }
for (const fam of ['OZ', 'IZ']) { const S = R[`${fam}|1.5`] ?? []; if (!S.length) continue;
  const sh = S.filter(s => s.shoot); console.log(`${fam} at 1.5 s: shot the gap ${(100 * sh.length / S.length).toFixed(0)}% (of those engaged ${(100 * sh.filter(s => s.eng).length / Math.max(1, sh.length)).toFixed(0)}%, depth ${q(sh.map(s => s.depth))}) | flat key-step ${(100 * S.filter(s => s.keystep && !s.shoot).length / S.length).toFixed(0)}% | engaged ${(100 * S.filter(s => s.eng).length / S.length).toFixed(0)}% | behaviors ${JSON.stringify(S.reduce((m: any, s) => (m[s.beh] = (m[s.beh] ?? 0) + 1, m), {}))}`); }
