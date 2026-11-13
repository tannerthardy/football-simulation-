/** Second-level defenders on gap runs with a puller (lab; observation only,
 * flags from the environment; the same seeds per arm). Every 0.2 s to
 * 1.4 s: their requested and achieved lateral speed toward the pull (the
 * lineman displaced furthest sideways by 1.5 s), the
 * share that have read run, that carry the PULL_READ tag, and their
 * behavior; and when the puller is first seen by them as one (pullers()).
 * node --import tsx scripts/diag/depth/lbpull.ts [--n 20] */
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { believesRun } from '../../../src/sim/behaviors/defense.js';
import { pullers } from '../../../src/sim/run-fits.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--n', '20'));
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const T = [.2, .4, .6, .8, 1.0, 1.2, 1.4];
const req: number[][] = T.map(() => []), got: number[][] = T.map(() => []), read: number[][] = T.map(() => []), tag: number[][] = T.map(() => []), seen: number[][] = T.map(() => []);
const kinds = new Map<string, number>();
const LB = /^(LB|MLB|ILB|OLB|SAM|WILL|MIKE)/;
for (const run of ['power', 'counter']) for (const form of ['ace_11', 'i_pro_21']) for (const cov of ['cover3', 'cover1']) for (let i = 0; i < n; i++) {
  const formation = FORMATION_BY_ID[form], personnel = formation.personnel === '21' ? 'base43' : 'nickel';
  const seed = [...`${run}|${form}|${cov}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
    offCall: { formation, flip: i % 2 === 1, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
  const lbs = sim.defense.filter(d => LB.test(d.slot));
  const line = sim.offense.filter(o => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  const home = new Map(line.map(o => [o, o.pos.y]));
  let side = 0, next = 0;
  const raw: Array<[number, number, number]> = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    // The puller is the lineman displaced furthest sideways by 1.5 s (as pullers.py).
    if (!side && sim.t >= 1.5) { const p = line.reduce((a, b) => Math.abs(b.pos.y - home.get(b)!) > Math.abs(a.pos.y - home.get(a)!) ? b : a); side = Math.sign(p.pos.y - home.get(p)!) || 1; }
    if (next < T.length && sim.t >= T[next] - 1e-9) {
      for (const d of lbs) {
        raw.push([next, sim.intents[d.idx]?.vel.y ?? 0, d.vel.y]);
        read[next].push(believesRun(sim, d) ? 1 : 0); tag[next].push(d.tags.has('fit-pull-read') ? 1 : 0);
        seen[next].push(pullers(sim, d).length ? 1 : 0);
        if (T[next] === 1.0) { const k = d.behavior?.kind ?? '?'; kinds.set(k, (kinds.get(k) ?? 0) + 1); }
      }
      next++;
    }
  };
  sim.run();
  for (const [k, r, g] of raw) { req[k].push(r * (side || 1)); got[k].push(g * (side || 1)); }
}
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
console.log('t           ' + T.map(t => t.toFixed(1).padStart(6)).join(''));
console.log('lat req     ' + req.map(v => mean(v).padStart(6)).join(''));
console.log('lat got     ' + got.map(v => mean(v).padStart(6)).join(''));
console.log('read run    ' + read.map(v => mean(v).padStart(6)).join(''));
console.log('sees puller ' + seen.map(v => mean(v).padStart(6)).join(''));
console.log('pull-read   ' + tag.map(v => mean(v).padStart(6)).join(''));
console.log('behavior at 1.0 s: ' + [...kinds].map(([k, c]) => `${k} ${c}`).join(', '));
