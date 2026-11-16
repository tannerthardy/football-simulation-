// Live mirrored pairs (Run Game, 2026-11-16): full plays with a real defence, flipped and not, same seed, ball centred;
// every body in the ball-relative mirrored frame each tick; report each pair's first differing tick and body.
//   node scripts/ref.mjs [--flag MIRROR_SCATTER=1] -- npx tsx scripts/diag/mirror/live-mirror.mts [seeds=4]
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seeds = Number(process.argv[2] ?? 4);
const plays: Array<[string, string, string]> = [['gun_doubles_11', 'smash', 'cover3'], ['gun_doubles_11', 'four_verts', 'cover1'], ['gun_trips_11', 'y_cross', 'cover2'],
  ['gun_doubles_11', 'hitches', 'cover3_mable'], ['gun_trips_11', 'flood', 'cover1'], ['gun_empty_11', 'smash', 'cover4']];
function run(form: string, conc: string, cov: string, seed: number, flip: boolean) {
  const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
  const formation = FORMATION_BY_ID[form];
  const sim: any = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: PASS_BY_ID[conc], label: conc },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov } as any,
    los: 40, ballY: CENTER_Y, firstDownX: 50, down: 1, seed } as any);
  // The line keeps absolute names when the formation flips: a flipped LT's mirror is the unflipped RT.
  const SWAP: Record<string, string> = { LT: 'RT', RT: 'LT', LG: 'RG', RG: 'LG' };
  const ss = sim.offAlign.strongSign, rows: string[][] = [];
  const name = (a: any) => (flip && SWAP[a.slot]) || a.slot;
  const rec = () => rows.push(sim.agents.map((a: any) => `${name(a)}:${(a.pos.x - sim.los).toFixed(4)},${((a.pos.y - sim.ballY) * ss).toFixed(4)}`).sort());
  rec(); const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); if (sim.t <= 3.0 + 1e-9) rec(); };
  sim.run(); return rows;
}
let same = 0, total = 0; const firsts: string[] = [];
for (const [f, c, v] of plays) for (let s = 1; s <= seeds; s++) {
  const A = run(f, c, v, 1000 * s + 7, false), B = run(f, c, v, 1000 * s + 7, true); total++;
  const n = Math.min(A.length, B.length);
  const k = Array.from({ length: n }, (_, i) => i).find((i) => A[i].join('|') !== B[i].join('|'));
  if (k === undefined) { same++; continue; }
  const who = A[k].filter((x, i) => x !== B[k][i]).map((x) => x.split(':')[0]);
  firsts.push(`${f} ${c} ${v} s${s}: tick ${k} (t ${(k * 0.05).toFixed(2)}) ${who.slice(0, 4).join(',')}${who.length > 4 ? '…' : ''}`);
}
console.log(`mirrored pairs agreeing to 3.0 s: ${same}/${total}`); for (const x of firsts) console.log('  ' + x);
