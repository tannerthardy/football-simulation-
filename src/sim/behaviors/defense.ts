/**
 * Defensive behaviors: pass rush, blitz, run fits, man coverage, zone
 * coverage, playing the ball in the air, and pursuit.
 *
 * Every defender carries a read time (reaction + play recognition). Until he
 * reads the play, he executes his pre-snap job; play action can fool him into
 * believing run for longer.
 */
import { FIELD_WIDTH } from '../../core/field.js';
import { clamp, lerp, norm, sub, type Vec2 } from '../../core/vec.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import { gapY, isDeepZone, zoneLandmark } from '../../playbook/alignment.js';
import type { Gap, ZoneId } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { angleTo, chase, goTo, leverage, pursuitPoint, runThrough, stand, track } from './common.js';
import { traits } from '../engagement.js';
import { catchSpot } from './receiver.js';

/** Does this defender currently believe the play is a run? */
export function believesRun(sim: PlaySim, a: Agent): boolean {
  if (sim.t < a.readAt) return false;
  if (!sim.isPass) return true;
  return sim.t < a.fooledUntil;
}
export function knowsPass(sim: PlaySim, a: Agent): boolean {
  return sim.isPass && sim.t >= a.readAt && sim.t >= a.fooledUntil;
}

/** Common transition: once the ball is past the line or caught, everyone pursues. */
function pursueIfLive(sim: PlaySim, a: Agent): MoveCommand | null {
  const c = sim.carrier;
  if (!c || c.team === a.team) return null;
  if (c !== sim.qb || sim.scrambled || !sim.isPass) {
    // Ball carrier other than the dropback QB: chase him (after recognizing).
    if (sim.t >= a.readAt || c.pos.x > sim.los) return chase(sim, a, c);
  }
  return null;
}

// ------------------------------------------------------------- pass rush

export class PassRusher implements Behavior {
  readonly kind = 'rush';
  private readonly getOff: number;
  /** Pre-snap rush plan from his tools. */
  readonly plan: 'power' | 'finesse' | 'speed';
  constructor(
    a: Agent,
    sim: PlaySim,
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {
    const burst = clamp((1.8 - a.player.measurables.tenSplit) / 0.35, 0, 1);
    this.getOff = clamp(0.06 + 0.16 * (1 - burst) + 0.08 * (1 - a.r('awareness')) + sim.rng.normal(0, 0.03), 0.02, 0.35);
    const edge = gap === 'C' || gap === 'D';
    const pw = 0.3 + a.r('passRushPower') + (a.profile.massKg - 120) / 60;
    const fi = 0.3 + a.r('passRushFinesse');
    const sp = edge ? 0.2 + burst * 1.2 + traits(a).bend * 0.5 : 0;
    this.plan = sim.rng.weighted(['power', 'finesse', 'speed'] as const, [pw, fi, sp]);
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.t < this.getOff) return stand(Math.PI);
    if (a.engagement) return stand();
    const c = sim.carrier;
    // Throw in the air: peel off toward the ball.
    if (sim.ball.kind === 'air') {
      const spot = catchSpot(a, sim);
      if (spot) return runThrough(a, spot.p, { speed: 0.9 });
    }
    if (c && c.team !== a.team && (c !== sim.qb || sim.scrambled) && (believesRun(sim, a) || !sim.isPass || c.pos.x > sim.los - 1)) {
      return runFit(a, sim, this.gap, this.gapSign);
    }
    if (believesRun(sim, a) && !sim.isPass) return runFit(a, sim, this.gap, this.gapSign);
    if (believesRun(sim, a)) return runFit(a, sim, this.gap, this.gapSign); // fooled by play action

    // Rush lane by plan: power rushers go through the blocker's chest at the
    // QB; finesse rushers attack a shoulder through their gap; speed rushers
    // take a wide arc and bend to a point behind the QB.
    const qb = sim.qb;
    const qbSeen = sim.see(a, qb, 0.5).pos;
    const gy = gapY(sim.offAlign, this.gap, this.gapSign);
    const edge = this.gap === 'C' || this.gap === 'D';
    const bend = 0.8 + 0.45 * traits(a).bend;
    if (this.plan === 'power') {
      const p = pursuitPoint(sim, a, qb, 1.5);
      return runThrough(a, p, { speed: 1 });
    }
    if (a.pos.x > sim.los - 0.5) {
      const lane = edge ? { x: sim.los - 1.6, y: gy + this.gapSign * (this.plan === 'speed' ? 1.8 : 1.0) } : { x: sim.los - 0.6, y: gy };
      return runThrough(a, lane, { speed: 1, cutSkill: bend });
    }
    if (edge && a.pos.x > qbSeen.x + 1.0) {
      const arc = { x: qbSeen.x - 1.0, y: qbSeen.y + this.gapSign * (this.plan === 'speed' ? 1.3 : 0.8) };
      return runThrough(a, arc, { speed: 1, cutSkill: bend });
    }
    const p = pursuitPoint(sim, a, qb, 1.5);
    return runThrough(a, p, { speed: 1, cutSkill: bend });
  }
}

export class Blitzer implements Behavior {
  readonly kind = 'blitz';
  private readonly delay: number;
  constructor(
    a: Agent,
    sim: PlaySim,
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {
    this.delay = clamp(0.05 + sim.rng.normal(0.05, 0.04), 0, 0.2);
    void a;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.t < this.delay) return stand(Math.PI);
    if (a.engagement) return stand();
    const live = pursueIfLive(sim, a);
    if (live) return live;
    if (believesRun(sim, a)) return runFit(a, sim, this.gap, this.gapSign);
    if (sim.ball.kind === 'air') {
      const spot = catchSpot(a, sim);
      if (spot) return runThrough(a, spot.p, { speed: 0.9 });
    }
    const gy = gapY(sim.offAlign, this.gap, this.gapSign);
    if (a.pos.x > sim.los + 0.3) return runThrough(a, { x: sim.los - 0.8, y: gy }, { speed: 1 });
    const p = pursuitPoint(sim, a, sim.qb, 1.5);
    return runThrough(a, p, { speed: 1 });
  }
}

// ------------------------------------------------------------- run fits

/**
 * Gap-sound run defense: defend the assigned gap until the carrier commits,
 * then fit on him with pursuit leverage. DBs force/alley from outside-in.
 */
export function runFit(a: Agent, sim: PlaySim, gap: Gap, gapSign: number): MoveCommand {
  const c = sim.carrier;
  if (a.engagement) return stand();
  const gy = gapY(sim.offAlign, gap, gapSign);
  if (!c || c.team === a.team) return goTo(a, { x: sim.los + 0.6, y: gy }, { speed: 0.9 });
  const seen = sim.see(a, c);
  const behindLOS = seen.pos.x < sim.los - 0.5;
  const committed = !behindLOS || Math.abs(seen.pos.y - gy) < 2.2;
  if (!committed && (a.pos.x - sim.los) < 6) {
    // Squeeze the gap, shading toward the ball's flow by recognition.
    const flow = clamp(seen.vel.y * 0.5, -2.5, 2.5) * a.r('playRecognition');
    const tgt = { x: Math.max(sim.los + 0.3, seen.pos.x + 1.0), y: gy + flow };
    return runThrough(a, tgt, { speed: 0.95 });
  }
  return chase(sim, a, c, 2.5);
}

export class RunDefender implements Behavior {
  readonly kind = 'run-fit';
  constructor(
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {}
  update(a: Agent, sim: PlaySim): MoveCommand {
    return runFit(a, sim, this.gap, this.gapSign);
  }
}

// ------------------------------------------------------------- coverage

/** Man coverage with press/off technique, leverage and hip turn. */
export class ManCoverage implements Behavior {
  readonly kind = 'man';
  private readonly press: boolean;
  private hipsOpen = false;
  private routeRead = false;
  private readChecked = false;

  constructor(
    a: Agent,
    sim: PlaySim,
    readonly target: Agent,
    press: boolean,
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {
    this.press = press;
    void a;
    void sim;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const R = this.target;
    const live = pursueIfLive(sim, a);
    if (live && (sim.carrier !== R || sim.catchAt >= 0 || !sim.isPass)) {
      // On runs, the man defender plays the run once he reads it (or when his man blocks).
      if (believesRun(sim, a) || sim.catchAt >= 0 || sim.throwAt >= 0) return live;
    }
    if (sim.ball.kind === 'air') return playBall(a, sim, R);
    if (believesRun(sim, a) && R.behavior.kind !== 'route') return runFit(a, sim, this.gap, this.gapSign);

    // Route recognition: a good defender may read the route and close the delay.
    if (!this.readChecked && sim.t > 0.8) {
      this.readChecked = true;
      const p = clamp(0.1 + 0.45 * (0.5 * a.r('playRecognition') + 0.5 * a.r('anticipation')) - 0.35 * R.r('routeRunning') + 0.15, 0.03, 0.6);
      this.routeRead = sim.rng.chance(p);
    }
    const delayScale = this.routeRead ? 0.45 : 1;
    const seen = sim.see(a, R, delayScale);
    const inside = Math.sign(sim.ballY - seen.pos.y) || 1;
    const lev = 0.7 * inside;
    const vx = seen.vel.x;
    const deep = seen.pos.x - sim.los;

    // Cushion shrinks as the route develops; press plays in phase.
    const cushion = this.press ? 0.8 : clamp(5.5 - 1.6 * sim.t, 1.0, 5.5);
    if (!this.hipsOpen && (seen.pos.x > a.pos.x - 2.5 || (vx > 6 && a.pos.x - seen.pos.x < 4) || sim.t > 1.6)) this.hipsOpen = true;

    let tx = seen.pos.x;
    let ty = seen.pos.y + lev;
    if (vx > 3 && deep > 3) tx = Math.max(tx, seen.pos.x + cushion * 0.5);
    else if (!this.hipsOpen) tx = Math.max(seen.pos.x + cushion, a.pos.x - 0.2);
    ty = clamp(ty, 0.5, FIELD_WIDTH - 0.5);
    const tgt = { x: tx, y: ty };
    if (!this.hipsOpen) {
      // Backpedal facing the QB, keeping the cushion.
      return track(a, tgt, { x: Math.max(0, seen.vel.x), y: seen.vel.y }, { facing: Math.PI, gain: 1.6 });
    }
    const cs = 0.85 + 0.35 * a.r('manCoverage');
    return track(a, tgt, seen.vel, { cutSkill: cs, gain: 2.0 + a.r('manCoverage') });
  }
}

/** Zone coverage: drop to the landmark, match threats in the zone, read the QB's eyes. */
export class ZoneCoverage implements Behavior {
  readonly kind = 'zone';
  private readonly landmark: Vec2;
  private readonly deep: boolean;
  private readonly radius: number;
  /** Lateral band of responsibility (field y range). */
  private readonly band: [number, number];
  target: Agent | null = null;

  constructor(
    a: Agent,
    sim: PlaySim,
    readonly zone: ZoneId,
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {
    this.landmark = zoneLandmark(zone, sim.offAlign);
    this.deep = isDeepZone(zone);
    // Flat/curl-flat defenders expand all the way to the sideline with a threat.
    this.radius = this.deep ? 11 : zone === 'robber' || zone === 'hook_mid' ? 6.5 : zone.includes('flat') ? 11 : 7.5;
    this.band = zoneBand(zone, sim);
    void a;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const live = pursueIfLive(sim, a);
    if (live) {
      // Deep defenders don't bite on runs until the ball crosses the line.
      const c = sim.carrier!;
      if (!this.deep || c.pos.x > sim.los - 0.5 || sim.catchAt >= 0) return live;
    }
    if (sim.ball.kind === 'air') return playBall(a, sim, null);
    if (believesRun(sim, a) && !this.deep && sim.t > a.readAt) return runFit(a, sim, this.gap, this.gapSign);

    const qb = sim.qb;
    const lm = this.landmark;
    const [ylo, yhi] = this.band;
    const facingQB = angleTo(a.pos, qb.pos);
    const zs = 0.75 + 0.3 * a.r('zoneCoverage');
    const inside = (y: number) => Math.sign(sim.ballY - y) || 1;

    // Perceived routes in (or about to enter) this zone's lateral band.
    const threats: Array<{ r: Agent; pos: Vec2; vel: Vec2; fut: Vec2 }> = [];
    for (const r of sim.offense) {
      if (r.behavior.kind !== 'route' && r.behavior.kind !== 'track') continue;
      const seen = sim.see(a, r);
      const fut = { x: seen.pos.x + seen.vel.x * 0.7, y: seen.pos.y + seen.vel.y * 0.7 };
      if (fut.y < ylo || fut.y > yhi) continue;
      threats.push({ r, pos: seen.pos, vel: seen.vel, fut });
    }

    if (this.deep) {
      // Deep zones: never let a vertical get on top. Split two verticals.
      const vert = threats.filter((th) => th.fut.x - sim.los > 7 || th.vel.x > 4.5);
      if (vert.length === 0) {
        let tgt = lm;
        if (sim.qbEyes) tgt = lerp(lm, sim.qbEyes.pos, 0.2 * a.r('anticipation'));
        return goTo(a, { x: Math.max(tgt.x, lm.x - 1), y: tgt.y }, { facing: facingQB, speed: zs });
      }
      vert.sort((p, q) => q.fut.x - p.fut.x);
      const deepest = vert[0];
      // Pattern read: once the threat stops climbing (breaks in/out or sits)
      // under the deep defender, he drives downhill on it.
      // Never while another receiver is climbing into the zone behind it.
      const climbing = vert.some((th) => th !== deepest && th.vel.x > 3.5 && th.pos.x - sim.los > 2);
      if (!climbing && deepest.vel.x < 3.0 && deepest.pos.x < lm.x + 1 && deepest.pos.x - sim.los > 6) {
        this.target = deepest.r;
        const drive = { x: deepest.pos.x + 1.2 + deepest.vel.x * 0.3, y: deepest.pos.y + deepest.vel.y * 0.4 };
        const react = sim.rng.next() < 0.3 + 0.6 * a.r('playRecognition');
        if (react) return track(a, { x: drive.x, y: clamp(drive.y, 0.5, FIELD_WIDTH - 0.5) }, { x: deepest.vel.x, y: deepest.vel.y }, { facing: facingQB, speed: zs * 1.05, gain: 2.2 });
      }
      const cushion = 2.5 + 0.28 * Math.max(0, deepest.vel.x) - 0.8 * a.r('anticipation');
      let ty: number;
      if (vert.length >= 2) {
        // Split them, leaning toward where the QB is looking.
        const w = sim.qbEyes === vert[1].r ? 0.65 : sim.qbEyes === vert[0].r ? 0.35 : 0.5;
        ty = vert[0].fut.y * (1 - w) + vert[1].fut.y * w;
      } else ty = deepest.fut.y + inside(deepest.fut.y) * 0.8;
      const tx = Math.max(deepest.pos.x + cushion, lm.x - 4);
      const turnRun = deepest.vel.x > 4 && deepest.pos.x > a.pos.x - cushion - 1.5;
      const tv = { x: Math.max(0, deepest.vel.x), y: deepest.vel.y * 0.9 };
      this.target = deepest.r;
      return track(a, { x: tx, y: clamp(ty, 0.5, FIELD_WIDTH - 0.5) }, tv, {
        facing: turnRun ? Math.atan2(ty - a.pos.y, Math.max(0.5, tx - a.pos.x)) : facingQB,
        speed: zs * 1.05,
        gain: 1.8,
      });
    }

    // Underneath: carry a vertical #2/#3 through the zone (seam carry / wall),
    // otherwise sit in the throwing lane of the nearest threat.
    const carryable = threats.filter((th) => th.vel.x > 4.5 && th.pos.x - sim.los > 2 && th.pos.x - sim.los < 13 && Math.abs(th.pos.y - lm.y) < 6);
    if (carryable.length > 0 && this.zone !== 'flat_s' && this.zone !== 'flat_w') {
      carryable.sort((p, q) => Math.abs(p.pos.y - lm.y) - Math.abs(q.pos.y - lm.y));
      const th = carryable[0];
      this.target = th.r;
      const tgt = { x: th.pos.x + 0.3, y: th.pos.y + inside(th.pos.y) * 0.9 };
      return track(a, tgt, { x: th.vel.x * 0.9, y: th.vel.y }, { facing: facingQB, speed: zs, gain: 1.6 });
    }
    let best: (typeof threats)[number] | null = null;
    let bd = Infinity;
    for (const th of threats) {
      const depth = th.fut.x - sim.los;
      if (depth > 16) continue;
      let dd = Math.hypot(th.fut.x - lm.x, th.fut.y - lm.y);
      if (sim.qbEyes === th.r) dd -= 3 * a.r('anticipation');
      if (dd < bd && dd < this.radius + 2) {
        bd = dd;
        best = th;
      }
    }
    this.target = best?.r ?? null;
    if (!best) {
      let tgt = lm;
      if (sim.qbEyes) tgt = lerp(lm, sim.qbEyes.pos, 0.25 * a.r('anticipation'));
      return goTo(a, tgt, { facing: facingQB, speed: zs });
    }
    const lane = lerp(qb.pos, best.pos, 0.82);
    let tgt = { x: Math.min(lane.x, best.pos.x - 0.5), y: lane.y };
    const off = sub(tgt, lm);
    const l = Math.hypot(off.x, off.y);
    if (l > this.radius) tgt = { x: lm.x + (off.x / l) * this.radius, y: lm.y + (off.y / l) * this.radius };
    return track(a, { x: tgt.x, y: clamp(tgt.y, 0.5, FIELD_WIDTH - 0.5) }, { x: best.vel.x * 0.5, y: best.vel.y * 0.8 }, { facing: facingQB, speed: zs * 1.05, gain: 1.6 });
  }
}

/** Lateral responsibility band for a zone (field y). */
function zoneBand(zone: ZoneId, sim: PlaySim): [number, number] {
  const W = FIELD_WIDTH;
  const s = sim.offAlign.strongSign;
  const by = sim.ballY;
  const third = W / 3;
  const side = (sign: number, lo: number, hi: number): [number, number] => (sign > 0 ? [lo, hi] : [W - hi, W - lo]);
  switch (zone) {
    // Deep thirds watch #2 up the hash too (he can break to the corner).
    case 'deep_third_s':
      return side(s, 2 * third - 6, W);
    case 'deep_third_w':
      return side(-s, 2 * third - 6, W);
    case 'deep_mid':
      return [third - 3, 2 * third + 3];
    case 'tampa_mid':
      return [W / 2 - 7, W / 2 + 7];
    case 'deep_half_s':
      return side(s, W / 2 - 3, W);
    case 'deep_half_w':
      return side(-s, W / 2 - 3, W);
    case 'quarter_s_out':
      return side(s, (3 * W) / 4 - 2, W);
    case 'quarter_w_out':
      return side(-s, (3 * W) / 4 - 2, W);
    case 'quarter_s_in':
      return side(s, W / 2 - 2, (3 * W) / 4 + 2);
    case 'quarter_w_in':
      return side(-s, W / 2 - 2, (3 * W) / 4 + 2);
    case 'flat_s':
    case 'curl_flat_s': {
      const lo = by + s * 3;
      return s > 0 ? [lo, W] : [0, lo];
    }
    case 'flat_w':
    case 'curl_flat_w': {
      const lo = by - s * 3;
      return s > 0 ? [0, lo] : [lo, W];
    }
    case 'hook_s':
      return s > 0 ? [by - 1, by + 10] : [by - 10, by + 1];
    case 'hook_w':
      return s > 0 ? [by - 10, by + 1] : [by - 1, by + 10];
    case 'hook_mid':
      return [by - 6, by + 6];
    case 'robber':
      return [by - 8, by + 8];
  }
}

/** Ball in the air: break on it after reacting; intercept the path or contest the catch. */
export function playBall(a: Agent, sim: PlaySim, man: Agent | null): MoveCommand {
  const ball = sim.ball;
  if (ball.kind !== 'air') return stand();
  const facingQB = Math.cos(a.body.facing - Math.atan2(ball.flight.pos.y - a.pos.y, ball.flight.pos.x - a.pos.x)) > 0.1;
  const react = a.profile.reactionTime * (facingQB ? 1 - 0.4 * a.r('anticipation') : 1.6) + (man ? 0.1 : 0);
  if (sim.t - sim.throwAt < react) {
    // Haven't seen it yet: stay with the man / keep doing what we were doing.
    if (man) {
      const s = sim.see(a, man);
      return goTo(a, { x: s.pos.x + s.vel.x * 0.3, y: s.pos.y + s.vel.y * 0.3 }, { through: Math.hypot(s.vel.x, s.vel.y) });
    }
    return { vel: a.vel };
  }
  a.tags.add('onBall');
  const spot = catchSpot(a, sim);
  // Near the ball's path, a defender with ball skills turns his head and finds
  // it (looking over the shoulder doesn't turn the body).
  const nearPath = spot && Math.hypot(spot.p.x - a.pos.x, spot.p.y - a.pos.y) < 5;
  if (nearPath && !a.tags.has('looking') && sim.rng.chance(0.15 + 0.5 * a.r('ballSkills'))) a.tags.add('looking');
  if (spot) {
    const tt = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile }, spot.p, a.profile.reach);
    if (tt <= spot.t - sim.t + 0.05) return runThrough(a, spot.p, { speed: 1 });
  }
  // Can't beat the ball to its path: drive on the catch point to arrive with
  // the ball — on the receiver's near side, ready to play through the hands
  // or make the tackle the moment it's caught.
  const land = arrivalPoint(sim);
  if (land) {
    const dx0 = a.pos.x - land.x;
    const dy0 = a.pos.y - land.y;
    const d0 = Math.hypot(dx0, dy0) || 1;
    const off = Math.min(0.9, d0);
    const lev = leverage(a, land.y) * 0.3;
    const tgt = { x: land.x + (dx0 / d0) * off, y: land.y + (dy0 / d0) * off + lev };
    const dx = tgt.x - a.pos.x;
    const dy = tgt.y - a.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    // Full speed, breaking down only in the last couple of yards; sure
    // tacklers arrive under more control.
    const control = 2.2 + 2.5 * (1 - a.r('tackling'));
    const allowed = Math.sqrt(control * control + 2 * a.profile.brake * 0.7 * Math.max(0, d - 0.3));
    const sp = Math.min(a.profile.vmax, allowed);
    return { vel: { x: (dx / d) * sp, y: (dy / d) * sp } };
  }
  return spot ? runThrough(a, spot.p, { speed: 0.9 }) : stand();
}

/** Where the ball comes down to catch height on its current flight. */
function arrivalPoint(sim: PlaySim): Vec2 | null {
  let last: Vec2 | null = null;
  for (const s of sim.ballPath) {
    if (s.t < sim.t) continue;
    last = { x: s.x, y: s.y };
    if (s.z < 1.4 && s.t > sim.t + 0.1) break;
  }
  return last;
}

/** Generic pursuit of the ball carrier. */
export class Pursuit implements Behavior {
  readonly kind = 'pursuit';
  update(a: Agent, sim: PlaySim): MoveCommand {
    if (a.engagement) return stand();
    const c = sim.carrier;
    if (sim.ball.kind === 'loose') return runThrough(a, { x: sim.ball.flight.pos.x, y: sim.ball.flight.pos.y });
    if (!c || c.team === a.team) return stand();
    return chase(sim, a, c);
  }
}

/** Loose ball: everyone near it goes for it. */
export class FumbleScramble implements Behavior {
  readonly kind = 'scramble-ball';
  constructor(private readonly fallback: Behavior) {}
  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.ball.kind !== 'loose') return this.fallback.update(a, sim);
    const b = sim.ball.flight.pos;
    const d = Math.hypot(b.x - a.pos.x, b.y - a.pos.y);
    if (d > 12) return goTo(a, { x: b.x, y: b.y }, { speed: 0.7 });
    return runThrough(a, { x: b.x + sim.ball.flight.vel.x * 0.2, y: b.y + sim.ball.flight.vel.y * 0.2 }, { speed: 1 });
  }
}

export function toward(a: Vec2, b: Vec2): Vec2 {
  return norm(sub(b, a));
}
