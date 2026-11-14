/** Straight run from a standstill at route effort for the median generated WR and TE, the real stepBody law (no get-off, full energy),
 * against the NFL's free-release GO routes that ran deep (nfl_route_speed.py rows, depth at 3 s >= 14): speed at 1.5 / 2.0 / 2.5 / 3.0 s.
 *   node --import tsx scripts/diag/route-speed/te_wr_straight.ts */
import { Rng } from '../../../src/core/rng.js';
import { DT } from '../../../src/core/units.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical, type PhysicalProfile } from '../../../src/players/physical.js';
import { stepBody, type Body } from '../../../src/physics/kinematics.js';
import { newSupport } from '../../../src/physics/support.js';
import type { Position } from '../../../src/players/types.js';
const median = (position: Position): PhysicalProfile => { const ps = Array.from({ length: 301 }, (_, k) => derivePhysical(generatePlayer(new Rng(900 + k), position, { quality: 0.55 }))); return [...ps].sort((a, b) => a.vmax - b.vmax)[150]; };
const TS = [1.5, 2.0, 2.5, 3.0];
for (const effort of [0.94, 1]) for (const pos of ['WR', 'TE'] as const) {
  const profile = median(pos), b: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 0.95, profile, support: newSupport(0.2) };
  const out: number[] = []; let t = 0;
  for (let k = 0; k < Math.round(3.05 / DT); k++) { stepBody(b, { vel: { x: profile.vmax * effort, y: 0 }, facing: 0, effort: 1 }, DT); t += DT; for (const q of TS) if (Math.abs(t - q) < DT / 2) out.push(Math.hypot(b.vel.x, b.vel.y)); }
  console.log(`${pos} effort ${effort} (vmax ${profile.vmax.toFixed(2)}, tau ${profile.tau.toFixed(2)}, weight ${(profile.massKg * 2.2046).toFixed(0)} lb): ${out.map((v) => v.toFixed(2)).join(' / ')}`);
}
