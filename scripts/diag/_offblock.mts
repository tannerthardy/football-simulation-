/** Sim side of offblock.py (same definition, 10 Hz samples): the first sample a defender is within 3 yd of the carrier
 * (not the QB before a handoff) and within 1.2 yd of an offensive player other than the carrier; is he more than 1.2 yd
 * from every offensive player at any sample in the next 1.0 s, and within 1.0 yd of the carrier within 1.5 s.
 * usage: <capDir> <seed>... (run plays) */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const R = new Map<string, number[]>();
const group = (s: string) => /^(DE|DT|NT)/.test(s) ? 'DL' : /^LB/.test(s) ? 'LB' : 'DB';
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const frames: any[] = []; let k = 0;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (k++ % 2) return; const c = sim.carrier;
    frames.push({ c: c && c !== sim.qb ? { ...c.pos } : null, cid: c?.idx, o: sim.offense.map((a: any) => ({ id: a.idx, p: { ...a.pos } })), d: sim.defense.map((a: any) => ({ slot: a.slot, p: { ...a.pos } })) }); };
  sim.run();
  const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
  const blocked = (f: any, j: number) => f.o.some((o: any) => o.id !== f.cid && dist(o.p, f.d[j].p) < 1.2);
  const done = new Set<number>();
  frames.forEach((f, i) => { if (!f.c) return; f.d.forEach((dd: any, j: number) => {
    if (done.has(j) || dist(dd.p, f.c) >= 3) return; done.add(j);
    if (!blocked(f, j) || i + 10 >= frames.length) return;
    const g = group(dd.slot), r = R.get(g) ?? (R.set(g, [0, 0, 0]), R.get(g)!); r[0]++;
    if (frames.slice(i, i + 11).some(h => !blocked(h, j))) r[1]++;
    if (frames.slice(i, i + 16).some(h => h.c && dist(h.d[j].p, h.c) < 1.0)) r[2]++; }); });
}
for (const [g, [n, off, reach]] of [...R].sort()) console.log(`sim ${g} n ${String(n).padStart(4)} | off every blocker within 1.0 s ${(100 * off / n).toFixed(0).padStart(3)}% | reaches carrier within 1.5 s ${(100 * reach / n).toFixed(0).padStart(3)}%`);
