import type { Body } from '../../src/physics/kinematics.js';
import { World } from '../../src/physics/world.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
function profile(mass: number, extra: Partial<PhysicalProfile> = {}): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9, ...extra };
}
for (const steer of [0, 900]) {
  const a: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: profile(130) };
  const b: Body = { pos: { x: 0.9, y: 0 }, vel: { x: 0, y: 0 }, facing: Math.PI, energy: 1, profile: profile(115) };
  const w = new World([a, b]);
  const hj = { kind: 'hands' as const, a, b, extension: 0.9, push: 900, hold: 200, steer, normalForce: 0, tangentForce: 0 };
  w.joints.push(hj);
  for (let k = 0; k < 20; k++) {
    w.step([{ vel: { x: 0, y: -2 }, push: 1 }, { vel: { x: -1, y: 4 }, push: 1 }], 0.05);
    if (k % 4 === 3) console.log(steer, k, 'a', a.pos.x.toFixed(2), a.pos.y.toFixed(2), 'b', b.pos.x.toFixed(2), b.pos.y.toFixed(2), 'va', a.vel.y.toFixed(2), 'vb', b.vel.y.toFixed(2), 'N', hj.normalForce.toFixed(0), 'T', hj.tangentForce.toFixed(0), 'lean a', a.support!.lean.x.toFixed(0), a.support!.lean.y.toFixed(0), 'b', b.support!.lean.x.toFixed(0), b.support!.lean.y.toFixed(0), a.support!.state, b.support!.state);
  }
}
