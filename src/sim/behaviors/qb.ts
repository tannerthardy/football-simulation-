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
import { handoffReach } from '../ball-transfer.js';
import { angleTo, goTo, stand } from './common.js';
import { RouteRunner } from './receiver.js';
import type { QBMind } from '../qbmind.js';
import type { ReplayTelemetryFrame } from '../types.js';
import { ReceiverForecast, type InstalledReceiverRoute } from '../receiver-forecast.js';

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
    // Depths at the throw match tracking (median 7.9 yd behind the line).
    case 'quick':
      return gun ? { x: los - 6.6, time: 0.75 } : { x: los - 5.0, time: 1.05 };
    case 'gun3':
      return gun ? { x: los - 7.3, time: 1.0 } : { x: los - 6.2, time: 1.3 };
    case 'gun5':
      return gun ? { x: los - 8.0, time: 1.4 } : { x: los - 8.0, time: 1.75 };
    case 'five':
      return { x: los - 8.0, time: gun ? 1.4 : 1.8 };
    case 'seven':
      return { x: los - 9.5, time: gun ? 1.8 : 2.3 };
    case 'pa':
    case 'boot':
      return { x: los - 8.3, time: 1.95 };
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
  private readonly mind: QBMind;
  /** Look-off: eyes on a decoy to move the safety before the first read. */
  private lookOff: { until: number; decoy: Agent } | null = null;
  private lookOffChecked = false;
  private readonly receiverForecasts = new Map<Agent, ReceiverForecast>();

  /** Existing private state only; never evaluates a fresh throw window. */
  recordedState(): Omit<NonNullable<ReplayTelemetryFrame['qb']>, 'eyes' | 'belief' | 'best'> {
    const p = this.pending;
    return { phase: this.phase, read: this.reads[this.readIdx]?.idx ?? null, pressure: this.underPressure,
      pending: p ? { target: p.target.idx, point: [p.point.x, p.point.y, p.point.z], flightTime: p.T,
        completion: p.P, interceptionRisk: p.intRisk, value: p.value } : null };
  }

  constructor(
    a: Agent,
    private readonly sim: PlaySim,
    private readonly concept: PassConcept,
    receiverPriors: ReadonlyMap<Agent, InstalledReceiverRoute>,
  ) {
    const gun = sim.offCall.formation.qb !== 'under';
    this.snapAt = gun ? 0.3 : 0.1;
    this.drop = dropSpec(concept.drop, a.pos.x, sim.los, gun);
    this.dropY = a.pos.y;
    this.clock = 2.5 + 1.0 * a.r('composure') + 0.6 * a.r('pocketPresence') + sim.rng.normal(0, 0.25);
    this.armSpeed = qbArmSpeed(a.player.ratings.throwPower);
    if (concept.family === 'playaction') this.fakeUntil = 0.7;
    this.mind = sim.qbMind;
    for (const [r, prior] of receiverPriors) this.receiverForecasts.set(r, new ReceiverForecast(a, prior, sim.dt));
  }

  /** Called after all behaviors are assigned (receivers exist). */
  init(sim: PlaySim): void {
    const refs = this.concept.progression;
    const seen = new Set<Agent>();
    for (const ref of refs) {
      const r = this.receiverFor(sim, ref);
      if (r?.behavior.passOption && !seen.has(r)) {
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
    this.reads = this.orderReads(sim, this.reads);
  }

  /**
   * Where to start, from what he believes pre-snap: against a pressure look
   * the hot (quickest) route comes first; against man he starts with his best
   * matchup; otherwise the concept's progression. A wrong belief sends him to
   * the wrong place first.
   */
  private orderReads(sim: PlaySim, reads: Agent[]): Agent[] {
    const out = [...reads];
    if (out.length < 2) return out;
    const m = this.mind;
    const bt = (r: Agent) => (r.behavior instanceof RouteRunner ? r.behavior.breakTime : 9);
    if (m.blitzExpected) {
      const hot = out.slice(0, 4).reduce((b, r) => (bt(r) < bt(b) ? r : b));
      return [hot, ...out.filter((r) => r !== hot)];
    }
    if (m.pMan() > 0.6) {
      const score = (r: Agent) => {
        let d: Agent | null = null;
        let dd = Infinity;
        for (const o of sim.defense) {
          const x = Math.hypot(o.pos.x - r.pos.x, o.pos.y - r.pos.y);
          if (x < dd) {
            dd = x;
            d = o;
          }
        }
        if (!d) return 0;
        return 0.5 * r.r('routeRunning') + 0.25 * (r.profile.vmax - d.profile.vmax) - 0.5 * d.r('manCoverage') + 0.15 * r.r('releaseVsPress');
      };
      const first3 = out.slice(0, 3);
      const best = first3.reduce((b, r) => (score(r) > score(b) ? r : b));
      if (best !== out[0] && score(best) - score(out[0]) > 0.12) return [best, ...out.filter((r) => r !== best)];
    }
    return out;
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
    // Wrapped up by a tackler he cannot start a throw (with only a hand on him he
    // still can); a throw already on its way comes out, wobbling.
    if (heldBy(a, sim) >= 0.6 && this.phase !== 'windup') return stand();

    // Eyes: what he looks at is what he sees; everything else is memory and belief.
    const gaze = this.gazePoint(sim);
    this.mind.observe(gaze);
    for (const [r, forecast] of this.receiverForecasts) {
      const picture = this.mind.receiverLook(r, gaze);
      if (picture) forecast.acquire(picture);
    }
    if (this.mind.justIdentified && this.readIdx === 0) this.reads = this.orderReads(sim, this.reads);

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
    if (pressure.time < 0.7 && pressure.agent) {
      if (!sim.stats.pressured && pressure.dist < 2.5) {
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
        if (rb) sim.presentHandoffFake(a, rb);
        const fakePt = rb ? { x: sim.los - 4.2, y: (a.pos.y + rb.pos.y) / 2 } : target;
        return goTo(a, fakePt, { speed: 0.6, facing: Math.PI / 2 * Math.sign(fakePt.y - a.pos.y || 1) });
      }
      if (d < 0.4 || t > this.snapAt + this.drop.time + 0.4 || (pressure.time < 0.5 && t > this.snapAt + 0.4)) {
        this.phase = 'set';
        this.setAt = t;
        this.readStart = t;
      } else {
        // QBs who lock onto their first read give it away during the drop.
        if (a.r('decisionMaking') < 0.45) sim.qbEyes = this.reads[0] ?? null;
        const gun = sim.offCall.formation.qb !== 'under';
        // Drop: backpedal from gun, turn-and-drop from under center.
        const facing = gun ? 0 : Math.PI / 2.4;
        return goTo(a, target, { facing, through: 0 });
      }
    }

    // ---- set: reading the field ----
    // Quick game is rhythm: one look per read. Dropback reads take longer.
    const rhythm = this.concept.family === 'quick' ? 0.6 : 1;
    const dwell = (0.42 + 0.4 * (1 - a.r('decisionMaking')) - 0.1 * a.r('awareness')) * rhythm * (1 + 0.3 * (1 - a.mind.focus));
    const timeSet = t - this.setAt;
    const urgency = clamp((0.9 - pressure.time) / 0.7, 0, 1) * (0.5 + 0.5 * a.r('pocketPresence'));
    const clockUrgency = clamp((timeSet + this.snapAt + this.drop.time - this.clock) / 0.8, 0, 1);
    const u = Math.max(urgency, clockUrgency);
    if (u > 0.5) this.underPressure++;

    // Look-off: veterans hold the safety with their eyes before the first read.
    if (!this.lookOffChecked) {
      this.lookOffChecked = true;
      const vet = Math.min(1, a.player.experience / 6);
      const p = 0.08 + 0.45 * a.r('decisionMaking') * a.r('anticipation') * (0.5 + 0.5 * vet);
      if (this.concept.family !== 'quick' && this.reads.length > 1 && sim.rng.chance(p)) {
        const side = Math.sign(this.reads[0].pos.y - sim.ballY);
        const decoy = this.reads.find((r) => Math.sign(r.pos.y - sim.ballY) !== side);
        if (decoy) {
          this.lookOff = { until: t + 0.25 + 0.1 * sim.rng.next(), decoy };
          this.readStart = this.lookOff.until;
        }
      }
    }
    if (this.lookOff && t < this.lookOff.until && pressure.time > 0.6) {
      sim.qbEyes = this.lookOff.decoy;
      return this.pocketMove(a, sim, this.lookOff.decoy);
    }

    const read = this.reads[this.readIdx];
    sim.qbEyes = read ?? null;
    const aggression = 0.5 + 0.35 * (a.player.archetype === 'Gunslinger' ? 1 : 0) - 0.25 * a.r('decisionMaking');
    const thr = 0.6 - 0.12 * aggression - 0.32 * u;
    const maxInt = 0.025 + 0.05 * aggression + 0.08 * u;

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
      // Veterans throw it away (or at a back's feet) rather than eat a sack.
      if (sim.t > this.snapAt + this.drop.time + 0.3 && sim.rng.chance(0.06 + 0.12 * a.r('awareness') + (this.outsidePocket(a, sim) ? 0.1 : 0))) return this.throwAway(a, sim);
      return this.evade(a, sim, pressure.agent);
    }

    // Internal clock expired: receivers go to the scramble drill, and he has to
    // get rid of it — escape, find someone uncovering, or throw it away.
    if (clockUrgency >= 1) {
      sim.scrambleDrill = true;
      if (this.shouldScramble(a, sim, false)) return this.scramble(a, sim);
      const over = timeSet + this.snapAt + this.drop.time - this.clock;
      if (timeSet > 1.4 + this.clock * 0.5 && this.outsidePocket(a, sim) && sim.rng.chance(0.06)) return this.throwAway(a, sim);
      if ((over > 0.8 && sim.rng.chance(0.06 + 0.1 * a.r('awareness'))) || over > 2.2) return this.throwAway(a, sim);
    }
    // Mobile QBs leave the pocket when coverage holds and the lane is there.
    if (timeSet > 1.0 && this.readIdx >= 2 && this.shouldScramble(a, sim, false) && sim.rng.chance(0.06 + 0.14 * a.r('elusiveness'))) {
      return this.scramble(a, sim);
    }

    return this.pocketMove(a, sim, read);
  }

  private gazePoint(sim: PlaySim): Vec2 {
    const heldPoint = (r: Agent): Vec2 => {
      const forecast = this.receiverForecasts.get(r);
      return forecast?.predict(sim.t, 0) ?? forecast?.prior.start ?? { x: sim.los + 10, y: sim.ballY };
    };
    if (this.lookOff && sim.t < this.lookOff.until) return heldPoint(this.lookOff.decoy);
    if (this.phase === 'windup' && this.pending) return this.pending.point;
    const read = this.reads[this.readIdx];
    // During the drop: the key (middle-of-field safety); quick game eyes the first read.
    if ((this.phase === 'snap' || this.phase === 'drop') && this.concept.family !== 'quick') return { x: sim.los + 12, y: sim.ballY };
    return read ? heldPoint(read) : { x: sim.los + 10, y: sim.ballY };
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
      // Pocket feel: a rusher still in a block arrives later the more square
      // the block is. Good pocket presence reads a rep being lost before the
      // rusher is free; poor pocket presence only notices when he's loose.
      let held = 0;
      if (d.engagement) {
        const feltWin = Math.min(1, d.engagement.win) * (0.35 + 0.65 * pp);
        held = 0.35 + 1.4 * (1 - feltWin);
      }
      // Blind-side rushers are sensed late by QBs with poor pocket presence.
      const ang = Math.abs(Math.atan2(d.pos.y - a.pos.y, d.pos.x - a.pos.x) - a.body.facing);
      const blind = ang > 1.8 && ang < 4.5;
      const seen = sim.see(a, d, blind ? 2.2 - 1.4 * pp : 1);
      const tt = timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, a.pos, 0.8) + held;
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
    const wind = this.windup(a);
    const from: Vec3 = { x: a.pos.x, y: a.pos.y, z: RELEASE_Z };
    const forecast = this.receiverForecasts.get(r);
    const current = forecast?.predict(sim.t, 0);
    if (!forecast || !current) return null;
    const predict = (dt: number): Vec2 => forecast.predict(sim.t, dt)!;
    // Natural throw: the flight time real QBs use at this distance (2023
    // tracking: ~0.6 s under 10 yd, 0.8 s at 15, 1.2 s at 25, 1.8 s at 35,
    // 2.5 s at 45), never faster than his arm allows. Stronger arms get there
    // a little sooner.
    const armEdge = clamp((this.armSpeed - 26) / 8, -0.5, 0.5);
    const natural = (d: number) => (0.38 + 0.022 * d + 0.00065 * d * d) * (1 - 0.12 * armEdge);
    let range = Math.hypot(current.x - a.pos.x, current.y - a.pos.y);
    let T = Math.max(0.3, natural(range));
    let Tmin = T;
    let pt = predict(wind + T);
    for (let i = 0; i < 3; i++) {
      const to = { x: pt.x, y: pt.y, z: CATCH_Z };
      range = Math.hypot(pt.x - a.pos.x, pt.y - a.pos.y);
      Tmin = minFlightTime(from, to, this.armSpeed) * 1.05;
      T = Math.max(Tmin, natural(range));
      pt = predict(wind + T);
    }
    pt = { x: pt.x, y: clamp(pt.y, 2, FIELD_WIDTH - 2) };
    const depth = pt.x - sim.los;
    // Options: the natural ball, a fastball into a tight window, and touch over the top.
    const options: number[] = [T];
    if (range > 15) options.push(T * 1.2);
    const fastball = Tmin < T * 0.85 ? Math.max(Tmin, T * 0.75) : null;

    let best: ThrowEval | null = null;
    const consider = (Topt: number) => {
      const p2 = Topt === T ? pt : predict(wind + Topt);
      const point: Vec3 = { x: p2.x, y: clamp(p2.y, 2, FIELD_WIDTH - 2), z: depth > 20 ? 1.6 : CATCH_Z };
      const ev = this.window(a, sim, r, from, point, Topt, wind, urgency);
      if (!best || ev.value > best.value) best = ev;
    };
    for (const Topt of options) consider(Topt);
    // The fastball only comes out when the natural throw isn't there.
    if (fastball && (!best || (best as ThrowEval).P < 0.6)) consider(fastball);
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
      // Not where the defender is: where the QB thinks he is.
      const seen = this.mind.estimate(d);
      const mover = { pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale };
      const facingQB = Math.cos(seen.facing - Math.atan2(a.pos.y - seen.pos.y, a.pos.x - seen.pos.x)) > 0.2;
      const react = d.profile.reactionTime * (facingQB ? 1 : 1.8) + (d.engagement ? 0.5 : 0);
      const tt = timeToReach(mover, point, d.profile.reach + 0.3) + react;
      const estimateError = a.mind.judgment(`reach:${d.slot}`) * noise;
      const m = tt - total + estimateError;
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
        const mb = tb - (wind + tau) + estimateError;
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
    // An incompletion costs a down (~3 yards of value); a pick costs ~45.
    const value = P * (gain + sticksBonus + 2) - (1 - P) * 3 - intRisk * 45;
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
    // Error grows with distance, and faster beyond ~15 yards (deep balls).
    let sigma = 0.25 + dist * (0.013 + 0.034 * (1 - acc)) + 0.0007 * Math.max(0, dist - 15) ** 2;
    sigma *= 1 + 0.7 * urgency * (1.1 - a.r('composure'));
    if (a.speed > 2.2) sigma *= 1.15 + 0.45 * (1 - a.r('throwOnRun'));
    sigma *= 1 + 0.25 * (1 - a.body.energy);
    sigma *= 1 + 2.5 * heldBy(a, sim);
    return sigma;
  }

  private startThrow(a: Agent, sim: PlaySim, ev: ThrowEval): MoveCommand {
    this.phase = 'windup';
    this.pending = ev;
    this.releaseAt = sim.t + this.windup(a);
    // Shoulders and arm give the throw away to defenders reading him.
    sim.windupAt = sim.t;
    return { vel: { x: a.vel.x * 0.5, y: a.vel.y * 0.5 }, facing: angleTo(a.pos, ev.point) };
  }

  private release(a: Agent, sim: PlaySim, ev: ThrowEval): void {
    const from: Vec3 = { x: a.pos.x, y: a.pos.y, z: RELEASE_Z };
    // Re-aim at release with the latest prediction.
    const r = ev.target;
    let point = ev.point;
    const p = this.receiverForecasts.get(r)?.predict(sim.t, ev.T);
    if (p) {
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
    if (!panic && mobility < 0.18) return false;
    // Is there a lane? Check points a few yards upfield; under pressure also
    // escapes outside the pocket to either side.
    let open = 0;
    const lanes = [-4, -2, 0, 2, 4].map((dy) => ({ x: Math.max(a.pos.x + 4, sim.los + 1), y: clamp(a.pos.y + dy, 1, FIELD_WIDTH - 1) }));
    if (panic) for (const side of [-1, 1]) lanes.push({ x: a.pos.x + 1, y: clamp(a.pos.y + side * 5.5, 1, FIELD_WIDTH - 1) });
    for (const q of lanes) {
      const myT = Math.hypot(q.x - a.pos.x, q.y - a.pos.y) / (a.profile.vmax * 0.8);
      let margin = Infinity;
      for (const d of sim.defense) {
        if (d.isDown(sim.t)) continue;
        const tt = timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile, speedScale: d.speedScale }, q, 1) + (d.engagement ? 0.5 : 0);
        margin = Math.min(margin, tt - myT);
      }
      if (margin > 0.35) open++;
    }
    return open >= (panic ? 1 : 2) && (panic ? mobility > 0.2 || sim.rng.chance(0.3) : true);
  }

  private scramble(a: Agent, sim: PlaySim): MoveCommand {
    sim.scrambled = true;
    sim.stats.scramble = true;
    sim.stats.rusher = a.player.id;
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
    // Hold the set point, sliding away from nearby rushers. When an edge rusher
    // gets to his depth outside him — the tackle riding him past — he climbs
    // into the pocket before the rusher can turn the corner. He reacts to what
    // he sees and feels: a rusher behind his shoulder registers late, and
    // pocket presence decides how early he senses the edge closing.
    const pp = a.r('pocketPresence');
    let fx = 0;
    let fy = 0;
    let edge = false;
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      const ang = Math.abs(Math.atan2(d.pos.y - a.pos.y, d.pos.x - a.pos.x) - a.body.facing);
      const blind = ang > 1.8 && ang < 4.5;
      const seen = sim.see(a, d, blind ? 2.2 - 1.4 * pp : 1).pos;
      const dx = a.pos.x - seen.x;
      const dy = a.pos.y - seen.y;
      const dd = Math.hypot(dx, dy);
      if (dd < 1e-3) continue;
      if (Math.abs(dy) > 1.6 && seen.x <= a.pos.x + 1.5 && dd < 2.5 + 3 * pp) edge = true;
      if (dd > 3.5) continue;
      const w = (3.5 - dd) / 3.5;
      fx += (dx / dd) * w;
      fy += (dy / dd) * w;
    }
    const home = { x: this.drop.x + (edge ? 1.8 + 1.2 * pp : 0), y: this.dropY };
    const tx = home.x + fx * 2 * pp;
    const ty = home.y + fy * 2 * pp;
    const facing = read ? angleTo(a.pos, read.pos) : 0;
    return goTo(a, { x: Math.min(tx, sim.los - 2.5), y: ty }, { speed: edge ? 0.6 : 0.45, facing });
  }
}

/** Run plays: open to the mesh point, hand off (or pitch), carry out the fake. */
export class QBHandoff implements Behavior {
  readonly kind = 'qb-handoff';
  private handed = false;
  private exchangeClosing = false;
  constructor(
    private readonly mesh: Vec2,
    private readonly meshTime: number,
    private readonly rb: Agent | null,
    private readonly pitchRange = 1.3,
    private readonly keeper = false,
  ) {}

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (this.handed || sim.carrier !== a) {
      if (this.handed) sim.pretendCarry(a);
      // Carry out the fake away from the installed play, even after the
      // exchange has taken the QB slightly across his own mesh spot.
      const run = sim.offCall.run;
      const playSide = run ? (run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign) : 0;
      const away = a.pos.y + (playSide ? -playSide : Math.sign(a.pos.y - this.mesh.y || 1)) * 4;
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
      if (this.pitchRange > handoffReach(a, rb) && d <= this.pitchRange) {
        this.handed = sim.pitchBall(a, rb);
        return stand();
      }
      if (d <= handoffReach(a, rb)) {
        this.handed = sim.handoff(a, rb);
        return stand();
      }
      if (this.pitchRange <= handoffReach(a, rb)) {
        const seen = sim.see(a, rb), dx = seen.pos.x - a.pos.x, dy = seen.pos.y - a.pos.y;
        const radial = dx * (seen.vel.x - a.vel.x) + dy * (seen.vel.y - a.vel.y);
        if (radial < 0) this.exchangeClosing = true;
        const speed = Math.hypot(seen.vel.x, seen.vel.y), reach = handoffReach(a, rb);
        // A delayed picture of the back has passed the mesh and our closest
        // approach, outside reach and separating. Continuing this give would
        // require a new recovery route, not the installed run-through track.
        // Secure the ball and carry; do not chase him or extend transfer reach.
        const pastMesh = (seen.pos.x - this.mesh.x) * seen.vel.x + (seen.pos.y - this.mesh.y) * seen.vel.y;
        if (this.exchangeClosing && Math.hypot(dx, dy) > reach && radial > 0
          && dx * seen.vel.x + dy * seen.vel.y > 0 && pastMesh > reach * speed) {
          a.behavior = new BallCarrier({ qb: true }, a);
          sim.stats.rusher = a.player.id;
          sim.event('read', a, rb, 'exchange passed outside reach; secure and carry');
          return a.behavior.update(a, sim);
        }
      }
    }
    if (sim.t < 0.05) return stand();
    // Quick reverse pivot / step to the mesh. Once the back is already on it
    // and riding past, ride with him: put the ball where he is going.
    if (rb && sim.t >= this.meshTime - 0.3 && Math.hypot(rb.pos.x - this.mesh.x, rb.pos.y - this.mesh.y) < 1.2) {
      const seen = sim.see(a, rb), lead = { x: seen.pos.x + seen.vel.x * .2, y: seen.pos.y + seen.vel.y * .2 };
      return goTo(a, lead, { speed: 1, facing: angleTo(a.pos, lead), through: 0 });
    }
    const facing = angleTo(a.pos, this.mesh);
    return goTo(a, this.mesh, { speed: 1, facing, through: 0 });
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

/** The firmest control a tackler has of `a` (0 when nobody is holding him). */
function heldBy(a: Agent, sim: PlaySim): number {
  const bond = sim.bond;
  if (!bond || bond.carrier !== a) return 0;
  return Math.max(0, ...bond.tacklers.map((d) => bond.control?.get(d) ?? bond.grip?.get(d) ?? 1));
}
