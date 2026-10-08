/**
 * Concept × coverage matrix: per-cell completion %, Y/A, INT %, YAC, sacks.
 *   npx tsx scripts/matrix.ts [playsPerCell] [seed] [concepts,...] [coverages,...]
 */
import { Rng } from '../src/core/rng.js';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_CONCEPTS, PASS_BY_ID, RUN_CONCEPTS, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGES, COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { OffensivePlayCall } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';

const [nStr = '60', seedStr = '3', conceptArg, covArg] = process.argv.slice(2);
const n = Number(nStr);
const rng = new Rng(Number(seedStr));
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 });
const def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
const concepts = conceptArg ? conceptArg.split(',') : [...PASS_CONCEPTS.map((c) => c.id), ...RUN_CONCEPTS.map((c) => c.id)];
const covs = covArg ? covArg.split(',') : COVERAGES.map((c) => c.id);
console.log('concept'.padEnd(13) + covs.map((c) => c.padStart(17)).join(''));
const tot: Record<string, { y: number; n: number }> = {};
for (const cid of concepts) {
  const isRun = !!RUN_BY_ID[cid];
  const formation = FORMATION_BY_ID[isRun ? 'ace_11' : 'gun_doubles_11'];
  const offCall: OffensivePlayCall = isRun ? { formation, flip: false, kind: 'run', run: RUN_BY_ID[cid], label: cid } : { formation, flip: false, kind: 'pass', pass: PASS_BY_ID[cid], label: cid };
  const offense = pickOffense(off, formation.personnel);
  const defense = pickDefense(def, 'nickel');
  let row = cid.padEnd(13);
  for (const cov of covs) {
    const pressure = cov === 'cover0' ? PRESSURE_BY_ID.zero_6 : null;
    let yds = 0, comp = 0, att = 0, ints = 0, sacks = 0, yac = 0, yacN = 0;
    for (let i = 0; i < n; i++) {
      const sim = new PlaySim({ offense, defense, offCall, defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure, label: '' }, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: rng.nextU32() });
      const r = sim.run();
      yds += r.turnover ? -20 : r.yards;
      if (r.stats.attempted) att++;
      if (r.stats.completed && !r.turnover) comp++;
      if (r.stats.interceptedBy) ints++;
      if (r.stats.sacked) sacks++;
      if (r.stats.yac !== undefined) { yac += r.stats.yac; yacN++; }
    }
    tot[cov] = tot[cov] ?? { y: 0, n: 0 };
    tot[cov].y += yds;
    tot[cov].n += n;
    row += isRun ? `${(yds / n).toFixed(1).padStart(6)}y          `.padStart(17) : ` ${(yds / n).toFixed(1).padStart(5)}y ${String(Math.round((comp / Math.max(1, att)) * 100)).padStart(3)}% i${ints} s${sacks} Y${(yac / Math.max(1, yacN)).toFixed(0)}`.padStart(17);
  }
  console.log(row);
}
console.log('avg/play'.padEnd(13) + covs.map((c) => `${(tot[c].y / tot[c].n).toFixed(2)}`.padStart(17)).join(''));
