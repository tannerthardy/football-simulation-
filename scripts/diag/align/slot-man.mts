/** The slot against off man (MAN_SLOT witnesses, 2026-11-14): #2's routes against cover1_off and cover1_lurk, seeds
 * 1..N, both flips, gun doubles, on 1st and 10 and on 3rd and 5. Per play: #2's route, his separation from his man (the defender assigned to him) at 1.0 and
 * 1.5 s, and if he is thrown to: caught, yards.
 *   node --import tsx scripts/diag/align/slot-man.mts [seeds] */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 12);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const CONCEPTS = ['stick', 'slant_flat', 'hitches', 'seam_slant', 'double_slants', 'quick_outs', 'four_verts', 'mesh', 'y_cross', 'hitch_post', 'verts_hitch', 'fade_flat', 'post_cross', 'hitch_cross'];
type Row = { open: number; fsThrow: number; fsArr: number; depth0: number; route: string; s10: number; s15: number; thrown: boolean; caught: boolean; yards: number };
const rows: Row[] = [];
for (const id of CONCEPTS) for (const cov of ['cover1_off', 'cover1_lurk']) for (const [down, dist] of [[1, 10], [3, 5]]) for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
  const formation = FORMATION_BY_ID.gun_spread_10, c = PASS_BY_ID[id];
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: c, label: id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
    los: 35, ballY: CENTER_Y, firstDownX: 35 + dist, down, seed: 1000 * seed + 7 + (flip ? 1 : 0) });
  // The detached #2 (a slot, not an attached end), on either side, with his route.
  // --one: the outside #1 instead (the off-corner control).
  const num = process.argv.includes('--one') ? 1 : 2;
  const sideOf = (['S', 'W'] as const).find((sd) => { const r = sim.offAlign.numbering[`${sd}${num}`]; return r && !sim.offAlign.spots[r].inline; });
  if (!sideOf) continue;
  const slot = sim.offAlign.numbering[`${sideOf}${num}`]; const two = sim.slot(slot);
  const route = (sideOf === 'S' ? c.strong : c.weak)?.[num] ?? '?';
  const man = sim.defense.find((d: any) => sim.defAlign.spots[d.slot]?.manTarget === slot);
  if (!man) continue;
  const depth0 = man.pos.x - sim.los;
  const sep = () => Math.hypot(man.pos.x - two.pos.x, man.pos.y - two.pos.y);
  let s10 = NaN, s15 = NaN, target: any = null, caught = false, open = NaN, fsThrow = NaN, fsArr = NaN;
  const fs = sim.defense.find((d: any) => d.slot === 'FS');
  const fsd = () => fs ? Math.hypot(fs.pos.x - two.pos.x, fs.pos.y - two.pos.y) : NaN;
  while (sim.phase !== 'dead' && sim.t < 8) {
    if (sim.ball.kind === 'air' && !target) { target = sim.ball.target; fsThrow = fsd(); }
    sim.tick();
    if (Number.isNaN(open) && man.behavior?.recordedTechnique?.()?.hipsOpen) open = sim.t;
    if (target === two && Number.isNaN(fsArr) && sim.ball.kind !== 'air') fsArr = fsd();
    if (Number.isNaN(s10) && sim.t >= 1.0 - 1e-9) s10 = sep();
    if (Number.isNaN(s15) && sim.t >= 1.5 - 1e-9) s15 = sep();
    const h = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (target === two && h === two) caught = true;
  }
  const end = sim.endSpot?.x ?? two.pos.x;
  rows.push({ open, fsThrow, fsArr, depth0, route, s10, s15, thrown: target === two, caught, yards: target === two ? end - sim.los : NaN });
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
for (const r of [...new Set(rows.map((x) => x.route))].sort()) {
  const R = rows.filter((x) => x.route === r), T = R.filter((x) => x.thrown), C = T.filter((x) => x.caught);
  console.log(`${r.padEnd(12)} n ${String(R.length).padStart(3)} | his man at the snap ${med(R.map((x) => x.depth0)).toFixed(1)} deep, hips open at ${med(R.map((x) => x.open)).toFixed(2)} s | FS to #2 at throw/arrival (thrown) ${med(T.map((x) => x.fsThrow)).toFixed(1)}/${med(T.map((x) => x.fsArr)).toFixed(1)} | sep 1.0 s p50 ${med(R.map((x) => x.s10)).toFixed(2)} 1.5 s ${med(R.map((x) => x.s15)).toFixed(2)} | thrown ${String(T.length).padStart(3)} caught ${T.length ? (100 * C.length / T.length).toFixed(0) : '-'}% yards mean ${T.length ? (T.reduce((s, x) => s + x.yards, 0) / T.length).toFixed(1) : '-'}`);
}
