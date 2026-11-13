/** The long-run tail, encounter by encounter (observation only; flags from
 * the environment). forcelab's paired run x formation x coverage matrix. For
 * every run reaching 15 yd: each contact event on the carrier (hit,
 * carrier_contact, tackle_wrap, missed_tackle, broken_tackle) with the
 * defender's group (DL, LB, box DB, deep = a deep-zone defender) and the
 * carrier's yard line; summarised past 5 yd by group: how many reached him
 * (any contact), wrapped, missed, broke free of a wrap; and the share of runs
 * reaching 20 and 40.
 * node --import tsx scripts/diag/runblock/taillab.ts [--n 5] */
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { isDeepZone } from '../../../src/playbook/alignment.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { DefSlot } from '../../../src/playbook/types.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--n', '5')), traceN = Number(arg('--trace', '0'));
let traced = 0;
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const runs = arg('--runs', 'iz_strong,oz_strong,duo,power,counter,toss,draw').split(',');
const forms = ['ace_11', 'gun_trips_11', 'i_pro_21', 'ace_12'];
const covs = arg('--covs', 'cover0,cover1,cover1_off,cover1_robber,cover2man,cover4,cover4_palms,cover6').split(',');
const TYPES = ['hit', 'carrier_contact', 'tackle_wrap', 'missed_tackle', 'broken_tackle'];
type Ev = { type: string; group: string; yard: number };
const long: Array<{ yards: number; evs: Ev[] }> = [];
let plays = 0;
for (const run of runs) for (const form of forms) for (const cov of covs) {
  const formation = FORMATION_BY_ID[form];
  const personnel = formation.personnel === '21' || formation.personnel === '12' ? 'base43' : 'nickel';
  for (let i = 0; i < n; i++) {
    const seed = [...`${run}|${form}|${cov}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
      offCall: { formation, flip: i % 2 === 1, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: cov === 'cover0' ? PRESSURE_BY_ID.zero_6 : null, label: cov },
      los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
    const dir = sim.attackDir('O');
    const group = (d: Agent) => {
      const role = sim.defAlign.spots[d.slot as DefSlot]?.role;
      if (role?.kind === 'zone' && isDeepZone(role.zone)) return 'deep';
      const x = (sim.defAlign.spots[d.slot as DefSlot]!.pos.x - sim.los) * dir;
      return x < 2 ? 'DL' : d.slot.startsWith('LB') ? 'LB' : 'boxDB';
    };
    const evs: Ev[] = [];
    const frames: string[] = [];
    let nextMark = 15;
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => {
      tick0();
      const c = sim.carrier;
      if (!c || c.team !== 'O' || c === sim.qb) return;
      const yard = (c.pos.x - sim.los) * dir;
      if (yard < nextMark) return;
      nextMark += 5;
      const near = sim.defense.map(d => ({ d, dist: Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) })).sort((p, q) => p.dist - q.dist).slice(0, 4);
      frames.push(`    ${yard.toFixed(0)} yd t=${sim.t.toFixed(2)} back ${Math.hypot(c.vel.x, c.vel.y).toFixed(1)} yd/s y=${c.pos.y.toFixed(1)} | ` + near.map(({ d, dist }) =>
        `${d.slot}(${group(d)}) ${dist.toFixed(1)}yd ${((d.pos.x - c.pos.x) * dir) >= 0 ? 'ahead' : 'behind'} ${((d.pos.x - c.pos.x) * dir).toFixed(1)} sp ${Math.hypot(d.vel.x, d.vel.y).toFixed(1)}${d.engagement ? ' ENG' : ''}${sim.bond?.tacklers.includes(d) ? ' BOND' : ''}`).join('; '));
    };
    const event = sim.event.bind(sim);
    sim.event = (type, a, b, note) => {
      event(type, a, b, note);
      const c = sim.carrier;
      if (!TYPES.includes(type) || !c || c.team !== 'O' || c === sim.qb) return;
      const d = [a, b].find(x => x && (x as Agent).team !== 'O') as Agent | undefined;
      if (d) evs.push({ type, group: group(d), yard: (c.pos.x - sim.los) * dir });
    };
    const r = sim.run();
    plays++;
    if (r.yards >= 15) long.push({ yards: r.yards, evs });
    if (r.yards >= 40 && traced < traceN) {
      traced++;
      console.log(`TRACE ${run} ${form} ${cov} ${i}: ${r.yards.toFixed(0)} yd | events ` + evs.map(e => `${e.type}:${e.group}@${e.yard.toFixed(0)}`).join(' '));
      for (const f of frames) console.log(f);
    }
  }
}
const pct = (k: number, m: number) => `${(100 * k / Math.max(m, 1)).toFixed(0)}%`;
const r20 = long.filter(l => l.yards >= 20), r40 = long.filter(l => l.yards >= 40);
console.log(`plays ${plays} | reach 15 ${pct(long.length, plays)}, 20 ${pct(r20.length, plays)}, 40 ${pct(r40.length, plays)} | P(40 | 20) ${pct(r40.length, r20.length)}`);
for (const [name, R] of [['runs 20-39', r20.filter(l => l.yards < 40)], ['runs 40+', r40]] as const) {
  console.log(`  ${name} (n ${R.length}): contacts past 5 yd per run by group, and the runs with each kind`);
  for (const g of ['DL', 'LB', 'boxDB', 'deep']) {
    const E = R.map(l => l.evs.filter(e => e.group === g && e.yard >= 5));
    const has = (t: string) => E.filter(es => es.some(e => e.type === t)).length;
    console.log(`    ${g.padEnd(5)} any ${pct(E.filter(es => es.length).length, R.length)} | hit ${pct(has('hit'), R.length)} contact ${pct(has('carrier_contact'), R.length)} wrap ${pct(has('tackle_wrap'), R.length)} missed ${pct(has('missed_tackle'), R.length)} broke ${pct(has('broken_tackle'), R.length)}`);
  }
  const none = R.filter(l => !l.evs.some(e => e.yard >= 5)).length;
  console.log(`    no contact at all past 5 yd: ${pct(none, R.length)}`);
}
