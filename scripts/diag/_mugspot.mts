/** Zone runs: box backers 1.6-3.5 yd deep at the snap within 6 yd of the OL centre, by alignment class (Run Game's
 * mugnfl.py): outside the tackles / stacked behind a DL (a DL within 1 yd laterally, on the line) / over an OL with no
 * DL (within 0.6 yd of an OL laterally) / in a gap; and by 1.5 s blocked first (an offensive non-carrier within 1.0 yd
 * before he crosses the LOS) / rushed untouched / sat untouched. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const C: Record<string, Record<string, number>> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const oy = OL.map((o: any) => o.pos.y).sort((a: number, b: number) => a - b); const cy = oy.reduce((a: number, b: number) => a + b, 0) / 5;
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - los) * d2) < 1.5);
  const LB = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return x >= 1.6 && x <= 3.5 && Math.abs(d.pos.y - cy) <= 6 && /LB|NB|SS/.test(d.slot); });
  const cls = new Map<any, string>(LB.map((l: any) => { const y = l.pos.y;
    const c = y < oy[0] - 0.5 || y > oy[4] + 0.5 ? 'outside tackles' : DL.some((d: any) => Math.abs(d.pos.y - y) <= 1) ? 'stacked behind DL' : oy.some((o: number) => Math.abs(o - y) <= 0.6) ? 'over OL, no DL' : 'in a gap';
    return [l, c]; }));
  const out = new Map<any, string>(); const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (sim.t > 1.5) return; for (const l of LB) { if (out.has(l)) continue;
    if ((l.pos.x - los) * d2 < 0) { out.set(l, 'rushed'); continue; }
    if (sim.offense.some((o: any) => o !== sim.carrier && Math.hypot(o.pos.x - l.pos.x, o.pos.y - l.pos.y) < 1.0)) out.set(l, 'blocked'); } };
  sim.run();
  for (const l of LB) { const k = cls.get(l)!; const o = out.get(l) ?? 'sat'; const g = (C[k] ??= { n: 0 }); g.n++; g[o] = (g[o] ?? 0) + 1; }
}
const tot = Object.values(C).reduce((s, g) => s + g.n, 0);
for (const [k, g] of Object.entries(C)) console.log(`${k}: n ${g.n} (${Math.round(100 * g.n / tot)}%) blocked ${Math.round(100 * (g.blocked ?? 0) / g.n)}% rushed ${Math.round(100 * (g.rushed ?? 0) / g.n)}% sat ${Math.round(100 * (g.sat ?? 0) / g.n)}%`);
