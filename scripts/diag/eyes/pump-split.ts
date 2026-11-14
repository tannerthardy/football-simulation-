/**
 * Why a started throw is pulled down (league games, passive: wraps QBPass.startThrow and pullDown). At the start of the
 * throw and at the delivery recheck: his forecast error on the target (where he believes the receiver is now against
 * where he is), and the nearest defender's distance to the catch point, true and in his picture (mind.estimate).
 * Pulled throws against kept ones: is it the forecast that moved, or a defender closing?
 *   node --import tsx scripts/diag/eyes/pump-split.ts [--seed 101] [--games 8] > out/eyes/pump-split.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const P: any = QBPass.prototype;
const snap = (qb: any, a: any, sim: any, ev: any) => {
  const r = ev.target, f = qb.receiverForecasts.get(r)?.predict(sim.t, 0);
  const pt = ev.point;
  let tTrue = 99, tSeen = 99, who: any = null;
  for (const d of sim.defense) {
    if (d.isDown(sim.t)) continue;
    const dt = Math.hypot(d.pos.x - pt.x, d.pos.y - pt.y); if (dt < tTrue) { tTrue = dt; who = d; }
    const e = qb.mind.estimate(d).pos; tSeen = Math.min(tSeen, Math.hypot(e.x - pt.x, e.y - pt.y));
  }
  return { t: sim.t, fErr: f ? Math.hypot(f.x - r.pos.x, f.y - r.pos.y) : null, defTrue: tTrue, defSeen: tSeen, who, depth: (pt.x - sim.los) * sim.attackDir('O') };
};
const startThrow = P.startThrow;
P.startThrow = function (this: any, a: any, sim: any, ev: any) { this.__start = snap(this, a, sim, ev); return startThrow.call(this, a, sim, ev); };
const pullDown = P.pullDown;
P.pullDown = function (this: any, a: any, sim: any, ev: any) {
  const now = snap(this, a, sim, ev), s0 = this.__start;
  const pulled = pullDown.call(this, a, sim, ev);
  if (s0) {
    const sameDef = s0.who === now.who;
    process.stdout.write(JSON.stringify({ pulled, dt: +(now.t - s0.t).toFixed(2), depth: +now.depth.toFixed(1),
      fErr0: s0.fErr === null ? null : +s0.fErr.toFixed(2), fErr1: now.fErr === null ? null : +now.fErr.toFixed(2),
      defTrue0: +s0.defTrue.toFixed(2), defTrue1: +now.defTrue.toFixed(2), defSeen0: +s0.defSeen.toFixed(2), defSeen1: +now.defSeen.toFixed(2), sameDef }) + '\n');
  }
  return pulled;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
