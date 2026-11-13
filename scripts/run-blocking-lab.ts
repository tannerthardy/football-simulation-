/** Controlled run/front matrix. Raw physical plays, including fouls; not league rates.
 * node --import tsx scripts/run-blocking-lab.ts [reps=30] [seed=7] [out.json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FRONT_BY_ID, COVERAGE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const [countStr = '30', seedStr = '7', output] = process.argv.slice(2);
const count = Number(countStr);
const seed = Number(seedStr);
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(seed)) throw new Error('Expected positive integer reps and integer seed');
const rng = new Rng(seed);
const home = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.55 });
const away = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
const cells: Array<Record<string, string | number>> = [];
for (const form of ['ace_11', 'i_pro_21', 'gun_doubles_11']) {
  const formation = FORMATION_BY_ID[form];
  for (const concept of ['iz_strong', 'oz_strong', 'power', 'counter', 'trap']) {
    for (const front of ['over', 'under']) for (const flip of [false, true]) {
      let gain = 0, stuffs = 0, explosive = 0, contact = 0, contactN = 0, unassigned = 0, climbs = 0, squeeze = 0, fouls = 0, timeouts = 0;
      for (let i = 0; i < count; i++) {
        const personnel = formation.personnel === '11' ? 'nickel' : 'base43';
        const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel),
          offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[concept], label: concept },
          defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
          los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.fork(`${form}:${concept}:${front}:${flip}:${i}`) });
        const blockers = sim.offense.filter((a) => a.behavior instanceof RunBlocker);
        for (const d of sim.defense.filter((d) => d.slot.startsWith('DE') || d.slot.startsWith('DT'))) {
          if (!blockers.some((b) => (b.behavior as RunBlocker).target === d)) unassigned++;
        }
        const result = sim.run();
        gain += result.offenseYards;
        stuffs += result.offenseYards <= 0 ? 1 : 0;
        explosive += result.offenseYards >= 10 ? 1 : 0;
        if (result.stats.yardsBeforeContact !== undefined) { contact += result.stats.yardsBeforeContact; contactN++; }
        climbs += result.events.filter((e) => e.type === 'block_climb').length;
        squeeze += result.events.some((e) => e.type === 'squeeze') ? 1 : 0;
        fouls += result.penalty ? 1 : 0;
        timeouts += result.outcome === 'timeout' ? 1 : 0;
      }
      cells.push({ form, concept, front, flip: Number(flip), plays: count, ypc: gain / count, stuffPct: 100 * stuffs / count,
        explosivePct: 100 * explosive / count, ybc: contactN ? contact / contactN : 0, contactN,
        unassignedDLPerSnap: unassigned / count, climbsPerSnap: climbs / count, squeezePct: 100 * squeeze / count, fouls, timeouts });
    }
  }
}
const document = { seed, repsPerCell: count, cohort: 'One fixed generated roster pair; physical outcomes including fouls; same named seeds across runs. Not an NFL estimate.', cells };
if (output) { mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(document, null, 2) + '\n'); }
console.log('formation       concept     front flip   YPC stuff%   10+%   YBC freeDL climbs skinny%');
for (const c of cells) {
  const n = (key: string, digits = 2) => Number(c[key]).toFixed(digits).padStart(6);
  console.log(`${String(c.form).padEnd(16)}${String(c.concept).padEnd(12)}${String(c.front).padEnd(6)}${c.flip} ${n('ypc')} ${n('stuffPct', 1)} ${n('explosivePct', 1)} ${n('ybc')} ${n('unassignedDLPerSnap')} ${n('climbsPerSnap')} ${n('squeezePct', 1)}`);
}
