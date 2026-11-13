/** Convergence of a contact/hold scenario as the world substep is refined (development aid). */
import type { Body } from '../../src/physics/kinematics.js';
import { World } from '../../src/physics/world.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
function profile(mass: number, extra: Partial<PhysicalProfile> = {}): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.0, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9, ...extra };
}
const body = (m: number, x: number, y: number, vx: number, vy: number, f = 0): Body => ({ pos: { x, y }, vel: { x: vx, y: vy }, facing: f, energy: 1, profile: profile(m) });
const run = (substeps: number, log = false) => {
  const a = body(110, 0, 0, 6, 0), b = body(95, 1.6, 0.25, -3, 0, Math.PI), c = body(120, 1.2, -1.4, 0, 3);
  const w = new World([a, b, c], { substeps });
  const events: string[] = [];
  for (let k = 0; k < 16; k++) {
    const r = w.step([{ vel: { x: 6, y: 0 }, push: 1 }, { vel: { x: -3, y: 0 }, push: 1 }, { vel: { x: 0, y: 3 } }], 0.05);
    if (r.falls.length) events.push(`t${k}:fall${r.falls}`);
    if (log) console.log(substeps, k, [a, b, c].map(q => `${q.pos.x.toFixed(2)},${q.pos.y.toFixed(2)} xi${Math.hypot(q.support!.xi.x, q.support!.xi.y).toFixed(2)} ${q.support!.state}`).join(' | '));
  }
  return { pos: [a, b, c].map((q) => ({ ...q.pos })), events };
};
const ref = run(48);
console.log('ref events', ref.events.join(' '));
for (const n of [1, 2, 4, 8, 16, 32]) {
  const r = run(n);
  const e = r.pos.reduce((s, p, i) => s + Math.hypot(p.x - ref.pos[i].x, p.y - ref.pos[i].y), 0);
  console.log(n, 'err', e.toFixed(4), r.events.join(' '));
}
run(8, true);
