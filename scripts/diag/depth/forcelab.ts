/** Paired run lab for the force fallback (flags from the environment): the
 * same seeds (hashed from the cell, so any subset pairs), bodies and calls
 * for every arm. Run concepts x formations x
 * man/quarters coverages; per play the force slots, yards and whether the
 * first run contact broke (as runbreak.py). Writes one
 * JSON line per play to --out so two arms can be paired.
 * node --import tsx scripts/diag/depth/forcelab.ts --out FILE [--n 12] */
import { appendFileSync, writeFileSync } from 'node:fs';
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { COUNTER_VARIANTS, RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const out = arg('--out', 'out/forcelab.jsonl'), n = Number(arg('--n', '12'));
writeFileSync(out, '');
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const runs = arg('--runs', 'iz_strong,oz_strong,duo,power,counter,toss,draw').split(',');
const forms = ['ace_11', 'gun_trips_11', 'i_pro_21', 'ace_12'];
const covs = arg('--covs', 'cover0,cover1,cover1_off,cover1_robber,cover2man,cover4,cover4_palms,cover6').split(',');
for (const run of runs) for (const form of forms) for (const cov of covs) {
  const formation = FORMATION_BY_ID[form];
  const personnel = formation.personnel === '21' || formation.personnel === '12' ? 'base43' : 'nickel';
  for (let i = 0; i < n; i++) {
    const seed = [...`${run}|${form}|${cov}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
      offCall: { formation, flip: i % 2 === 1, kind: 'run', run: RUN_BY_ID[run] ?? COUNTER_VARIANTS[run.replace(/^counter_/, '') as keyof typeof COUNTER_VARIANTS], label: run },
      defCall: { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: cov === 'cover0' ? PRESSURE_BY_ID.zero_6 : null, label: cov },
      los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
    // First run contact, as runbreak.py: broken if he still runs 4+ yd/s 0.5 s
    // later and gains 5+ more yards.
    let contact: { t: number; x: number; speed?: number } | null = null;
    const event = sim.event.bind(sim), dir = sim.attackDir('O');
    sim.event = (type, a, b, note) => {
      event(type, a, b, note);
      const c = sim.carrier;
      if (!contact && c && c.team === 'O' && c !== sim.qb && ['tackle_wrap', 'missed_tackle', 'hit', 'carrier_contact'].includes(type))
        contact = { t: sim.t, x: (c.pos.x - sim.los) * dir };
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (contact && contact.speed === undefined && sim.t >= contact.t + .5) contact.speed = sim.carrier?.speed ?? 0; };
    const r = sim.run();
    const met = contact as { t: number; x: number; speed?: number } | null;
    const broke = met ? (met.speed ?? 0) >= 4 && r.yards - met.x >= 5 : null;
    const force = sim.defense.filter(d => d.runFit?.kind === 'force').map(d => d.slot).sort().join('+');
    appendFileSync(out, JSON.stringify({ run, form, cov, i, force, yards: r.yards, broke }) + '\n');
  }
}
