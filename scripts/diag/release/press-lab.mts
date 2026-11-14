// Press-release lab (Run Game, 2026-11-14): staged dropbacks against press, written in the common play format so
// scripts/diag/release/press-release.py measures them with the same code as NFL tracking. Our league games almost
// never press (9 pressed outside receivers in 32 games), so the sim side comes from here.
//   npx tsx scripts/diag/release/press-lab.mts --cov cover1,cover3_mable --seeds 12 [--solo] --out out/release/lab.jsonl.gz
// --solo calls both corners' technique 'solo' (CORNER_SIDE cornerTech; the SOLO_JAM fixture's call), where supported.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const covs = arg('--cov', 'cover1').split(','), seeds = Number(arg('--seeds', '12')), solo = process.argv.includes('--solo');
const OUT = arg('--out', 'out/release/lab.jsonl.gz');
const GROUP: Record<string, string> = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', OG: 'OL', C: 'OL', EDGE: 'DL', DT: 'DL', LB: 'LB', CB: 'DB', S: 'DB' };
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const lines: string[] = []; const r2 = (v: number) => Math.round(v * 100) / 100;
for (const cov of covs) for (const [form, conc] of [['gun_trips_11', 'four_verts'], ['gun_doubles_11', 'four_verts'], ['gun_doubles_11', 'comebacks']])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    const formation = FORMATION_BY_ID[form], c = PASS_BY_ID[conc];
    if (!formation || !c || !COVERAGE_BY_ID[cov]) continue;
    let sim: any;
    try {
      sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
        offCall: { formation, flip, kind: 'pass', pass: c, label: conc },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov,
          ...(solo ? { cornerTech: { S: 'solo', W: 'solo' } } : {}) } as any,
        los: 35, ballY: CENTER_Y, firstDownX: 45, down: 1, seed: 1000 * seed + 7 + (flip ? 1 : 0) } as any);
    } catch (e) { console.error(String(e)); continue; }
    const xy: number[][] = []; const ev: Record<string, number> = {};
    const routes = sim.agents.map((a: any) => a.behavior instanceof RouteRunner ? `${a.behavior.route.family}:${a.behavior.route.id}` : null);
    const record = () => { const row: number[] = []; for (const a of sim.agents) row.push(r2(a.pos.x - sim.los), r2(a.pos.y)); xy.push(row); };
    record();
    const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0(); const k = Math.round(sim.t / 0.1); if (Math.abs(sim.t - k * 0.1) < 1e-6 && k === xy.length) record();
      if (ev.pass_forward === undefined && sim.ball.kind === 'air') ev.pass_forward = r2(sim.t); };
    const res = sim.run(); ev.end = r2(sim.t);
    lines.push(JSON.stringify({ id: `${cov}${solo ? '-solo' : ''}-${form}-${conc}-s${seed}${flip ? 'f' : ''}`, source: 'sim', kind: 'pass', yards: res.yards,
      players: sim.agents.map((a: any, i: number) => ({ side: a.team, group: GROUP[a.player.position] ?? 'OTHER', slot: a.slot, route: routes[i] })),
      dt: 0.1, xy, ball_y: r2(sim.ballY), events: ev, cell: { concept: conc, coverage: cov } }));
  }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, gzipSync(lines.join('\n') + '\n'));
console.log(`wrote ${lines.length} plays -> ${OUT}`);
