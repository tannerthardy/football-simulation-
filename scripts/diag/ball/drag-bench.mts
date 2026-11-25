/** Lone-ball bench for BALL_DRAG: hang time, apex, release speed and arrival speed by throw distance, drag off (0.003027) and on (0.005), for the QB's drive flight time T(d) = 0.0731 + 0.03945 d + 0.00022 d^2
 * (qb.ts QB_DRIVE) and a 1.8 yd release, a catch at 1.0 yd. No RNG, no game. The release is solveLaunch's (the same call the QB makes); the arrival speed is the 3-D speed at T (the catch roll's `ballSpeed`).
 *   node --import tsx scripts/diag/ball/drag-bench.mts */
import { solveLaunch, stepFlight, type BallFlight } from '../../../src/physics/ball.js';
const OFF = 0.003027, ON = 0.005;
const T = (d: number) => 0.0731 + 0.03945 * d + 0.00022 * d * d;
console.log('| air yd | T (s) | k | release 3-D (yd/s) | release horiz | launch deg | apex z (yd) | apex t (s) | arrival 3-D (yd/s) | arrival horiz | miss at T (yd) |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const d of [8, 12, 16, 20, 25, 30, 40, 50]) {
  for (const k of [OFF, ON]) {
    const from = { x: 0, y: 0, z: 1.8 }, to = { x: d, y: 0, z: 1.0 }, t = T(d);
    const v = solveLaunch(from, to, t, k);
    const b: BallFlight = { pos: { ...from }, vel: { ...v }, drag: k };
    let apex = from.z, apexT = 0, el = 0;
    while (el < t - 1e-9) { const h = Math.min(0.01, t - el); stepFlight(b, h); el += h; if (b.pos.z > apex) { apex = b.pos.z; apexT = el; } }
    const sp = Math.hypot(b.vel.x, b.vel.y, b.vel.z), hs = Math.hypot(b.vel.x, b.vel.y), rs = Math.hypot(v.x, v.y, v.z), rh = Math.hypot(v.x, v.y);
    console.log(`| ${d} | ${t.toFixed(2)} | ${k === OFF ? 'off 0.0030' : 'on 0.0050'} | ${rs.toFixed(1)} | ${rh.toFixed(1)} | ${(Math.atan2(v.z, rh) * 180 / Math.PI).toFixed(1)} | ${(apex - 0).toFixed(2)} | ${apexT.toFixed(2)} | ${sp.toFixed(1)} | ${hs.toFixed(1)} | ${Math.hypot(b.pos.x - to.x, b.pos.y - to.y, b.pos.z - to.z).toFixed(3)} |`);
  }
}
