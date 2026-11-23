/** The World's dive push-off on a lone body: the speed gained along the line, the planted time and the reach by the time he is off his feet and on the ground.
 *   [DIVE_STANCE=1] node --import tsx scripts/diag/body/dive-bench.mts
 * Bodies: mass 100 kg (strength-free profile, power 100 = 1.0 body weight of leg drive), vmax 9 yd/s; and a stronger and a weaker leg. The diver runs straight at the line and dives along it. */
import type { Body } from '../../../src/physics/kinematics.js';
import type { PhysicalProfile } from '../../../src/players/physical.js';
import { World } from '../../../src/physics/world.js';
import { DIVE_STANCE } from '../../../src/physics/dive.js';

const base: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 };
const rows: string[] = [];
for (const [lab, power] of [['weak legs (0.8 BW)', 80], ['average legs (1.0 BW)', 100], ['strong legs (1.3 BW)', 130]] as const) {
  for (const speed of [0, 1, 3, 5, 7, 9]) {
    const b: Body = { pos: { x: 0, y: 0 }, vel: { x: speed, y: 0 }, facing: 0, spin: 0, energy: 1, profile: { ...base, power } };
    const w = new World([b], {});
    let tFall = -1, vFall = 0, xFall = 0, t = 0;
    for (let k = 0; k < 80; k++) {
      w.step([k === 0 ? { vel: { x: speed, y: 0 }, dive: { x: 1, y: 0 } } : { vel: { x: 0, y: 0 }, free: true }], .05); t += .05;
      if (tFall < 0 && b.support!.state !== 'up') { tFall = t; vFall = b.vel.x; xFall = b.pos.x; }
    }
    rows.push(`| ${lab} | ${speed} | ${tFall.toFixed(2)} | ${(vFall - speed).toFixed(2)} | ${xFall.toFixed(2)} | ${b.pos.x.toFixed(2)} |`);
  }
}
console.log(`DIVE_STANCE ${DIVE_STANCE ? 'on' : 'off'}\n| legs | speed at the dive | off his feet at (s) | speed gained | yards covered when he leaves his feet | yards covered at rest (4 s) |\n|---|---|---|---|---|---|\n${rows.join('\n')}`);
