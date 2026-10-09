import type { Body } from '../../src/physics/kinematics.js';
import { availability, supportParams } from '../../src/physics/support.js';
import { World } from '../../src/physics/world.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
function profile(mass: number, extra: Partial<PhysicalProfile> = {}): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9, ...extra };
}
const a: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: profile(120) };
const b: Body = { pos: { x: 0.75, y: 0 }, vel: { x: 0, y: 0 }, facing: Math.PI, energy: 1, profile: profile(120) };
const w = new World([a, b]);
for (let k = 0; k < 20; k++) {
  const r = w.step([{ vel: { x: 3, y: 0 }, push: 1 }, { vel: { x: -3, y: 0 }, push: 1 }], 0.05);
  const s = a.support!;
  console.log(k, 'sub', r.substeps, 'dist', (b.pos.x - a.pos.x).toFixed(3), 'va', a.vel.x.toFixed(2), 'load', s.load.x.toFixed(0), 'lean', s.lean.x.toFixed(0), 'xi', s.xi.x.toFixed(3), 'avail', availability(s, supportParams(a.profile), 1).toFixed(2), s.state, 'imp', r.contacts.map(c => c.impulse.toFixed(1)).join(','));
}
