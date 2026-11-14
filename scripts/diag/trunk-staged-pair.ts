/** TRUNK_TWIST Stage 1, the staged pair: a receiver running a vertical looks back for a deep ball at 6-8 yd/s with a trailing DB.
 * Four verticals against cover 1 (man, a trailing DB), the QB's throw to X staged at a fixed time (his motion and release are his
 * own; only the choice is staged), seeds 1..N. Reads the target's speed from the release to the arrival, hips and shoulders off
 * his path, the trunk, separation and the catch. Read-only.
 *   TRUNK_TWIST=1 TRUNK_NECK=1 node --import tsx scripts/diag/trunk-staged-pair.ts [N=24] [at=2.6]  */
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 24), at = Number(process.argv[3] ?? 2.6);
const off = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) * 180 / Math.PI; };
const rows: any[] = [];
for (let seed = 1; seed <= N; seed++) {
  const offense = generateTeam(new Rng(51), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(52), 'D', 'DEF', { strength: .55 });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'four_verts' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'c1' },
    los: 40, ballY: 26, firstDownX: 50, seed, stagedThrow: { at, slot: 'X' } } as never);
  const log: any[] = []; let rel = -1, T: any = null, best = Infinity, tArr = -1;
  while (sim.phase !== 'dead' && sim.t < 7) {
    sim.tick();
    if (sim.ball.kind === 'air' && sim.ball.target) {
      if (rel < 0) { rel = sim.t; T = sim.ball.target; }
      const b = sim.ball.flight.pos, dh = Math.hypot(b.x - T.pos.x, b.y - T.pos.y);
      if (dh < best) { best = dh; tArr = sim.t; }
      const sp = Math.hypot(T.vel.x, T.vel.y), path = Math.atan2(T.vel.y, T.vel.x);
      let near = Infinity; for (const d of sim.defense) near = Math.min(near, Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y));
      log.push({ t: sim.t, sp, near, hips: sp > 1 ? off(T.body.facing, path) : 0, shoulders: sp > 1 ? off(T.shoulders, path) : 0, trunk: Math.abs(T.body.trunk ?? 0) * 180 / Math.PI });
    }
  }
  if (!T || !log.length) { rows.push({ seed, thrown: false }); continue; }
  const atA = log.find((x) => x.t >= tArr - 1e-6) ?? log[log.length - 1], m5 = [...log].reverse().find((x) => x.t <= tArr - 0.5) ?? log[0];
  rows.push({ seed, thrown: true, caught: !!sim.stats?.completed, best, flight: tArr - rel, spRel: log[0].sp, spM5: m5.sp, spA: atA.sp, hipsA: atA.hips, shouldersA: atA.shoulders, trunkA: atA.trunk, trunkMax: Math.max(...log.map((x) => x.trunk)), sepA: atA.near });
}
const R = rows.filter((r) => r.thrown), q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map((f) => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
const mean = (v: number[]) => v.length ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) : '-';
console.log(`staged four_verts vs cover1, throw to X at ${at} s, TRUNK_TWIST=${process.env.TRUNK_TWIST ?? 0} TRUNK_NECK=${process.env.TRUNK_NECK ?? 0}: thrown ${R.length}/${N}, caught ${R.filter((r) => r.caught).length}`);
console.log(`  speed release ${q(R.map((r) => r.spRel))} -> 0.5 s out ${q(R.map((r) => r.spM5))} -> arrival ${q(R.map((r) => r.spA))} | slowing mean ${mean(R.map((r) => r.spM5 - r.spA))}`);
console.log(`  hips off the path at the arrival ${q(R.map((r) => r.hipsA))} deg | shoulders ${q(R.map((r) => r.shouldersA))} deg | trunk ${q(R.map((r) => r.trunkA))} deg (max ${q(R.map((r) => r.trunkMax))}) | nearest defender ${q(R.map((r) => r.sepA))} yd | ball miss distance ${q(R.map((r) => r.best))} yd | flight ${q(R.map((r) => r.flight))} s`);
