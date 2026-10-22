/** Line get-off on lab cases with the operator of getoff-rel.py: first
 * movement = 0.15 yd from the snap position, interpolated on a 0.1 s grid;
 * each line defender (< 2 yd off the ball, inside the tackles + 2 yd) against
 * the offensive lineman nearest him at the snap. Observation only.
 * node --import tsx scripts/diag/align/getoff-probe.ts [concepts=iz,oz,power,duo] [seeds=77,1,2] */
import { CALLED_LOOKS, makeSim, rosters } from '../zone-lab/lab.js';

const concepts = (process.argv[2] ?? 'iz,oz,power,duo').split(',');
const seeds = (process.argv[3] ?? '77,1,2').split(',').map(Number);
const R = rosters();
const q = (v: number[], f = .5) => v.length ? v.slice().sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const ol = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const vsOL: number[] = [], olT: number[] = [], dlT: number[] = [];
const fouls = new Map<string, number>();
let plays = 0, hard = 0;
const lag: Record<string, number[]> = {}, rel: Record<string, number[]> = {};
const timed: number[] = [], antic: number[] = [], go: number[] = [];
for (const concept of concepts) for (const look of CALLED_LOOKS) for (const roster of Object.keys(R)) for (const seed of seeds) {
  const formation = concept === 'oz' || concept === 'iz' ? 'ace_12' : 'i_pro_21';
  const sim = makeSim({ concept, dir: 'strong', formation, look, roster, seed }, R);
  plays++;
  for (const [a, pl] of sim.snapCount?.plans ?? []) if (a.team === 'D' && a.pos.x - a.profile.radius - sim.los < 2) {
    timed.push(pl.timed ? 1 : 0); antic.push(a.r('anticipation')); go.push(pl.go);
  }
  if (sim.snapCount?.hard) hard++;
  for (const f of sim.penalties) fouls.set(f.kind, (fouls.get(f.kind) ?? 0) + 1);
  const start = sim.agents.map((a) => ({ ...a.pos }));
  const ad = sim.attackDir('O');
  const grid: { x: number; y: number }[][] = [start];
  while (sim.phase === 'live' && sim.t < 2.5 - 1e-9) {
    (sim as unknown as { tick(): void }).tick();
    if (Math.abs(sim.t * 10 - Math.round(sim.t * 10)) < 1e-6) grid.push(sim.agents.map((a) => ({ ...a.pos })));
  }
  const first = (i: number) => {
    let prev = 0;
    for (let k = 1; k < grid.length; k++) {
      const d = Math.hypot(grid[k][i].x - start[i].x, grid[k][i].y - start[i].y);
      if (d >= .15) return (k - 1 + (.15 - prev) / Math.max(d - prev, 1e-9)) * .1;
      prev = d;
    }
    return null;
  };
  const line = sim.offense.filter((a) => ol.has(a.slot));
  const mid = line.map((a) => a.pos.y).sort((a, b) => a - b)[2];
  const half = Math.max(...line.map((a) => Math.abs(start[a.idx].y - mid))) + 2;
  const los = Math.max(...line.map((a) => (start[a.idx].x - sim.los) * ad)) + .3;
  const ot = new Map(line.map((a) => [a, first(a.idx)]));
  if ([...ot.values()].some((v) => v === null)) continue;
  olT.push(...[...ot.values()] as number[]);
  for (const d of sim.defense) {
    const s = start[d.idx];
    if ((s.x - sim.los) * ad - los > 2 || Math.abs(s.y - mid) > half) continue;
    const t = first(d.idx); if (t === null) continue;
    const o = line.reduce((b, a) => Math.hypot(start[a.idx].x - s.x, start[a.idx].y - s.y) < Math.hypot(start[b.idx].x - s.x, start[b.idx].y - s.y) ? a : b);
    dlT.push(t); vsOL.push(t - ot.get(o)!);
    const pl = sim.snapCount?.plans.get(d);
    const k = `${d.behavior.kind} ${pl ? (pl.timed ? 'timed' : 'react') + (pl.go < 0 ? '<0' : '') : ''}`;
    (rel[k] ??= []).push(t - ot.get(o)!);
    (lag[k] ??= []).push(t - d.snapReadyAt);
  }
}
const p = (v: number[]) => [.1, .25, .5, .75, .9].map((f) => q(v, f).toFixed(2)).join('/');
console.log(`plays ${plays} line defenders ${vsOL.length}`);
console.log(`OL first move p10/25/50/75/90 ${p(olT)} s`);
console.log(`DL first move p10/25/50/75/90 ${p(dlT)} s`);
console.log(`DL minus OL in front p10/25/50/75/90 ${p(vsOL)} s | DL first ${(100 * vsOL.filter((x) => x < 0).length / vsOL.length).toFixed(0)}%`);
console.log(`fouls ${[...fouls].map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
if (timed.length) console.log(`line defenders timing ${(100 * timed.reduce((a, b) => a + b, 0) / timed.length).toFixed(0)}% | anticipation p50 ${q(antic).toFixed(2)} | planned go p10/50/90 ${q(go, .1).toFixed(2)}/${q(go).toFixed(2)}/${q(go, .9).toFixed(2)} | hard counts ${hard}/${plays}`);
for (const [k, v] of Object.entries(lag)) console.log(`  ${k.padEnd(18)} n ${String(v.length).padStart(4)} first move minus start p25/50/75 ${q(v, .25).toFixed(2)}/${q(v).toFixed(2)}/${q(v, .75).toFixed(2)}`);
for (const [k, v] of Object.entries(rel)) console.log(`  ${k.padEnd(18)} n ${String(v.length).padStart(4)} DL minus OL p25/50/75 ${q(v, .25).toFixed(2)}/${q(v).toFixed(2)}/${q(v, .75).toFixed(2)}`);
