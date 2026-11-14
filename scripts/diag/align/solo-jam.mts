/** SOLO_JAM witnesses: trips four verticals (gun_trips_11, four_verts) against Cover 3 Mable with the solo (backside)
 * corner called to press (CORNER_SIDE cornerTech solo), and the Cover 1 press comparison; seeds 1..N x flips. Per play:
 * whether the backside corner jammed #1 ('jam' event by him), #1's lateral movement by the time he is 1 yd past the
 * line, his time to 5 yd, the corner's trail at 3.0 s, and if #1 is thrown to deep (10+ air yd): caught.
 *   CORNER_SIDE=1 [SOLO_JAM=1] npx tsx solo-jam.mts [seeds] */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 6);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const rows: any[] = [];
for (const cov of ['cover3_mable', 'cover1']) for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
  const formation = FORMATION_BY_ID.gun_trips_11, c = PASS_BY_ID.four_verts;
  let sim: any;
  try {
    sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip, kind: 'pass', pass: c, label: 'four_verts' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov, cornerTech: { S: 'solo', W: 'solo' } },
      los: 35, ballY: CENTER_Y, firstDownX: 45, down: 1, seed: 1000 * seed + 7 + (flip ? 1 : 0) });
  } catch (e) { console.error(String(e)); continue; }
  // The backside (weak) #1 and the corner on him.
  const one = sim.slot(sim.offAlign.numbering.W1); if (!one) continue;
  const cb = sim.defense.find((d: any) => sim.defAlign.spots[d.slot]?.manTarget === one.slot) ?? sim.defense.find((d: any) => d.slot === 'CB_W');
  if (!cb) continue;
  const dir = sim.attackDir('O'), y0 = one.pos.y;
  let lat1 = NaN, t5 = NaN, trail3 = NaN, deep = false, caught = false, target: any = null;
  const pressed = !!sim.defAlign.spots[cb.slot]?.press;
  while (sim.phase !== 'dead' && sim.t < 6) {
    if (sim.ball.kind === 'air' && !target) { target = sim.ball.target; deep = (sim.ball.intended.x - sim.los) * dir >= 10; }
    sim.tick();
    const d = (one.pos.x - sim.los) * dir;
    if (Number.isNaN(lat1) && d >= 1) lat1 = Math.abs(one.pos.y - y0);
    if (Number.isNaN(t5) && d >= 5) t5 = sim.t;
    if (Number.isNaN(trail3) && sim.t >= 3 - 1e-9) trail3 = (one.pos.x - cb.pos.x) * dir;
    if (target === one && sim.ball.kind === 'held' && sim.ball.carrier === one) caught = true;
  }
  const jam = sim.events.some((e: any) => e.type === 'jam' && e.a === cb.idx);
  rows.push({ cov, pressed, jam, lat1, t5, trail3, deepTo: target === one && deep, caught });
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1].toFixed(2) : '-'; };
console.log(`== CORNER_SIDE=${process.env.CORNER_SIDE ?? 0} SOLO_JAM=${process.env.SOLO_JAM ?? 0}`);
for (const cov of ['cover3_mable', 'cover1']) {
  const R = rows.filter(r => r.cov === cov), D = R.filter(r => r.deepTo);
  console.log(`   ${cov}: n ${R.length} | pressed ${R.filter(r => r.pressed).length} | jammed ${R.filter(r => r.jam).length} | #1 lateral by 1 yd ${med(R.map(r => r.lat1))} | to 5 yd ${med(R.map(r => r.t5))} s | #1 ahead of the corner at 3.0 s ${med(R.map(r => r.trail3))} yd | deep to #1 ${D.length}, caught ${D.filter(r => r.caught).length}`);
}
