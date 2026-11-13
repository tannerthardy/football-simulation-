/** tsx scripts/diag/route-releases.mts [SEEDS=4] [OUT]
 * Ordinary (non-screen) pass releases in the sim: every PASS_CONCEPT from four
 * formations vs four calls, positions every 0.1 s to 1.4 s, each detached
 * WR/TE labelled with the route he ran. Same common format as screen-lab. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_CONCEPTS } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const SEEDS = Number(process.argv[2] ?? 4);
const FORMS = ['gun_doubles_11', 'gun_trips_11', 'gun_bunch_11', 'ace_11'];
const DEFENSES = [
  { label: 'C3', front: 'over', coverage: 'cover3', pressure: null },
  { label: 'C1', front: 'over', coverage: 'cover1', pressure: null },
  { label: 'C2', front: 'over', coverage: 'cover2', pressure: null },
  { label: 'C1MA', front: 'over', coverage: 'cover1', pressure: 'mike_a' },
];
const GROUP: Record<string, string> = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', OG: 'OL', C: 'OL', EDGE: 'DL', DT: 'DL', LB: 'LB', CB: 'DB', S: 'DB' };
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const r2 = (v: number) => Math.round(v * 100) / 100;
const lines: string[] = [];
for (const fid of FORMS) for (const concept of PASS_CONCEPTS) for (const def of DEFENSES) for (let seed = 1; seed <= SEEDS; seed++) {
  const formation = FORMATION_BY_ID[fid];
  const sim: any = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: concept, label: concept.name },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID[def.front], coverage: COVERAGE_BY_ID[def.coverage],
      pressure: def.pressure ? PRESSURE_BY_ID[def.pressure] : null, label: def.label },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7,
  });
  const xy: number[][] = [];
  const rec = () => { const row: number[] = []; for (const a of sim.agents) row.push(r2(a.pos.x - sim.los), r2(a.pos.y)); xy.push(row); };
  rec();
  let thrown: number | null = null;
  while (sim.phase !== 'done' && sim.t < 1.4 - 1e-9) {
    sim.tick();
    const k = Math.round(sim.t / 0.1);
    if (Math.abs(sim.t - k * 0.1) < 1e-6 && k === xy.length) rec();
    if (thrown === null && (sim.events as any[]).some(e => e.type === 'throw')) thrown = sim.t;
  }
  const routes = sim.agents.map((a: any) => a.team === 'O' ? (a.behavior?.route?.id ?? a.behavior?.kind ?? a.behavior?.constructor?.name ?? '') : '');
  lines.push(JSON.stringify({ id: `${fid}|${concept.id}|${def.label}|${seed}`, kind: 'pass', dt: 0.1, xy, ball_y: r2(sim.ballY), throw: thrown,
    players: sim.agents.map((a: any) => ({ side: a.team, group: GROUP[a.player.position] ?? 'OTHER' })), routes }));
}
const OUT = process.argv[3] ?? 'out/screens/sim-releases.jsonl.gz';
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, gzipSync(lines.join('\n') + '\n'));
console.log(`wrote ${lines.length} plays`);
