/** The target's speed through the flight of a deep ball (a staged throw at 2.2 s to the X receiver on a go): speed at 0.25 s steps after the release, the trunk twist he
 * carries (looking back for the ball), and his depth at arrival. usage: [DIR_CAP=1] node --import tsx scripts/diag/route-speed/sim_flight_speed.ts [N=24] [concept=y_cross... default four_verts] [slot X] */
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 24), concept = process.argv[3] ?? 'four_verts', slot = process.argv[4] ?? 'X', at = Number(process.env.AT ?? 2.2);
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : NaN; };
const rows: { sp: number[]; tw: number[]; depth: number }[] = [];
for (const cov of ['cover3', 'cover1']) for (let seed = 1; seed <= N; seed++) {
  const offense = generateTeam(new Rng(51), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(52), 'D', 'DEF', { strength: .55 });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, zoneStyle: 'spot', label: cov }, los: 40, ballY: 26, firstDownX: 50, seed, stagedThrow: { at, slot } } as never);
  let rel = -1; const sp: number[] = [], tw: number[] = []; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (sim.ball?.kind === 'air' && rel < 0) rel = sim.t;
    if (rel >= 0 && sim.ball?.kind === 'air') { const tgt = sim.ball.target ?? sim.offense.find((a: any) => a.slot === slot); const a = sim.offense.find((x: any) => x.slot === slot) ?? tgt;
      const k = Math.round((sim.t - rel) / 0.25); if (k >= 0 && k < 10 && Math.abs((sim.t - rel) - k * 0.25) < sim.dt / 2 + 1e-6) { sp[k] = Math.hypot(a.vel.x, a.vel.y); tw[k] = Math.abs(a.body.trunk ?? 0) * 180 / Math.PI; } } };
  sim.run(); const a = sim.offense.find((x: any) => x.slot === slot);
  if (rel >= 0) rows.push({ sp, tw, depth: a ? a.pos.x - 40 : NaN });
}
console.log(`${concept}/${slot}: ${rows.length} throws`);
console.log('speed after the release at 0 / .25 / .5 / ... s: ' + [0, 1, 2, 3, 4, 5, 6].map(k => med(rows.map(r => r.sp[k])).toFixed(2)).join(' / '));
console.log('trunk twist (deg):                               ' + [0, 1, 2, 3, 4, 5, 6].map(k => med(rows.map(r => r.tw[k])).toFixed(0)).join(' / '));
