/** Locate the timestep-dependent held fall (rear and angled witnesses, seed
 * 3001). Hybrid runs at coarse resolution: only the balance (capture-point)
 * update of every body is re-integrated in m finer pieces inside each
 * substep, with that substep's inputs held fixed (contact accelerations,
 * trip/tip inputs, recovery speed, foot deficit). Contact, grip and gait
 * solves stay coarse. If sub-cycling balance alone reproduces the fine
 * outcome, the error is in balance integration; if not, it comes from the
 * solve frequency of the contact/grip forces feeding it. Observation only.
 * node --import tsx scripts/diag/physics/loaded-subcycle.ts
 */
import { World } from '../../../src/physics/world.js';
import { rep, type Cell } from '../tackle/panel.js';

let M = 1;
const W = World.prototype as any;
const update = W.updateSupport;
W.updateSupport = function (this: any, i: number, h: number, report: unknown) {
  if (M <= 1) return update.call(this, i, h, report);
  const b = this.bodies[i], keys = ['tripX', 'tripY', 'thighX', 'thighY', 'tipX', 'tipY'] as const;
  const saved = keys.map((k) => this[k][i]), v0x = this.v0x[i], v0y = this.v0y[i];
  for (const [n, k] of keys.entries()) this[k][i] = saved[n] / M;
  // Same mean acceleration over each piece: velocity change per piece is 1/M.
  this.v0x[i] = b.vel.x - (b.vel.x - v0x) / M; this.v0y[i] = b.vel.y - (b.vel.y - v0y) / M;
  for (let k = 0; k < M && b.support.state === 'up'; k++) update.call(this, i, h / M, report);
  for (const [n, k] of keys.entries()) this[k][i] = saved[n];
  this.v0x[i] = v0x; this.v0y[i] = v0y;
};
const CASES: [string, Cell, 'center' | 'patch'][] = [
  ['rear 180/6', { angle: 180, speed: 6, cut: false, difficulty: 'difficult' }, 'center'],
  ['angled 45/8', { angle: 45, speed: 8, cut: false, difficulty: 'difficult' }, 'patch'],
];
for (const [name, cell, mode] of CASES) {
  const out: string[] = [];
  for (const [n, m] of [[12, 1], [12, 16], [192, 1]] as [number, number][]) {
    M = m;
    const r = rep(cell, 1, 3001, { handContact: mode, substeps: n });
    out.push(`${n} substeps, balance x${m}: ${r.ending}${r.carrierState === 'down' ? '(fell)' : ''} ${(r.afterContact ?? NaN).toFixed(1)} yd ${(r.contactToEnd ?? NaN).toFixed(2)} s`);
  }
  console.log(`${name.padEnd(12)} ${out.join(' | ')}`);
}
