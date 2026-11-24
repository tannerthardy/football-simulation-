/** Believed body, gate 1 (Flex, 2026-11-24): what the defenders on the field believe of the offense's skill players over a game,
 * against the truth, by play index (BELIEVED_BODY=1). Per (defender, skill player) pair on the field at the end of each play:
 * |believed - true| and the believed sd of top speed and burst, and the share of pairs with a seen floor / a measurement.
 * usage: BELIEVED_BODY=1 node --import tsx scripts/diag/belief/game-belief.mts [games=2] [seed=901] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { BELIEVED_BODY } from '../../../src/sim/believed-body.js';
if (!BELIEVED_BODY) throw new Error('run with BELIEVED_BODY=1');
const games = Number(process.argv[2] ?? 2), seed0 = Number(process.argv[3] ?? 901);
const rng = new Rng(seed0);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const buckets = [[0, 20], [20, 40], [40, 70], [70, 999]] as const;
const acc = buckets.map(() => ({ n: 0, errV: 0, sdV: 0, errA: 0, sdA: 0, floor: 0, measure: 0, rookieN: 0, rookieErr: 0 }));
for (let g = 0; g < games; g++) {
  let play = 0;
  simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, hooks: {
    playResult: (sim) => {
      const r = sim.run();
      const store = sim.beliefs!;
      const k = buckets.findIndex(([a, b]) => play >= a && play < b), A = acc[k];
      for (const d of sim.defense) for (const o of sim.offense) {
        if (['LT', 'LG', 'C', 'RG', 'RT', 'QB'].includes(o.slot)) continue;
        const b = store.belief(d, o), v = b.get('vmax'), a = b.get('accel');
        A.n++; A.errV += Math.abs(v.mean - o.profile.vmax); A.sdV += v.sd; A.errA += Math.abs(a.mean - o.profile.vmax / o.profile.tau); A.sdA += a.sd;
        if (b.entries.some((e) => (e.source.kind === 'saw' || e.source.kind === 'told') && e.kind === 'floor')) A.floor++;
        if (b.entries.some((e) => (e.source.kind === 'saw' || e.source.kind === 'told') && e.kind === 'measure')) A.measure++;
        if (o.player.experience === 0) { A.rookieN++; A.rookieErr += Math.abs(v.mean - o.profile.vmax); }
      }
      play++;
      return r;
    } } });
}
console.log('| plays | pairs | vmax abs err | vmax sd | burst abs err | burst sd | with a seen/told floor | with a measurement | rookies: vmax abs err |');
console.log('|---|---|---|---|---|---|---|---|---|');
buckets.forEach(([a, b], i) => { const A = acc[i]; if (!A.n) return;
  console.log(`| ${a}-${b === 999 ? 'end' : b} | ${A.n} | ${(A.errV / A.n).toFixed(2)} | ${(A.sdV / A.n).toFixed(2)} | ${(A.errA / A.n).toFixed(2)} | ${(A.sdA / A.n).toFixed(2)} | ${(100 * A.floor / A.n).toFixed(0)}% | ${(100 * A.measure / A.n).toFixed(0)}% | ${A.rookieN ? (A.rookieErr / A.rookieN).toFixed(2) + ` (n ${A.rookieN})` : '-'} |`); });
