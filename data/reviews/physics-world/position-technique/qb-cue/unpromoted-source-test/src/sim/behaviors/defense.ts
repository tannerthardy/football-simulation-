/**
 * Defensive behaviors: pass rush, blitz, run fits, man coverage, zone
 * coverage, playing the ball in the air, and pursuit.
 *
 * Every defender carries a read time (reaction + play recognition). Until he
 * reads the play, he executes his pre-snap job; play action can fool him into
 * believing run for longer.
 */
import { FIELD_WIDTH, OPP_GOAL_X } from '../../core/field.js';
import { angleDiff, clamp, lerp, norm, sub, type Vec2 } from '../../core/vec.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import { coverageDepth, gapY, isDeepZone, zoneLandmark } from '../../playbook/alignment.js';
import type { Gap, ZoneId, ZoneStyle } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { angleTo, chase, goTo, leverage, pursuitPoint, runThrough, stand, track } from './common.js';
import { traits } from '../engagement.js';
import { catchSpot } from './receiver.js';
import { showsBlock } from '../coverage-cues.js';
import { executeRunFit } from '../run-fits.js';
import { RouteObservation } from '../coverage-read.js';
import { inferQBDirection, qbCueAffinity } from '../coverage/qb-cue.js';

interface ZoneThreat { r: Agent; pos: Vec2; vel: Vec2; fut: Vec2; qbAffinity: number }

/** Has this defender read run? (His own read from what he's seen — see recognition.ts.) */
export function believesRun(sim: PlaySim, a: Agent): boolean {
  if (a.recog) return a.recog.read === 'run';
  return !sim.isPass && sim.t >= a.readAt;
}
export function knowsPass(sim: PlaySim, a: Agent): boolean {
  if (a.recog) return a.recog.read === 'pass';
  return sim.isPass && sim.t >= a.readAt;
}

/**
 * Common transition: once the ball carrier is past the line (or the QB is
 * scrambling), everyone pursues. Behind the line, a defender who has read
 * run plays his fit — he doesn't abandon his gap to chase.
 */
export function pursueIfLive(sim: PlaySim, a: Agent): MoveCommand | null {
  const c = sim.carrier;
  if (!c || c.team === a.team) return null;
  const seen = sim.see(a,c);
  const preserveEdge = a.runFit?.kind === 'edge' || a.runFit?.kind === 'force' || a.runFit?.kind === 'cutback';
  const past = seen.pos.x > sim.los + (preserveEdge ? 2 : 0);
  if (past || (c === sim.qb && sim.scrambled)) {
    if (sim.t >= a.readAt || seen.pos.x > sim.los + 2) return chase(sim, a, c);
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
    this.getOff = a.snapReadyAt = clamp(a.snapReadyAt + sim.rng.normal(0, 0.03), 0.02, 0.4);
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
    // The ball is handed off or the QB takes off: play the run. Up close a
    // lineman sees the exchange; a rusher who has read run plays it too
    // (on play action, that's being fooled).
    if (c && c.team !== a.team && (c !== sim.qb || sim.scrambled)) return runFit(a, sim, this.gap, this.gapSign);
    if (believesRun(sim, a)) return runFit(a, sim, this.gap, this.gapSign);

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
    this.delay = a.snapReadyAt = clamp(a.snapReadyAt + sim.rng.normal(0, 0.04), 0.02, 0.4);
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
  return executeRunFit(a, sim, gap, gapSign);
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

/**
 * Man technique options. `lev`: which shoulder he plays (inside by default,
 * toward his help); `trail`: low-hip, under the receiver with deep help over
 * the top (2-Man); `overTop`: a deep player carrying a vertical stays on top of
 * him (quarters safety on #2, a bracket's high player).
 */
export interface ManOptions {
  lev?: 'inside' | 'outside' | 'head';
  trail?: boolean;
  overTop?: boolean;
}

/** Man coverage with press/off technique, leverage and hip turn. */
export class ManCoverage implements Behavior {
  readonly kind = 'man';
  private readonly press: boolean;
  private readonly initialCushion: number;
  private hipsOpen = false;
  private routeRead = false;
  private stemHeading: number | null = null;
  private stableSince = 0;
  private readonly observation = new RouteObservation();

  /** The technique actually in use, without updating receiver observation. */
  recordedTechnique(): NonNullable<import('../types.js').ReplayAgentState['man']> {
    return { leverage: this.opts.lev ?? 'inside', initialCushion: this.initialCushion, press: this.press,
      hipsOpen: this.hipsOpen, trail: !!this.opts.trail, overTop: !!this.opts.overTop, routeRead: this.routeRead };
  }

  constructor(
    a: Agent,
    sim: PlaySim,
    readonly target: Agent,
    press: boolean,
    private readonly gap: Gap,
    private readonly gapSign: number,
    readonly opts: ManOptions = {},
  ) {
    this.press = press;
    this.initialCushion = Math.max(0.8, a.pos.x - target.pos.x);
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
    const receiverCue = sim.see(a, R);
    const blockingLook = showsBlock(a, sim, R, receiverCue);
    if (believesRun(sim, a) && blockingLook) return runFit(a, sim, this.gap, this.gapSign);

    // Anticipate a stable observed stem, then lose that confidence on a break.
    // No route identity or once-per-play "knows the route" coin flip.
    const cue = sim.see(a, R);
    const heading = Math.atan2(cue.vel.y, cue.vel.x);
    if (Math.hypot(cue.vel.x, cue.vel.y) < 1 || this.stemHeading === null || Math.abs(angleDiff(this.stemHeading, heading)) > 0.35) {
      this.stableSince = sim.t;
      this.stemHeading = heading;
      this.routeRead = false;
    } else if (sim.t - this.stableSince > 0.35 + 0.35 * (1 - a.r('playRecognition') * a.mind.focus)) this.routeRead = true;
    const delayScale = this.routeRead ? 0.65 : 1;
    const seen = this.observation.read(sim.see(a, R, delayScale), sim.t, R.profile, a.profile.reactionTime,
      a.r('anticipation') * a.r('manCoverage') * a.mind.focus);
    const inside = Math.sign(sim.ballY - seen.pos.y) || 1;
    const o = this.opts;
    const lev = (o.trail ? 0.9 : 0.7) * (o.lev === 'outside' ? -inside : o.lev === 'head' ? 0 : inside);
    const vx = seen.vel.x;
    const deep = seen.pos.x - sim.los;

    // Cushion shrinks as the route develops; press plays in phase.
    const developing = clamp(Math.max(0, deep) / 8, 0, 1);
    const cushion = this.press ? 0.8 : Math.max(1, Math.min(5.5, this.initialCushion) * (1 - developing) + developing);
    // At press depth the receiver is already within 2.5 yards at the snap.
    // That alone is not a release cue: opening immediately made the corner
    // step downhill and turn twice while the receiver accelerated past him.
    const closing = Math.max(0, vx - Math.max(0, a.vel.x));
    const flipTime = Math.PI / a.profile.turnRate + 0.15 * (1 - a.r('anticipation') * a.mind.focus);
    const releaseBurst = Math.max(0, (R.profile.vmax - Math.hypot(seen.vel.x, seen.vel.y)) / R.profile.tau);
    const consumed = a.pos.x - seen.pos.x < 1.8 + closing * flipTime + 0.25 * releaseBurst * flipTime * flipTime;
    const crossing = Math.abs(seen.vel.y) > 3 && Math.abs(seen.vel.y) > Math.abs(vx);
    if (!this.hipsOpen && Math.hypot(seen.vel.x, seen.vel.y) > 1.5 && (consumed || crossing)) this.hipsOpen = true;

    let tx = seen.pos.x;
    let ty = seen.pos.y + lev;
    if (this.press && vx >= 0) {
      const developing = clamp(deep / 4, 0, 1);
      tx += this.initialCushion * (1 - developing) + 0.6 * developing;
    }
    else if (vx > 3 && deep > 3) tx = Math.max(tx, seen.pos.x + cushion * 0.5);
    else if (!this.hipsOpen) tx = Math.max(seen.pos.x + cushion, a.pos.x - 0.2);
    // Over the top: a deep carrier keeps a cushion on the vertical; trail: a
    // low-hip under defender sits behind his hip with help over the top.
    if (o.overTop) {
      // Keep a roof on a climbing receiver. A visible plant compresses the
      // cushion instead of preserving four yards of empty grass forever.
      const climbing = Math.max(0, vx);
      const top = 0.8 + 0.15 * climbing;
      tx = seen.pos.x + top;
    }
    else if (o.trail && deep > 3 && vx > 2) tx = seen.pos.x - 0.6;
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

/**
 * Zone coverage. Two techniques:
 * - match (pattern-match): drop to the landmark, carry verticals through the
 *   zone, pick up whoever enters it, read the QB's eyes as a tiebreaker.
 * - spot (spot drop, "country" zone): sprint to the landmark, settle and play
 *   the quarterback — lean where he looks, sit in the lane of a receiver in
 *   the zone without following him out, break on his arm action.
 * Overloaded match defenders can hesitate at an exchange, then recover on a
 * subsequent read. Their called technique stays intact.
 */
export class ZoneCoverage implements Behavior {
  readonly kind = 'zone';
  private readonly landmark: Vec2;
  /** Inspect the exact adjusted landmark used by this technique. */
  recordedLandmark(): Vec2 { return { ...this.landmark }; }
  private readonly deep: boolean;
  private readonly radius: number;
  /** Lateral band of responsibility (field y range). */
  private readonly band: [number, number];
  readonly style: ZoneStyle;
  target: Agent | null = null;
  private nextPatternRead = 0;
  private patternHesitationUntil = -1;
  private readonly initialDepth: number;
  private turnedWith: Agent | null = null;
  private readonly observations = new Map<Agent, RouteObservation>();

  constructor(
    a: Agent,
    sim: PlaySim,
    readonly zone: ZoneId,
    private readonly gap: Gap,
    private readonly gapSign: number,
    styleOverride?: ZoneStyle,
  ) {
    this.landmark = zoneLandmark(zone, sim.offAlign);
    this.initialDepth = a.pos.x - sim.los;
    this.deep = isDeepZone(zone);
    // Flat/curl-flat defenders expand all the way to the sideline with a threat.
    this.radius = this.deep ? 11 : zone === 'robber' || zone === 'hook_mid' || zone === 'hole' ? 6.5 : zone.includes('flat') ? 11 : 7.5;
    this.band = zoneBand(zone, sim);
    const style: ZoneStyle = styleOverride ?? (zone === 'robber' || zone === 'hole' ? 'match' : (sim.defCall.zoneStyle ?? 'match'));
    if (style === 'spot' && !this.deep) {
      // Spot drops are deeper: curl and hook defenders sink to 11-12 yards.
      const sink = zone.startsWith('curl_flat') ? 2.5 : zone.startsWith('hook') ? 1.5 : zone.startsWith('flat') ? 1.5 : 0;
      this.landmark = { x: sim.los + coverageDepth(sim.los, this.landmark.x - sim.los + sink), y: this.landmark.y };
    }
    this.style = style;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const live = pursueIfLive(sim, a);
    if (live) {
      // Deep defenders don't bite on runs until the ball crosses the line.
      const c = sim.carrier!;
      if (!this.deep || c.pos.x > sim.los - 0.5 || sim.catchAt >= 0) return live;
    }
    // Until he sees the throw, a zone defender keeps playing his zone.
    if (sim.ball.kind === 'air' && sawThrow(a, sim, null)) return playBall(a, sim, null);
    // A deep defender who reads run executes his cap/force contract. Alley
    // fits retain depth through the mesh; certainty about the hidden call is
    // not required, and a mistaken read can still expose play action.
    if (believesRun(sim, a)) return runFit(a, sim, this.gap, this.gapSign);
    const spot = this.style === 'spot';

    const qb = sim.see(a, sim.qb);
    const qbCue = inferQBDirection(a.pos, a.facing, qb);
    const lm = this.landmark;
    const [ylo, yhi] = this.band;
    const facingQB = angleTo(a.pos, qb.pos);
    // Zone drops are run under control, eyes on the QB.
    // Until he's read pass, an underneath defender only eases into his drop
    // (read step): how far he commits depends on how sure he is.
    const hesitate = this.deep ? 1 : unsureFactor(a);
    const zs = (0.65 + 0.2 * a.r('zoneCoverage')) * hesitate;
    const inside = (y: number) => Math.sign(sim.ballY - y) || 1;

    // Perceived routes in (or about to enter) this zone's lateral band.
    const threats: ZoneThreat[] = [];
    for (const r of sim.offense) {
      if (r === sim.qb || ['LT', 'LG', 'C', 'RG', 'RT'].includes(r.slot)) continue;
      let observation = this.observations.get(r);
      if (!observation) { observation = new RouteObservation(); this.observations.set(r, observation); }
      const seen = observation.read(sim.see(a, r), sim.t, r.profile, a.profile.reactionTime,
        a.r('anticipation') * a.r('zoneCoverage') * a.mind.focus);
      const fut = { x: seen.pos.x + seen.vel.x * 0.7, y: seen.pos.y + seen.vel.y * 0.7 };
      if (fut.y < ylo || fut.y > yhi) continue;
      // Neutral pre-snap/drop torso facing does not identify a route. Require
      // observed release/movement before that broad bearing biases a threat.
      const released = seen.pos.x > sim.los || Math.hypot(seen.vel.x, seen.vel.y) > 1;
      threats.push({ r, pos: seen.pos, vel: seen.vel, fut,
        qbAffinity: released ? qbCueAffinity(qbCue, seen.pos) : 0 });
    }

    if (this.deep) {
      // Deep zones: never let a vertical get on top. Split two verticals.
      let vert = threats.filter((th) => th.fut.x - sim.los > 7 || (th.vel.x > 1 && th.pos.x > sim.los));
      // A deep-third corner stays over verticals in the outside third; a seam
      // on the hash is the middle safety's. He only takes #2 if #2 works out to him.
      if (this.zone === 'deep_third_s' || this.zone === 'deep_third_w') {
        const third = FIELD_WIDTH / 3;
        const outer = vert.filter((th) => Math.min(th.fut.y, FIELD_WIDTH - th.fut.y) < third + 2);
        if (outer.length) vert = outer;
      }
      // Quarters is a route distribution: the corner carries #1, the safety
      // keys #2. Splitting both verticals here duplicated the corner's help
      // and left the slot free. Deep-third corners likewise own the outside
      // receiver before helping on a seam. Halves/middle retain split rules.
      const quarter = this.zone.startsWith('quarter_');
      const thirdCorner = this.zone.startsWith('deep_third_');
      if (quarter || thirdCorner) {
        const side = this.zone.includes('_s') ? 'S' : 'W';
        const number = this.zone.endsWith('_in') ? '2' : '1';
        const slot = sim.offAlign.numbering[`${side}${number}` as 'S1' | 'S2' | 'W1' | 'W2'];
        const owned = vert.find(th => th.r.slot === slot);
        if (owned) vert = [owned];
      }
      if (vert.length === 0) {
        let tgt = lm;
        // Lean only toward observed released routes in this responsibility.
        // A bare torso ray into empty grass cannot manufacture a receiver cue.
        const total = threats.reduce((sum, th) => sum + th.qbAffinity, 0);
        if (total > 1e-6) {
          const y = threats.reduce((sum, th) => sum + th.pos.y * th.qbAffinity / total, 0);
          const confidence = Math.max(...threats.map(th => th.qbAffinity));
          const lean = ((spot ? 0.25 + 0.2 * a.r('zoneCoverage') : 0.2) * a.r('anticipation') + (spot ? 0.1 : 0)) * confidence;
          tgt = lerp(lm, { x: lm.x, y: clamp(y, ylo, yhi) }, lean);
        }
        return goTo(a, { x: Math.max(tgt.x, lm.x - 1), y: tgt.y }, { facing: facingQB, speed: zs });
      }
      vert.sort((p, q) => q.fut.x - p.fut.x);
      const deepest = vert[0];
      // Pattern read: once the threat stops climbing (breaks in/out or sits)
      // under the deep defender, he drives downhill on it.
      // Never while another receiver is climbing into the zone behind it.
      // (Only verticals near him; a seam on the far hash belongs to the middle safety.)
      const climbing = vert.some((th) => th !== deepest && th.vel.x > 3.5 && th.pos.x - sim.los > 2 && Math.abs(th.pos.y - a.pos.y) < 8);
      // (Pattern reads are match technique; a spot dropper waits for the QB's arm.)
      if ((!spot || OPP_GOAL_X - sim.los <= 10) && !climbing && deepest.vel.x < 3.0 && deepest.pos.x < lm.x + 1
        && deepest.pos.x - sim.los > Math.min(6, Math.max(1, (OPP_GOAL_X - sim.los) * 0.5))) {
        this.target = deepest.r;
        const drive = { x: deepest.pos.x + 1.2 + deepest.vel.x * 0.3, y: deepest.pos.y + deepest.vel.y * 0.4 };
        if (a.mind.focus * (0.4 + 0.6 * a.r('playRecognition')) > 0.35) {
          const aim = a.mind.aim('zone-drive', drive, sim.t);
          return track(a, { x: aim.x, y: clamp(aim.y, 0.5, FIELD_WIDTH - 0.5) }, { x: deepest.vel.x, y: deepest.vel.y }, { facing: facingQB, speed: zs * 1.05, gain: 2.2 });
        }
      }
      // Stay 2–3 yards over the top: deep enough not to be beaten vertically,
      // close enough to drive on a break.
      const cushion = 1.6 + 0.16 * Math.max(0, deepest.vel.x) - 0.6 * a.r('anticipation');
      let ty: number;
      if (vert.length >= 2) {
        // Split them, leaning toward where the QB is looking.
        const w = 0.5 + 0.15 * a.r('anticipation') * (vert[1].qbAffinity - vert[0].qbAffinity);
        ty = vert[0].fut.y * (1 - w) + vert[1].fut.y * w;
      } else ty = deepest.fut.y + inside(deepest.fut.y) * 0.8;
      // A landmark describes responsibility, not a minimum depth to sprint
      // to regardless of the release. Let the initial cushion compress as
      // the stem climbs; otherwise a corner retreats from a hitch into grass.
      const developing = clamp((deepest.pos.x - sim.los) / 8, 0, 1);
      const workingCushion = Math.max(cushion, this.initialDepth * (1 - developing) + cushion * developing);
      const tx = deepest.pos.x + workingCushion;
      // Turn before the receiver consumes the cushion during the hip flip.
      // Pedaling has a physical speed cap; racing a vertical does not.
      const closing = Math.max(0, deepest.vel.x - Math.max(0, a.vel.x));
      const flipTime = Math.PI / a.profile.turnRate + 0.15 * (1 - a.r('anticipation') * a.mind.focus);
      if (deepest.vel.x > a.profile.vmax * a.profile.backpedal && a.pos.x - deepest.pos.x < cushion + closing * flipTime)
        this.turnedWith = deepest.r;
      const turnRun = this.turnedWith === deepest.r && deepest.vel.x > 3;
      const tv = { x: Math.max(0, deepest.vel.x), y: deepest.vel.y * 0.9 };
      this.target = deepest.r;
      return track(a, { x: tx, y: clamp(ty, 0.5, FIELD_WIDTH - 0.5) }, tv, {
        facing: turnRun ? undefined : facingQB,
        speed: turnRun ? 1 : zs * 1.05,
        gain: 1.8,
      });
    }

    // Low red-zone Cover 2: the corner sinks under #1 with outside leverage
    // rather than abandoning him for an open-field flat landmark. An actual
    // second threat entering the flat still pulls him off; the safety caps #1.
    if (OPP_GOAL_X - sim.los <= 10 && (this.zone === 'flat_s' || this.zone === 'flat_w')) {
      const side = this.zone === 'flat_s' ? 'S' : 'W';
      const sign = side === 'S' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
      const one = threats.find(th => th.r.slot === sim.offAlign.numbering[`${side}1`]);
      if (one) {
        const flat = threats.filter(th => th !== one && th.pos.x - sim.los < 5 && th.pos.x > sim.los - 1
          && sign * th.vel.y > 1 && (Math.abs(th.fut.y - one.pos.y) < 6 || sign * (th.fut.y - sim.ballY) > 12))
          .sort((p, q) => Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y) - Math.hypot(q.pos.x - a.pos.x, q.pos.y - a.pos.y))[0];
        const key = flat ?? one;
        this.target = key.r;
        const tgt = { x: Math.max(sim.los + Math.min(2.5, this.initialDepth), key.pos.x - 0.8),
          y: clamp(key.pos.y + sign * 0.45, 0.5, FIELD_WIDTH - 0.5) };
        return track(a, tgt, { x: key.vel.x * 0.85, y: key.vel.y * 0.9 }, {
          facing: key.vel.x > 3 && a.pos.x - key.pos.x < 1.5 ? undefined : facingQB, speed: zs * 1.1, gain: 2 });
      }
    }

    if (spot) return this.spotUnderneath(a, sim, threats, qb);

    // An overloaded pattern reader can spend a beat zoning grass when two
    // routes demand an exchange. He can recover on the next read; the called
    // technique never turns into a permanent randomly selected bust.
    if (sim.t >= this.nextPatternRead) {
      this.nextPatternRead = sim.t + a.mind.decisionInterval;
      const crossing = threats.filter((th) => th.pos.x - sim.los > 2 && th.pos.x - sim.los < 13);
      if (crossing.length >= 2 && a.mind.focus * (0.5 + 0.5 * a.r('zoneCoverage')) < 0.52) {
        this.patternHesitationUntil = this.nextPatternRead;
        a.tags.add('match-hesitation');
      }
    }
    if (sim.t < this.patternHesitationUntil) return this.spotUnderneath(a, sim, threats, qb);

    // Underneath: carry a vertical #2/#3 through the zone (seam carry / wall),
    // otherwise sit in the throwing lane of the nearest threat.
    // Curl-flat players wall #2 only to ~10 yards, then hand him off and expand
    // under #1; hook players carry seams a little deeper.
    const carryTo = this.zone.startsWith('curl_flat') ? 10 : 13;
    const carryable = threats.filter((th) => th.vel.x > 4.5 && th.pos.x - sim.los > 2 && th.pos.x - sim.los < carryTo && Math.abs(th.pos.y - lm.y) < 6);
    if (carryable.length > 0 && this.zone !== 'flat_s' && this.zone !== 'flat_w') {
      carryable.sort((p, q) => Math.abs(p.pos.y - lm.y) - Math.abs(q.pos.y - lm.y));
      const th = carryable[0];
      this.target = th.r;
      // Wall and carry: keep him in front and inside, gaining depth before he
      // gets there. Eyes stay on the QB until the seam threatens to run past;
      // then turn and run with him.
      const tgt = { x: Math.max(th.pos.x + 1.5, a.pos.x - 0.5), y: th.pos.y + inside(th.pos.y) * 0.9 };
      const runPast = th.vel.x > 4.5 && a.pos.x - th.pos.x < 2.5;
      return track(a, tgt, { x: th.vel.x, y: th.vel.y }, { facing: runPast ? undefined : facingQB, speed: runPast ? 0.92 + 0.08 * a.r('zoneCoverage') : zs * 1.1, gain: 1.8 });
    }
    let best: (typeof threats)[number] | null = null;
    let bd = Infinity;
    for (const th of threats) {
      const depth = th.fut.x - sim.los;
      if (depth > 16) continue;
      let dd = Math.hypot(th.fut.x - lm.x, th.fut.y - lm.y);
      dd -= 3 * a.r('anticipation') * th.qbAffinity;
      if (dd < bd && dd < this.radius + 2) {
        bd = dd;
        best = th;
      }
    }
    this.target = best?.r ?? null;
    if (!best) {
      return goTo(a, lm, { facing: facingQB, speed: zs });
    }
    const lane = lerp(qb.pos, best.pos, 0.82);
    let tgt = { x: Math.min(lane.x, best.pos.x - 0.5), y: lane.y };
    const off = sub(tgt, lm);
    const l = Math.hypot(off.x, off.y);
    if (l > this.radius) tgt = { x: lm.x + (off.x / l) * this.radius, y: lm.y + (off.y / l) * this.radius };
    // A match defender can run with a crosser while looking back toward the
    // QB. Treating gaze as hip orientation forced him to shuffle at ~60% of
    // top speed forever, even after accepting the route into his zone.
    const carryingAcross = Math.abs(best.vel.y) > 3 && Math.abs(best.vel.y) > Math.abs(best.vel.x);
    return track(a, { x: tgt.x, y: clamp(tgt.y, 0.5, FIELD_WIDTH - 0.5) }, { x: best.vel.x * 0.5, y: best.vel.y * 0.8 }, {
      facing: carryingAcross ? Math.atan2(best.vel.y, best.vel.x) : facingQB, speed: carryingAcross ? 1 : zs * 1.05, gain: 1.6 });
  }

  /**
   * Spot-drop underneath defender: sprint to the spot (turned to run, so quick
   * throws beat him before he gets there), then settle with eyes on the QB.
   * He leans where the QB looks and squeezes the lane of a receiver in his
   * zone, but keeps his depth and never leaves his zone with a route.
   */
  private spotUnderneath(a: Agent, sim: PlaySim, threats: ZoneThreat[], qb: { pos: Vec2 }): MoveCommand {
    const lm = this.landmark;
    const facingQB = angleTo(a.pos, qb.pos);
    const toSpot = Math.hypot(lm.x - a.pos.x, lm.y - a.pos.y);
    if (toSpot > 2.5 && !a.tags.has('settled')) {
      return goTo(a, lm, { speed: (0.88 + 0.1 * a.r('zoneCoverage')) * unsureFactor(a), facing: toSpot > 4 ? undefined : facingQB });
    }
    a.tags.add('settled');
    const read = 0.5 * a.r('zoneCoverage') + 0.5 * a.r('anticipation');
    let tgt: Vec2 = lm;
    const inZone = threats.filter((th) => Math.hypot(th.pos.x - lm.x, th.pos.y - lm.y) < this.radius && th.pos.x - sim.los > 1);
    const affinities = inZone.map(th => ({ th, weight: th.qbAffinity }));
    const total = affinities.reduce((sum, item) => sum + item.weight, 0);
    if (total > 1e-6) {
      // Multiple routes on the same bearing stay ambiguous. Squeeze their
      // observed lanes rather than learning which one the QB privately read.
      const looked = affinities.reduce((p, { th, weight }) => ({ x: p.x + th.pos.x * weight / total, y: p.y + th.pos.y * weight / total }), { x: 0, y: 0 });
      const lane = lerp(qb.pos, looked, 0.82);
      const confidence = Math.max(...affinities.map(item => item.weight));
      tgt = lerp(lm, lane, (0.45 + 0.4 * read) * confidence);
    }
    // Hold the spot's depth until the ball is thrown; stay within the zone.
    tgt = { x: Math.max(tgt.x, lm.x - 2), y: tgt.y };
    const off = sub(tgt, lm);
    const l = Math.hypot(off.x, off.y);
    if (l > this.radius) tgt = { x: lm.x + (off.x / l) * this.radius, y: lm.y + (off.y / l) * this.radius };
    return goTo(a, { x: tgt.x, y: clamp(tgt.y, 0.5, FIELD_WIDTH - 0.5) }, { facing: facingQB, speed: 0.7 + 0.15 * a.r('zoneCoverage') });
  }
}

/** Speed factor for a defender who hasn't read run or pass yet. */
export function unsureFactor(a: Agent): number {
  const r = a.recog;
  if (!r || r.read !== 'unsure') return 1;
  return 0.3 + 0.7 * r.pPass();
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
    case 'hole':
      return [by - 9, by + 9];
    case 'curl_s': {
      const lo = by + s * 1;
      return s > 0 ? [lo, W - 4] : [4, lo];
    }
    case 'curl_w': {
      const lo = by - s * 1;
      return s > 0 ? [4, lo] : [lo, W - 4];
    }
  }
}

/** Ball in the air: break on it after reacting; intercept the path or contest the catch. */
/** Has this defender seen the throw yet? (Eyes on the QB see it sooner.) */
export function sawThrow(a: Agent, sim: PlaySim, man: Agent | null): boolean {
  const ball = sim.ball;
  if (ball.kind !== 'air') return false;
  const qb = sim.see(a, sim.qb).pos;
  const qbAngle = Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x);
  // Zone eyes can look over the shoulder while the hips carry a crossing
  // route. A defender sprinting directly away still cannot see the release.
  const zoneEyes = a.behavior instanceof ZoneCoverage || (a.behavior as { zoneEyes?: boolean }).zoneEyes === true;
  const facingQB = Math.cos(a.body.facing - qbAngle) > (zoneEyes ? -0.2 : 0.1);
  // Eyes on the QB see the release; a trailing man defender reads it off
  // the receiver's eyes and hands a beat later.
  const react = a.mind.observationDelay(a.profile.reactionTime * (facingQB ? 1 - 0.4 * a.r('anticipation') : 1.25)) + (man ? 0.05 : 0);
  // Spot droppers key the quarterback: his arm and body action give the
  // throw away before the ball is out, so their reaction starts there.
  const style = a.behavior instanceof ZoneCoverage ? a.behavior.style : (a.behavior as { style?: ZoneStyle }).style;
  const keysQB = facingQB && sim.windupAt >= 0 && zoneEyes && style === 'spot';
  if (keysQB && sim.t - sim.windupAt >= react) {
    a.tags.add('readArm');
    return true;
  }
  return sim.t - sim.throwAt >= react;
}

export function playBall(a: Agent, sim: PlaySim, man: Agent | null): MoveCommand {
  const ball = sim.ball;
  if (ball.kind !== 'air') return stand();
  if (!sawThrow(a, sim, man)) {
    // Haven't seen it yet: stay with the man / keep doing what we were doing.
    if (man) {
      const s = sim.see(a, man);
      const inside = Math.sign(sim.ballY - s.pos.y) || 1;
      return track(a, { x: s.pos.x, y: s.pos.y + inside * 0.7 }, s.vel, { cutSkill: 0.85 + 0.35 * a.r('manCoverage') });
    }
    return { vel: a.vel };
  }
  a.tags.add('onBall');
  const spot = catchSpot(a, sim);
  const window = observedCatchWindow(a, sim);
  // Near the ball's path, a defender with ball skills turns his head and finds
  // it (looking over the shoulder doesn't turn the body).
  const nearPath = spot && Math.hypot(spot.p.x - a.pos.x, spot.p.y - a.pos.y) < 5;
  if (nearPath && !a.tags.has('looking') && sim.rng.chance(0.15 + 0.5 * a.r('ballSkills'))) a.tags.add('looking');
  if (spot) {
    const tt = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, spot.p, a.profile.reach);
    // A reachable ball is an arrival problem. Sprinting *through* the spot
    // every tick pulls an in-phase defender across the receiver and then
    // out of the contest as the trajectory's earliest reachable point moves.
    // A receiver may get to the ball before this later point on its flight.
    // Reaching where an already-caught pass would have hit the ground is not
    // an interception opportunity. Close the actual visible catch window.
    if (tt <= spot.t - sim.t + 0.05 && (!window || spot.t <= window.t + 0.05)) return goTo(a, spot.p);
  }
  // Can't beat the ball to its path: drive on the catch point to arrive with
  // the ball — on the receiver's near side, ready to play through the hands
  // or make the tackle the moment it's caught.
  const land = window?.p ?? arrivalPoint(sim);
  if (land) {
    // Close to the catch itself. A fixed yard of standoff plus inside shade
    // keeps a late defender outside the hands even when he can recover.
    const tgt = land;
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

/** First plausible receiver catch from the defender's delayed picture and
 * the visible flight. Does not inspect the intended target or called route.
 * This is a possibility estimate; a receiver can still drop or miss it. */
function observedCatchWindow(a: Agent, sim: PlaySim): { p: Vec2; t: number } | null {
  const receivers = sim.offense.filter(r => r !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(r.slot))
    .map(r => ({ r, seen: sim.see(a, r) }));
  for (const s of sim.ballPath) {
    const remaining = s.t - sim.t;
    if (remaining < 0 || s.z < 0.25) continue;
    for (const { r, seen } of receivers) {
      if (s.z > r.profile.maxCatchHeight * 0.92) continue;
      const p = { x: s.x, y: s.y };
      if (Math.hypot(p.x - seen.pos.x, p.y - seen.pos.y) > r.profile.vmax * remaining + r.profile.reach) continue;
      const tt = timeToReach({ pos: seen.pos, vel: seen.vel, profile: r.profile }, p, r.profile.reach * 0.8);
      if (tt <= remaining) return { p, t: s.t };
    }
  }
  return null;
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
