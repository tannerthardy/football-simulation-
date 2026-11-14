// node --import tsx scripts/diag/eyes/late-options.ts [seed] [games] > rows.jsonl   (flags from the environment)
// One row per targeted throw: when its windup began, and for every man in his reads at that moment: how far
// downfield he truly is, whether his route is finished (the runner's own settled flag, read here for diagnosis only),
// whether the quarterback counts him ready, where he sits in the progression, and what the quarterback priced him at
// (chance and pick risk on his pictures, at the urgency of that tick). Marks the man thrown to. Table:
// late_options_table.py. Passive except that it calls his own evaluate() once per man at the windup's first tick.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim); let was = false, rec: any = null;
  sim.tick = () => {
    tick();
    const q = sim.qb, b: any = q.behavior; if (b?.kind !== 'qb-pass' || sim.carrier !== q) return;
    const w = b.phase === 'windup';
    if (w && !was && b.pending?.target) {
      const dir = sim.attackDir(q.team), u = b.throwRec?.u ?? 0;
      rec = { t: +sim.t.toFixed(2), thr: b.throwRec?.thr ?? null, u, readIdx: b.readIdx, target: b.pending.target.slot, qbSpeed: +Math.hypot(q.vel.x, q.vel.y).toFixed(1),
        men: b.reads.map((r: any, i: number) => {
          const ev = b.evaluate(q, sim, r, u);
          return { slot: r.slot, i, depth: +((r.pos.x - sim.los) * dir).toFixed(1), wide: +Math.abs(r.pos.y - sim.ballY).toFixed(1), speed: +Math.hypot(r.vel.x, r.vel.y).toFixed(1),
            settled: !!r.behavior?.settled, route: r.behavior?.route?.id ?? r.behavior?.kind, ready: !!b.ready(r, sim), P: ev ? +ev.P.toFixed(2) : null, risk: ev ? +ev.intRisk.toFixed(3) : null, thrown: r === b.pending.target };
        }) };
    }
    was = w;
  };
  const res = orig.apply(this);
  if (rec && sim.ball?.kind !== 'held') console.log(JSON.stringify({ ...rec, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, away: !!res.stats.throwaway }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
