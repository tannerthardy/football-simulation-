import type { Body } from '../../src/physics/kinematics.js';
import { World } from '../../src/physics/world.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
function profile(mass: number): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
}
const c: Body = { pos: { x: 0, y: 0 }, vel: { x: 6, y: 0 }, facing: 0, energy: 1, profile: profile(95) };
const d: Body = { pos: { x: -0.6, y: 0.1 }, vel: { x: 1, y: 0 }, facing: 0, energy: 1, profile: profile(100) };
const w = new World([c, d]);
const g: import('../../src/physics/world.js').GraspJoint = { kind: 'grasp', a: d, b: c, reach: 1.3, capacity: 1600, legs: 1 };
w.joints.push(g);
for (let k = 0; k < 12; k++) {
  const r = w.step([{ vel: { x: 7, y: 0 }, push: 1 }, { vel: { x: -2, y: 0 }, push: 1 }], 0.05);
  console.log(k, 'c v', c.vel.x.toFixed(2), 'd v', d.vel.x.toFixed(2), 'dist', Math.hypot(c.pos.x-d.pos.x,c.pos.y-d.pos.y).toFixed(2), 'lock', c.support!.feetLock.toFixed(2), 'xi', c.support!.xi.x.toFixed(3), c.support!.state, 'hold', g.hold?.toFixed(2), 'broken', g.broken, 'falls', r.falls);
}
