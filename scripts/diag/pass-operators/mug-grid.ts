// Double mug (Even front) vs pass: each mug package plus the bail. Free rusher = first defender within 2 yd
// of the QB before the throw who was never engaged by a blocker.
import { writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
const forms = ['gun_doubles_11', 'gun_trips_11', 'gun_empty_11', 'ace_11'];
const passes = ['curl_flat', 'smash', 'dagger', 'four_verts', 'stick', 'mesh'];
const pk: [string | null, string][] = [[null, 'cover2'], ['mug_one', 'cover1'], ['mug_sim', 'cover3'], ['mug_fire', 'cover3'], ['mug_both', 'cover0']];
const teams = [1, 2, 3].map(i => ({ o: generateTeam(new Rng(100 + i), 'O', 'O', { strength: .55 }), d: generateTeam(new Rng(200 + i), 'D', 'D', { strength: .55 }) }));
const rows: any[] = []; let n = 0, fail = 0;
for (const [pid, cov] of pk) for (const fid of forms) for (const cid of passes) for (const flip of [false, true]) for (const t of [0, 1]) {
  const formation = FORMATION_BY_ID[fid]; const T = teams[(n + t) % 3];
  let sim: PlaySim; try { sim = new PlaySim({ offense: pickOffense(T.o, formation.personnel), defense: pickDefense(T.d, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: PASS_BY_ID[cid], label: cid },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.even ?? FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: pid ? PRESSURE_BY_ID[pid] : null, mug: 2, label: pid ?? 'bail' } as any,
    los: 35 + (n % 3) * 10, ballY: [23.6, 26.65, 29.7][n % 3], firstDownX: 55, seed: 9000 + n, audibles: false } as any); } catch (e) { n++; fail++; continue; }
  n++;
  const touched = new Set<number>(); let close = -1, free = false; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); for (const o of sim.offense) if (o.engagement) touched.add(o.engagement.defender.idx);
    if (close < 0 && sim.throwAt < 0) { const c = sim.defense.find(d => Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2); if (c) { close = sim.t; free = !touched.has(c.idx); } } };
  const r: any = sim.run(); const s: any = sim.stats;
  rows.push({ pid: pid ?? 'bail', fid, cid, flip, t, y: r.yards, sack: !!s.sacked, close, free, comp: !!s.completed });
}
writeFileSync(process.argv[2], JSON.stringify(rows)); console.log(rows.length, 'fail', fail);
