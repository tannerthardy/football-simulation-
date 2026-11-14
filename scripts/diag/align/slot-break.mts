/** MAN_SLOT residue (2): from catch depth, is the slot defender in phase too easily on breaking routes? On slot-man.mts's
 * fixture, for #2 slant / cross / in / drag routes: when #2 breaks (his heading turns 45+ deg off his stem), when his man
 * defender's heading follows (turns 45+ deg toward #2's new line), the lag, the separation at the break and 0.3 / 0.6 s
 * after, the defender's depth over #2 at the break, and the outcome when #2 is thrown to. Also what the defender's
 * picture of #2 was (sim.see age) at the break.
 *   MAN_SLOT=1 npx tsx slot-break.mts [seeds] */
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
const ang = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 180 / Math.PI;
const rows: any[] = [];
for (const id of CONCEPTS) for (const cov of ['cover1_off', 'cover1_lurk']) for (const [down, dist] of [[1, 10], [3, 5]]) for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
  const formation = FORMATION_BY_ID.gun_spread_10, c = PASS_BY_ID[id];
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: c, label: id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
    los: 35, ballY: CENTER_Y, firstDownX: 35 + dist, down, seed: 1000 * seed + 7 + (flip ? 1 : 0) });
  const sideOf = (['S', 'W'] as const).find((sd) => { const r = sim.offAlign.numbering[`${sd}2`]; return r && !sim.offAlign.spots[r].inline; });
  if (!sideOf) continue;
  const slot = sim.offAlign.numbering[`${sideOf}2`], two = sim.slot(slot);
  const route = (sideOf === 'S' ? c.strong : c.weak)?.[2] ?? '?';
  if (!/slant|cross|drag|shallow|^in$|short_in|dig/.test(route)) continue;
  const man = sim.defense.find((d: any) => sim.defAlign.spots[d.slot]?.manTarget === slot);
  if (!man) continue;
  let stem: number | null = null, brk = NaN, follow = NaN, sepB = NaN, sep3 = NaN, sep6 = NaN, overB = NaN, ageB = NaN, target: any = null, caught = false;
  const sep = () => Math.hypot(man.pos.x - two.pos.x, man.pos.y - two.pos.y);
  while (sim.phase !== 'dead' && sim.t < 6) {
    if (sim.ball.kind === 'air' && !target) target = sim.ball.target;
    sim.tick();
    const sp = Math.hypot(two.vel.x, two.vel.y), h = Math.atan2(two.vel.y, two.vel.x);
    if (stem === null && sp > 3 && sim.t > 0.4) stem = h;
    if (stem !== null && Number.isNaN(brk) && sp > 2 && ang(h, stem) > 45) {
      brk = sim.t; sepB = sep(); overB = (man.pos.x - two.pos.x) * sim.attackDir('O');
      const seen = sim.see(man, two); ageB = seen.age !== undefined ? sim.t - seen.age : NaN;
    }
    if (!Number.isNaN(brk) && Number.isNaN(follow) && Math.hypot(man.vel.x, man.vel.y) > 1.5 && ang(Math.atan2(man.vel.y, man.vel.x), h) < 45) follow = sim.t;
    if (!Number.isNaN(brk) && Number.isNaN(sep3) && sim.t >= brk + 0.3 - 1e-9) sep3 = sep();
    if (!Number.isNaN(brk) && Number.isNaN(sep6) && sim.t >= brk + 0.6 - 1e-9) sep6 = sep();
    if (target === two && sim.ball.kind === 'held' && sim.ball.carrier === two) caught = true;
  }
  rows.push({ route, brk, lag: follow - brk, sepB, sep3, sep6, overB, ageB, thrown: target === two, caught });
}
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
console.log(`== MAN_SLOT=${process.env.MAN_SLOT ?? 0}: #2 breaking routes n ${rows.length}`);
for (const r of [...new Set(rows.map(x => x.route))].sort()) {
  const R = rows.filter(x => x.route === r), T = R.filter(x => x.thrown);
  console.log(`   ${r.padEnd(10)} n ${R.length} | break at ${q(R.map(x => x.brk))} s | defender follows after ${q(R.map(x => x.lag))} s | his picture's age then ${q(R.map(x => x.ageB))} s | over #2 at the break ${q(R.map(x => x.overB))} | separation at the break ${q(R.map(x => x.sepB))}, +0.3 s ${q(R.map(x => x.sep3))}, +0.6 s ${q(R.map(x => x.sep6))} | thrown ${T.length}, caught ${T.filter(x => x.caught).length}`);
}
