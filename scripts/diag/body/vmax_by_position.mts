/** vmax (in-pads top speed, derivePhysical) by position for generated teams, with the forty and weight it comes from, beside the NFL tracked p99 of the same position (top_speed.py).
 *   node --import tsx scripts/diag/body/vmax_by_position.mts [--teams 8] */
import { Rng } from '../../../src/core/rng.js';
import { generateTeam } from '../../../src/league/team.js';
import { derivePhysical } from '../../../src/players/physical.js';
const ti = process.argv.indexOf('--teams'); const n = ti >= 0 ? Number(process.argv[ti + 1]) : 8;
const rng = new Rng(7); const by: Record<string, { v: number[]; f: number[]; w: number[]; t: number[] }> = {};
for (let i = 0; i < n; i++) {
  const team: any = generateTeam(rng, `T${i}`, `T${i}`, { strength: 0.55 });
  const roster: any[] = team.players ?? team.roster ?? Object.values(team).flat().filter((x: any) => x && x.measurables);
  for (const p of roster) { if (!p?.measurables) continue; const ph = derivePhysical(p); const b = (by[p.position] ??= { v: [], f: [], w: [], t: [] }); b.v.push(ph.vmax); b.f.push(p.measurables.forty); b.w.push(p.measurables.weightLb); b.t.push(ph.tau); }
}
const m = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length, sd = (a: number[]) => Math.sqrt(m(a.map(x => (x - m(a)) ** 2)));
console.log('| position | n | forty (s) mean | weight (lb) | vmax mean (yd/s) | sd | max | tau (s) |\n|---|---|---|---|---|---|---|---|');
for (const [k, b] of Object.entries(by).sort()) console.log(`| ${k} | ${b.v.length} | ${m(b.f).toFixed(2)} | ${m(b.w).toFixed(0)} | ${m(b.v).toFixed(2)} | ${sd(b.v).toFixed(2)} | ${Math.max(...b.v).toFixed(2)} | ${m(b.t).toFixed(2)} |`);
