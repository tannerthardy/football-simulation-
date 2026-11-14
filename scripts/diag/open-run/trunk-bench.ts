/** Lone-body table for candidate (a), the trunk twist: top speed at a given shoulder angle off the path.
 *
 * The cap reads the HIPS angle. Under (a) the shoulders can twist off the hips by up to T, so a body whose shoulders
 * are `theta` off his path has hips max(0, theta - T) off it. This bench runs the real `stepBody` (locomotionAccel
 * plus the traction clamp) with `facing` set to that hips angle and a full-speed request along the path, and reads the
 * speed it holds. No engine change: the trunk is emulated by the facing it would leave the gait.
 *
 *   node --import tsx scripts/diag/open-run/trunk-bench.ts   (needs out/open-run/nfl-band.json from open_run_check.py)
 *
 * Columns: shoulder angle | NFL p95 / p99 (cleaned of flipped player-plays) | current cap (hips = shoulders) |
 * T = 45 / 55 / 65 | whether each is inside the band [p95 - 0.5, p99 + 0.5] (yd/s). T only applies to WR/TE/RB; CB and
 * S are shown with T = 0 (hips follow shoulders by technique) and, for reference, T = 55. */
import { readFileSync, writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { DT } from '../../../src/core/units.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical, type PhysicalProfile } from '../../../src/players/physical.js';
import { stepBody, type Body } from '../../../src/physics/kinematics.js';
import { newSupport } from '../../../src/physics/support.js';
import type { Position } from '../../../src/players/types.js';

const band: Record<string, { theta: number; p95: number; p99: number; fwd95: number; n: number }[]> = JSON.parse(readFileSync('out/open-run/nfl-band.json', 'utf8'));
const TS = [45, 55, 65];
const ENERGY = 0.85; // a defender's typical energy at the snap in a game (snap-energy.ts); receivers are similar

function medianProfile(position: Position): PhysicalProfile {
  const ps = Array.from({ length: 201 }, (_, k) => derivePhysical(generatePlayer(new Rng(500 + k), position, { quality: 0.5 })));
  return [...ps].sort((a, b) => a.vmax - b.vmax)[100];
}

/** Speed held after `seconds` of a full-speed request along +x with the hips `hipsDeg` off it, from v0 = 6 yd/s. */
function holdSpeed(profile: PhysicalProfile, hipsDeg: number, seconds = 5): number {
  const facing = (hipsDeg * Math.PI) / 180;
  const b: Body = { pos: { x: 0, y: 0 }, vel: { x: 6, y: 0 }, facing, energy: ENERGY, profile, support: newSupport(0.2) };
  for (let k = 0; k < Math.round(seconds / DT); k++) { stepBody(b, { vel: { x: profile.vmax, y: 0 }, facing, effort: 1 }, DT); b.energy = ENERGY; }
  return Math.hypot(b.vel.x, b.vel.y);
}

const lines: string[] = [];
const out: Record<string, unknown> = {};
for (const [grp, pos] of [['WR', 'WR'], ['TE', 'TE'], ['RB', 'RB'], ['CB', 'CB'], ['S', 'S']] as const) {
  const profile = medianProfile(pos);
  const rows = band[grp] ?? [];
  lines.push(`\n${grp}: sim vmax ${profile.vmax.toFixed(2)}, shuffle ${profile.shuffle.toFixed(2)}, backpedal ${profile.backpedal.toFixed(2)} (energy ${ENERGY})`);
  lines.push('theta | NFL p95 / p99 | current | T45 | T55 | T65   (* = within 0.5 yd/s of the NFL band)');
  const table: unknown[] = [];
  for (const r of rows) {
    if (r.theta < 60) continue;
    const cur = holdSpeed(profile, r.theta);
    const tw = TS.map((T) => holdSpeed(profile, Math.max(0, r.theta - T)));
    const inBand = (v: number) => (v >= r.p95 - 0.5 && v <= r.p99 + 0.5 ? '*' : ' ');
    lines.push(`${r.theta.toFixed(0).padStart(4)} | ${r.p95.toFixed(1)} / ${r.p99.toFixed(1)} | ${cur.toFixed(1)}${inBand(cur)} | ${tw.map((v) => v.toFixed(1) + inBand(v)).join(' | ')}`);
    table.push({ theta: r.theta, p95: r.p95, p99: r.p99, current: cur, twist: Object.fromEntries(TS.map((T, i) => [T, tw[i]])) });
  }
  out[grp] = { vmax: profile.vmax, shuffle: profile.shuffle, backpedal: profile.backpedal, table };
}
writeFileSync('out/open-run/trunk-bench.json', JSON.stringify(out, null, 1));
console.log(lines.join('\n'));
