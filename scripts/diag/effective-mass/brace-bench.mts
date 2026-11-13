/** HIP_BRACE bench (Integration's conditions, 2026-11-10). A runner requesting 5 yd/s with one holder behind him. Cases:
 *   firm two-arm hold at shoulder height (GraspJoint.height 0.82 of the runner's stature) from a downed holder, and from
 *   a planted holder (on his feet, requesting 0);
 *   one-arm grab at the waist (capacity of one arm, leg share 0, no height) from a holder running alongside at 5 yd/s;
 * each against a light (generated RB) and a heavy (RB x 1.25 mass, strength at the same ratio) runner.
 * Reports time to down, runner speed at +0.5 / +1.0 s, his ground force as a share of traction at +0.5 s, the share of
 * hip torque spent bracing at +0.5 s (hipUsed, read through report fields when exposed, else n/a), and momentum.
 * Settings at load: run per arm (HIP_BRACE=1). usage: node --import tsx scripts/diag/effective-mass/brace-bench.mts */
import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { newSupport, supportParams } from '../../../src/physics/support.js';
import { World } from '../../../src/physics/world.js';
const rng = new Rng(3);
const base = generatePlayer(rng, 'RB'), H = derivePhysical(generatePlayer(rng, 'LB'));
const light = derivePhysical(base);
const heavy = derivePhysical({ ...base, measurables: { ...base.measurables, weightLb: (base.measurables?.weightLb ?? 205) * 1.25 }, ratings: { ...base.ratings, strength: Math.min(99, (base.ratings?.strength ?? 60) * 1.25) } } as any);
type Case = { name: string; state: 'down' | 'planted' | 'alongside'; arms: 1 | 2; shoulder: boolean };
function run(R: any, c: Case) {
  const r: any = { pos: { x: 0, y: 0 }, vel: { x: 5, y: 0 }, facing: 0, energy: 1, profile: R, support: newSupport(0.2) };
  const d = R.radius + H.radius + 0.15;
  const h: any = { pos: { x: -d, y: c.state === 'alongside' ? 0.35 : 0.1 }, vel: { x: c.state === 'planted' ? 2 : 5, y: 0 }, facing: 0, energy: 1, profile: H, support: newSupport(0.2) };
  if (c.state === 'down') { h.support.state = 'down'; h.support.since = 0; }
  const w = new World([r, h]);
  const cap = supportParams(H).armForce * (c.arms === 2 ? 1.5 : 0.15);
  w.joints.push({ kind: 'grasp', a: h, b: r, reach: d + 0.4, capacity: cap, legs: 0, pull: 0, hold: d, ...(c.shoulder ? { height: 0.82 * R.heightYd } : {}) } as any);
  const o: any = { down: NaN, err: 0 };
  for (let k = 1; k <= 30; k++) {
    const p0 = r.vel.x * R.massKg + h.vel.x * H.massKg;
    const hi = c.state === 'alongside' ? { vel: { x: 5, y: 0 }, facing: 0 } : { vel: { x: 0, y: 0 }, facing: 0 };
    const rep = w.step([{ vel: { x: 5, y: 0 }, facing: 0, push: 1 } as any, hi as any], 0.05);
    o.err = Math.max(o.err, Math.abs(r.vel.x * R.massKg + h.vel.x * H.massKg - p0 - rep.groundImpulse[0].x - rep.groundImpulse[1].x));
    if (Number.isNaN(o.down) && r.support.state !== 'up') o.down = k * 0.05;
    if (k === 10) { o.v5 = r.vel.x; o.g5 = rep.groundImpulse[0].x / rep.groundImpulseLimit[0]; o.hip = (w as any).hipUsed?.[0]; }
    if (k === 20) o.v10 = r.vel.x;
  }
  return o;
}
console.log(`HIP_BRACE=${process.env.HIP_BRACE ?? ''} | holder ${H.massKg.toFixed(0)} kg; light runner ${light.massKg.toFixed(0)} kg, heavy ${heavy.massKg.toFixed(0)} kg`);
for (const c of [
  { name: 'firm two-arm, shoulder, holder downed', state: 'down', arms: 2, shoulder: true },
  { name: 'firm two-arm, shoulder, holder planted', state: 'planted', arms: 2, shoulder: true },
  { name: 'one-arm, waist, holder alongside', state: 'alongside', arms: 1, shoulder: false },
  { name: 'firm two-arm, waist (COM height), downed', state: 'down', arms: 2, shoulder: false },
] as Case[]) for (const [lbl, R] of [['light', light], ['heavy', heavy]] as const) {
  const o = run(R, c);
  console.log(`  ${c.name.padEnd(40)} ${lbl.padEnd(5)} | down ${Number.isFinite(o.down) ? o.down.toFixed(2) + ' s' : 'no  '} | runner +0.5 ${o.v5?.toFixed(2) ?? '-'} +1.0 ${o.v10?.toFixed(2) ?? '-'} | ground force at +0.5 ${o.g5?.toFixed(2)} of traction | hip torque bracing ${o.hip !== undefined ? o.hip.toFixed(2) : 'n/a'} | momentum ${o.err.toExponential(1)}`);
}
