/** World-only side hit: peak support deviation vs substeps (development aid). */
import type { Body } from '../../src/physics/kinematics.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
import { World, type Intent } from '../../src/physics/world.js';
function profile(mass: number): PhysicalProfile {
  return { massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9.5, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
}
const body = (m: number, x: number, y: number, vx: number, vy: number, f: number): Body => ({ pos: { x, y }, vel: { x: vx, y: vy }, facing: f, energy: 1, profile: profile(m) });
for (const hit of [4, 6, 8]) {
  const row: string[] = [];
  for (const n of [6, 12, 24, 48, 96]) {
    const c = body(80, 0, 0, 6, 0, 0), h = body(105, 0, 0.3 * hit + 0.9 * 0.5, 6, -hit, -Math.PI / 2);
    const w = new World([c, h], { substeps: n });
    let peak = 0, struck = false;
    for (let k = 0; k < 30; k++) {
      if (!struck && Math.hypot(c.pos.x - h.pos.x, c.pos.y - h.pos.y) < 1.02 * (c.profile.radius + h.profile.radius)) struck = true;
      const ic: Intent = { vel: { x: 6, y: 0 }, facing: 0 };
      const ih: Intent = struck ? { vel: { x: 6, y: 0 } } : { vel: { x: 6, y: -hit }, facing: -Math.PI / 2 };
      w.step([ic, ih], 0.05);
      peak = Math.max(peak, Math.hypot(c.support!.xi.x, c.support!.xi.y));
    }
    row.push(`${n}:${peak.toFixed(3)}${c.support!.state === 'up' ? '' : '(' + c.support!.state + ')'}`);
  }
  console.log(`hit ${hit}: ${row.join('  ')}`);
}
// The same without the pull-up decision: hitter is a passive body at a fixed velocity.
for (const hit of [4, 6, 8]) {
  const row: string[] = [];
  for (const n of [6, 12, 24, 48, 96]) {
    const c = body(80, 0, 0, 6, 0, 0), h = body(105, 0, 0.3 * hit + 0.9 * 0.5, 6, -hit, -Math.PI / 2);
    const w = new World([c, h], { substeps: n });
    let peak = 0;
    for (let k = 0; k < 30; k++) { w.step([{ vel: { x: 6, y: 0 }, facing: 0 }, { vel: { x: 0, y: 0 }, free: true }], 0.05); peak = Math.max(peak, Math.hypot(c.support!.xi.x, c.support!.xi.y)); }
    row.push(`${n}:${peak.toFixed(3)}`);
  }
  console.log(`passive hitter ${hit}: ${row.join('  ')}`);
}
// Lateral velocity the runner takes from a passive hitter, and when.
for (const hit of [4, 6, 8]) {
  const row: string[] = [];
  for (const n of [6, 12, 24, 48, 96]) {
    const c = body(80, 0, 0, 6, 0, 0), h = body(105, 0, 0.3 * hit + 0.9 * 0.5, 6, -hit, -Math.PI / 2);
    const w = new World([c, h], { substeps: n });
    let maxVy = 0, maxAcc = 0;
    for (let k = 0; k < 12; k++) {
      const vy0 = c.vel.y;
      w.step([{ vel: { x: 6, y: 0 }, facing: 0, free: true }, { vel: { x: 0, y: 0 }, free: true }], 0.05);
      maxVy = Math.max(maxVy, -c.vel.y);
      maxAcc = Math.max(maxAcc, Math.abs(c.vel.y - vy0) / 0.05);
    }
    row.push(`${n}:dv${maxVy.toFixed(3)} a${maxAcc.toFixed(0)}`);
  }
  console.log(`free bodies hit ${hit}: ${row.join('  ')}`);
}
