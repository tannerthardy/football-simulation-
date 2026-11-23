// QB lane 2026-11-23 (Rules' release-at-the-plant, the progression's reach, the read clock on the set). Measurement
// only. League games; every dropback. Every 0.1 s while he holds the ball, for every receiver on a route: ready()
// (his own forecast of the break against a throw started now), whether the read is current, his head's angle to the
// man, and the price (P, pick risk) against his bar. Also his phase and setAt. Per play: the route of each receiver,
// the QB's expected break (forecast.breakAt) and the route's own break time; the decision (windup start) and release.
// The thrown target's gates are read afterwards: the first time each came true, and which came last.
//   node --import tsx scripts/diag/eyes/release-gate.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
PlaySim.prototype.run = ((orig) => function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const samples: any[] = []; let decision: any = null, release: any = null, hooked = false, nextT = 0;
  const routes: Record<string, any> = {};
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => {
    const b0: any = sim.qb.behavior;
    if (!hooked && b0?.kind === 'qb-pass') { hooked = true;
      const st = b0.startThrow.bind(b0);
      b0.startThrow = (a: any, s: any, ev: any) => { if (!decision) decision = { t: +s.t.toFixed(2), slot: ev.target.slot, phase: b0.phase }; return st(a, s, ev); };
      const tb = sim.throwBall.bind(sim);
      sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !release) release = { t: +sim.t.toFixed(2), slot: target?.slot ?? null, away: !!rest[4] || !target }; return tb(p, target, ...rest); };
    }
    tick0();
    const b: any = sim.qb.behavior, qb = sim.qb;
    if (b?.kind !== 'qb-pass' || sim.carrier !== qb || release || !b.reads) return;
    if (sim.t < nextT - 1e-9) return; nextT = sim.t + 0.1;
    const head = qb.head ?? qb.body.facing, cur = b.reads[b.readIdx] ?? null;
    const u = b.barNow?.u ?? 0, need = b.barNow?.thr ?? null, risk = b.barNow?.maxInt ?? null;
    const row: any = { t: +sim.t.toFixed(2), ph: b.phase, setAt: b.setAt, need, risk, r: {} };
    for (const r of sim.offense) {
      const f = b.receiverForecasts?.get(r); if (r === qb || !f) continue;
      if (!routes[r.slot]) routes[r.slot] = { route: r.behavior?.route?.id ?? null, trueBreak: r.behavior?.breakTime ?? null };
      let ready = false; try { ready = b.ready(r, sim); } catch { /* */ }
      const x: any = { ready, cur: r === cur, ang: +(Math.abs(wrap(head - Math.atan2(r.pos.y - qb.pos.y, r.pos.x - qb.pos.x))) * 180 / Math.PI).toFixed(0), exp: f.breakAt?.() ?? null };
      if (ready) { let ev: any = null; try { ev = b.evaluate(qb, sim, r, u); } catch { /* */ } if (ev) { x.P = +ev.P.toFixed(3); x.iR = +ev.intRisk.toFixed(4); } }
      row.r[r.slot] = x;
    }
    samples.push(row);
  };
  const res = orig.apply(this);
  console.log(JSON.stringify({ seed, concept: sim.offCall?.pass?.id ?? null, family: sim.offCall?.pass?.family ?? null, drop: sim.offCall?.pass?.drop ?? null,
    decision, release, routes, cmp: !!sim.stats.completed, samples }));
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) {
  const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s });
}
