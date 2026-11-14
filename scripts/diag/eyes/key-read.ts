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
  const tick = sim.tick.bind(sim); let kts = 0, rec: any = null, named: any = undefined, tgt: any = null, qbRef: any = null;
  sim.tick = () => {
    tick();
    if (tgt && sim.ball.kind === 'air') tgt.last = { x: sim.ball.flight.pos.x, y: sim.ball.flight.pos.y, z: sim.ball.flight.pos.z };
    if (tgt && tgt.target && tgt.aim && !tgt.arr && (sim.t >= tgt.arriveAt - 1e-6 || sim.ball.kind !== 'air')) {
      const r = tgt.target, bp = tgt.last ?? r.pos, sp = Math.hypot(r.vel.x, r.vel.y) || 1, ux = r.vel.x / sp, uy = r.vel.y / sp;
      const ex = tgt.aim.x - r.pos.x, ey = tgt.aim.y - r.pos.y, bx = bp.x - tgt.aim.x, by = bp.y - tgt.aim.y;
      tgt.arr = { early: +(tgt.arriveAt - sim.t).toFixed(2), aimAlong: +(ex * ux + ey * uy).toFixed(1), aimAcross: +(ex * -uy + ey * ux).toFixed(1), aimOff: +Math.hypot(ex, ey).toFixed(1),
        ballOffAim: +Math.hypot(bx, by).toFixed(1), ballZ: tgt.last ? +tgt.last.z.toFixed(1) : null, speed: +sp.toFixed(1),
        looking: Math.cos(r.body.facing - Math.atan2(sim.qb.pos.y - r.pos.y, sim.qb.pos.x - r.pos.x)) > 0 };
    }
    const q = sim.qb, b: any = q.behavior; if (b?.kind !== 'qb-pass') return;
    qbRef = b; kts = Math.max(kts, b.keyThrows ?? 0);
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
  sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !tgt) tgt = { target, away: !!rest[3], t: +sim.t.toFixed(2), kt: (sim.qb.behavior as any)?.keyThrows ?? null, aim: rest[1] ? { x: rest[1].x, y: rest[1].y } : null, arriveAt: sim.t + (rest[2] ?? 0), arr: null as any, air: target ? +Math.hypot(target.pos.x - sim.qb.pos.x, target.pos.y - sim.qb.pos.y).toFixed(1) : null,
      brk: target ? (() => { const f = (sim.qb.behavior as any)?.receiverForecasts?.get(target), b = f?.breakAt?.(); return b == null ? null : +(b - sim.t).toFixed(2); })() : null,
      near: target ? +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y))).toFixed(1) : null, kind: (sim.qb.behavior as any)?.kind }; return tb(p, target, ...rest); };
  const res = orig.apply(this);
  if (rec) {
    const { low, high, ...row } = rec;
    console.log(JSON.stringify({ ...row, thrown: !tgt || tgt.away || !tgt.target ? null : tgt.target === low ? 'low' : tgt.target === high ? 'high' : 'other', cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: (res as any).yards ?? null,
      onRead: (qbRef?.keyThrows ?? 0) > 0, pulled: qbRef?.keyPulled ?? 0, sawKt: kts, shut: qbRef?.keyShut ?? [], over: qbRef?.keyOver ?? 0, thrownAt: tgt?.t ?? null, ktAtThrow: tgt?.kt ?? null, arr: tgt?.arr ?? null, air: tgt?.air ?? null, brk: tgt?.brk ?? null, nearAtThrow: tgt?.near ?? null,
      ball: tgt ? sim.events.filter((e: any) => e.t >= tgt.t && ['catch', 'incomplete', 'pbu', 'interception', 'drop', 'deflection', 'miss'].includes(e.type)).map((e: any) => e.type) : [], kindAtThrow: tgt?.kind ?? null, endKind: sim.qb.behavior?.kind ?? null, desc: String((res as any).description ?? (res as any).text ?? '').slice(0, 90) }));
  }
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
