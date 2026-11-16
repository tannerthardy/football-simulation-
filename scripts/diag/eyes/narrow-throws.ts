// BLITZ_READ=1 BLITZ_DEPTH=1 BLITZ_SKILL=1 BLITZ_SECOND=1 QB_EVADE_UP=1 node --import tsx scripts/diag/eyes/narrow-throws.ts [seed] [games] > rows.jsonl
// Integration's BLITZ_SKILL question (2026-11-16): are the blitz stack's added interceptions thrown while his believed
// pressure narrows him? One row per pass play with a QB throw: at the throw, his narrowing (narrow(): believed free
// pressure x (1 - composure)), his urgency and bar as the read loop last set them (barNow: u, thr, maxInt), his believed
// free threat (freeU), whether the defense called a pressure, and the result (interception, completion). Passive: reads
// the quarterback's own fields at the throw; calls nothing that advances state.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let row: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, ...rest: any[]) => {
    if (p === sim.qb && !row) {
      const b: any = p.behavior, away = !!rest[3];
      let narrow: number | null = null;
      try { narrow = typeof b?.narrow === 'function' ? b.narrow(p) : null; } catch { narrow = null; }
      row = { t: +sim.t.toFixed(2), away, kind: b?.kind ?? null, narrow: narrow === null ? null : +narrow.toFixed(3), freeU: b?.freeU !== undefined ? +b.freeU.toFixed(3) : null,
        bar: b?.barNow ? { u: +b.barNow.u.toFixed(3), thr: +b.barNow.thr.toFixed(3), maxInt: +b.barNow.maxInt.toFixed(3), thr0: +b.barNow.thr0.toFixed(3) } : null,
        P: b?.throwRec?.P ?? null, hot: !!b?.hot, target: target?.slot ?? null };
    }
    return tb(p, target, ...rest);
  };
  const res: any = orig.apply(this);
  if (row) console.log(JSON.stringify({ ...row, concept: sim.offCall?.pass?.id ?? '?', pressure: sim.defCall?.pressure?.id ?? null,
    int: sim.events.some((e: any) => e.type === 'interception'), cmp: !!res.stats?.completed }));
  return res;
};
const seed = Number(process.argv[2] ?? 11);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 4); g++) simulateGame(home, away, { seed: seed + g });
