// node --import tsx scripts/diag/eyes/throw-role.ts [seed] [games] > rows.jsonl   (flags from the environment)
// One row per targeted throw: the target's role in the installed read plan (alert, the key's low or high man, a
// triangle man, the outlet, a man in the order, or none: no plan), his place in the quarterback's reads and the place
// the read loop was on when the windup began, the plan's style, the route he ran, when the ball left, whether the throw
// came through the alarm (hot), the result, and for each man ahead of him in the reads: ready, his price, how far
// downfield, still running, and whether his break is behind him. Passive except for one evaluate() per man ahead.
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
      const t = b.pending.target, p = b.plan;
      const role = !p ? 'no plan' : t === p.alert ? 'alert' : p.key && t === p.key.low ? 'key low' : p.key && t === p.key.high ? 'key high' : p.triangle?.includes(t) ? 'triangle' : t === p.outlet ? 'outlet' : 'order';
      rec = { t: +sim.t.toFixed(2), role, style: p?.style ?? null, place: b.reads.indexOf(t), on: b.readIdx, reads: b.reads.length, route: t.behavior?.route?.id ?? t.behavior?.kind, pos: t.player.position,
        thr: b.throwRec?.thr ?? null, sinceSet: b.setAt !== undefined ? +(sim.t - b.setAt).toFixed(2) : null,
        ahead: b.reads.slice(0, Math.max(0, b.reads.indexOf(t))).map((r: any) => { const ev = b.evaluate(q, sim, r, b.throwRec?.u ?? 0); return { route: r.behavior?.route?.id ?? r.behavior?.kind, ready: !!b.ready(r, sim), P: ev ? +ev.P.toFixed(2) : null,
          depth: +((r.pos.x - sim.los) * sim.attackDir(q.team)).toFixed(1), speed: +Math.hypot(r.vel.x, r.vel.y).toFixed(1), broken: (() => { const f = b.receiverForecasts.get(r); return !!f?.hasBreak && f.breakAt() === null; })() }; }),
        hot: !!b.throwRec?.hot, P: b.throwRec?.P ?? null, clearsNormal: b.throwRec?.clearsNormal ?? null, keyRead: !!b.keyRead, concept: sim.offCall?.pass?.id ?? '?' };
    }
    was = w;
  };
  const res = orig.apply(this);
  if (rec && !res.stats.throwaway) console.log(JSON.stringify({ ...rec, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
