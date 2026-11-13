/** Paired dropback lab (flags from the environment): the same seeds (hashed
 * from the cell, so any subset pairs), bodies and calls for every arm. Pass
 * concepts x formations x coverages; per play the first time a defender is
 * within 2 yd of the quarterback before the throw (pressure), who (interior
 * DT/NT, edge, other), sacks and the throw time. One JSON line per play.
 * node --import tsx scripts/diag/depth/passlab.ts --out FILE [--n 8] [--covs a,b] */
import { appendFileSync, writeFileSync } from 'node:fs';
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { Rng } from '../../../src/core/rng.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const out = arg('--out', 'out/passlab.jsonl'), n = Number(arg('--n', '8'));
writeFileSync(out, '');
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const passes = ['stick', 'smash', 'curl_flat', 'four_verts', 'flood', 'dagger', 'y_cross', 'comebacks'];
const forms = ['gun_doubles_11', 'gun_trips_11', 'ace_11'];
const covs = arg('--covs', 'cover1,cover2,cover3,cover4,cover6').split(',');
const fronts = ['over', 'under'];
for (const pass of passes) for (const form of forms) for (const cov of covs) for (const front of fronts) {
  const formation = FORMATION_BY_ID[form];
  for (let i = 0; i < n; i++) {
    const seed = [...`${pass}|${form}|${cov}|${front}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
      offCall: { formation, flip: i % 2 === 1, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID[front] ?? FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
      los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
    let pressure = -1, who = '';
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (pressure >= 0 || sim.throwAt >= 0 || sim.carrier !== sim.qb) return;
      for (const d of sim.defense) if (Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2) {
        pressure = sim.t; who = /^(DT|NT)/.test(d.slot) ? 'interior' : /^(DE|OLB|EDGE)/.test(d.slot) ? 'edge' : 'other'; break;
      }
    };
    const r = sim.run();
    appendFileSync(out, JSON.stringify({ pass, form, cov, front, i, pressure, who, sack: !!r.stats.sacked, throwAt: sim.throwAt, yards: r.yards }) + '\n');
  }
}
