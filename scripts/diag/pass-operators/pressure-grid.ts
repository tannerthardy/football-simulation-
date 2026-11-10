// Pass plays vs pressure looks: sacks, time to first defender within 2 yd of the QB, unblocked rushers, yards.
import { writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURES } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
const forms = ['gun_doubles_11', 'gun_trips_11', 'ace_11', 'gun_empty_11'];
const passes = ['curl_flat', 'smash', 'dagger', 'four_verts'];
const press = [null, ...PRESSURES.map(p => p.id)];
const teams = [1, 2, 3].map(i => ({ o: generateTeam(new Rng(100 + i), 'O', 'O', { strength: .55 }), d: generateTeam(new Rng(200 + i), 'D', 'D', { strength: .55 }) }));
const rows: any[] = []; let n = 0;
for (const pid of press) for (const fid of forms) for (const cid of passes) for (const flip of [false, true]) for (const t of [0, 1]) {
  const formation = FORMATION_BY_ID[fid]; const T = teams[(n + t) % 3];
  const P = pid ? PRESSURES.find(p => p.id === pid)! : null;
  let sim: PlaySim; try { sim = new PlaySim({ offense: pickOffense(T.o, formation.personnel), defense: pickDefense(T.d, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: PASS_BY_ID[cid], label: cid },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[P?.coverage ?? 'cover3'] ?? COVERAGE_BY_ID.cover3, pressure: P, label: pid ?? 'none' } as any,
    los: 35 + (n % 3) * 10, ballY: [23.6, 26.65, 29.7][n % 3], firstDownX: 55, seed: 5000 + n, audibles: false } as any); } catch (e) { n++; continue; }
  n++;
  let close = -1; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (close < 0 && sim.throwAt < 0 && sim.defense.some(d => Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2)) close = sim.t; };
  const r: any = sim.run(); const s: any = sim.stats;
  rows.push({ pid: pid ?? 'none', fid, cid, flip, t, y: r.yards, sack: !!s.sacked, close, ttt: sim.throwAt, comp: !!s.completed, int: r.events.some((e: any) => e.type === 'interception') });
}
writeFileSync(process.argv[2], JSON.stringify(rows)); console.log(rows.length);
