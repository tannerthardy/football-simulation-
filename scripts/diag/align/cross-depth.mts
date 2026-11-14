/** Crossing routes as run (QB lane's crosser depth question, 2026-11-14): each shallow / shallow_high / cross
 * runner's deepest point past the line from the snap to the throw (or 3.0 s if not thrown by then; the NFL operator's
 * rule, nfl_route_depth.py), and his depth at the moment he crosses the ball's line (the mesh point for mesh), against
 * the route as drawn. Concepts that run them, against cover3 and cover1, seeds 1..N, both flips.
 *   node --import tsx scripts/diag/align/cross-depth.mts [seeds] */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 8);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const CROSSERS = new Set(['shallow', 'shallow_high', 'cross']);
const rows: { route: string; deepest: number; atBall: number | null }[] = [];
for (const id of ['mesh', 'drive', 'y_cross', 'hitch_cross', 'post_cross', 'flood', 'dagger']) for (const cov of ['cover3', 'cover1']) for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
  const c = PASS_BY_ID[id]; if (!c) continue;
  const formation = FORMATION_BY_ID[id === 'y_cross' || id === 'flood' ? 'gun_trips_11' : 'gun_doubles_11'];
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: c, label: id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 + (flip ? 1 : 0) });
  const runners: { a: any; route: string; y0: number; deepest: number; atBall: number | null }[] = [];
  for (const sd of ['S', 'W'] as const) for (const n of [1, 2, 3] as const) {
    const route = (sd === 'S' ? c.strong : c.weak)?.[n]; const slot = sim.offAlign.numbering[`${sd}${n}`];
    if (route && CROSSERS.has(route) && slot) { const a = sim.slot(slot); runners.push({ a, route, y0: a.pos.y, deepest: -9, atBall: null }); }
  }
  if (!runners.length) continue;
  while (sim.phase !== 'dead' && sim.t < 3.0 && sim.ball.kind === 'held' && sim.ball.carrier === sim.qb) {
    sim.tick();
    for (const r of runners) {
      const d = r.a.pos.x - sim.los; r.deepest = Math.max(r.deepest, d);
      if (r.atBall === null && Math.sign(r.a.pos.y - sim.ballY) !== Math.sign(r.y0 - sim.ballY)) r.atBall = d;
    }
  }
  for (const r of runners) rows.push({ route: `${r.route}${id === 'mesh' ? ' (mesh)' : ''}`, deepest: r.deepest, atBall: r.atBall });
}
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
for (const r of [...new Set(rows.map((x) => x.route))].sort()) {
  const R = rows.filter((x) => x.route === r), d = R.map((x) => x.deepest), b = R.map((x) => x.atBall ?? NaN);
  console.log(`${r.padEnd(20)} n ${String(R.length).padStart(3)} | deepest to throw/3 s p25/50/75 ${q(d, .25).toFixed(1)}/${q(d, .5).toFixed(1)}/${q(d, .75).toFixed(1)} | depth crossing the ball p50 ${q(b, .5).toFixed(1)} (crossed by then ${R.filter((x) => x.atBall !== null).length})`);
}
