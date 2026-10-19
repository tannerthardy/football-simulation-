/** Backers on gap schemes, before and after the handoff (observation only):
 * at snap + T for each T, every insert/force backer's requested and actual
 * lateral velocity toward the play side, whether he reads a puller
 * (pullers(), from his own picture; the PULL_READ path) and its side, and his
 * behavior kind. Play side = the side the concept is called to.
 * node --import tsx scripts/diag/stretch/lbflow.ts [--concepts power,counter] [--formations i_pro_21,ace_12] [--seeds 77,71001] */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
import { pullers } from '../../../src/sim/run-fits.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const TIMES = [.4, .6, .8, 1.0, 1.2, 1.5, 1.8];
const R = rosters();
const rows: { t: number; req: number; act: number; ind: number }[] = [];
for (const formation of arg('--formations', 'i_pro_21,ace_12').split(',')) for (const concept of arg('--concepts', 'power,counter').split(','))
  for (const dir of ['strong', 'weak'] as const) for (const [lk] of LOOK_SPECS) for (const roster of ['pair11', 'pair31'])
    for (const seed of arg('--seeds', '77,71001').split(',').map(Number)) {
      const sim = makeSim({ concept, dir, look: lk, roster, seed, formation }, R);
      const ps = playSideSign(sim, sim.offCall.run!);
      let k = 0;
      while (sim.phase === 'live' && k < TIMES.length) {
        sim.tick();
        if (sim.t + 1e-9 < TIMES[k]) continue;
        for (const d of sim.defense) {
          if (!d.slot.startsWith('LB') || !d.runFit || (d.runFit.kind !== 'insert' && d.runFit.kind !== 'force')) continue;
          const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 }, pull = pullers(sim, d)[0], ind = pull ? { side: Math.sign(pull.vel.y) } : null;
          rows.push({ t: TIMES[k], req: iv.y * ps, act: d.vel.y * ps, ind: ind ? ind.side * ps : 0 });
        }
        k++;
      }
    }
const q = (v: number[], f = .5) => { const s = v.slice().sort((a, b) => a - b); return s.length ? +s[Math.floor(f * (s.length - 1))].toFixed(2) : NaN; };
console.log('backers (insert/force), lateral toward the play side, yd/s');
for (const t of TIMES) {
  const s = rows.filter(r => r.t === t);
  const seen = s.filter(r => r.ind !== 0);
  console.log(`  t ${t.toFixed(1)}: n ${s.length} requested p25/50/75 ${q(s.map(r => r.req), .25)}/${q(s.map(r => r.req))}/${q(s.map(r => r.req), .75)} actual p50 ${q(s.map(r => r.act))} | sees a pull ${(100 * seen.length / s.length).toFixed(0)}% (toward play ${(100 * seen.filter(r => r.ind > 0).length / Math.max(1, seen.length)).toFixed(0)}%), requested when seen p50 ${q(seen.map(r => r.req))}`);
}
