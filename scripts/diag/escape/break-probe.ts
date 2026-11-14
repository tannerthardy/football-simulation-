// QB_BREAK=1 THROW_PLATFORM=1 node --import tsx scripts/diag/escape/break-probe.ts [seed] [games] > rows.jsonl
// One row per dropback: what he did out of the pocket (QBPass.breakRec: the break and its cause, tuck, throw-away,
// stop-and-set, throw), where he was when the ball left or the play ended (depth behind the line, width from the
// ball), and the result. Passive. Table: break_table.py.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim); let qb: any = null, thrown: any = null, last: any = null;
  sim.tick = () => {
    tick();
    const q = sim.qb, b: any = q.behavior;
    if (!qb && b?.kind === 'qb-pass') qb = b;
    if (qb && sim.carrier === q) last = { t: +sim.t.toFixed(2), depth: +((sim.los - q.pos.x) * sim.attackDir(q.team)).toFixed(1), wide: +Math.abs(q.pos.y - sim.ballY).toFixed(1), speed: +Math.hypot(q.vel.x, q.vel.y).toFixed(1) };
  };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false, ...rest: any[]) => {
    if (p === sim.qb && !thrown) thrown = { ...last, away: !!throwaway, depthOfTarget: +((intended.x - sim.los) * sim.attackDir(p.team)).toFixed(1) };
    return tb(p, target, v0, intended, arrivalT, throwaway, ...rest);
  };
  const res = orig.apply(this);
  if (!qb) return res;
  console.log(JSON.stringify({ rec: (qb.breakRec ?? []).map((r: any) => ({ t: +r.t.toFixed(2), what: r.what })), tries: (qb.breakTry ?? []).length, firstTry: (qb.breakTry ?? [])[0] ?? null, thrown, last, sacked: !!res.stats.sacked, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy,
    scramble: !!sim.scrambled, yards: (res as any).yards ?? null }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
