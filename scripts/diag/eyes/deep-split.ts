// node --import tsx scripts/diag/eyes/deep-split.ts [seed] [games] > rows.jsonl : every targeted throw: his aim, where the ball
// went, what the receiver did. Intent is known here: `intended` is the aim point before his miss is drawn.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let rec: any = null, last: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false) => {
    if (target && !throwaway) rec = { t: sim.t, T: arrivalT - sim.t, qb: { x: qb.pos.x, y: qb.pos.y, sp: Math.hypot(qb.vel.x, qb.vel.y), vx: qb.vel.x, vy: qb.vel.y }, aim: { x: intended.x, y: intended.y },
      r0: { x: target.pos.x, y: target.pos.y, vx: target.vel.x, vy: target.vel.y }, target, arrivalT, los: sim.los, acc: [qb.r('accShort'), qb.r('accMid'), qb.r('accDeep')], route: target.behavior?.route?.id ?? null };
    return tb(qb, target, v0, intended, arrivalT, throwaway);
  };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (rec && !rec.done) {
      if (sim.ball.kind === 'air' && !(rec.atArr && sim.t > rec.arrivalT + 1e-9)) last = { x: sim.ball.flight.pos.x, y: sim.ball.flight.pos.y, z: sim.ball.flight.pos.z, t: sim.t, rx: rec.target.pos.x, ry: rec.target.pos.y, rs: Math.hypot(rec.target.vel.x, rec.target.vel.y) };
      else { rec.done = true; }
      if (sim.ball.kind === 'air' && sim.t >= rec.arrivalT - 1e-9) rec.atArr = true;
    }
  };
  const res = orig.apply(this);
  if (rec && last) { const { target, ...r } = rec; console.log(JSON.stringify({ ...r, land: last, completed: !!res.stats.completed, int: !!res.stats.interceptedBy, air: res.stats.airYards })); }
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 6); g++) simulateGame(home, away, { seed: seed + g });
