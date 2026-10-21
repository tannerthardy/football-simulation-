/** Hand fight between a rusher and a blocker in the bare world: does the
 * outcome converge with the substep? (development aid) */
import type { Body } from '../../src/physics/kinematics.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
import { World, type HandJoint, type Intent } from '../../src/physics/world.js';
function profile(mass: number): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 8, tau: 1.6,
    brake: 5, lateral: 5, turnRate: 6, backpedal: 0.6, shuffle: 0.6, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass * 1.05, balance: 0.5, bend: 0.4, stepSpeed: 3.0, getUp: 1.0 };
}
const body = (m: number, x: number, y: number, vx: number, vy: number, f: number): Body => ({ pos: { x, y }, vel: { x: vx, y: vy }, facing: f, energy: 1, profile: profile(m) });
for (const variant of ['push only', 'push+steer', 'with leans']) {
  const row: string[] = [];
  for (const n of [6, 12, 24, 48, 96]) {
    const b = body(140, 0, 0, -1.5, 0, 0), d = body(120, 0.85, -0.3, -3, 0, Math.PI);
    const w = new World([b, d], { substeps: n });
    const j: HandJoint = { kind: 'hands', a: b, b: d, extension: 0.85, push: 1100, hold: 250, steer: variant === 'push only' ? 0 : 700 } as HandJoint;
    w.joints.push(j);
    for (let k = 0; k < 30; k++) {
      // Rusher heads for a point behind the blocker's outside shoulder; blocker
      // retreats and mirrors him.
      const tx = -6 - d.pos.x, ty = -2.5 - d.pos.y, tl = Math.hypot(tx, ty) || 1;
      const id: Intent = { vel: { x: tx / tl * 6, y: ty / tl * 6 }, facing: Math.PI, push: variant === 'with leans' ? 1 : 0 };
      const ib: Intent = { vel: { x: -2, y: (d.pos.y - b.pos.y) * 3 }, facing: 0, push: variant === 'with leans' ? 1 : 0 };
      w.step([ib, id], 0.05);
    }
    row.push(`${n}:D(${d.pos.x.toFixed(3)},${d.pos.y.toFixed(3)})`);
  }
  console.log(`${variant.padEnd(10)} ${row.join('  ')}`);
}
