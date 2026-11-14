/** TRUNK_TWIST Stage 1: the short targets that fell in the family read (back and flat open catch), staged: the same ball in both arms.
 * Targets by route family: a back's check (`hitches`), a flat (`curl_flat`), a quick out (`quick_outs`), the throw to him staged at `at`
 * (his motion and release are his own, the choice is staged), man coverage (cover 1) and zone (cover 3), seeds 1..N. At the catch
 * contest (the tick `sim.dice('catch', R)` is drawn) it records the receiver's state: speed, the angle each segment (hips, shoulders,
 * head via the gaze) is off the ball's bearing, the ball's height and its distance from him, the nearest defender, and the outcome.
 *   TRUNK_TWIST=1 node --import tsx scripts/diag/trunk-staged-short.ts [N=24] [at=1.4] [out.json] */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 24), at = Number(process.argv[3] ?? 1.4);
const ang = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) * 180 / Math.PI; };
const TARGETS: { name: string; concept: string; family: string }[] = [
  { name: 'back (check)', concept: 'hitches', family: 'back' }, { name: 'flat', concept: 'curl_flat', family: 'flat' }, { name: 'quick out', concept: 'quick_outs', family: 'quick' }];
const COVS = [['cover1', COVERAGE_BY_ID.cover1], ['cover3', COVERAGE_BY_ID.cover3]] as const;
const rows: any[] = [];
for (const tg of TARGETS) for (const [cn, cov] of COVS) for (let seed = 1; seed <= N; seed++) {
  const offense = generateTeam(new Rng(51), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(52), 'D', 'DEF', { strength: .55 });
  const base: any = { offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[tg.concept], label: tg.concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: cov, pressure: null, zoneStyle: 'spot', label: cn },
    los: 40, ballY: 26, firstDownX: 50, seed };
  // find the slot whose route family is wanted: build once, read, rebuild with the staged throw
  const probe: any = new PlaySim({ ...base } as never);
  const T = probe.offense.find((a: any) => (a.behavior?.fallback?.route ?? a.behavior?.route)?.family === tg.family);
  if (!T) { rows.push({ target: tg.name, cov: cn, seed, thrown: false, noSlot: true }); continue; }
  const sim: any = new PlaySim({ ...base, stagedThrow: { at, slot: T.slot } } as never);
  const R = sim.offense.find((a: any) => a.slot === T.slot);
  let ctx: any = null, rel = -1, best = Infinity;
  const dice = sim.dice.bind(sim);
  sim.dice = (k: string, a: any, ...r: any[]) => {
    if (k === 'catch' && a === R && !ctx) {
      const b = sim.ball.flight.pos, bearing = Math.atan2(b.y - R.pos.y, b.x - R.pos.x), path = Math.atan2(R.vel.y, R.vel.x), sp = Math.hypot(R.vel.x, R.vel.y);
      let near = Infinity; for (const d of sim.defense) near = Math.min(near, Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y));
      const g = sim.gaze?.get?.(R);
      ctx = { t: sim.t, sp, ballZ: b.z, ballDist: Math.hypot(b.x - R.pos.x, b.y - R.pos.y), hipsToBall: ang(R.body.facing, bearing), shouldersToBall: ang(R.shoulders, bearing),
        headToBall: g?.dir !== undefined ? ang(g.dir, bearing) : null, hipsOffPath: sp > 1 ? ang(R.body.facing, path) : 0, trunk: Math.abs(R.body.trunk ?? 0) * 180 / Math.PI, near };
    }
    return dice(k, a, ...r);
  };
  while (sim.phase !== 'dead' && sim.t < 7) {
    sim.tick();
    if (sim.ball.kind === 'air' && sim.ball.target === R) { if (rel < 0) rel = sim.t; const b = sim.ball.flight.pos; best = Math.min(best, Math.hypot(b.x - R.pos.x, b.y - R.pos.y)); }
  }
  rows.push({ target: tg.name, cov: cn, seed, thrown: rel >= 0, caught: !!sim.stats?.completed, best, ...(ctx ?? {}), contest: !!ctx });
}
if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify(rows));
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map((f) => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
console.log(`TRUNK_TWIST=${process.env.TRUNK_TWIST ?? 0}, throw staged at ${at} s, seeds 1..${N}`);
for (const tg of TARGETS) for (const [cn] of COVS) {
  const V = rows.filter((r) => r.target === tg.name && r.cov === cn && r.thrown), C = V.filter((r) => r.contest);
  console.log(`  ${tg.name.padEnd(13)} ${cn}: thrown ${V.length}, contested ${C.length}, caught ${V.filter((r) => r.caught).length} | ball miss ${q(V.map((r) => r.best))} | at the contest: speed ${q(C.map((r) => r.sp))} hips-off-ball ${q(C.map((r) => r.hipsToBall))} shoulders-off-ball ${q(C.map((r) => r.shouldersToBall))} head-off-ball ${q(C.map((r) => r.headToBall))} deg, ball z ${q(C.map((r) => r.ballZ))} dist ${q(C.map((r) => r.ballDist))} near ${q(C.map((r) => r.near))}`);
}
