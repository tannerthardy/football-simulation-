/** Strength (push force, traction) of generated linemen by slot (development aid). */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { derivePhysical } from '../../src/players/physical.js';
import { supportParams, comHeightAt } from '../../src/physics/support.js';
const rng = new Rng(3);
const t = generateTeam(rng, 'T', 'TTT', { strength: 0.55 });
const rows: Record<string, number[][]> = {};
for (const p of t.roster) {
  if (!['OT', 'OG', 'C', 'DT', 'EDGE', 'LB', 'RB', 'S', 'CB', 'WR'].includes(p.position)) continue;
  const ph = derivePhysical(p), sp = supportParams(ph);
  (rows[p.position] ??= []).push([ph.massKg, sp.pushForce, sp.armForce, comHeightAt(sp, 0.85), ph.bend ?? 0, p.ratings.strength, ph.vmax]);
}
for (const [pos, r] of Object.entries(rows)) {
  const avg = (k: number) => (r.reduce((s, x) => s + x[k], 0) / r.length).toFixed(2);
  console.log(pos.padEnd(5), 'n', r.length, 'mass', avg(0), 'push', avg(1), 'arm', avg(2), 'comH@0.85', avg(3), 'bend', avg(4), 'strRating', avg(5), 'vmax', avg(6));
}
