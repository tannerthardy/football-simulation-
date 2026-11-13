// [QB_SEEN_OUT=1] node --import tsx scripts/diag/eyes/outlet-probe.ts [seed] [games] > rows.jsonl
// One row per dropback: whether a check-release man was in the call, when he truly released, when the quarterback's
// picture first had him on his release route, who was thrown to and when, whether that target was a check-release man
// and whether he was truly on a route when the windup began, and the result. Passive.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim); const men = new Map<any, { rel: number | null; seen: number | null }>();
  let thrown: any = null, windup: { t: number; onRoute: boolean; target: any } | null = null, wasWind = false;
  sim.tick = () => {
    tick();
    const q = sim.qb, b: any = q.behavior; if (b?.kind !== 'qb-pass' || sim.carrier !== q) return;
    for (const [r, f] of b.receiverForecasts as Map<any, any>) {
      if (f.prior.startDelay !== null) continue;
      let o = men.get(r); if (!o) men.set(r, o = { rel: null, seen: null });
      if (o.rel === null && r.behavior.kind === 'route') o.rel = sim.t;
      if (o.seen === null && (f.estimate?.progress ?? null) !== null) o.seen = sim.t;
    }
    const w = b.phase === 'windup';
    if (w && !wasWind && b.pending?.target) windup = { t: sim.t, onRoute: b.pending.target.behavior.kind === 'route', target: b.pending.target };
    wasWind = w;
  };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false, ...rest: any[]) => {
    if (qb === sim.qb && !thrown) thrown = { t: sim.t, slot: target?.slot ?? null, pos: target?.player.position ?? null, away: !!throwaway, check: !!target && men.has(target),
      onRoute: target && windup?.target === target ? windup.onRoute : null, windAt: windup?.t ?? null,
      rel: target ? men.get(target)?.rel ?? null : null, seen: target ? men.get(target)?.seen ?? null : null, depth: (intended.x - sim.los) * sim.attackDir(qb.team) };
    return tb(qb, target, v0, intended, arrivalT, throwaway, ...rest);
  };
  const res = orig.apply(this);
  console.log(JSON.stringify({ men: [...men.values()], thrown, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: res.yards ?? res.stats.yards ?? null, scramble: !!sim.scrambled }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
