/** Where does the tow go? (Integration, 2026-11-10.) A 91 kg runner requesting 5 yd/s with a 90 kg holder off his feet
 * behind him gripping at the waist (legs 0.3). Per 0.05 s tick, along the runner's travel (kg·yd/s² and in g of the
 * runner's weight): the runner's ground force and its share of his traction limit; the grasp's force on the runner
 * (its tension after grip capacity); the holder's ground force (his sliding friction) and the holder's own
 * acceleration; and the check that ground + grasp equals the runner's mass x acceleration. Also the grasp's capacity
 * against its tension, and whether the grip is slipping.
 * usage: node --import tsx scripts/diag/effective-mass/tow-forces.mts */
import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { newSupport, supportParams } from '../../../src/physics/support.js';
import { World } from '../../../src/physics/world.js';
const G = 10.72, rng = new Rng(3);
const R = derivePhysical(generatePlayer(rng, 'RB')), H = derivePhysical(generatePlayer(rng, 'CB'));
for (const [label, legs, cap] of [['waist, firm grip', 0.3, 1.5], ['waist, grip x4', 0.3, 6]] as const) {
  const r: any = { pos: { x: 0, y: 0 }, vel: { x: 5, y: 0 }, facing: 0, energy: 1, profile: R, support: newSupport(0.2) };
  const d = R.radius + H.radius + 0.15;
  const h: any = { pos: { x: -d, y: 0.1 }, vel: { x: 5, y: 0 }, facing: 0, energy: 1, profile: H, support: newSupport(0.2) };
  h.support.state = 'down'; h.support.since = 0;
  const w = new World([r, h]); const j: any = { kind: 'grasp', a: h, b: r, reach: d + 0.4, capacity: supportParams(H).armForce * cap, legs, pull: 0, hold: d };
  w.joints.push(j);
  console.log(`${label}: grip capacity ${j.capacity.toFixed(0)} kg yd/s^2 (${(j.capacity / (R.massKg * G)).toFixed(2)} g of the runner); runner traction ${supportParams(R).traction.toFixed(0)}, holder weight x 0.75 ${(0.75 * H.massKg * G).toFixed(0)}`);
  console.log('    t | centre distance, hold, reach | holder v | runner v | runner ground (share of limit) | grasp on runner | sum / m a check | holder ground | holder a | slipping');
  for (let k = 1; k <= 20; k++) {
    const vr = r.vel.x, vh = h.vel.x;
    const rep = w.step([{ vel: { x: 5, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: 0, y: 0 } } as any], 0.05);
    const gR = rep.groundImpulse[0].x / 0.05, gH = rep.groundImpulse[1].x / 0.05, lim = rep.groundImpulseLimit[0] / 0.05;
    const jf = (j.normalForceOnB?.x ?? 0) + (j.tangentForceOnB?.x ?? 0);
    const ma = R.massKg * (r.vel.x - vr) / 0.05, ah = (h.vel.x - vh) / 0.05;
    const gg = (x: number) => (x / (R.massKg * G)).toFixed(2);
    if (k % 2 === 0) console.log(`  ${(k * 0.05).toFixed(2)} | dist ${Math.hypot(r.pos.x - h.pos.x, r.pos.y - h.pos.y).toFixed(3)} hold ${(j.hold ?? NaN).toFixed(3)} reach ${j.reach.toFixed(2)} | holder v ${h.vel.x.toFixed(2)} | ${r.vel.x.toFixed(2)} | ${gR.toFixed(0).padStart(5)} (${(gR / lim).toFixed(2)}) ${gg(gR)} g | ${jf.toFixed(0).padStart(5)} ${gg(jf)} g | ${(gR + jf).toFixed(0)} vs ${ma.toFixed(0)} | ${gH.toFixed(0).padStart(5)} | ${ah.toFixed(2)} | ${j.slipping ? 'yes' : 'no'}`);
  }
}
