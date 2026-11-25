/** A lone linebacker's start from a near standstill with the hips turned off the command, in the World: speed along the command at +0.05 / +0.25 / +0.5 s and the hips' angle off the command,
 * by the starting angle and speed. No contact, no controller: the intent is the full-speed command and the facing the controller's own (`commandFacing`: the hips lead the path, a plant below PLANT_SPEED squares at once).
 *   node --import tsx scripts/diag/body/facing-start-bench.mts
 * Run Game's shed-recovery case (n 62 LBs, develop + run/tackle-repair): command/vmax 0.99-1.00, balanced, not held; speed 1.55 / 2.04 / 2.38 yd/s at +0.05 / +0.25 / +0.5 s with the facing 65 / 52 / 31 degrees off the command. */
import type { Body } from '../../../src/physics/kinematics.js';
import type { PhysicalProfile } from '../../../src/players/physical.js';
import { World } from '../../../src/physics/world.js';
const lb: PhysicalProfile = { massKg: 112, radius: .32, reach: 1.05, heightYd: 2.05, vmax: 7.9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .62, shuffle: .6,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const deg = (r: number) => Math.abs(((r + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * 180 / Math.PI;
console.log('| start speed | velocity along command | facing off command | speed at +0.05 / +0.25 / +0.50 s | facing off command at +0.05 / +0.25 / +0.50 s | mean accel over 0.5 s (yd/s2) |\n|---|---|---|---|---|---|');
for (const v0 of [0.3, 1.0, 2.0]) for (const vdir of [0, 90]) for (const face of [0, 30, 65, 90]) {
  const vd = vdir * Math.PI / 180;
  const b: Body = { pos: { x: 0, y: 0 }, vel: { x: v0 * Math.cos(vd), y: v0 * Math.sin(vd) }, facing: face * Math.PI / 180, spin: 0, energy: 1, profile: { ...lb } };
  const w = new World([b], {}); const out: string[] = [], fa: string[] = []; let along = 0;
  for (let k = 1; k <= 10; k++) {
    w.step([{ vel: { x: lb.vmax, y: 0 }, effort: 1 }], .05);
    if (k === 1 || k === 5 || k === 10) { out.push(Math.hypot(b.vel.x, b.vel.y).toFixed(2)); fa.push(deg(b.facing).toFixed(0)); along = b.vel.x; }
  }
  console.log(`| ${v0} | ${vdir === 0 ? 'with it' : 'across it (90 deg)'} | ${face} | ${out.join(' / ')} | ${fa.join(' / ')} | ${((Math.hypot(b.vel.x, b.vel.y) - v0) / 0.5).toFixed(1)} |`);
}
