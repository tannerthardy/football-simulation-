import type { Body } from '../../src/physics/kinematics.js';
import { World } from '../../src/physics/world.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
function profile(mass: number, extra: Partial<PhysicalProfile> = {}): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9, ...extra };
}
const body = (m: number, x: number, y: number, vx: number, vy: number, f = 0): Body => ({ pos: { x, y }, vel: { x: vx, y: vy }, facing: f, energy: 1, profile: profile(m) });
const scene = (substeps: number, speed: number) => {
  const a = body(110, 0, 0, speed, 0), b = body(95, 1.6, 0.25, -speed / 2, 0, Math.PI), c = body(120, 1.2, -1.4, 0, 3);
  const w = new World([a, b, c], { substeps });
  const log: string[] = [];
  for (let k = 0; k < 16; k++) {
    const r = w.step([{ vel: { x: speed, y: 0 }, push: 1 }, { vel: { x: -speed / 2, y: 0 }, push: 1 }, { vel: { x: 0, y: 3 } }], 0.05);
    log.push(`${k} ` + [a, b, c].map(q => `(${q.pos.x.toFixed(3)},${q.pos.y.toFixed(3)} v${q.vel.x.toFixed(2)},${q.vel.y.toFixed(2)} f${q.facing.toFixed(2)} xi${Math.hypot(q.support!.xi.x,q.support!.xi.y).toFixed(2)})`).join(' ') + ' c:' + r.contacts.map(c=>`${c.i}${c.j}`).join(','));
  }
  return log;
};
const A = scene(8, 3), B = scene(64, 3);
for (let k = 0; k < 16; k++) { console.log('n8 ', A[k]); console.log('n64', B[k]); }
