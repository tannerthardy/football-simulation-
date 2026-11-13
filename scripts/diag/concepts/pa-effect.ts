/**
 * Play action in league games (Integration: call rate and effect before the boot). For every called drop-back pass
 * (not a screen): down, distance, the QB's alignment, whether it is play action, and the outcome; and the second
 * level's response in the first second, by the same operator as pa_effect_nfl.py: off-ball box defenders (3-8 yd off
 * the line, within 6 yd of the ball at the snap), their depth change toward the line at 0.5 and 1.0 s (positive =
 * downhill) and their peak downhill speed in the first 1.0 s. Passive.
 *   node --import tsx scripts/diag/concepts/pa-effect.ts [--seed 101] [--games 8] > out/concepts/pa-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this, call = sim.offCall;
  const pass = call?.kind === 'pass' ? call.pass : null;
  if (!pass || pass.family === 'screen') return run.call(this);
  const dir = sim.attackDir('O');
  const lbs = sim.defense.filter((d: any) => { const dep = (d.pos.x - sim.los) * dir; return dep >= 3 && dep <= 8 && Math.abs(d.pos.y - sim.ballY) <= 6; });
  const start = new Map<any, number>(lbs.map((d: any) => [d, (d.pos.x - sim.los) * dir]));
  const at: Record<string, number[]> = { '0.5': [], '1.0': [] };
  const peak = new Map<any, number>(lbs.map((d: any) => [d, 0]));
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.t <= 1.0 + 1e-9) for (const d of lbs) peak.set(d, Math.max(peak.get(d)!, -d.vel.x * dir));
    for (const T of ['0.5', '1.0']) if (!at[T].length && sim.t >= Number(T) - 1e-9) for (const d of lbs) at[T].push(+(start.get(d)! - (d.pos.x - sim.los) * dir).toFixed(2));
  };
  const r = run.call(this), s = sim.stats, ev = r.events ?? [];
  process.stdout.write(JSON.stringify({ concept: pass.id, family: pass.family, down: sim.down, dist: +(sim.firstDownX - sim.los).toFixed(1),
    qb: call.formation?.qb ?? null, pa: pass.family === 'playaction', lbs: lbs.length, d05: at['0.5'], d10: at['1.0'], peak: [...peak.values()].map((v) => +v.toFixed(2)),
    att: !!s.attempted, cmp: !!s.completed, sack: !!s.sacked, int: ev.some((e: any) => e.type === 'interception'), yards: +r.yards.toFixed(2) }) + '\n');
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
