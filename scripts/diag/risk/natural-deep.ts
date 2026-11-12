/**
 * Natural deep throws (go-ball placement, throw side; Integration and Coverage's question: why natural deep balls
 * come down short of the receiver's full-speed spot when forced ones do not). League-sampled games; every released
 * throw aimed 15+ yd past the line. At the release: his aim, the launched flight (untouched: where it comes down at
 * its planned arrival), the receiver's position and velocity, and his forecast of the receiver over the flight; the
 * time since the snap, his urgency, platform (moving / flick), coverage family, nearest defender to the target. At the
 * planned arrival: the receiver's actual position. Along / across are along the QB -> aim line.
 * - vsHeldRel: launched flight vs the receiver held at his release velocity (Coverage's deep_trail "release" spot);
 * - leadRel: aim vs that held spot (his lead); dispAlong/dispAcross: launched vs aim (dispersion);
 * - fcSpeed: his forecast's mean speed over the flight; relSpeed: the receiver's speed at the release;
 *   actSpeed: the receiver's mean speed over the flight; actVsHeld: where he actually is vs the held spot;
 * - vsActual / vsActualAcross: launched vs the actual receiver.
 *   node --import tsx scripts/diag/risk/natural-deep.ts [--seed 101] [--games 8] > out/risk/natdeep-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { DRAG_SPIRAL, simulateTo } from '../../../src/physics/ball.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const P: any = QBPass.prototype, rel = P.release;
let cur: any = null;
P.release = function (a: any, sim: any, ev: any) {
  const tb = sim.throwBall, qb = this;
  sim.throwBall = (q: any, r: any, v0: any, pt: any, arr: number) => {
    sim.throwBall = tb;
    const T = arr - sim.t;
    if (r && pt.x * sim.attackDir(q.team) - sim.los * sim.attackDir(q.team) >= 15) {
      const relPos = { x: q.pos.x + Math.cos(q.body.facing) * 0.3, y: q.pos.y + Math.sin(q.body.facing) * 0.3, z: 2.2 };
      const land = simulateTo(relPos, v0, T, DRAG_SPIRAL, sim.wind);
      const f = qb.receiverForecasts.get(r), f0 = f?.predict(sim.t, 0), f1 = f?.predict(sim.t, T);
      const pr = qb.pressure(a, sim);
      cur = { t: sim.t, T, from: { x: q.pos.x, y: q.pos.y }, pt: { x: pt.x, y: pt.y }, land: { x: land.x, y: land.y }, r,
        rel: { x: r.pos.x, y: r.pos.y, vx: r.vel.x, vy: r.vel.y }, fcSpeed: f0 && f1 ? Math.hypot(f1.x - f0.x, f1.y - f0.y) / T : null,
        sinceSnap: sim.t, urgency: Math.max(0, Math.min(1, (0.9 - pr.time) / 0.7)), moving: Math.hypot(q.vel.x, q.vel.y) > 2.2, flick: qb.flick ?? 0,
        sep: Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y))), coverage: sim.defCall?.coverage?.id ?? null, arr };
    }
    return tb.call(sim, q, r, v0, pt, arr);
  };
  return rel.call(this, a, sim, ev);
};
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this; cur = null;
  let at: any = null, meet: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const wasFree = sim.ball.kind === 'air' && !sim.ball.securing;
    tick();
    if (cur && !at && sim.t >= cur.arr - 1e-9) at = { x: cur.r.pos.x, y: cur.r.pos.y };
    // Where the ball is met: the first tick it is in hands (securing) or no longer in flight.
    if (cur && !meet && wasFree && !(sim.ball.kind === 'air' && !sim.ball.securing)) { const b = sim.ballPos(); meet = { x: b.x, y: b.y, t: sim.t }; }
  };
  const res = run.call(this);
  if (cur && at) {
    const c = cur, ux = c.pt.x - c.from.x, uy = c.pt.y - c.from.y, L = Math.hypot(ux, uy) || 1;
    const al = (p: any, o: any) => +(((p.x - o.x) * ux + (p.y - o.y) * uy) / L).toFixed(2);
    const ac = (p: any, o: any) => +Math.abs(((p.y - o.y) * ux - (p.x - o.x) * uy) / L).toFixed(2);
    const held = { x: c.rel.x + c.rel.vx * c.T, y: c.rel.y + c.rel.vy * c.T };
    const ev = res.events ?? [];
    process.stdout.write(JSON.stringify({ air: +L.toFixed(1), depth: +((c.pt.x - sim.los) * sim.attackDir(sim.offense[0].team)).toFixed(1), T: +c.T.toFixed(2),
      sinceSnap: +c.sinceSnap.toFixed(2), urgency: +c.urgency.toFixed(2), moving: c.moving, flick: +c.flick.toFixed(2), sep: +c.sep.toFixed(2), coverage: c.coverage,
      relSpeed: +Math.hypot(c.rel.vx, c.rel.vy).toFixed(2), fcSpeed: c.fcSpeed === null ? null : +c.fcSpeed.toFixed(2),
      actSpeed: +(Math.hypot(at.x - c.rel.x, at.y - c.rel.y) / c.T).toFixed(2),
      vsHeldRel: al(c.land, held), leadRel: al(c.pt, held), dispAlong: al(c.land, c.pt), dispAcross: ac(c.land, c.pt),
      actVsHeld: al(at, held), meetVsHeld: meet ? al(meet, { x: c.rel.x + c.rel.vx * (meet.t - c.t), y: c.rel.y + c.rel.vy * (meet.t - c.t) }) : null,
      meetVsHeldArr: meet ? al(meet, held) : null, meetEarly: meet ? +(c.arr - meet.t).toFixed(2) : null, vsActual: al(c.land, at), vsActualAcross: ac(c.land, at),
      cmp: !!sim.stats.completed, int: ev.some((e: any) => e.type === 'interception'), touched: ev.some((e: any) => e.type === 'pbu' || e.type === 'deflection') }) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
