// QB lane 2026-11-23 (QB_BAT_HEIGHT: the price should match what our rushers bat). Measurement only. League games: per
// pass attempt from the pass behaviour (not thrown away), whether a defender batted it at the line (catching.ts
// 'batted at the line') and whether the play ended in an interception; and every other deflection by a defender.
//   node --import tsx scripts/diag/eyes/batted.ts <seed> <games>
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
let att = 0, bat = 0, batInt = 0, ints = 0, defl = 0, predicted = 0, predN = 0;
const bins = [0, 0.01, 0.03, 0.06, 1].slice(0, -1).map((lo, i, a) => ({ lo, hi: [0.01, 0.03, 0.06, 1][i], n: 0, pred: 0, bat: 0 }));
PlaySim.prototype.run = ((orig) => function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let thrown = false, pBat: number | null = null, hooked = false; const tb = sim.throwBall.bind(sim);
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { const b: any = sim.qb.behavior; if (!hooked && b?.kind === 'qb-pass') { hooked = true; const st = b.startThrow.bind(b); b.startThrow = (a: any, s2: any, ev: any) => { if (pBat === null) pBat = ev?.parts?.pBat ?? null; return st(a, s2, ev); }; } t0(); };
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => { if (p === sim.qb && !thrown && target && !away) thrown = true; return tb(p, target, v0, intended, arrivalT, away, ...rest); };
  const res = orig.apply(this);
  if (thrown) {
    att++; const ev = sim.events as any[]; const b = ev.some((e) => e.type === 'deflection' && e.note === 'batted at the line'), i = ev.some((e) => e.type === 'interception');
    if (b) bat++; if (b && i) batInt++;
    if (pBat !== null) { predicted += pBat; predN++; const k = bins.find((x) => pBat! >= x.lo && pBat! < x.hi); if (k) { k.n++; k.pred += pBat; if (b) k.bat++; } } if (i) ints++; defl += ev.filter((e) => e.type === 'deflection' && e.note !== 'batted at the line').length;
  }
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) {
  const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s });
}
console.log(JSON.stringify({ seed, games, att, bat, batRate: +(bat / Math.max(1, att)).toFixed(4), batInt, ints, otherDeflections: defl, priced: predN, predictedBats: +predicted.toFixed(2), bins }));
