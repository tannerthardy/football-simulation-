// node --import tsx scripts/diag/eyes/corner-price.ts [seed] [games] > rows.jsonl   (flags from the environment)
// What his price does with a defender over a downfield route. At each of his throws (not throwaways), for every
// receiver on a route who is 8 yd or more downfield, targeted or not: his own evaluation of that throw at that moment
// (P and its parts, pick risk, flight), and the man over the top by true position: among defenders at least as deep
// as the receiver less 2 yd, the one nearest the aim point after 0.3 s more on his course; `need` is the speed he
// would need to cover the rest, less 1 yd of reach, in 1.2 s (corner_danger.py's measure, here to his aim point
// rather than to where the receiver truly is 1.5 s on). Calls his evaluate() once more per receiver at the throw:
// it draws no dice, but it is not a recorded-engine run.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let rows = null as any[] | null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false, ...rest: any[]) => {
    const b: any = qb.behavior;
    if (qb === sim.qb && target && !throwaway && !rows && b?.kind === 'qb-pass') {
      rows = []; const dir = sim.attackDir(qb.team);
      for (const r of sim.offense) {
        const id = r.behavior?.route?.id; if (!id || (r.pos.x - sim.los) * dir < 8) continue;
        let ev: any = null; try { ev = b.evaluate(qb, sim, r, 0); } catch { ev = null; }
        if (!ev) continue;
        const over = sim.defense.filter((d: any) => (d.pos.x - r.pos.x) * dir >= -2)
          .map((d: any) => ({ d, dist: Math.hypot(d.pos.x + d.vel.x * 0.3 - ev.point.x, d.pos.y + d.vel.y * 0.3 - ev.point.y) })).sort((x: any, y: any) => x.dist - y.dist)[0];
        rows.push({ t: +sim.t.toFixed(2), route: id, tg: r === target, depth: +((r.pos.x - sim.los) * dir).toFixed(1), P: +ev.P.toFixed(3), int: +ev.intRisk.toFixed(3), T: +ev.T.toFixed(2),
          pOpen: ev.parts ? +ev.parts.pOpen.toFixed(3) : null, pClear: ev.parts ? +ev.parts.pClear.toFixed(3) : null, pAcc: ev.parts ? +ev.parts.pAcc.toFixed(3) : null,
          need: over ? +(Math.max(0, over.dist - 1) / 1.2).toFixed(1) : 99, dOp: over ? +over.dist.toFixed(1) : null, concept: sim.offCall?.pass?.id ?? '?' });
      }
    }
    return tb(qb, target, v0, intended, arrivalT, throwaway, ...rest);
  };
  const res = orig.apply(this);
  for (const r of (rows ?? []) as any[]) console.log(JSON.stringify({ ...r, cmp: r.tg ? !!res.stats.completed : null, picked: r.tg ? !!res.stats.interceptedBy : null }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
