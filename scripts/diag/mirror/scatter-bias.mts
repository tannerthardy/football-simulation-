// MIRROR_SCATTER: the scatter's signed mean relative to each defender's own side (+ = wide of his landmark), off vs on
// (Run Game, 2026-11-16). Off, the applied lateral offset is the draw in absolute field y, so relative to his side it is
// draw × side; on, it is the draw itself. Over many plays both should average about 0; a real bias (every defender
// shading toward one sideline, which the absolute form would hide as "wide" on one side and "tight" on the other)
// would show as a signed mean that differs by side.
//   npx tsx scripts/diag/mirror/scatter-bias.mts [plays=400]
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { scatterSide } from '../../../src/playbook/alignment.js';
const N = Number(process.argv[2] ?? 400);
const forms = ['gun_doubles_11', 'gun_trips_11', 'i_form_21', 'singleback_11'].filter((f) => FORMATION_BY_ID[f]);
const covs = ['cover3', 'cover1', 'cover2', 'cover4'];
const acc: Record<string, number[]> = { errOff: [], errOn: [], scOff: [], scOn: [], errOffL: [], errOffR: [] };
const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
for (let i = 0; i < N; i++) {
  const formation = FORMATION_BY_ID[forms[i % forms.length]];
  const sim: any = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
    offCall: { formation, flip: i % 2 === 1, kind: 'pass', pass: PASS_BY_ID.smash, label: 'smash' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[covs[i % covs.length]], pressure: null, label: 'x' } as any,
    los: 40, ballY: CENTER_Y, firstDownX: 50, down: 1, seed: 7000 + i } as any);
  for (const d of sim.defense) {
    const sp = sim.defAlign.spots[d.slot]; if (!sp) continue;
    const side = scatterSide(sim.offAlign, sp.pos.y), e = d.mind.alignmentError;
    acc.errOff.push(e * side); acc.errOn.push(e); (side > 0 ? acc.errOffR : acc.errOffL).push(e);
    const j = sim.defStyle.scatter?.[d.slot]; if (j && !sp.press && sp.pos.x - sim.los > 2) { acc.scOff.push(j.y * side); acc.scOn.push(j.y); }
  }
}
const m = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length), se = (v: number[]) => Math.sqrt(m(v.map((x) => (x - m(v)) ** 2)) / Math.max(1, v.length));
console.log(`plays ${N}; alignment error, mean relative to his side (+ wide): off ${m(acc.errOff).toFixed(4)} (SE ${se(acc.errOff).toFixed(4)}, n ${acc.errOff.length}), on ${m(acc.errOn).toFixed(4)} (SE ${se(acc.errOn).toFixed(4)})`);
console.log(`  off, raw absolute-y draw by side: +y side ${m(acc.errOffR).toFixed(4)} (n ${acc.errOffR.length}), -y side ${m(acc.errOffL).toFixed(4)} (n ${acc.errOffL.length})`);
console.log(`ALIGN_HABIT lateral scatter (off-ball, non-press), mean relative to his side: off ${m(acc.scOff).toFixed(4)} (SE ${se(acc.scOff).toFixed(4)}, n ${acc.scOff.length}), on ${m(acc.scOn).toFixed(4)} (SE ${se(acc.scOn).toFixed(4)})`);
