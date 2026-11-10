/** UPPER_HANG bench (Integration, 2026-11-10): one runner at 5 yd/s, one holder off his feet behind him gripping his
 * upper body (shoulder: legs 0; waist: legs 0.3) or his legs (0.5, the existing leg hang), on the real World. The
 * runner keeps requesting 5 yd/s along his path. Reports the runner's speed at +0.25/+0.5/+1.0/+1.5 s, when he goes
 * down (support leaves 'up'), the holder's speed, and pair momentum against ground impulses (must close exactly).
 * UPPER_HANG was a trial flag (2026-11-10, reverted: no effect); the grip height rows use GraspJoint.height. usage: node --import tsx scripts/diag/effective-mass/hang-bench.mts */
import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { newSupport, supportParams } from '../../../src/physics/support.js';
import { World } from '../../../src/physics/world.js';
const rng = new Rng(3);
const R = derivePhysical(generatePlayer(rng, 'RB')), H = derivePhysical(generatePlayer(rng, 'CB'));
function run(legs: number, holderUp: boolean, capScale = 1, height?: number) {
  const r: any = { pos: { x: 0, y: 0 }, vel: { x: 5, y: 0 }, facing: 0, energy: 1, profile: R, support: newSupport(0.2) };
  const d = R.radius + H.radius + 0.15;
  const h: any = { pos: { x: -d, y: 0.1 }, vel: { x: 5, y: 0 }, facing: 0, energy: 1, profile: H, support: newSupport(0.2) };
  if (!holderUp) { h.support.state = 'down'; h.support.since = 0; }
  const w = new World([r, h]);
  w.joints.push({ kind: 'grasp', a: h, b: r, reach: d + 0.4, capacity: supportParams(H).armForce * 1.5 * capScale, legs, pull: 0, hold: d, ...(height !== undefined ? { height } : {}) } as any);
  const out: any = { down: NaN, err: 0 };
  for (let k = 1; k <= 30; k++) {
    const p0 = r.vel.x * R.massKg + h.vel.x * H.massKg;
    const rep = w.step([{ vel: { x: 5, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: 0, y: 0 } } as any], 0.05);
    out.err = Math.max(out.err, Math.abs(r.vel.x * R.massKg + h.vel.x * H.massKg - p0 - rep.groundImpulse[0].x - rep.groundImpulse[1].x));
    if (Number.isNaN(out.down) && r.support.state !== 'up') out.down = k * 0.05;
    if (k === 5) out.v25 = r.vel.x; if (k === 10) out.v5 = r.vel.x; if (k === 20) out.v10 = r.vel.x; if (k === 30) out.v15 = r.vel.x;
    if (k === 10) out.hv = h.vel.x;
  }
  out.held = (w.joints as any[]).some(j => !j.broken);
  return out;
}
console.log(`UPPER_HANG=${process.env.UPPER_HANG ?? ''} | runner ${R.massKg.toFixed(0)} kg at 5 yd/s, holder ${H.massKg.toFixed(0)} kg starting behind him at his speed`);
for (const [label, legs] of [['shoulder (legs 0.0)', 0], ['waist (legs 0.3)', 0.3], ['legs (0.5, leg hang)', 0.5]] as const) for (const up of [false, true]) {
  const o = run(legs, up);
  console.log(`  ${label.padEnd(20)} holder ${up ? 'on his feet ' : 'off his feet'} | runner +0.25 ${o.v25.toFixed(2)} +0.5 ${o.v5.toFixed(2)} +1.0 ${o.v10.toFixed(2)} +1.5 ${o.v15.toFixed(2)} | runner down at ${Number.isFinite(o.down) ? o.down.toFixed(2) + ' s' : 'no'} | holder +0.5 ${o.hv.toFixed(2)} | grip holds ${o.held} | momentum error ${o.err.toExponential(1)}`);
}
const shoulder = 0.82 * R.heightYd, chest = 0.70 * R.heightYd;
console.log(`grip height (GraspJoint.height): runner COM at about ${(0.55 * R.heightYd).toFixed(2)} yd, chest ${chest.toFixed(2)}, shoulder ${shoulder.toFixed(2)} (stature fractions 0.55 / 0.70 / 0.82)`);
for (const [label, z] of [['chest', chest], ['shoulder / jersey', shoulder]] as const) for (const up of [false, true]) {
  const o = run(0, up, 1, z);
  console.log(`  upper hold at ${label.padEnd(18)} holder ${up ? 'on his feet ' : 'off his feet'} | runner +0.25 ${o.v25.toFixed(2)} +0.5 ${o.v5.toFixed(2)} +1.0 ${o.v10.toFixed(2)} +1.5 ${o.v15.toFixed(2)} | runner down at ${Number.isFinite(o.down) ? o.down.toFixed(2) + ' s' : 'no'} | holder +0.5 ${o.hv.toFixed(2)} | momentum error ${o.err.toExponential(1)}`);
}
