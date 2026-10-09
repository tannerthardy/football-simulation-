import type { Body } from '../../src/physics/kinematics.js';
import { supportParams } from '../../src/physics/support.js';
import { World } from '../../src/physics/world.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
function profile(mass: number, extra: Partial<PhysicalProfile> = {}): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9, ...extra };
}
const body = (m: number, x: number, y: number, vx: number, vy: number, f = 0): Body => ({ pos: { x, y }, vel: { x: vx, y: vy }, facing: f, energy: 1, profile: profile(m) });
const scene = (substeps: number | undefined, speed: number) => {
  const a = body(110, 0, 0, speed, 0), b = body(95, 1.6, 0.25, -speed / 2, 0, Math.PI), c = body(120, 1.2, -1.4, 0, 3);
  const w = new World([a, b, c], { substeps });
  let subs = 0;
  for (let k = 0; k < 16; k++) subs += w.step([{ vel: { x: speed, y: 0 }, push: 1 }, { vel: { x: -speed / 2, y: 0 }, push: 1 }, { vel: { x: 0, y: 3 } }], 0.05).substeps;
  return { pos: [a, b, c].map((q) => ({ ...q.pos })), subs };
};
const ref = scene(128, 3);
for (const n of [2, 3, 4, 6, 8, 16, 32, 64, undefined]) {
  const r = scene(n, 3);
  console.log(n ?? `adaptive(avg ${(r.subs / 16).toFixed(1)})`, r.pos.reduce((s, p, i) => s + Math.hypot(p.x - ref.pos[i].x, p.y - ref.pos[i].y), 0).toFixed(4));
}
// energy debug
const ke = (bs: Body[]) => bs.reduce((s, b) => s + 0.5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2) + 0.5 * supportParams(b.profile).yawInertia * (b.spin ?? 0) ** 2, 0);
for (const [vx, offset] of [[8, 0], [5, 0.3], [11, 0.42]]) {
  const a = body(100, 0, 0, vx, 0), b = body(85, 1.5, offset, -2, 0);
  const w = new World([a, b]);
  let prev = ke([a, b]) + w.contactEnergy();
  for (let k = 0; k < 20; k++) {
    const r = w.step([{ vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }], 0.05);
    const e = ke([a, b]) + w.contactEnergy();
    if (e > prev + 1e-6) console.log('case', vx, offset, 'step', k, 'energy up', (e - prev).toFixed(3), 'pe', w.contactEnergy().toFixed(2), 'falls', r.falls, 'states', a.support!.state, b.support!.state, 'ground work', r.groundWork.map(g=>g.toFixed(2)));
    prev = e;
  }
}
