/** His blitz read against what comes (league games, passive): per pass play, his blitz expectation and its inputs at
 * the snap, the rushers at 1.0 s (rush/blitz behaviours), the throw time and target, sack, and the outcome.
 *   node --import tsx scripts/diag/eyes/blitz-read.ts [--seed 101] [--games 8] > out/eyes/blitz.jsonl */
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
  let snap: any = null, rush: number | null = null, thr: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    const q = sim.qb.behavior;
    if (!snap && q?.kind === 'qb-pass' && q.mind) snap = { expected: !!q.mind.blitzExpected, inputs: q.mind.blitzInputs, coverage: sim.defCall?.coverage?.id, pressure: sim.defCall?.pressure?.id ?? null };
    if (rush === null && sim.t >= 1.0) rush = sim.defense.filter((d: any) => d.behavior?.kind === 'rush' || d.behavior?.kind === 'blitz').length;
    if (!thr && was !== 'air' && sim.ball.kind === 'air' && !sim.ball.throwaway && sim.ball.target) thr = { t: +sim.t.toFixed(2), pos: sim.ball.target.player.position, slot: sim.ball.target.slot };
  };
  const res = run.call(this);
  process.stdout.write(JSON.stringify({ concept: sim.offCall.pass?.id, snap, rush, thr, sack: sim.events.some((e: any) => e.type === 'sack'), outcome: res.outcome }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
