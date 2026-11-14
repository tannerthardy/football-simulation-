// [QB_BELIEVED_DEF=1] node --import tsx scripts/diag/eyes/believed-probe.ts [seed] [games] > rows.jsonl
// Passive: every targeted throw with the chance he priced it at, the outcome, and how far the defender nearest his
// aim is from typical for his position (ball skills and top speed), with the quarterback's awareness and experience.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { typicalAt } from '../../../src/sim/believed.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let rec: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false, ...rest: any[]) => {
    if (target && !throwaway) {
      let near: any = null, nd = Infinity;
      for (const d of sim.defense) { const x = Math.hypot(d.pos.x - intended.x, d.pos.y - intended.y); if (x < nd) { nd = x; near = d; } }
      const typ = near ? typicalAt(near.player.position) : null, tr = qb.behavior?.throwRec;
      rec = { P: tr?.P ?? null, intRisk: tr?.intRisk ?? null, nd, pos: near?.player.position, dBall: near && typ ? near.r('ballSkills') - typ.ratings.ballSkills : null,
        dV: near && typ ? near.profile.vmax - typ.profile.vmax : null,
        dReach: near && typ ? near.profile.reach - typ.profile.reach : null, dReact: near && typ ? near.profile.reactionTime - typ.profile.reactionTime : null, aware: qb.r('awareness'), exp: qb.player.experience };
    }
    return tb(qb, target, v0, intended, arrivalT, throwaway, ...rest);
  };
  const res = orig.apply(this);
  if (rec) console.log(JSON.stringify({ ...rec, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
