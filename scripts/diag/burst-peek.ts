/** Sprint-start parameters by position group and the speed a straight start reaches at 0.5 s (development aid). */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { derivePhysical } from '../../src/players/physical.js';
import { stepBody, type Body } from '../../src/physics/kinematics.js';
const rng = new Rng(Number(process.argv[2] ?? 3));
const groups: Record<string, Array<{ vmax: number; tau: number; v05: number; m: number; ten: number; forty: number }>> = {};
for (let t = 0; t < 4; t++) {
  const team = generateTeam(rng, 'T', 'TTT', { strength: 0.55 });
  for (const p of team.roster) {
    const prof = derivePhysical(p);
    const b: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: prof };
    for (let k = 0; k < 10; k++) stepBody(b, { vel: { x: prof.vmax, y: 0 } }, 0.05);
    (groups[p.position] ??= []).push({ vmax: prof.vmax, tau: prof.tau, v05: b.vel.x, m: prof.massKg, ten: p.measurables.tenSplit, forty: p.measurables.forty });
  }
}
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
for (const [g, xs] of Object.entries(groups)) console.log(`${g.padEnd(5)} n ${String(xs.length).padStart(3)} mass ${avg(xs.map((x) => x.m)).toFixed(0)} 10yd ${avg(xs.map((x) => x.ten)).toFixed(2)} 40 ${avg(xs.map((x) => x.forty)).toFixed(2)} vmax ${avg(xs.map((x) => x.vmax)).toFixed(2)} tau ${avg(xs.map((x) => x.tau)).toFixed(2)} a0 ${avg(xs.map((x) => x.vmax / x.tau)).toFixed(2)} v@0.5s ${avg(xs.map((x) => x.v05)).toFixed(2)}`);
