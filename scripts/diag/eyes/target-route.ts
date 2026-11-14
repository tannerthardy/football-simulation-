// node --import tsx scripts/diag/eyes/target-route.ts [seed] [games] > rows.jsonl   (flags from the environment)
// One row per targeted throw: the route the target is running (its id, or his behaviour when he is not on a route),
// his position group and slot, when the ball left, where he is past the line, and the result. Passive.
// For bisecting what moved the quarterback's targets between engines: run with one promoted flag set to 0 at a time
// and compare the label shares (target_route_table.py).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let rec: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false, ...rest: any[]) => {
    if (qb === sim.qb && target && !throwaway && !rec) rec = { t: +sim.t.toFixed(2), route: target.behavior?.route?.id ?? target.behavior?.kind ?? '?', slot: target.slot, pos: target.player.position,
      depth: +((target.pos.x - sim.los) * sim.attackDir(qb.team)).toFixed(1), concept: sim.offCall?.pass?.id ?? sim.offCall?.label ?? '?', P: qb.behavior?.throwRec?.P ?? null };
    return tb(qb, target, v0, intended, arrivalT, throwaway, ...rest);
  };
  const res = orig.apply(this);
  if (rec) console.log(JSON.stringify({ ...rec, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
