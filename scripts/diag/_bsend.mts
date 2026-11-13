/** Zone runs: the backside end (Run Game's bsend.py): a defender on the line (0-1.6 yd) outside the tackle with no
 * TE/wing within 1 yd laterally, on the side away from the OL's mean lateral flow over 1 s. By 1.5 s: crossed the
 * LOS untouched (no offensive non-carrier within 1.0 yd first), sat (neither crossed nor touched), depth at 1.5 s
 * (- = in the backfield), inward squeeze, and which branch tags he carried. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const R: Record<string, any[]> = { IZ: [], OZ: [] }; const TAGS: Record<string, number> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/zone/i.test(p.call)) continue; const fam = /inside/i.test(p.call) ? 'IZ' : 'OZ';
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const oy0 = OL.map((o: any) => o.pos.y); const lo = Math.min(...oy0), hi = Math.max(...oy0);
  const others = sim.offense.filter((o: any) => !OL.includes(o) && o !== sim.qb);
  const ends = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return x >= 0 && x <= 1.6 && (d.pos.y < lo - 0.5 || d.pos.y > hi + 0.5) && !others.some((o: any) => Math.abs(o.pos.y - d.pos.y) <= 1 && Math.abs(o.pos.x - los) < 3); });
  const st = new Map<any, any>(ends.map((e: any) => [e, { y0: e.pos.y, out: null as string | null, tags: new Set<string>() }])); let ps = 0, end15: any = null; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (!ps && sim.t >= 1 - 1e-6) ps = Math.sign(OL.reduce((s: number, o: any, i: number) => s + o.pos.y - oy0[i], 0)) || 1;
    if (sim.t > 1.5) { if (!end15) end15 = new Map(ends.map((e: any) => [e, { x: (e.pos.x - los) * d2, y: e.pos.y }])); return; }
    for (const e of ends) { const s = st.get(e)!; for (const t of e.tags) if (/squeeze|set|widen|shoot|chase|step|edge|contain|trail/.test(t)) s.tags.add(t);
      if (s.out) continue; if ((e.pos.x - los) * d2 < 0) s.out = 'crossed'; else if (sim.offense.some((o: any) => o !== sim.carrier && Math.hypot(o.pos.x - e.pos.x, o.pos.y - e.pos.y) < 1.0)) s.out = 'touched'; } };
  sim.run(); if (!ps || !end15) continue;
  const cy = (lo + hi) / 2;
  for (const e of ends) { if ((e.pos.y - cy) * ps > 0 && (st.get(e)!.y0 - cy) * ps > 0) continue; const s = st.get(e)!; if ((s.y0 - cy) * ps > 0) continue;
    const at = end15.get(e); R[fam].push({ out: s.out ?? 'sat', depth: at.x, squeeze: (at.y - s.y0) * Math.sign(cy - s.y0) });
    const k = [...s.tags].sort().join('+') || 'none'; TAGS[k] = (TAGS[k] ?? 0) + 1; }
}
const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
for (const [f, v] of Object.entries(R)) if (v.length) console.log(`${f} backside end n ${v.length}: crossed untouched ${Math.round(100 * v.filter(x => x.out === 'crossed').length / v.length)}% touched ${Math.round(100 * v.filter(x => x.out === 'touched').length / v.length)}% sat ${Math.round(100 * v.filter(x => x.out === 'sat').length / v.length)}% | depth at 1.5 s ${md(v.map(x => x.depth))} | inward squeeze ${md(v.map(x => x.squeeze))}`);
console.log('tags:', Object.entries(TAGS).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(', '));
