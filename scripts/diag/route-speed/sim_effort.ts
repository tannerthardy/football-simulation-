/** Sim side of nfl_effort.py: ball-held route speed per receiver per 0.1 s from the snap to the throw (or the sack), natural plays (the target is whoever the QB threw to), man (cover 1) and zone (cover 3 / 2 / 4),
 * WR / TE / RB, with the route id. Writes tracks {id, g, tg, cov, route, tr: [[t, x, y, s]]}; nfl_effort.py's `fromsim` turns them into the same JSON the NFL collector writes.
 *   [ROUTE_EFFORT=1] node --import tsx scripts/diag/route-speed/sim_effort.ts [seeds=8] OUT.json */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 8), OUT = process.argv[3];
const concepts = ['curl_flat', 'stick', 'mesh', 'smash', 'four_verts', 'y_cross', 'flood', 'comebacks', 'hitch_post', 'dagger', 'levels', 'slant_flat', 'drive', 'post_cross', 'sail_corner', 'hitches'].filter((c) => PASS_BY_ID[c]);
const out: any[] = [];
for (const concept of concepts) for (const cov of ['cover1', 'cover3', 'cover2', 'cover4']) for (let seed = 1; seed <= N; seed++) {
  const offense = generateTeam(new Rng(61), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(62), 'D', 'DEF', { strength: .55 });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, zoneStyle: 'spot', label: cov }, los: 40, ballY: 26, firstDownX: 50, seed } as never);
  const recv = sim.offense.filter((a: any) => ['WR', 'TE', 'RB'].includes(a.player?.position) && (a.behavior?.fallback?.route ?? a.behavior?.route)?.id);
  const rec = new Map<any, { route: string; tr: number[][] }>(); for (const a of recv) rec.set(a, { route: (a.behavior?.fallback?.route ?? a.behavior?.route).id, tr: [] });
  let thrown = false, last = -1, target: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (sim.phase !== 'live' || thrown) return;
    if (sim.ball?.kind === 'air') { thrown = true; target = sim.ball.target ?? null; return; }
    const k = Math.round(sim.t * 10); if (Math.abs(sim.t - k / 10) > sim.dt / 2 + 1e-9 || k === last) return; last = k;
    for (const [a, r] of rec) r.tr.push([k / 10, a.pos.x - 40, a.pos.y, Math.hypot(a.vel.x, a.vel.y)]); };
  try { sim.run(); } catch { continue; }
  if (!thrown) continue;
  for (const [a, r] of rec) out.push({ id: `${a.team}:${a.player.name ?? a.slot}`, g: a.player.position, tg: a === target, cov: cov === 'cover1' ? 'Man' : 'Zone', route: r.route, tr: r.tr });
}
console.log(out.length, 'receiver-plays'); if (OUT) writeFileSync(OUT, JSON.stringify(out));
