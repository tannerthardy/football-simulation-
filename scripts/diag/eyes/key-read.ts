// OUTLET_LAST=1 PLAN_KEYS=1 [QB_KEY_MAN=1] node --import tsx scripts/diag/eyes/key-read.ts [seed] [games] > rows.jsonl
// One row per dropback whose installed plan has a defender key: the concept, the key's role, the man QB_KEY_MAN's
// alignment rule names (computed here for both arms, from the snap alignment), the man the read was taken on, his
// answer, where that man truly was along the low-high stretch at the read (0 = on the low route, 1 = on the high one),
// who was thrown to (low, high, or another), whether the throw was started on the read (QB_KEY_THROW) and what shut
// the window when it was not, and the result. Passive.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim); let rec: any = null, named: any = undefined, tgt: any = null, qbRef: any = null;
  sim.tick = () => {
    tick();
    const q = sim.qb, b: any = q.behavior; if (b?.kind !== 'qb-pass') return;
    qbRef = b;
    const k = b.plan?.key; if (!k) return;
    if (named === undefined) named = k.man ?? b.keyMan(sim, k.role, k.low, k.high);
    if (!rec && b.keyRead) {
      const kr = b.keyRead, on = kr.defender ? sim.defense.find((d: any) => d.player.id === kr.defender) : null;
      const lo = k.low.pos, hi = k.high.pos, sx = hi.x - lo.x, sy = hi.y - lo.y, L2 = Math.max(1, sx * sx + sy * sy);
      const along = (d: any) => d ? +(((d.pos.x - lo.x) * sx + (d.pos.y - lo.y) * sy) / L2).toFixed(2) : null;
      rec = { t: +kr.at.toFixed(2), role: k.role, concept: sim.offCall?.pass?.id ?? '?', coverage: sim.defCall?.coverage?.id ?? '?', named: named?.slot ?? null, namedPos: named?.player.position ?? null,
        on: on?.slot ?? null, onPos: on?.player.position ?? null, answer: kr.defender ? kr.throwTo : 'none', s: kr.s, trueOn: along(on), trueNamed: along(named), low: k.low, high: k.high };
    }
  };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !tgt) tgt = { target, away: !!rest[3], t: +sim.t.toFixed(2) }; return tb(p, target, ...rest); };
  const res = orig.apply(this);
  if (rec) {
    const { low, high, ...row } = rec;
    console.log(JSON.stringify({ ...row, thrown: !tgt || tgt.away || !tgt.target ? null : tgt.target === low ? 'low' : tgt.target === high ? 'high' : 'other', cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: (res as any).yards ?? null,
      onRead: (sim.qb.behavior?.keyThrows ?? qbRef?.keyThrows ?? 0) > 0, shut: qbRef?.keyShut ?? [], thrownAt: tgt?.t ?? null }));
  }
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
