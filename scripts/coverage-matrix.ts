/**
 * Coverage × concept matrix: every coverage call against every pass concept
 * from 2x2 and 3x1, both flips, fixed rosters and seeds. Reports, per
 * coverage, completion rate, yards per attempt, explosive rate and
 * separation at the throw, and the concepts and receivers that beat it —
 * where the holes are, independent of play-calling.
 *   npx tsx scripts/coverage-matrix.ts [reps=3] [coverage ids, comma-separated]
 */
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_CONCEPTS } from '../src/playbook/concepts.js';
import { COVERAGES, COVERAGE_BY_ID } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const reps = Number(process.argv[2] ?? 3);
const only = process.argv[3]?.split(',');
const covers = only ?? COVERAGES.map((c) => c.id);
const forms = ['gun_doubles_11', 'gun_trips_11'];
const concepts = PASS_CONCEPTS.filter((c) => c.family !== 'playaction');
const rosters = [7, 19, 31];

interface Acc { att: number; comp: number; yds: number; big: number; sep: number; sepN: number; sack: number; n: number; int: number; byConcept: Record<string, { att: number; yds: number }>; byTarget: Record<string, { att: number; yds: number }> }

const out: Record<string, Acc> = {};
for (const cov of covers) {
  const acc: Acc = { att: 0, comp: 0, yds: 0, big: 0, sep: 0, sepN: 0, sack: 0, n: 0, int: 0, byConcept: {}, byTarget: {} };
  out[cov] = acc;
  for (const roster of rosters) {
    const lr = new Rng(roster);
    const off = generateTeam(lr.fork('offense'), 'Offense', 'OFF', { strength: 0.55 });
    const def = generateTeam(lr.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
    for (const form of forms) for (const concept of concepts) for (const flip of [false, true]) for (let r = 0; r < reps; r++) {
      const formation = FORMATION_BY_ID[form];
      const sim = new PlaySim({
        offense: pickOffense(off, formation.personnel),
        defense: pickDefense(def, 'nickel'),
        offCall: { formation, flip, kind: 'pass', pass: concept, label: '' },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, zoneStyle: 'match', label: '', checkPick: r % 2 },
        los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * roster + 17 * r + (flip ? 7 : 0),
      });
      const res = sim.run();
      const st = res.stats;
      acc.n++;
      if (st.sacked) { acc.sack++; continue; }
      if (!st.attempted || st.throwaway) continue;
      acc.att++;
      const yards = st.completed ? res.yards : 0;
      if (st.completed) { acc.comp++; acc.yds += yards; if (yards >= 20) acc.big++; }
      if (st.interceptedBy) acc.int++;
      if (st.separation !== undefined) { acc.sep += st.separation; acc.sepN++; }
      const c = (acc.byConcept[concept.id] ??= { att: 0, yds: 0 });
      c.att++; c.yds += yards;
      const tgt = st.target ? sim.agents.find((a) => a.player.id === st.target)?.slot ?? '?' : '?';
      const ref = sim.offAlign.refOf[tgt as never] ?? tgt;
      const t = (acc.byTarget[`${form === 'gun_trips_11' ? '3x1' : '2x2'}:${ref}`] ??= { att: 0, yds: 0 });
      t.att++; t.yds += yards;
    }
  }
}

console.log(`coverage               att  comp%   YPA   20+%  sep   INT%  sack%   worst concepts (YPA)                  worst receivers (YPA)`);
for (const [cov, a] of Object.entries(out).sort((p, q) => q[1].yds / Math.max(1, q[1].att) - p[1].yds / Math.max(1, p[1].att))) {
  const worst = Object.entries(a.byConcept).filter(([, c]) => c.att >= 4).sort((p, q) => q[1].yds / q[1].att - p[1].yds / p[1].att).slice(0, 3).map(([k, c]) => `${k} ${(c.yds / c.att).toFixed(1)}`).join(', ');
  const wr = Object.entries(a.byTarget).filter(([, c]) => c.att >= 6).sort((p, q) => q[1].yds / q[1].att - p[1].yds / p[1].att).slice(0, 3).map(([k, c]) => `${k} ${(c.yds / c.att).toFixed(1)}(${c.att})`).join(', ');
  console.log(`${cov.padEnd(21)} ${String(a.att).padStart(4)}  ${(100 * a.comp / Math.max(1, a.att)).toFixed(1).padStart(5)} ${(a.yds / Math.max(1, a.att)).toFixed(2).padStart(5)}  ${(100 * a.big / Math.max(1, a.att)).toFixed(1).padStart(5)} ${(a.sep / Math.max(1, a.sepN)).toFixed(2)}  ${(100 * a.int / Math.max(1, a.att)).toFixed(1).padStart(4)}  ${(100 * a.sack / a.n).toFixed(1).padStart(5)}   ${worst.padEnd(38)} ${wr}`);
}
