/**
 * Quarterback.
 *
 * Pass plays: snap → drop (or play-action fake) → progression reads in the
 * concept's order, each read gated by its route timing → evaluate the throw
 * window → throw / move to the next read / climb or slide in the pocket /
 * scramble / throw it away / take the sack.
 *
 * Throw-window evaluation: predict the receiver's position at release +
 * flight time (anticipation: the QB knows the route), solve the shortest
 * flight his arm allows (bullet) and a touch alternative, then for every
 * defender he perceives compute time-to-reach the catch point (plus reaction
 * to the ball) vs. the ball's arrival, and the chance an underneath defender
 * can get a hand on the ball's path. Decision-making adds noise to those
 * margins; accuracy turns into a miss distance on the actual throw.
 */
import { FIELD_WIDTH } from '../../core/field.js';
import { clamp, logistic, type Vec2, type Vec3 } from '../../core/vec.js';
import { arcPoint, dragFreeLaunch, minFlightTime, qbArmSpeed, solveLaunch, DRAG_SPIRAL } from '../../physics/ball.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import type { DropType, PassConcept, ReceiverRef } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { BallCarrier } from './carrier.js';
import { angleTo, goTo, stand } from './common.js';
import { RouteRunner } from './receiver.js';

const RELEASE_Z = 2.2;
const CATCH_Z = 1.3;

interface ThrowEval {
  target: Agent;
  point: Vec3;
  T: number;
  P: number;
  intRisk: number;
  value: number;
  depth: number;
}

function dropSpec(drop: DropType, qbStartX: number, los: number, gun: boolean): { x: number; time: number } {
  switch (drop) {
    case 'quick':
      return gun ? { x: los - 5.6, time: 0.55 } : { x: los - 3.9, time: 0.9 };
    case 'gun3':
      return gun ? { x: los - 6.0, time: 0.75 } : { x: los - 5.0, time: 1.1 };
    case 'gun5':
      return gun ? { x: los - 7.0, time: 1.1 } : { x: los - 7.0, time: 1.55 };
    case 'five':
      return { x: los - 7.0, time: gun ? 1.1 : 1.6 };
    case 'seven':
      return { x: los - 8.8, time: gun ? 1.5 : 2.1 };
    case 'pa':
    case 'boot':
      return { x: los - 7.5, time: 1.9 };
  }
  void qbStartX;
}

export class QBPass implements Behavior {
  readonly kind = 'qb-pass';
  private phase: 'snap' | 'drop' | 'set' | 'windup' = 'snap';
  private readonly snapAt: number;
  private readonly drop: { x: number; time: number };
  private readonly dropY: number;
  private reads: Agent[] = [];
  private readIdx = 0;
  private readStart = -1;
  private setAt = -1;
  private pending: ThrowEval | null = null;
  private releaseAt = 0;
  private underPressure = 0;
  private readonly clock: number;
  private readonly armSpeed: number;
  private fakeUntil = 0;

  constructor(
    a: Agent,
    private readonly sim: PlaySim,
    private readonly concept: PassConcept,
  ) {
    const gun = sim.offCall.formation.qb !== 'under';
    this.snapAt = gun ? 0.3 : 0.1;
    this.drop = dropSpec(concept.drop, a.pos.x, sim.los, gun);
    this.dropY = a.pos.y;
    this.clock = 2.5 + 1.0 * a.r('composure') + 0.6 * a.r('pocketPresence') + sim.rng.normal(0, 0.25);
    this.armSpeed = qbArmSpeed(a.player.ratings.throwPower);
    if (concept.family === 'playaction') this.fakeUntil = 1.0;
  }

  /** Called after all behaviors are assigned (receivers exist). */
  init(sim: PlaySim): void {
    const refs = this.concept.progression;
    const seen = new Set<Agent>();
    for (const ref of refs) {
      const r = this.receiverFor(sim, ref);
      if (r && !seen.has(r)) {
        this.reads.push(r);
        seen.add(r);
      }
    }
    // Anyone else running a route is a late option.
    for (const o of sim.offense) {
      if (!seen.has(o) && o.behavior instanceof RouteRunner) {
        this.reads.push(o);
        seen.add(o);
      }
    }
  }

  private receiverFor(sim: PlaySim, ref: ReceiverRef): Agent | null {
    const slot = sim.offAlign.numbering[ref];
    if (!slot) return null;
    return sim.slot(slot) ?? null;
  }

  private windup(a: Agent): number {
    return 0.1 + 0.18 * (1 - a.r('release'));
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const t = sim.t;
    if (sim.carrier !== a) return stand();
    const facingDown = 0;

    if (this.phase === 'snap') {
      if (t < this.snapAt) return stand(facingDown);
      this.phase = 'drop';
    }

    if (this.phase === 'windup') {
      if (t >= this.releaseAt && this.pending) {
        this.release(a, sim, this.pending);
        this.pending = null;
        return stand();
      }
      return { vel: { x: a.vel.x * 0.5, y: a.vel.y * 0.5 }, facing: this.pending ? angleTo(a.pos, this.pending.point) : facingDown };
    }

    const pressure = this.pressure(a, sim);
    if (pressure.time < 0.9 && pressure.agent) {
      if (!sim.stats.pressured && pressure.dist < 3) {
        sim.stats.pressured = true;
        sim.stats.hurriedBy = pressure.agent.player.id;
        sim.event('pressure', pressure.agent, a);
      }
    }

    if (this.phase === 'drop') {
      const target = { x: this.drop.x, y: this.dropY };
      const d = Math.hypot(target.x - a.pos.x, target.y - a.pos.y);
      // Play-action: sell the fake first.
      if (t < this.fakeUntil) {
        const rb = sim.slot('RB');
        const fakePt = rb ? { x: sim.los - 4.2, y: (a.pos.y + rb.pos.y) / 2 } : target;
        return goTo(a, fakePt, { speed: 0.6, facing: Math.PI / 2 * Math.sign(fakePt.y - a.pos.y || 1) });
      }
      if (d < 0.4 || t > this.snapAt + this.drop.time + 0.4 || (pressure.time < 0.5 && t > this.snapAt + 0.4)) {
        this.phase = 'set';
        this.setAt = t;
        this.readStart = t;
      } else {
        const gun = sim.offCall.formation.qb !== 'under';
        // Drop: backpedal from gun, turn-and-drop from under center.
        const facing = gun ? 0 : Math.PI / 2.4;
        return goTo(a, target, { facing, through: 0 });
      }
    }

    // ---- set: reading the field ----
    const dwell = 0.42 + 0.4 * (1 - a.r('decisionMaking')) - 0.1 * a.r('awareness');
    const timeSet = t - this.setAt;
    const urgency = clamp((0.9 - pressure.time) / 0.7, 0, 1) * (0.5 + 0.5 * a.r('pocketPresence'));
    const clockUrgency = clamp((timeSet + this.snapAt + this.drop.time - this.clock) / 0.8, 0, 1);
    const u = Math.max(urgency, clockUrgency);
    if (u > 0.5) this.underPressure++;

    const read = this.reads[this.readIdx];
    sim.qbEyes = read ?? null;
    const aggression = 0.5 + 0.35 * (a.player.archetype === 'Gunslinger' ? 1 : 0) - 0.25 * a.r('decisionMaking');
    const thr = 0.6 - 0.12 * aggression - 0.32 * u;
    const maxInt = 0.05 + 0.08 * aggression + 0.12 * u;

    // Current read.
    if (read && this.ready(read, sim)) {
      const ev = this.evaluate(a, sim, read, u);
      if (ev && ev.P >= thr && ev.intRisk <= maxInt) return this.startThrow(a, sim, ev);
      if (t - this.readStart > dwell) {
        this.readIdx++;
        this.readStart = t;
      }
    } else if (!read) {
      // Out of reads: take the best available.
      const best = this.bestOption(a, sim, u);
      if (best && best.P >= thr - 0.1 && best.intRisk <= maxInt + 0.03) return this.startThrow(a, sim, best);
    } else if (t - this.readStart > dwell + 0.6) {
      this.readIdx++;
      this.readStart = t;
    }

    // Hot / panic: under imminent pressure, find anything.
    if (pressure.time < 0.45) {
      const best = this.bestOption(a, sim, 1);
      if (best && best.P > 0.3 && best.intRisk < 0.18) return this.startThrow(a, sim, best);
      if (this.shouldScramble(a, sim, true)) return this.scramble(a, sim);
      if (this.outsidePocket(a, sim) && a.r('awareness') > 0.35 && sim.rng.chance(0.25)) return this.throwAway(a, sim);
      return this.evade(a, sim, pressure.agent);
    }

    // Internal clock expired.
    if (clockUrgency >= 1) {
      if (this.shouldScramble(a, sim, false)) return this.scramble(a, sim);
      if (timeSet > 1.4 + this.clock * 0.5 && this.outsidePocket(a, sim) && sim.rng.chance(0.06)) return this.throwAway(a, sim);
    }
    // Dual threats leave early when coverage is tight and the lane is there.
    if (timeSet > 1.2 && this.readIdx >= 2 && this.shouldScramble(a, sim, false) && sim.rng.chance(0.04 + 0.08 * a.r('elusiveness'))) {
      return this.scramble(a, sim);
    }

    return this.pocketMove(a, sim, read);
  }

  private ready(r: Agent, sim: PlaySim): boolean {
    const rr = r.behavior instanceof RouteRunner ? r.behavior : null;
    if (!rr) return r.behavior.kind === 'route';
    const antic = sim.qb.r('anticipation');
    return sim.t >= rr.breakTime - 0.3 * antic;
  }

  private outsidePocket(a: Agent, sim: PlaySim): boolean {
    return Math.abs(a.pos.y - sim.ballY) > 4.5;
  }

  private pressure(a: Agent, sim: PlaySim): { time: number; agent: Agent | null; dist: number } {
    let best = Infinity;
    let who: Agent | null = null;
    let dist = Infinity;
    const pp = a.r('pocketPresence');
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      if (d.engagement && d.engagement.win < 0.75) continue;
      // Blind-side rushers are sensed late by QBs with poor pocket presence.
      const ang = Math.abs(Math.atan2(d.pos.y - a.pos.y, d.pos.x - a.pos.x) - a.body.facing);
      const blind = ang > 1.8 && ang < 4.5;
      const seen = sim.see(a, d, blind ? 2.2 - 1.4 * pp : 1);
      const tt = timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile }, a.pos, 0.8) + (d.engagement ? 0.35 : 0);
      if (tt < best) {
        best = tt;
        who = d;
        dist = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
      }
    }
    return { time: best, agent: who, dist };
  }

  private evaluate(a: Agent, sim: PlaySim, r: Agent, urgency: number): ThrowEval | null {
    if (r.isDown(sim.t) || r.engagement) return null;
    const rr = r.behavior instanceof RouteRunner ? r.behavior : null;
    const wind = this.windup(a);
    const from: Vec3 = { x: a.pos.x, y: a.pos.y, z: RELEASE_Z };
    const predict = (dt: number): Vec2 => (rr ? rr.predict(r, dt) : { x: r.pos.x + r.vel.x * dt, y: r.pos.y + r.vel.y * dt });
    let T = Math.max(0.3, Math.hypot(r.pos.x - a.pos.x, r.pos.y - a.pos.y) / (this.armSpeed * 0.85));
    let pt = predict(wind + T);
    for (let i = 0; i < 2; i++) {
      const to = { x: pt.x, y: pt.y, z: CATCH_Z };
      T = minFlightTime(from, to, this.armSpeed) * 1.05;
      pt = predict(wind + T);
    }
    pt = { x: pt.x, y: clamp(pt.y, 2, FIELD_WIDTH - 2) };
    const depth = pt.x - sim.los;
    const options: number[] = [T];
    const range = Math.hypot(pt.x - a.pos.x, pt.y - a.pos.y);
    if (range > 9) options.push(T * 1.2);
    if (range > 16) options.push(T * 1.4);

    let best: ThrowEval | null = null;
    for (const Topt of options) {
      const p2 = Topt === T ? pt : predict(wind + Topt);
      const point: Vec3 = { x: p2.x, y: clamp(p2.y, 2, FIELD_WIDTH - 2), z: depth > 20 ? 1.6 : CATCH_Z };
      const ev = this.window(a, sim, r, from, point, Topt, wind, urgency);
      if (!best || ev.value > best.value) best = ev;
    }
    return best;
  }

  private window(a: Agent, sim: PlaySim, r: Agent, from: Vec3, point: Vec3, T: number, wind: number, urgency: number): ThrowEval {
    const noise = 0.22 * (1 - a.r('decisionMaking')) + 0.05;
    const total = wind + T;
    let pOpen = 1;
    let intRisk = 0;
    let pClear = 1;
    const v0 = dragFreeLaunch(from, point, T);
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      const seen = sim.see(a, d, 1.0);
      const mover = { pos: seen.pos, vel: seen.vel, profile: d.profile };
      const facingQB = Math.cos(d.body.facing - Math.atan2(a.pos.y - d.pos.y, a.pos.x - d.pos.x)) > 0.2;
      const react = d.profile.reactionTime * (facingQB ? 1 : 1.8) + (d.engagement ? 0.5 : 0);
      const tt = timeToReach(mover, point, d.profile.reach + 0.3) + react;
      const m = tt - total + sim.rng.normal(0, noise);
      const contest = 1 - logistic((m - 0.05) / 0.13);
      // A defender who gets there well before the ball is sitting on the route.
      const first = 1 - logistic((m + 0.3) / 0.13);
      pOpen *= 1 - contest * (0.55 + 0.3 * d.r('ballSkills'));
      // Undercut risk along the flight path: a hand on the ball kills the
      // completion, and some of those become picks.
      const leap = d.profile.reactReach + 0.5 * (d.profile.maxCatchHeight - d.profile.reactReach);
      let touch = 0;
      for (const f of [0.3, 0.45, 0.6, 0.75, 0.88]) {
        const tau = T * f;
        const b = arcPoint(from, v0, tau);
        if (b.z > leap + 0.1) continue;
        const tb = timeToReach(mover, b, d.profile.reach) + react;
        const mb = tb - (wind + tau) + sim.rng.normal(0, noise);
        touch = Math.max(touch, logistic(-(mb - 0.05) / 0.1));
      }
      pClear *= 1 - touch * 0.75;
      intRisk += touch * (0.08 + 0.3 * d.r('ballSkills'));
      // At the catch point: jumped routes are picks; contested balls sometimes.
      intRisk += first * (0.15 + 0.35 * d.r('ballSkills')) + Math.max(0, contest - first) * 0.08 * d.r('ballSkills');
    }
    const dist = Math.hypot(point.x - from.x, point.y - from.y);
    const sigma = this.missSigma(a, sim, dist, urgency);
    const pAcc = Math.exp(-(sigma * sigma) / (2 * 1.35 * 1.35));
    const P = pOpen * pClear * pAcc * (0.88 + 0.1 * r.r('hands'));
    const depth = point.x - sim.los;
    const gain = depth + 1.5 + 3.5 * pOpen;
    const toSticks = sim.firstDownX - sim.los;
    const sticksBonus = depth >= toSticks ? 3 : 0;
    const value = P * (gain + sticksBonus) - intRisk * 45;
    return { target: r, point, T, P, intRisk: Math.min(1, intRisk), value, depth };
  }

  private bestOption(a: Agent, sim: PlaySim, urgency: number): ThrowEval | null {
    let best: ThrowEval | null = null;
    for (const r of this.reads) {
      if (!this.ready(r, sim) && urgency < 0.8) continue;
      const ev = this.evaluate(a, sim, r, urgency);
      if (ev && (!best || ev.value > best.value)) best = ev;
    }
    return best;
  }

  private missSigma(a: Agent, sim: PlaySim, dist: number, urgency: number): number {
    const acc = dist < 10 ? a.r('accShort') : dist < 20 ? lerp(a.r('accShort'), a.r('accMid'), (dist - 10) / 10) : lerp(a.r('accMid'), a.r('accDeep'), clamp((dist - 20) / 15, 0, 1));
    let sigma = 0.2 + dist * (0.011 + 0.032 * (1 - acc));
    sigma *= 1 + 0.7 * urgency * (1.1 - a.r('composure'));
    if (a.speed > 2.2) sigma *= 1.15 + 0.45 * (1 - a.r('throwOnRun'));
    sigma *= 1 + 0.25 * (1 - a.body.energy);
    void sim;
    return sigma;
  }

  private startThrow(a: Agent, sim: PlaySim, ev: ThrowEval): MoveCommand {
    if (process.env.QBDEBUG) console.log(`[qb] t=${sim.t.toFixed(2)} throw to ${ev.target.slot} P=${ev.P.toFixed(2)} int=${ev.intRisk.toFixed(2)} T=${ev.T.toFixed(2)} depth=${ev.depth.toFixed(1)} pt=(${(ev.point.x - sim.los).toFixed(1)},${ev.point.y.toFixed(1)}) readIdx=${this.readIdx}`);
    this.phase = 'windup';
    this.pending = ev;
    this.releaseAt = sim.t + this.windup(a);
    return { vel: { x: a.vel.x * 0.5, y: a.vel.y * 0.5 }, facing: angleTo(a.pos, ev.point) };
  }

  private release(a: Agent, sim: PlaySim, ev: ThrowEval): void {
    const from: Vec3 = { x: a.pos.x, y: a.pos.y, z: RELEASE_Z };
    // Re-aim at release with the latest prediction.
    const r = ev.target;
    const rr = r.behavior instanceof RouteRunner ? r.behavior : null;
    let point = ev.point;
    if (rr) {
      const p = rr.predict(r, ev.T);
      point = { x: p.x, y: clamp(p.y, 2, FIELD_WIDTH - 2), z: ev.point.z };
    }
    const dist = Math.hypot(point.x - from.x, point.y - from.y);
    const pressure = this.pressure(a, sim);
    const urgency = clamp((0.9 - pressure.time) / 0.7, 0, 1);
    let sigma = this.missSigma(a, sim, dist, urgency);
    sigma *= Math.exp(sim.rng.normal(0, 0.2 * (1 - a.r('consistency'))));
    const miss: Vec3 = {
      x: point.x + sim.rng.normal(0, sigma * 0.8),
      y: point.y + sim.rng.normal(0, sigma),
      z: Math.max(0.4, point.z + sim.rng.normal(0, sigma * 0.45)),
    };
    const T = ev.T * (1 + sim.rng.normal(0, 0.03));
    const v0 = solveLaunch(from, miss, T, DRAG_SPIRAL, sim.wind);
    sim.throwBall(a, r, v0, point, sim.t + T);
  }

  private throwAway(a: Agent, sim: PlaySim): MoveCommand {
    const side = a.pos.y < sim.ballY ? -1 : 1;
    const y = side > 0 ? FIELD_WIDTH + 3 : -3;
    const target: Vec3 = { x: a.pos.x + 8, y, z: 1.5 };
    const from: Vec3 = { x: a.pos.x, y: a.pos.y, z: RELEASE_Z };
    const T = minFlightTime(from, target, this.armSpeed) * 1.2;
    const v0 = solveLaunch(from, target, T, DRAG_SPIRAL, sim.wind);
    sim.throwBall(a, null, v0, target, sim.t + T, true);
    return stand();
  }

  private shouldScramble(a: Agent, sim: PlaySim, panic: boolean): boolean {
    const mobility = 0.5 * clamp((5.0 - a.player.measurables.forty) / 0.6, 0, 1) + 0.5 * a.r('elusiveness');
    if (!panic && mobility < 0.35) return false;
    // Is there a lane? Check points a few yards upfield.
    let open = 0;
    for (const dy of [-4, -2, 0, 2, 4]) {
      const q = { x: Math.max(a.pos.x + 4, sim.los + 1), y: clamp(a.pos.y + dy, 1, FIELD_WIDTH - 1) };
      const myT = Math.hypot(q.x - a.pos.x, q.y - a.pos.y) / (a.profile.vmax * 0.8);
      let margin = Infinity;
      for (const d of sim.defense) {
        if (d.isDown(sim.t)) continue;
        const tt = timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile }, q, 1) + (d.engagement ? 0.5 : 0);
        margin = Math.min(margin, tt - myT);
      }
      if (margin > 0.35) open++;
    }
    return open >= (panic ? 1 : 2) && (panic ? mobility > 0.2 || sim.rng.chance(0.3) : true);
  }

  private scramble(a: Agent, sim: PlaySim): MoveCommand {
    sim.scrambled = true;
    sim.stats.scramble = true;
    sim.event('scramble', a);
    a.behavior = new BallCarrier({ qb: true }, a);
    return a.behavior.update(a, sim);
  }

  private evade(a: Agent, sim: PlaySim, threat: Agent | null): MoveCommand {
    if (!threat) return stand();
    // Step away from the rusher, climbing if he comes from the edge.
    const away = { x: a.pos.x - threat.pos.x, y: a.pos.y - threat.pos.y };
    const l = Math.hypot(away.x, away.y) || 1;
    const fromEdge = Math.abs(threat.pos.y - a.pos.y) > 1.5 && threat.pos.x < a.pos.x + 1;
    const dir = fromEdge ? { x: 0.8, y: (away.y / l) * 0.6 } : { x: away.x / l, y: away.y / l };
    const elus = 0.5 + 0.5 * a.r('elusiveness');
    return { vel: { x: dir.x * a.profile.vmax * 0.7 * elus, y: dir.y * a.profile.vmax * 0.7 * elus }, facing: 0, cutSkill: 0.8 + 0.4 * a.r('elusiveness') };
  }

  private pocketMove(a: Agent, sim: PlaySim, read: Agent | undefined): MoveCommand {
    // Hold the set point, sliding away from nearby rushers; step up vs. edge pressure.
    let fx = 0;
    let fy = 0;
    let edge = false;
    for (const d of sim.defense) {
      const dx = a.pos.x - d.pos.x;
      const dy = a.pos.y - d.pos.y;
      const dd = Math.hypot(dx, dy);
      if (dd > 3.5 || dd < 1e-3) continue;
      const w = (3.5 - dd) / 3.5;
      fx += (dx / dd) * w;
      fy += (dy / dd) * w;
      if (Math.abs(dy) > 1.6 && d.pos.x <= a.pos.x + 0.5) edge = true;
    }
    const home = { x: this.drop.x + (edge ? 1.8 : 0), y: this.dropY };
    const tx = home.x + fx * 2 * a.r('pocketPresence');
    const ty = home.y + fy * 2 * a.r('pocketPresence');
    const facing = read ? angleTo(a.pos, read.pos) : 0;
    return goTo(a, { x: Math.min(tx, sim.los - 2.5), y: ty }, { speed: 0.45, facing });
  }
}

/** Run plays: open to the mesh point, hand off (or pitch), carry out the fake. */
export class QBHandoff implements Behavior {
  readonly kind = 'qb-handoff';
  private handed = false;
  constructor(
    private readonly mesh: Vec2,
    private readonly meshTime: number,
    private readonly rb: Agent | null,
    private readonly pitchRange = 1.3,
    private readonly keeper = false,
  ) {}

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (this.handed || sim.carrier !== a) {
      // Carry out the fake away from the play.
      const away = a.pos.y + Math.sign(a.pos.y - this.mesh.y || 1) * 4;
      return goTo(a, { x: sim.los - 6, y: away }, { speed: 0.4 });
    }
    if (this.keeper && sim.t >= this.meshTime) {
      a.behavior = new BallCarrier({ aim: { x: sim.los + 1, y: sim.ballY }, aimUntil: sim.t + 0.8 }, a);
      sim.stats.rusher = a.player.id;
      return a.behavior.update(a, sim);
    }
    const rb = this.rb;
    if (rb && sim.t >= this.meshTime - 0.15) {
      const d = Math.hypot(rb.pos.x - a.pos.x, rb.pos.y - a.pos.y);
      if (d <= this.pitchRange || sim.t > this.meshTime + 0.9) {
        this.handed = true;
        sim.handoff(a, rb);
        return stand();
      }
    }
    if (sim.t < 0.1) return stand();
    const facing = angleTo(a.pos, this.mesh);
    return goTo(a, this.mesh, { speed: 0.75, facing });
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
