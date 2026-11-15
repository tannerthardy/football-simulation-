/** GO routes in the sim, ball held, same shape as nfl_go_speed.py: per receiver on a `go`, (time since the snap, speed) at 10 Hz to 4 s, the distance at 1 / 2 / 3 s, WR or TE/RB, and the free-release flag
 * (no defender within 1.5 yd of him in the first 0.5 s). usage: [FLAGS] node --import tsx scripts/diag/route-speed/sim_go_speed.ts [N=12] OUT.json */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 12), OUT = process.argv[3];
const concepts = Object.values(PASS_BY_ID).filter((c: any) => JSON.stringify([c.strong, c.weak]).includes('"go"')).map((c: any) => c.id);
const rows: any[] = [];
for (const concept of concepts) for (const cov of ['cover3', 'cover1', 'cover2']) for (let seed = 1; seed <= N; seed++) {
  const offense = generateTeam(new Rng(51 + seed), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(52 + seed), 'D', 'DEF', { strength: .55 });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, zoneStyle: 'spot', label: cov }, los: 40, ballY: 26, firstDownX: 50, seed } as never);
  const rec = new Map<any, { series: [number, number][]; mind: number; dist: Record<string, number>; d: number; last: any }>();
  for (const a of sim.offense) { const id = (a.behavior?.fallback?.route ?? a.behavior?.route)?.id; if (id === 'go') rec.set(a, { series: [], mind: 99, dist: {}, d: 0, last: { ...a.pos } }); }
  if (!rec.size) continue;
  let lastK = -1;
  while (sim.phase !== 'dead' && sim.t < 4.05) {
    sim.tick();
    for (const [a, r] of rec) { r.d += Math.hypot(a.pos.x - r.last.x, a.pos.y - r.last.y); r.last = { ...a.pos };
      if (sim.t <= 0.5) for (const d of sim.defense) r.mind = Math.min(r.mind, Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y));
      for (const k of [1, 2, 3]) if (Math.abs(sim.t - k) < sim.dt / 2 + 1e-9 && r.dist[String(k)] === undefined) r.dist[String(k)] = r.d; }
    const k = Math.round(sim.t * 10);
    if (sim.ball?.kind !== 'held' && sim.ball?.kind !== undefined) break;
    if (Math.abs(sim.t - k / 10) < sim.dt / 2 + 1e-9 && k !== lastK) { lastK = k; for (const [a, r] of rec) r.series.push([k / 10, Math.hypot(a.vel.x, a.vel.y)]); }
  }
  for (const [a, r] of rec) rows.push({ g: a.player.position === 'WR' ? 'WR' : 'TE/RB', free: r.mind >= 1.5, series: r.series, dist: r.dist, concept, cov });
}
console.log(`${concepts.join(',')}: ${rows.length} go routes`);
if (OUT) writeFileSync(OUT, JSON.stringify(rows));
