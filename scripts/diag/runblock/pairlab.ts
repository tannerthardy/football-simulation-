/** Paired lab: identical plays per concept under the environment's flags (Over front, 4 formations x 8
 * coverages x n, los 35, left hash, seeds from the cell key; roster Rng(7), strength .55). Per concept: mean
 * yards, yards capped at 10, stuff / 10+ / 20+ rates and a hash of the results (equal hash = identical plays).
 * DUMP=1 prints each play's yards and first defender in contact.
 * node --import tsx scripts/diag/runblock/pairlab.ts [--n 3] [--concepts iz_strong,...] [--covs cover1,...] */
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--n', '3'));
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const concepts = arg('--concepts', 'draw,counter,toss,trap,power,iz_strong,oz_strong,duo').split(',');
const forms = ['ace_11', 'gun_trips_11', 'i_pro_21', 'ace_12'];
const covs = arg('--covs', 'cover0,cover1,cover1_off,cover2,cover3,cover4,cover6,cover2man').split(',');
for (const con of concepts) {
  const ys: number[] = []; let sig = 0;
  for (const form of forms) for (const cov of covs) {
    const formation = FORMATION_BY_ID[form];
    const personnel = formation.personnel === '21' || formation.personnel === '12' ? 'base43' : 'nickel';
    for (let i = 0; i < n; i++) {
      const seed = [...`${con}|${form}|${cov}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
      const run = RUN_BY_ID[con];
      const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
        offCall: run ? { formation, flip: i % 2 === 1, kind: 'run', run, label: con } : { formation, flip: i % 2 === 1, kind: 'pass', pass: PASS_BY_ID[con], label: con },
        defCall: { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: cov === 'cover0' ? PRESSURE_BY_ID.zero_6 : null, label: cov },
        los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
      const r = sim.run();
      ys.push(r.yards);
      if (process.env.DUMP) { const ev=sim.events.find(e=>e.type==='carrier_contact'||e.type==='tackle_wrap'||e.type==='hit'); const who=ev? [ev.a,ev.b].map(k=>sim.agents[k as number]).find(x=>x&&x.team!=='O') : undefined; console.log(`P ${con}|${form}|${cov}|${i} ${r.yards.toFixed(1)} ${who?.slot??'-'} t=${ev?.t?.toFixed(2)??'-'} carrier=${sim.carrier?.slot}`); } sig = (Math.imul(sig ^ Math.round(r.yards * 100), 16777619) >>> 0);
    }
  }
  const m = ys.reduce((a, b) => a + b, 0) / ys.length, p = (f: (y: number) => boolean) => (100 * ys.filter(f).length / ys.length).toFixed(0);
  const capped = ys.reduce((a, b) => a + Math.min(b, 10), 0) / ys.length;
  console.log(`${con.padEnd(12)} n ${ys.length} | mean ${m.toFixed(2)} capped10 ${capped.toFixed(2)} | stuff ${p(y => y <= 0)}% 10+ ${p(y => y >= 10)}% 20+ ${p(y => y >= 20)}% | sig ${sig.toString(16)}`);
}
