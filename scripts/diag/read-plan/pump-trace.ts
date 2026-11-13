/**
 * Pump trace (Integration's split): on league-sampled games, every pump whose window P fell by more than 0.3 between
 * the decision (startThrow) and the plant's re-check (pullDown) is traced. At both moments, for every defender: the
 * QB's picture of him (mind.estimate: position, velocity, its age), his true state, and the window's terms recomputed
 * as window() does (blind, reaction, run, margin = his arrival - the ball's); and the receiver's forecast point and
 * true state. The defender whose margin fell most is the one that sank the throw. Classification:
 * (a) he truly changed course or speed between the moments (his true position at the plant more than 1 yd from his
 *     true course at the decision, or his speed changed more than 1.5 yd/s);
 * (b) otherwise, the picture: his pictured state at the decision differed from the truth (more than 1 yd or
 *     1.5 yd/s), or the margins differ with his true motion unchanged;
 * (c) the receiver changed: the forecast catch point moved more than 1.5 yd between the moments.
 * One JSON row per traced pump. Passive except for re-evaluation.
 *   node --import tsx scripts/diag/read-plan/pump-trace.ts [--seed 101] [--games 4] [--max 30] > out/read-plan/pump-trace.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { timeToReach } from '../../../src/physics/reach.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '4')), max = Number(arg('--max', '30'));
const P: any = QBPass.prototype, st = P.startThrow, pd = P.pullDown;
let traced = 0;
const pending: any[] = [];
const runP = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const r = runP.call(this);
  for (const p of pending.splice(0)) process.stdout.write(JSON.stringify({ ...p.row, recAtArrival: p.watchRec.pos }) + '\n');
  return r;
};
const snap = (qb: any, a: any, sim: any, ev: any, point: any, wind: number) => {
  const total = wind + ev.T, pMan = qb.mind.pMan();
  const forecast = qb.receiverForecasts.get(ev.target), target = forecast?.predict(sim.t, 0) ?? ev.target.pos;
  const breakAt = forecast?.breakAt() ?? null, untilBreak = breakAt === null ? 0 : Math.max(0, breakAt - sim.t);
  const defs: any = {};
  for (const d of sim.defense) {
    if (d.isDown(sim.t)) continue;
    const seen = qb.mind.estimate(d);
    const facingQB = Math.cos(seen.facing - Math.atan2(a.pos.y - seen.pos.y, a.pos.x - seen.pos.x)) > 0.2;
    const onTarget = Math.hypot(seen.pos.x - target.x, seen.pos.y - target.y) < 3;
    const facingBlind = pMan * wind + (1 - pMan) * Math.max(0, wind - d.profile.reactionTime);
    const blind = facingQB ? facingBlind : onTarget ? Math.min(untilBreak, wind) : wind;
    const mover = { pos: { x: seen.pos.x + seen.vel.x * blind, y: seen.pos.y + seen.vel.y * blind }, vel: seen.vel, profile: d.profile, speedScale: d.speedScale };
    const react = d.profile.reactionTime * (facingQB ? 1 : 1.8) + (d.engagement ? 0.5 : 0);
    const tt = blind + timeToReach(mover, point, d.profile.reach + 0.3) + react;
    defs[d.slot] = { margin: +(tt - total).toFixed(2), blind: +blind.toFixed(2), react: +react.toFixed(2), facingQB,
      seen: { x: +seen.pos.x.toFixed(2), y: +seen.pos.y.toFixed(2), vx: +seen.vel.x.toFixed(2), vy: +seen.vel.y.toFixed(2) }, age: +qb.mind.pictureAge(d).toFixed(2),
      true: { x: +d.pos.x.toFixed(2), y: +d.pos.y.toFixed(2), vx: +d.vel.x.toFixed(2), vy: +d.vel.y.toFixed(2) } };
  }
  const pic = forecast?.lastPicture() ?? null;
  return { t: sim.t, point: { x: +point.x.toFixed(2), y: +point.y.toFixed(2) }, wind: +wind.toFixed(2), T: +ev.T.toFixed(2),
    recPicAge: pic ? +(sim.t - pic.sampledAt).toFixed(2) : null, recMotion: forecast?.estimate?.motion ?? null, recBreakAt: breakAt,
    rec: { x: +ev.target.pos.x.toFixed(2), y: +ev.target.pos.y.toFixed(2), vx: +ev.target.vel.x.toFixed(2), vy: +ev.target.vel.y.toFixed(2) }, defs };
};
P.startThrow = function (a: any, sim: any, ev: any) {
  this.traceDecision = { ev, snap: snap(this, a, sim, ev, ev.point, this.windup(a)), windupAt: sim.t };
  return st.call(this, a, sim, ev);
};
P.pullDown = function (a: any, sim: any, ev: any) {
  const out = pd.call(this, a, sim, ev);
  const D = this.traceDecision;
  if (!out || !D || D.ev !== ev || traced >= max) return out;
  const left = this.releaseAt - sim.t;
  const p = this.receiverForecasts.get(ev.target)?.predict(sim.t, left + ev.T);
  if (!p) return out;
  const point = { x: p.x, y: Math.max(2, Math.min(160 / 3 - 2, p.y)), z: ev.point.z };
  const pressure = this.pressure(a, sim), urgency = Math.max(0, Math.min(1, (0.9 - pressure.time) / 0.7)) * (0.5 + 0.5 * a.r('pocketPresence'));
  const e = this.window(a, sim, ev.target, { x: a.pos.x, y: a.pos.y, z: 2.2 }, point, ev.T, left, urgency);
  if (ev.P - e.P <= 0.3) return out;
  traced++;
  const arriveAt = D.snap.t + D.snap.wind + ev.T, rec = ev.target, watchRec = { arriveAt, pos: null as any };
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (!watchRec.pos && sim.t >= arriveAt - 1e-9) watchRec.pos = { x: +rec.pos.x.toFixed(2), y: +rec.pos.y.toFixed(2) }; };
  const S0 = D.snap, S1 = snap(this, a, sim, ev, point, left), dt = S1.t - S0.t;
  // The defender whose margin fell most.
  let worst: string | null = null, fall = -Infinity;
  for (const k of Object.keys(S1.defs)) { const f = (S0.defs[k]?.margin ?? 9) - S1.defs[k].margin; if (f > fall) { fall = f; worst = k; } }
  const d0 = worst ? S0.defs[worst] : null, d1 = worst ? S1.defs[worst] : null;
  let cls = 'unclassified', detail: any = {};
  if (d0 && d1) {
    const courseErr = Math.hypot(d1.true.x - (d0.true.x + d0.true.vx * dt), d1.true.y - (d0.true.y + d0.true.vy * dt));
    const dSpeed = Math.hypot(d1.true.vx, d1.true.vy) - Math.hypot(d0.true.vx, d0.true.vy);
    const picErr0 = Math.hypot(d0.seen.x - d0.true.x, d0.seen.y - d0.true.y), picVel0 = Math.hypot(d0.seen.vx - d0.true.vx, d0.seen.vy - d0.true.vy);
    const pointMove = Math.hypot(S1.point.x - S0.point.x, S1.point.y - S0.point.y);
    detail = { courseErr: +courseErr.toFixed(2), dSpeed: +dSpeed.toFixed(2), picErr0: +picErr0.toFixed(2), picVel0: +picVel0.toFixed(2), age0: d0.age, age1: d1.age, pointMove: +pointMove.toFixed(2) };
    cls = courseErr > 1 || Math.abs(dSpeed) > 1.5 ? 'a_defender_changed' : picErr0 > 1 || picVel0 > 1.5 ? 'b_picture' : pointMove > 1.5 ? 'c_receiver' : 'b_same_motion_priced_differently';
  }
  pending.push({ watchRec, row: { decisionT: +S0.t.toFixed(2), plantT: +S1.t.toFixed(2), P0: +ev.P.toFixed(3), P1: +e.P.toFixed(3), target: ev.target.slot,
    worst, fall: +fall.toFixed(2), d0, d1, cls, detail, point0: S0.point, point1: S1.point, wind0: S0.wind, left: S1.wind, rec0: S0.rec, rec1: S1.rec,
    recPicAge0: S0.recPicAge, recPicAge1: S1.recPicAge, recMotion0: S0.recMotion, recMotion1: S1.recMotion, recBreak0: S0.recBreakAt, recBreak1: S1.recBreakAt,
  } });
  return out;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games && traced < max; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
