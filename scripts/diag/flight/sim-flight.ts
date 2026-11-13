/**
 * Ball flight in league games, as nfl_flight.py measures the NFL: on every completed pass, the throw (the ball in the
 * air) to the ball reaching the receiver's hands (the securing window opening: CATCH_SECURE's 'secure', the sim's
 * pass_arrived); the distance from the passer at the throw to the ball at that moment; the air yards (the ball's depth
 * past the line then); the ball's launch speed. Passive.
 *   node --import tsx scripts/diag/flight/sim-flight.ts [--seed 101] [--games 8] > out/flight/sim-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  let rel: any = null, arr: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (!air && sim.ball.kind === 'air' && !rel && !sim.ball.throwaway) {
      const v = sim.ball.flight?.vel;
      rel = { t: sim.t, qx: sim.qb.pos.x, qy: sim.qb.pos.y, v0: v ? Math.hypot(v.x, v.y, v.z) : null };
    }
    if (rel && !arr && sim.ball.kind === 'air' && sim.ball.securing) { const b = sim.ballPos(); arr = { t: sim.t, x: b.x, y: b.y }; }
  };
  const r = run.call(this);
  if (rel && arr && sim.stats.completed) process.stdout.write(JSON.stringify({ T: +(arr.t - rel.t).toFixed(2), dist: +Math.hypot(arr.x - rel.qx, arr.y - rel.qy).toFixed(2),
    air: +((arr.x - sim.los) * sim.attackDir('O')).toFixed(2), v0: rel.v0 === null ? null : +(rel.v0 * 0.9144 / 0.9144).toFixed(2) }) + '\n');
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
