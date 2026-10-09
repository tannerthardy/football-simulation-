/** Physical profiles of a few lab slots (development aid). node --import tsx scripts/diag/profile-peek.ts [seed] */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const rng = new Rng(Number(process.argv[2] ?? 11));
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 }), def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'),
  offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.nextU32() });
for (const s of ['Z', 'FS', 'CB_S', 'RB', 'MLB', 'LT']) { const a = sim.slot(s); if (!a) continue; const p = a.profile;
  console.log(s, JSON.stringify({ m: p.massKg.toFixed(0), vmax: p.vmax.toFixed(2), tau: p.tau?.toFixed(2), brake: p.brake.toFixed(2), lateral: p.lateral.toFixed(2), power: p.power?.toFixed(2), reach: p.reach.toFixed(2), r: p.radius.toFixed(2), react: p.reactionTime.toFixed(2), tackling: a.r('tackling').toFixed(2), pursuit: a.r('pursuit').toFixed(2) })); }
