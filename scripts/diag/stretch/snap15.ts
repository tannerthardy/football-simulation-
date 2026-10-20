/** Snapshot of every defender when the carrier first reaches REF yd past the
 * line (observation only): slot, position relative to the carrier (dx + is
 * downfield of him, dy lateral), speed and how much of it is toward him,
 * facing relative to the bearing to him, engagement partner, behavior and
 * run-fit job. Flags from the environment.
 * node --import tsx scripts/diag/stretch/snap15.ts CASE_ID [REF=15] */
import { makeSim, rosters, type LabCase } from '../zone-lab/lab.js';
const [id, ref = '15'] = process.argv.slice(2);
const [concept, dir, formation, look, roster, seed] = id.split('/');
const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation } as LabCase, rosters());
const sgn = sim.attackDir('O');
const deg = (r: number) => Math.round(((r * 180 / Math.PI + 540) % 360) - 180);
while (sim.phase === 'live' && sim.t < 12) {
  sim.tick();
  const c = sim.carrier;
  if (!c || c.team !== 'O' || (c.pos.x - sim.los) * sgn < Number(ref)) continue;
  console.log(`${id} t ${sim.t.toFixed(2)} carrier +${((c.pos.x - sim.los) * sgn).toFixed(1)} y ${c.pos.y.toFixed(1)} speed ${c.speed.toFixed(1)} heading ${deg(Math.atan2(c.vel.y, c.vel.x))}`);
  for (const d of [...sim.defense].sort((a, b) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) - Math.hypot(b.pos.x - c.pos.x, b.pos.y - c.pos.y))) {
    const dx = (d.pos.x - c.pos.x) * sgn, dy = d.pos.y - c.pos.y, dist = Math.hypot(dx, dy);
    const toC = Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x);
    const toward = (d.vel.x * Math.cos(toC) + d.vel.y * Math.sin(toC));
    const e = d.engagement as any;
    console.log(`  ${d.slot.padEnd(5)} dist ${dist.toFixed(1).padStart(5)} dx ${dx.toFixed(1).padStart(6)} dy ${dy.toFixed(1).padStart(6)} speed ${d.speed.toFixed(1)} toward ${toward.toFixed(1).padStart(5)} face-off ${String(Math.abs(deg(d.body.facing - toC))).padStart(4)} ${e ? 'ENG by ' + (e.blocker === d ? e.defender : e.blocker).slot : d.isDown(sim.t) ? 'DOWN' : 'free'} ${d.behavior.kind}/${d.runFit?.kind ?? '-'}`);
  }
  break;
}
