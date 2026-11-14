/** Pumps per dropback in league games (passive): per pass play, the pump events (a started throw pulled down at the
 * delivery recheck), when each came, the throw time and outcome.
 *   node --import tsx scripts/diag/eyes/pumps.ts [--seed 101] [--games 8] > out/eyes/pumps.jsonl */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  const res = run.call(this);
  const ev = sim.events as any[];
  const thr = ev.find((e) => e.type === 'throw' || e.type === 'throwaway');
  process.stdout.write(JSON.stringify({ concept: sim.offCall.pass?.id, pumps: ev.filter((e) => e.type === 'pump').map((e) => +e.t.toFixed(2)),
    thr: thr ? +thr.t.toFixed(2) : null, sack: ev.some((e) => e.type === 'sack'), throwaway: ev.some((e) => e.type === 'throwaway'), outcome: res.outcome, yards: res.yards, caught: !!sim.stats.completed, int: ev.some((e) => e.type === 'interception') }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
