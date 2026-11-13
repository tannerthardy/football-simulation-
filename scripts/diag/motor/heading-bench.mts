/** Coverage's question (2026-11-10): does the motor converge a pursuer's heading onto his command slowly while he is
 * accelerating? One generated DB on the real World, no game: moving at v0 along +x, he is commanded a velocity of
 * speed vc at angle th off his travel and holds it. Reports, every 0.1 s to 1.0 s, the angle between his velocity and
 * the command (the heading lag), his speed, and the lateral and longitudinal components of his acceleration.
 * Compared: accelerating (v0 4 -> vc 9), constant speed (v0 = vc = 4 and 7), and decelerating (7 -> 4).
 * usage: node --import tsx scripts/diag/motor/heading-bench.mts [--seed 3] */
import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { newSupport } from '../../../src/physics/support.js';
import { World } from '../../../src/physics/world.js';
const seed = process.argv.includes('--seed') ? Number(process.argv[process.argv.indexOf('--seed') + 1]) : 3;
const profile = derivePhysical(generatePlayer(new Rng(seed), 'CB'));
const D = (a: number) => a * 180 / Math.PI;
function run(v0: number, vc: number, thDeg: number) {
  const b: any = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy: 1, profile, support: newSupport(0.2) };
  const w = new World([b]); const th = thDeg * Math.PI / 180, cmd = { x: vc * Math.cos(th), y: vc * Math.sin(th) };
  const out: string[] = [];
  for (let k = 1; k <= 20; k++) {
    const v = { ...b.vel };
    w.step([{ vel: cmd, facing: th } as any], 0.05);
    const ax = (b.vel.x - v.x) / 0.05, ay = (b.vel.y - v.y) / 0.05, sp = Math.hypot(b.vel.x, b.vel.y), h = Math.atan2(b.vel.y, b.vel.x);
    const along = (ax * b.vel.x + ay * b.vel.y) / (sp || 1), lat = Math.abs(-ax * b.vel.y + ay * b.vel.x) / (sp || 1);
    if (k % 2 === 0 && k <= 10 || k === 20) out.push(`+${(k * 0.05).toFixed(1)} lag ${D(Math.abs(th - h)).toFixed(0).padStart(3)} v ${sp.toFixed(1)} a_long ${along.toFixed(1).padStart(4)} a_lat ${lat.toFixed(1).padStart(4)}`);
  }
  return out.join(' | ');
}
console.log(`CB ${profile.massKg.toFixed(0)} kg vmax ${profile.vmax.toFixed(1)} yd/s (seed ${seed}); command held at angle th off his travel; lag = |command - velocity heading| (deg)`);
for (const th of [10, 20, 30]) for (const [v0, vc, label] of [[4, 9, 'accelerating 4 -> 9'], [4, 4, 'constant 4'], [7, 7, 'constant 7'], [7, 4, 'decelerating 7 -> 4']] as const)
  console.log(`  th ${th} ${label.padEnd(20)} ${run(v0, vc, th)}`);
