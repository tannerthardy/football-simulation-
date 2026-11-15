/**
 * Blocking.
 *
 * Pass protection: a coordinator matches available blockers to rushers each
 * tick (inside-out zone responsibility for linemen, backs and tight ends pick
 * up free rushers); spare linemen double. Protectors kick-slide to a set point
 * and fit between the rusher and the QB.
 *
 * Run blocking: assignments are computed at the snap from the defensive
 * alignment using real rules — zone (covered/uncovered, reach, combo to the
 * second level, backside cutoff) and gap (down blocks, pullers kicking out the
 * end man on the line or leading through the hole, trap), plus fullback lead
 * and receivers stalking defensive backs.
 */
import { FIELD_WIDTH } from '../../core/field.js';
import { clamp, norm, sub, type Vec2 } from '../../core/vec.js';
import { gaitLag, cornerSpeed, fatigueFactor, movingArrivalVelocity, type MoveCommand } from '../../physics/kinematics.js';
import { previewFreeMovement } from '../../physics/movement-preview.js';
import { requestToCover } from '../motion-plan.js';
import { availability, supportParams } from '../../physics/support.js';
import type { HandJoint, Intent } from '../../physics/world.js';
import type { RunConcept } from '../../playbook/types.js';
import type { Agent, Behavior, Engagement, RunContactSurface } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { chooseRunBlockFit, observedBlockLeverage, secondLevelBlockApproach } from '../run-block-fit.js';
import { paRunLook } from '../pa-look.js';
import { DOUBLE_OVERTAKE, axisOf, contactControl, helperSupport, passSetDepth, promoteContact, protectPoint, PUNCH, SET_SPOT, setSpotTarget, TACKLE_SET, tackleFloor, tackleSetLine, traits } from '../engagement.js';
import { readZoneReach, type ZoneReachRead } from '../zone-reach.js';
import { interceptPoint, timeToReach } from '../../physics/reach.js';
import type { Perceived } from '../perception.js';
import { goTo, runThrough, stand, track } from './common.js';
import {collectionCommand,readCollectionApproach,type CollectionApproach} from '../collection-approach.js';
import { blockerWorkPoint, readBlockerWorkPicture, type BlockerWorkPicture } from '../blocker-work-picture.js';
import { assessClimbAccess, type ClimbAccessResult, chooseClimbAccess, climbAccessCommand, type ClimbAccess } from '../climb-access.js';
import { lineDepth, lineOffset } from '../../playbook/alignment.js';
import type { EngagedGoal } from '../engaged-technique.js';
import { OL_ON_COUNT } from '../snap-count.js';
/** A blocker's own start: his readiness lag, or with OL_ON_COUNT his planned start on the count. */
const startOf = (a: Agent): number => OL_ON_COUNT ? a.snapReadyAt : a.mind.snapDelay;

/** How far behind the line this player's installed stance stands. */
const stanceDepth = (sim: PlaySim, a: Agent) => sim.los - (sim.offAlign.spots[a.slot]?.pos.x ?? sim.los - .55);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
export const isOL = (a: Agent): boolean => OL.has(a.slot);
/** A first-level run blocker on the line: the five linemen and an inline end
 * doing the same job, who keeps the same base and strike fit into contact.
 * A detached wing or slot keeps his own approach. */
const onLine = (a: Agent, sim: PlaySim): boolean => isOL(a) || !!sim.offAlign?.spots[a.slot]?.inline;

// ------------------------------------------------------------- protection

export class ProtectionCoordinator {
  private lastT = -1;
  private readonly sticky = new Map<Agent, Agent>();
  readonly assigned = new Map<Agent, Agent | null>();
  readonly protectors: Agent[] = [];
  readonly homeY = new Map<Agent, number>();

  add(a: Agent): void {
    this.protectors.push(a);
    this.homeY.set(a, a.pos.y);
  }

  /** The protector whose area this defender is in sees him for the line. */
  private observer(d: Agent): Agent {
    let best = this.protectors[0], bd = Infinity;
    for (const b of this.protectors) {
      if (!isOL(b)) continue;
      const dd = Math.abs(this.homeY.get(b)! - d.pos.y);
      if (dd < bd) { bd = dd; best = b; }
    }
    return best;
  }

  private readonly dropped = new Set<Agent>();

  /** PRO_READ: who rushes is read from what the line sees, not from the
   * defender's call. At the snap the threats are the men aligned on the line
   * (a visible alignment); after it, a man is a rusher once the blocker in his
   * area sees him attacking the line, and a man on the line who is seen
   * dropping off it is released. */
  private seenRusher(sim: PlaySim, d: Agent): boolean {
    const seen = sim.see(this.observer(d), d);
    if (seen.pos.x < sim.los + 1.5 && seen.vel.x > 1 && seen.pos.x > sim.los + 0.5) this.dropped.add(d);
    if (seen.pos.x < sim.los + 1.5 && seen.vel.x < -0.5) this.dropped.delete(d);
    // PRO_CALL: a walked-up threat the call declared is released once he is
    // seen leaving the box, and is a rusher on his first seen downhill step.
    if (PRO_CALL && this.called.has(d) && seen.vel.x > 1 && seen.pos.x > sim.los + 0.5) this.dropped.add(d);
    if (this.dropped.has(d)) return false;
    if (seen.pos.x < sim.los) return true;
    if (PRO_CALL && this.called.has(d) && seen.pos.x < sim.los + CALL_DEPTH && seen.vel.x < -0.5) return true;
    return seen.pos.x < sim.los + 1.5 && (seen.vel.x < -0.5 || (this.declaredOn.has(d) && seen.vel.x <= 1));
  }

  private readonly declaredOn = new Set<Agent>();
  /** PRO_CALL: off-ball threats the protection call declared at the snap. */
  readonly called = new Set<Agent>();
  /** PRO_CALL: backs the call counts in the protection (decided at install). */
  readonly backsIn = new Set<Agent>();

  private isRusher(sim: PlaySim, d: Agent): boolean {
    if (PRO_READ) return this.seenRusher(sim, d);
    const k = d.behavior.kind;
    if (k === 'rush' || k === 'blitz') {
      // Blitzers from depth are identified after a recognition delay.
      if (k === 'blitz' && sim.t < 0.2 + 0.3 * (1 - 0.5)) return d.pos.x < sim.los + 2.5;
      return true;
    }
    return d.pos.x < sim.los + 1.5 && d.vel.x < -0.5;
  }

  /**
   * Declared protection at the snap: linemen take rushers in left-to-right
   * order (no crossing paths), minimizing total lateral distance — tackles on
   * the edges, guards on the 5-techniques, the center on the nose against an
   * odd front. A rusher the line can't take is left for a back in protection
   * if one is close enough; otherwise for whoever is nearest later. Without
   * an order, linemen each grabbed the nearest man and doubled the nose while
   * an edge ran free.
   */
  private declare(sim: PlaySim, rushers: Agent[]): void {
    const ol = this.protectors.filter((b) => isOL(b)).sort((p, q) => this.homeY.get(p)! - this.homeY.get(q)!);
    const rs = [...rushers].sort((p, q) => p.pos.y - q.pos.y);
    const backs = this.protectors.filter((b) => !isOL(b));
    const skipCost = (r: Agent) => {
      const near = backs.length ? Math.min(...backs.map((b) => Math.abs(b.pos.y - r.pos.y))) : Infinity;
      if (!Number.isFinite(near)) return 14;
      // PRO_CALL: big on big. The back's man in the call is a walked-up
      // backer, not a down lineman: leaving a called (off-ball) threat to him
      // is cheap, leaving a man on the line to him is not.
      if (PRO_CALL) return this.called.has(r) ? 1 + 0.6 * near : 8 + 0.6 * near;
      return 2 + 0.6 * near;
    };
    const n = ol.length;
    const m = rs.length;
    const INF = 1e9;
    const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(INF));
    const how = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    dp[0][0] = 0;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= m; j++) {
        if (i === 0 && j === 0) continue;
        if (i > 0 && dp[i - 1][j] < dp[i][j]) {
          dp[i][j] = dp[i - 1][j];
          how[i][j] = 1; // lineman unassigned (helps)
        }
        if (j > 0 && dp[i][j - 1] + skipCost(rs[j - 1]) < dp[i][j]) {
          dp[i][j] = dp[i][j - 1] + skipCost(rs[j - 1]);
          how[i][j] = 2; // rusher left to a back
        }
        if (i > 0 && j > 0) {
          const b = ol[i - 1];
          const r = rs[j - 1];
          const dy = Math.abs(r.pos.y - this.homeY.get(b)!);
          const zone = b.slot === 'LT' || b.slot === 'RT' ? 5.5 : 2.8;
          const c = dp[i - 1][j - 1] + dy + (dy > zone ? 6 : 0);
          if (c < dp[i][j]) {
            dp[i][j] = c;
            how[i][j] = 3;
          }
        }
      }
    }
    let i = n;
    let j = m;
    const left: Agent[] = [];
    while (i > 0 || j > 0) {
      const h = how[i][j];
      if (h === 3) {
        this.sticky.set(ol[i - 1], rs[j - 1]);
        i--;
        j--;
      } else if (h === 2) { left.push(rs[j - 1]); j--; }
      else i--;
    }
    // PRO_CALL: a declared threat the line can't take is the back's at the
    // snap (his man in the call), not whoever is nearest once he comes.
    if (PRO_CALL) for (const r of left) {
      const free = backs.filter((b) => ![...this.sticky.keys()].includes(b));
      if (!free.length) break;
      const b = free.reduce((x, y) => (Math.abs(x.pos.y - r.pos.y) <= Math.abs(y.pos.y - r.pos.y) ? x : y));
      this.sticky.set(b, r);
    }
  }

  private declared = false;

  update(sim: PlaySim): void {
    if (this.lastT === sim.t) return;
    this.lastT = sim.t;
    // Pre-snap, the line counts the men aligned on it; that is visible.
    if (PRO_READ && !this.declared) for (const d of sim.defense) if (sim.snapX[d.idx] < sim.los + 1.5) this.declaredOn.add(d);
    if (PRO_CALL && !this.declared) for (const d of boxThreats(sim)) if (!this.declaredOn.has(d)) this.called.add(d);
    const rushers = sim.defense.filter((d) => !d.isDown(sim.t) && this.isRusher(sim, d));
    let front = PRO_READ ? [...this.declaredOn].filter((d) => rushers.includes(d)) : rushers;
    // PRO_CALL: the call's threats are in the declaration before they move.
    if (PRO_CALL && !this.declared) front = [...front, ...[...this.called].filter((d) => !front.includes(d) && !this.dropped.has(d))];
    if (!this.declared && front.length) {
      this.declared = true;
      this.declare(sim, front);
    }
    const free = this.protectors.filter((b) => !b.engagement && !b.isDown(sim.t) && b.behavior instanceof PassProtector && !(b.behavior as PassProtector).released);
    this.assigned.clear();
    const taken = new Set<Agent>();
    for (const b of this.protectors) if (b.engagement) taken.add(b.engagement.defender);
    const unblocked = rushers.filter((r) => !r.engagement && !taken.has(r));
    const usedB = new Set<Agent>();
    const usedR = new Set<Agent>();
    const zoneOf = (b: Agent) => (isOL(b) ? (b.slot === 'LT' || b.slot === 'RT' ? 5.5 : 2.6) : 8);
    // Assignments hold once made: a blocker keeps his man unless someone else
    // has picked him up, he's down, or he has left this blocker's area (a game
    // or twist — then he's passed off).
    for (const [b, r] of [...this.sticky]) {
      const home = this.homeY.get(b)!;
      // PRO_CALL: a called threat stays the blocker's man until he is seen
      // leaving the box (or CALL_HOLD passes without him coming).
      const held = PRO_CALL && this.called.has(r) && !this.dropped.has(r) && sim.t < CALL_HOLD;
      if (!free.includes(b) || r.isDown(sim.t) || r.engagement || taken.has(r) || Math.abs(seenPos(sim, b, r).y - home) > zoneOf(b) + 1.5
        || (PRO_READ && !rushers.includes(r) && !held)) {
        this.sticky.delete(b);
        continue;
      }
      usedB.add(b);
      usedR.add(r);
      this.assigned.set(b, r);
    }
    const pairs: Array<{ b: Agent; r: Agent; cost: number }> = [];
    for (const b of free) {
      if (usedB.has(b)) continue;
      const home = this.homeY.get(b)!;
      const isT = b.slot === 'LT' || b.slot === 'RT';
      const zone = zoneOf(b);
      for (const r of unblocked) {
        if (usedR.has(r)) continue;
        const rp = seenPos(sim, b, r);
        if (Math.abs(rp.y - home) > zone) continue;
        // Don't chase rushers who are already past.
        if (rp.x < b.pos.x - 1.5 && isOL(b)) continue;
        let cost = Math.abs(rp.y - b.pos.y) + 0.35 * Math.max(0, rp.x - b.pos.x);
        if (!isOL(b)) cost += 0.8; // backs/TEs pick up leftovers
        // Interior first: centers and guards take A/B gap threats.
        if (isOL(b) && Math.abs(rp.y - sim.ballY) < 2.5 && !isT) cost -= 0.4;
        pairs.push({ b, r, cost });
      }
    }
    pairs.sort((p, q) => p.cost - q.cost);
    for (const { b, r } of pairs) {
      if (usedB.has(b) || usedR.has(r)) continue;
      usedB.add(b);
      usedR.add(r);
      this.assigned.set(b, r);
      this.sticky.set(b, r);
    }
    // Spare protectors help: double the nearest engaged rusher.
    for (const b of free) {
      if (usedB.has(b)) continue;
      let best: Agent | null = null;
      let bd = isOL(b) ? 2.8 : 0;
      for (const o of this.protectors) {
        const e = o.engagement;
        if (!e || e.helpers.length > 0) continue;
        const dd = Math.abs(seenPos(sim, b, e.defender).y - b.pos.y);
        if (dd < bd) {
          bd = dd;
          best = e.defender;
        }
      }
      this.assigned.set(b, best);
    }
  }
}

export class PassProtector implements Behavior {
  readonly kind = 'pass-pro';
  /** A check-release is an installed outlet; permanent protection is not. */
  get passOption(): boolean { return this.releaseTo !== null; }
  released = false;
  /** Per-rep tendency to over-set (random, scaled by footwork). */
  private oversetBias = -1;
  constructor(
    private readonly coord: ProtectionCoordinator,
    /** For backs/TEs: release into a route after this time if nobody comes. */
    private readonly releaseTo: (() => Behavior) | null = null,
    private readonly releaseAfter = 1.1,
    /** A called release (a screen): leave the set on the count even with a man,
     * releasing the hands; a back or end with a free blitzer still stays in. */
    private readonly calledRelease = false,
  ) {}

  /** A lineman with a called release sets at his stance depth and blocks his
   * man like any pass set until the count, then lets him go. NFL released
   * linemen on RB/TE screens stay ~0.7 yd off the ball and are in contact
   * with a rusher for ~0.8 s in the first 2 s (screen_ol_reference.py,
   * rushpath.py in screen-lab.md item 18); letting the rusher by untouched
   * gave 0.4 s, and free interior rushers reached the QB within 1 s 82% of
   * the time (NFL 11%). An attached end with a called release (TE screen)
   * sets the same way: from a tackle's kick set he drifted 3 yd into the
   * backfield before his release and was carried to 6-7 yd by the end he let
   * go, where the QB's forecast of his drift floated the ball behind him. */
  private setDepth(sim: PlaySim, a: Agent): number {
    const depth = passSetDepth(sim, a);
    return this.calledRelease && (isOL(a) || !sim.offAlign.spots[a.slot]?.backfield) ? 0 : depth;
  }

  /** Inspect existing protection state without running the coordinator. */
  recordedTarget(a: Agent): number | null {
    return a.engagement?.defender.idx ?? this.coord.assigned.get(a)?.idx ?? null;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    // Play action: everyone shows a low, aggressive pad level at first.
    a.stance = isOL(a) && (PUNCH ? paRunLook(a, sim, a.engagement?.defender ?? this.coord.assigned.get(a) ?? null)
      : sim.t < 0.35 && sim.offCall.kind === 'pass' && !!sim.offCall.pass?.fake) ? 'low' : 'high';
    const home = this.coord.homeY.get(a) ?? a.pos.y;
    const outside = a.slot === 'LT' || a.slot === 'RT' ? Math.sign(home - sim.ballY) : 0;
    a.passSet = { depth: passSetDepth(sim, a), laneY: home + outside * 0.8, outside, spotY: home };
    if (sim.t < startOf(a)) return stand(0);
    // A called release: a lineman or attached end leaves his man on the count;
    // a back stays in while a free rusher is coming at him (a blitz kills the screen).
    const freeRusher = (): boolean => { const r = this.coord.assigned.get(a); return !!r && !r.engagement; };
    // A lineman lets his rusher by: he leaves once the man he is on is past
    // his hip toward the quarterback (or has left him), and a beat (0.3 s) after
    // the count at the latest, so a rusher who stops does not sit in the screen.
    const pastHip = (): boolean => {
      const d = a.engagement?.defender ?? this.coord.assigned.get(a);
      return !d || (a.pos.x - d.pos.x) * sim.attackDir(a.team) > 0.3;
    };
    if (this.calledRelease && this.releaseTo && sim.t > this.releaseAfter && sim.carrier === sim.qb
      && (isOL(a) ? pastHip() || sim.t > this.releaseAfter + 0.3 : !sim.offAlign.spots[a.slot]?.backfield || !freeRusher())) {
      if (a.engagement) sim.disengage(a.engagement);
      this.released = true;
      a.behavior = this.releaseTo();
      return a.behavior.update(a, sim);
    }
    if (a.engagement) return stand();
    if (sim.carrier !== sim.qb || !sim.isPass) {
      return stand();
    }
    this.coord.update(sim);
    const rA = this.coord.assigned.get(a) ?? null;
    if (!rA && this.releaseTo && sim.t > this.releaseAfter) {
      this.released = true;
      a.behavior = this.releaseTo();
      return a.behavior.update(a, sim);
    }
    // SET_SPOT: the QB he protects is the launch point he knows from the call, not the live QB behind him.
    const qb = SET_SPOT ? { ...sim.qb, pos: protectPoint(sim) } as typeof sim.qb : sim.qb;
    if (!rA) {
      // Set: tackles kick, interior sets short; backs hold near the QB.
      const isT = a.slot === 'LT' || a.slot === 'RT';
      const out = Math.sign(home - sim.ballY);
      const depth = isOL(a) ? this.setDepth(sim, a) : 0;
      // A back steps up beside the QB's launch point, not toward the line:
      // from under center the QB starts at the line and drops away.
      let set = isOL(a) ? { x: sim.los - lineDepth(0.6, stanceDepth(sim, a)) - depth, y: home + (isT ? out * 0.8 : 0) } : { x: Math.min(qb.pos.x + 1.2, sim.snapX[a.idx] + 1.5), y: qb.pos.y + Math.sign(home - qb.pos.y || 1) * 1.4 };
      if (runLook(a, sim)) set = { x: sim.los - 0.2, y: set.y };
      return goTo(a, set, { speed: 0.7, facing: 0 });
    }
    // PASS_SET_SEEN: the set is his, from his picture of the rusher; only the contact itself is the World's.
    const r = PASS_SET_SEEN ? seenRusherView(sim, a, rA) : rA;
    // Pass set: stay on the line between the rusher and the QB, giving ground
    // under control. Poor footwork over-sets against speed (opening the
    // inside counter).
    const toQB = norm(sub(qb.pos, r.pos));
    const arm = a.player.measurables.armIn / 36;
    // Punching range: bodies plus most of an arm's length.
    const contact = a.profile.radius + r.profile.radius + 0.1 + arm * 0.55;
    const out = Math.sign(r.pos.y - sim.ballY) || 1;
    const edgeRusher = Math.abs(r.pos.y - sim.ballY) > 3;
    const fear = edgeRusher ? clamp((r.speed - 4) / 5, 0, 1) : 0.2;
    if (this.oversetBias < 0) this.oversetBias = sim.dice('set', a).range(0.2, 1.4);
    const overset = (1 - traits(a).feet) * 0.9 * fear * this.oversetBias;
    // Kick-slide: gain depth (tackles more than interior), staying on the
    // rusher's line to the QB at punching distance. Make the rusher come to you.
    const isT = a.slot === 'LT' || a.slot === 'RT';
    const setDepth = this.setDepth(sim, a);
    // Anticipate the rusher's path a beat ahead (better feet read it sooner).
    const lead = 0.15 + 0.2 * traits(a).feet;
    const rp = { x: r.pos.x + r.vel.x * lead, y: r.pos.y + r.vel.y * lead };
    const toQBp = norm(sub(qb.pos, rp));
    let along = contact * 0.85;
    if (toQBp.x < -0.2) along = Math.max(along, (sim.los - setDepth - rp.x) / toQBp.x);
    let set = { x: rp.x + toQBp.x * along, y: rp.y + toQBp.y * along + out * overset };
    // SET_SPOT: an interior set goes to its spot (his set depth straight back off his alignment), with its width where
    // the rusher's line to the launch point crosses that depth, kept to his zone. He meets the rusher there.
    const spotSet = SET_SPOT && !isT && isOL(a) && !this.calledRelease && !runLook(a, sim);
    let spotFrac = 0;
    if (spotSet) {
      const sx = sim.los - lineDepth(0.6, stanceDepth(sim, a)) - setDepth;
      const tg = setSpotTarget(sim, a, rp, sx);
      set = { x: sx, y: tg.y }; spotFrac = tg.frac;
    }
    // An edge rusher runs an arc, not the straight line to the QB: a tackle
    // who sets on that line sits on the chord, a couple of yards inside him,
    // all the way back. Kick to cut the arc off instead — meet him at the
    // earliest point on his projected path you can reach first, on his inside
    // shoulder — and let the hands decide the rep.
    let ride = false;
    let cuttingOff = false;
    if (edgeRusher && isOL(a) && !this.calledRelease) {
      const meet = PASS_KICK ? null : cutOffPoint(a, r, qb.pos, contact);
      if (meet) {
        set = { x: meet.x, y: meet.y + out * overset };
        cuttingOff = true;
      }
      else if (r.pos.x < a.pos.x + 1.0 && Math.hypot(r.pos.x - a.pos.x, r.pos.y - a.pos.y) < 4) {
        // Beaten to the corner: run him past the QB — chase his inside hip
        // and get hands on him from a losing angle.
        const toQBr = norm(sub(qb.pos, r.pos));
        set = { x: r.pos.x + r.vel.x * 0.2 + toQBr.x * contact * 0.5, y: r.pos.y + r.vel.y * 0.2 + toQBr.y * contact * 0.5 };
        ride = true;
      }
    }
    if (PASS_KICK && edgeRusher && isOL(a) && !ride && !runLook(a, sim)) {
      // Vertical set: kick back, deeper than where the rusher will be a beat
      // from now, on his inside shoulder; never take ground back toward the
      // line, never past the launch point. He has to come to the tackle.
      const ahead = { x: r.pos.x + r.vel.x * KICK_LOOK, y: r.pos.y + r.vel.y * KICK_LOOK };
      // Depth is kept on the rusher's present depth: leading his position a
      // beat ahead as well would keep the tackle 2-3 yd in front of a fast
      // rusher, retreating out of punching range all the way to the launch
      // point (the old start law hid this by making the tackle lag his spot).
      const floor = TACKLE_SET ? tackleFloor(sim) : null;
      const x = Math.max(qb.pos.x + 0.5, floor ?? -Infinity, Math.min(a.pos.x, r.pos.x - KICK_LEAD, sim.los - lineDepth(0.6, stanceDepth(sim, a)) - setDepth));
      set = { x, y: ahead.y - out * contact * 0.6 + out * overset };
      // TACKLE_SET: the inside half of the rusher, but never outside his set line.
      if (TACKLE_SET || VERTICAL_SET) { const line = tackleSetLine(sim, a, r); set.y = line.y - line.out * Math.max(0, (line.y - set.y) * line.out); }
    }
    if (runLook(a, sim)) set = { x: Math.max(set.x, sim.los - 0.3), y: set.y };
    const dd = Math.hypot(r.pos.x - a.pos.x, r.pos.y - a.pos.y);
    // A tackle late to the spot can still get a punch on a speed rusher's near
    // shoulder as he goes by; the rep then starts from a losing angle.
    const passing = r.speed > 4.5 && r.pos.x < a.pos.x + 0.6;
    const reachOut = edgeRusher && passing ? 0.15 + 0.3 * traits(a).feet : 0;
    // Contact is physical: the bodies' true distance (his reach decision above is from his picture).
    const ddContact = PASS_SET_SEEN ? Math.hypot(rA.pos.x - a.pos.x, rA.pos.y - a.pos.y) : dd;
    if (ddContact < contact + 0.15 + reachOut && sim.engage(a, rA, 'pass')) return stand();
    const facing = Math.atan2(r.pos.y - a.pos.y, r.pos.x - a.pos.x);
    const quick = 0.85 + 0.3 * traits(a).feet;
    if (ride) return track(a, set, r.vel, { cutSkill: quick, gain: 3 });
    // Kick with the rusher only while short of the lead. Deeper than that,
    // matching his retreat keeps whatever extra depth the start produced
    // and he never comes into range; hold and let him come.
    if (PASS_KICK && edgeRusher && isOL(a)) {
      // TACKLE_SET: at the called set he stops kicking; the rusher comes to him.
      const floor = TACKLE_SET ? tackleFloor(sim) : null;
      const anchored = floor !== null && a.pos.x <= floor + 0.1;
      // TACKLE_SET: at his set line he does not match the rusher's widening.
      const line = TACKLE_SET ? tackleSetLine(sim, a, r) : null;
      const wide = !!line && (a.pos.y - line.y) * line.out >= -0.1 && r.vel.y * line.out > 0;
      // VERTICAL_SET: lead only the rusher's inward motion; his outward run is not chased.
      // VERTICAL_SET: the rusher's inward motion as he sees it (his picture, delayed), whatever PASS_SET_SEEN says.
      const leadY = VERTICAL_SET ? out * Math.min(0, sim.see(a, rA).vel.y * out) : wide ? 0 : r.vel.y;
      return track(a, set, { x: anchored || a.pos.x < r.pos.x - KICK_LEAD ? 0 : Math.min(0, r.vel.x), y: leadY }, { facing, cutSkill: quick, gain: 2.5 });
    }
    // The cutoff is an interception, not a point on which to match the
    // rusher's present velocity. Approach through it at the kick-slide speed
    // already assumed by the forecast; physical movement and contact still
    // decide whether the tackle can arrive and obtain useful protection.
    if (cuttingOff) return goTo(a, set, { speed: 0.75, through: a.profile.vmax * 0.75, facing, cutSkill: quick });
    // SET_SPOT: his spot does not move with the rusher's depth; across, it moves by its own share of his motion.
    if (spotSet) return track(a, set, { x: 0, y: r.vel.y * spotFrac }, { facing, cutSkill: quick, gain: 2.5 });
    return track(a, set, { x: r.vel.x * 0.7, y: r.vel.y }, { facing, cutSkill: quick, gain: 2.5 });
  }
}

/** PASS_KICK (G5, default on; PASS_KICK=0 turns it off): a tackle sets against an edge
 * rusher vertically instead of cutting off his arc. He kicks back to stay
 * deeper than where the rusher will be a beat from now, on his inside
 * shoulder, never takes ground back toward the line and never passes the
 * launch point; the rusher has to come to him. Tracked tackles go nearly
 * straight back (2.2 yd deep at 1.0 s, 3.4 at 1.5 s) with the rusher 1.3 and
 * 0.8 yd shallower; the cutoff met him at the line (PRO-1). Ported from
 * claude/run-game-v3 (docs/PARKED.md). */
const PASS_KICK = process.env.PASS_KICK !== '0';
/** VERTICAL_SET (experimental, off; VERTICAL_SET=1): the tackle's kick against an edge rusher gives ground vertically
 * and keeps an inside-out relationship instead of matching the rusher's width. He kicks no wider than TACKLE_SET's set
 * line from his alignment (0.4 of the rusher's snap width outside him, 0.3-1.0 yd: a wider rusher gets a wider, deeper
 * set, a tight one a flatter set), and his lateral lead is only the rusher's inward motion (the inside counter he
 * mirrors), never his outward run. Off, the kick copies the rusher's lateral velocity: at first contact the NFL
 * tackle retreats 2.5-3.0 yd/s with outward speed about 0 (wide / very wide alignments, IQR -0.75..+0.75), ours 2.25-2.75
 * with +0.25..+0.75 (p75 +1.25..+1.5), and meets the very wide rusher at 1.3 s against 1.5 s, landing wide 27-32% vs
 * 64% (docs/reviews/2026-11-12-tackle-set.md). Depth (TACKLE_SET's floor) is not part of it. */
const VERTICAL_SET = process.env.VERTICAL_SET !== '0';
/** PRO_READ (default on; PRO_READ=0 restores the old read): protection reads
 * who rushes from what the line sees. Off, the coordinator read each
 * defender's private behavior (rush/blitz), so the line never set on a
 * dropping end and knew every blitzer by his call. */
const PRO_READ = process.env.PRO_READ !== '0';
/** PASS_SET_SEEN (experimental, off; intended on): a pass protector's set and his protection's assignment costs read
 * his picture of the rusher (`sim.see`, his delayed, recognised sample; Rules+Coaching's track() replaces it when it
 * lands), not the rusher's true position and velocity. The set point, the kick, the mirror, the cut-off, his overset
 * fear and his reach for a man going by are his decisions; only the contact itself (the bodies' true distance at
 * engage) is the World's. Found by the perception census (2026-11-13): the pre-contact set read the true state. */
export const PASS_SET_SEEN = process.env.PASS_SET_SEEN !== '0';
/** PASS_SET_SEEN: the rusher as this blocker sees him, shaped like the Agent fields the set reads. */
function seenRusherView(sim: PlaySim, a: Agent, r: Agent): Agent {
  const s = sim.see(a, r);
  const view = Object.create(r) as Agent & { pos: Vec2; vel: Vec2; speed: number };
  Object.defineProperty(view, 'pos', { value: s.pos });
  Object.defineProperty(view, 'vel', { value: s.vel });
  Object.defineProperty(view, 'speed', { value: Math.hypot(s.vel.x, s.vel.y) });
  return view;
}
/** PASS_SET_SEEN: a rusher's position as this protector sees it (true position when off). */
function seenPos(sim: PlaySim, b: Agent, r: Agent): Vec2 {
  return PASS_SET_SEEN ? sim.see(b, r).pos : r.pos;
}
/** PRO_CALL (experimental, off; PRO_CALL=1): the protection is called at the
 * line from what the offence sees before the snap. The line counts the box:
 * every defender within CALL_DEPTH of the line inside the linemen's width
 * +-CALL_WIDTH (on-line men, walked-up backers, a safety rolled into the box).
 * Walked-up threats are declared with the men on the line, so the snap
 * assignment slides to the extra man and leaves the one the line can't take
 * to a back; a declared threat is a rusher on his first seen downhill step
 * (BLITZ_READ's rule) and is released when seen leaving the box or after
 * CALL_HOLD without coming. When the
 * count exceeds the protectors the concept keeps in, a back installed on a
 * free route, then an attached end, stays in as a check-release (assign.ts); the back's route when
 * he is free is the route builder's (Run Game). A blitz disguised from depth
 * is not in the count. Built on BLITZ_READ (docs/reviews/patches/blitz-read.patch);
 * evidence docs/reviews/2026-11-11-protection.md: 0 of 75 free off-ball
 * blitzers declared, free first pressure 23.2% / 38.0% at even / +1 numbers
 * vs NFL 12.7 / 14.9, protection size 18/63/19 vs NFL 30/48/22. */
export const PRO_CALL = process.env.PRO_CALL !== '0';
/** How far off the ball a defender counts in the call's box (yd). */
const CALL_DEPTH = 3.5;
/** How far outside the linemen's width the call's box reaches (yd). */
const CALL_WIDTH = 3.5;
/** How long a called threat stays his blocker's man without coming (s): a
 * lineman whose man doesn't come helps after a beat. */
const CALL_HOLD = 0.6;

/** The protection call's box count: defenders the offence sees within
 * CALL_DEPTH of the line, inside the linemen's width +-CALL_WIDTH, at the snap. */
export function boxThreats(sim: PlaySim): Agent[] {
  const ys = sim.offense.filter(isOL).map((o) => o.pos.y);
  if (!ys.length) return [];
  const lo = Math.min(...ys) - CALL_WIDTH, hi = Math.max(...ys) + CALL_WIDTH;
  return sim.defense.filter((d) => (sim.snapX[d.idx] ?? d.pos.x) < sim.los + CALL_DEPTH && d.pos.y >= lo && d.pos.y <= hi);
}
/** How far deeper than an upfield edge rusher's present depth the kick keeps the tackle (yd). */
const KICK_LEAD = 0.8;
/** How far ahead on his present velocity the kick reads the rusher's width (s). */
const KICK_LOOK = 0.4;

/**
 * Where a blocker meets a rusher on his path: the earliest point on it
 * (shaded to the rusher's QB side) the blocker can reach first, within the
 * next second. The path is an arc, not his current heading: a rusher who
 * starts upfield and wide bends back toward the QB (about 1.2 rad/s), so a
 * tackle who extrapolated the heading would set wide while the rusher turned
 * the corner behind him. Kick-slide speed limits the blocker (he moves facing
 * the rusher, not sprinting). Null when the rusher can't be cut off.
 */
function cutOffPoint(b: Agent, r: Agent, qb: Vec2, contact: number): Vec2 | null {
  const vmax = b.profile.vmax * 0.75;
  const step = 0.05;
  const bend = 1.2 * step;
  let p = { ...r.pos };
  let rSpeed = Math.max(2, Math.hypot(r.vel.x, r.vel.y));
  let heading = Math.hypot(r.vel.x, r.vel.y) > 0.5 ? Math.atan2(r.vel.y, r.vel.x) : Math.atan2(qb.y - r.pos.y, qb.x - r.pos.x);
  for (let tau = step; tau <= 1.0 + 1e-9; tau += step) {
    const want = Math.atan2(qb.y - p.y, qb.x - p.x);
    let turn = want - heading;
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn < -Math.PI) turn += 2 * Math.PI;
    heading += clamp(turn, -bend, bend);
    rSpeed = Math.min(r.profile.vmax * 0.95, rSpeed + 2.5 * step);
    p = { x: p.x + Math.cos(heading) * rSpeed * step, y: p.y + Math.sin(heading) * rSpeed * step };
    const toQB = norm(sub(qb, p));
    const inside = { x: p.x + toQB.x * contact * 0.6, y: p.y + toQB.y * contact * 0.6 };
    const d = Math.max(0, Math.hypot(inside.x - b.pos.x, inside.y - b.pos.y) - 0.2);
    const speed = Math.hypot(b.vel.x, b.vel.y);
    // Time to cover d from the current speed under the sprint model (rough).
    const tReach = d / Math.max(0.5, Math.min(vmax, speed + (vmax - speed) * 0.5)) + 0.05;
    if (tReach <= tau) return inside;
  }
  return null;
}

/**
 * Play-action protection: the interior shows run for the first moments (fire
 * out low instead of setting), the cue that holds linebackers; the tackles
 * still kick to protect the edges.
 */
function runLook(a: Agent, sim: PlaySim): boolean {
  const interior = a.slot === 'LG' || a.slot === 'C' || a.slot === 'RG';
  // PUNCH: the look ends on contact, depth, his man's declared rush or his patience (pa-look.ts), not a clock.
  if (PUNCH) return interior && a.stance === 'low';
  return interior && sim.t < 0.35 && sim.offCall.kind === 'pass' && !!sim.offCall.pass?.fake;
}

// ------------------------------------------------------------- run blocking

export type RunBlockKind = 'drive' | 'reach' | 'down' | 'combo' | 'climb' | 'pull' | 'cutoff' | 'lead' | 'stalk' | 'draw';
const RESERVED_RUN_KINDS = new Set<RunBlockKind>(['pull', 'lead', 'stalk', 'draw']);

export interface CombinationProposal {
  t: number;
  climber: Agent;
  keeper: Agent;
  engagement: Engagement;
  hands: HandJoint;
  phi: number;
  cost: number;
  /** The reader's first achievable step off the double, not a promised block. */
  departure?: { exit: Vec2 | null; flow: Vec2; backer: Perceived };
}

export interface CombinationRead {
  nextRead: number;
  secureSince: number;
  /** Scheduled attention attempt; physical ineligibility can prevent visual reads. */
  readAt: number;
  proposal: CombinationProposal | null;
}

export interface Combination {
  members: [Agent, Agent];
  defender: Agent;
  backer: Agent | null;
  released: boolean;
  /** Legacy unjoined scheduling only; joined members use their own reads. */
  secureSince: number;
  /** Legacy unjoined scheduling only; joined members use their own reads. */
  nextRead: number;
  /** Independent confirmations and current-tick self-proposals, by member. */
  reads?: [CombinationRead, CombinationRead];
  /** Installed covered-player technique; either member may become keeper. */
  soloKind?: RunBlockKind;
  /** Optional check/post work is an installation, not a weaker double team. */
  helpPolicy?: { kind: 'check'; homeY: number; side: number };
  /** Stability read only by the original uncovered check player. */
  checkSince?: number;
  /** The helper's optional look cannot retime the joined double team's read. */
  checkNextRead?: number;
  /** ZONE_SCOOP: the helper runs his play-side track past the man and takes
   * him only if the man comes across his face. */
  scoop?: boolean;
}

export interface RunBlockPlan {
  kind: RunBlockKind;
  /** Installed initial presentation, independent of later combo/climb work.
   * Draw's one-second motor phase is authored technique, not a visual read. */
  presentation?: 'draw';
  target: Agent | null;
  climbTo?: Agent | null;
  drive: Vec2;
  pullPath?: Vec2[];
  /** Pullers: 'kick' the end man or 'lead' to a linebacker. */
  pullRole?: 'kick' | 'lead' | 'trap';
  /** Explicit GH installation: first guard/end relationship known at the snap. */
  pullSurface?: { blocker: Agent; defender: Agent };
  /** This exact installed perimeter defender uses a moving near-surface stalk. */
  perimeterStalk?: Agent;
  /** This exact installed inside defender needs an attainable ordinary strike. */
  insideStalk?: Agent;
  combination?: Combination;
  /** A solo cutoff's installed shoulder belongs to this exact down threat. */
  contactFit?: RunContactSurface & { target: Agent };
  /** FB_PLAYSIDE: a stretch lead's landmark (outside the end of the line):
   * he runs the track to it and takes the first man to show in that lane. */
  leadLane?: Vec2;
  /** WING_CALL arc: the man over him he releases around (outside) first. */
  arcAround?: Agent;
  /** The old surface must be cleared before the new linebacker approach. */
  departure?: { defender: Agent; keeper: Agent; backer: Agent };
}

function drawPresentation(plan: RunBlockPlan, t: number): boolean {
  return (plan.presentation === 'draw' || plan.kind === 'draw') && t < 1.0;
}

/** The uncovered man of a draw double sells pass only until the rush
 * commits: once he sees the doubled man on his partner, the show has done
 * its work and he goes to help and climb. His own delayed picture only. */
function rushOnPartner(a: Agent, sim: PlaySim, combo: Combination): boolean {
  const partner = combo.members.find((m) => m !== a);
  if (!partner) return false;
  const man = sim.see(a, combo.defender), mate = sim.see(a, partner);
  const reach = partner.profile.radius + combo.defender.profile.radius + partner.player.measurables.armIn / 36;
  // Lined up over his partner he is already within arm's length; the rush
  // has committed once he has come across the line into the set.
  const across = (sim.los - man.pos.x) * sim.attackDir(a.team) > 0;
  return man.pose === 'up' && across && Math.hypot(man.pos.x - mate.pos.x, man.pos.y - mate.pos.y) <= reach;
}

function classify(sim: PlaySim): { dl: Agent[]; lb: Agent[]; db: Agent[] } {
  const dl: Agent[] = [];
  const lb: Agent[] = [];
  const db: Agent[] = [];
  for (const d of sim.defense) {
    const dx = d.pos.x - sim.los;
    const dy = Math.abs(d.pos.y - sim.ballY);
    if (dx < 2.0 && dy < 9) dl.push(d);
    else if (dx < 7.5 && dy < 8) lb.push(d);
    else db.push(d);
  }
  return { dl, lb, db };
}

export function playSideSign(sim: PlaySim, concept: RunConcept): number {
  return concept.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
}

/** Maximize accounted-for down threats before minimizing lateral travel.
 * At most seven inline blockers: a small mask search avoids a greedy tackle
 * stealing a shaded guard's man and leaving the wide end without an owner.
 */
function zoneOwnership(line: Agent[], down: Agent[], reachLimit?:number, extra?: (b: Agent, d: Agent) => number, ends?: Set<Agent>, gapSide = 0): Map<Agent, Agent> {
  type Choice = { missed: number; distance: number; targets: Map<Agent, Agent> };
  let choices = new Map<number, Choice>([[0, { missed: 0, distance: 0, targets: new Map() }]]);
  const better = (a: Choice, b?: Choice) => !b || a.missed < b.missed || (a.missed === b.missed && a.distance < b.distance);
  for (const d of down) {
    const next = new Map<number, Choice>();
    const keep = (mask: number, choice: Choice) => { if (better(choice, next.get(mask))) next.set(mask, choice); };
    for (const [mask, choice] of choices) {
      keep(mask, { ...choice, missed: choice.missed + 1 });
      for (let i = 0; i < line.length; i++) {
        if (mask & (1 << i)) continue;
        const b = line[i];
        const distance = Math.abs(d.pos.y - b.pos.y);
        if (distance >= (reachLimit ?? ((ends ? ends.has(b) : i === 0 || i === line.length - 1) ? 4.5 : 2.2))) continue;
        const targets = new Map(choice.targets);
        targets.set(b, d);
        // ZONE_GAP: his responsibility is his play-side gap, half a split
        // play side of him; a man on his backside shoulder is in the gap of
        // the teammate on that side.
        const owed = gapSide ? Math.abs(d.pos.y - (b.pos.y + gapSide * ZONE_GAP_SHIFT)) : distance;
        keep(mask | (1 << i), { missed: choice.missed, distance: choice.distance + owed + (extra?.(b, d) ?? 0), targets });
      }
    }
    choices = next;
  }
  let best: Choice | undefined;
  for (const choice of choices.values()) if (better(choice, best)) best = choice;
  return best?.targets ?? new Map();
}

/** BACKSIDE_COMBO (default off): on zone runs the backside end outside the
 * backside tackle is left alone; the tackle doubles the backside guard's man
 * and the guard climbs to the backside backer nobody else has. The installed
 * plan cut off that end and left the guard solo: covered backside guards got
 * within 1.5 yd of a backer by 2.5 s on 9-14% of snaps (tracked 47-48%). */
export const BACKSIDE_COMBO = process.env.BACKSIDE_COMBO !== '0';
/** BACKSIDE_SWAP (off): BACKSIDE_COMBO's guard takes the backside backer even
 * when a play-side double was to climb to him; the double climbs to the next
 * free backer nearest its man, or stays on him. With an uncovered backside
 * tackle and a solo-blocked backside guard, the installed rule found no free
 * backer and left the tackle a solo cutoff on an end 2-3.5 yd outside him
 * (run-ref-12: first touch nobody by 2.0 s 59% IZ / 71% OZ). 2022 zone runs
 * against that front: end 7-10%, inside man 35%, backer 28-38%, nobody 17-30%.
 * Stretch calls only, and only when the double has another free backer: on
 * inside zone the swap alone cost -0.21 yd (SE 0.08) on the fixed runs, and
 * a double left without a climber cost the play side. */
export const BACKSIDE_SWAP = process.env.BACKSIDE_SWAP !== '0';
/** KEEPER_HIP (off): a zone double member whose half of the shared man is the
 * man's backside half is exempt from REACH_FLAT's flat track and closes to the
 * man's depth on the intercept of that hip. A backside tackle keeping a double
 * on the guard's man (BACKSIDE_SWAP, run-ref-12) sat 0.5-1.1 yd across from
 * his aim but about 1.9 yd short of the man's depth, held flat while gaining
 * width: 1.62-1.67 yd from the man 0.9-1.8 s, up 0.2-0.6 yd; tracked
 * uncovered backside tackles touch the inside man 35% (end 2-3.5 yd out). */
export const KEEPER_HIP = process.env.KEEPER_HIP !== '0';
/** DOUBLE_HANDOFF (default off): a double-team keeper whose hands are on the
 * man within working reach plus 0.35 yd counts as able to take him over,
 * loaded or not, and as the man's keeper whether or not he is the engagement's
 * primary blocker. On moving (stretch) doubles the installed check flickered
 * (keeper hands 'not touching' on 22% of release reads 0.8-1.5 s), resetting
 * the 0.15 s secure dwell: outside-zone doubles left at 1.50 s (tracked 1.00)
 * and 23% climbed (tracked 52%). */
export const DOUBLE_HANDOFF = process.env.DOUBLE_HANDOFF !== '0';
/** RELEASE_QUICK (default off): with his backer showing (filling or flowing
 * in his own picture), a double member's release read does not wait out the
 * 0.15 s keeper-secure dwell. Outside zone: backer shows at 0.80 s, release
 * 1.35 s, climber off the down man 1.50 s (tracked 1.00 s) from the same
 * spot on the man as tracked climbers. */
export const RELEASE_QUICK = process.env.RELEASE_QUICK !== '0';

/** ZONE_GAP (default off): zone ownership charges each lineman his distance
 * from his play-side gap (half a split, 0.75 yd, play side of him), not from
 * his body, so a down man on his backside shoulder is his backside teammate's
 * (the man is in that teammate's play-side gap) and he works play side or
 * climbs. Tracked 2022 outside zone: with the nearest down man shaded to his
 * backside the centre leaves him 71% of snaps, the backside guard 57%, the
 * backside tackle 53% (each 1.7-3.1 yd upfield by 2.5 s); shaded play side or
 * head-up they block him about 90%. Ours left a backside-shaded man 5-22%. */
export const ZONE_GAP = process.env.ZONE_GAP !== '0';
const ZONE_GAP_SHIFT = .75;

/** ZONE_SCOOP (default off): on outside/wide zone a double whose helper is
 * play side of the shared man (the man shaded to the helper's backside, the
 * backside teammate's to reach) gives the helper the check policy inside zone
 * uses: he steps through his play-side gap and climbs unless the man comes
 * across his face. Installed, he engaged that man on 90% of snaps; tracked
 * 2022 backside guards never come within 1 yd of a backside-shaded man on
 * 57% (centres 71%) and are 2-3 yd upfield by 2.5 s. */
export const ZONE_SCOOP = process.env.ZONE_SCOOP !== '0';

/** NO_CROSS (default off): two solo blockers outside the line (tight end,
 * wing, receiver) never cross their assignments: the inside man takes the
 * inside defender. The backside end dropped by BACKSIDE_COMBO went to the
 * wing outside the tight end while the tight end took the man outside him. */
export const NO_CROSS = process.env.NO_CROSS !== '0';
/** ZONE_ONBALL (default off): zone ownership counts only men on the ball
 * (no more than 1.1 yd deep, the same line the gap call uses for a press
 * defender) as down threats. A nickel standing on the line 1.4 yd off the
 * ball over a wing was counted as a fifth down lineman: to account for him
 * the tight end took him and the tackle took the end 2.2 yd outside, whom
 * the backside double then dropped, leaving the end unblocked (s29-38). */
export const ZONE_ONBALL = process.env.ZONE_ONBALL !== '0';
/** ZONE_MUG (default off): a box backer walked up within 3 yd of the ball,
 * inside the surface, is part of the front for zone ownership: the man whose
 * gap he stands in blocks him at the line rather than leaving him to a
 * climber. Tracked uncovered linemen facing a backer under 3.5 yd touch him
 * 72% (inside zone) / 62% (outside) by 1.5 s; with walked-up backers in the
 * sim, 64% of them were untouched by anyone by 1.5 s. A backer stacked behind
 * a down man (within 1 yd of him laterally) stays a second-level man: tracked
 * blockers take those first only 28-33% of the time, gap mugs 77-87%. */
export const ZONE_MUG = process.env.ZONE_MUG !== '0';
/** CLIMB_RUNNER_SIDE (default off): a climber fits his backer on the side
 * between the backer and the runner as he sees him, not always the called
 * play side; on a cutback the play-side fit walled the backer into the
 * runner's new lane and the climber ran past him (s29-38 centre). */
export const CLIMB_RUNNER_SIDE = process.env.CLIMB_RUNNER_SIDE !== '0';
/** ZONE_WINGS (default off): a wing at the end of the line (off it, within
 * 2 yd outside the last man and no more than 1 yd deeper) is a line member
 * for zone covered/uncovered ownership, and ownership weighs the physical
 * matchup as well as alignment (a man much heavier than his blocker costs
 * as if he stood farther away: 8 yd per unit of mass ratio over 1). The
 * ordinary rules then decide the rest: a covered wing blocks the end over
 * him and the uncovered tight end helps and climbs; a receiver too light for
 * the end is uncovered, chips the end with the tackle and comes off, and the
 * release reads never leave him as the keeper. Replaces two special cases. */
export const ZONE_WINGS = process.env.ZONE_WINGS !== '0';
/** BLOCKER_NEXT (default off): a climber or lead whose man is gone (down,
 * or blocked by a teammate) looks for the next threat in the runner's lane
 * once the runner has the ball, not his own pre-snap lane, and with no work
 * in sight leads that lane upfield instead of stepping back to a spot 3 yd
 * in front of the runner (s19-105: the centre stood over a fallen backer,
 * then walked back toward the line). */
export const BLOCKER_NEXT = process.env.BLOCKER_NEXT !== '0';
/** WING_CALL (default off): when a down man lines up over a wing beside the
 * end of the line (laterally nearer the wing by 0.3 yd or more), the call
 * names the wing's technique for that snap, in the tracked mix by side
 * (2022 zone runs, same operator, wingnfl.py). Play side: the end takes him
 * and the wing arcs to the next man (TE wing 55%, receiver 70%), the wing
 * takes him and the end climbs (15% / 8%), or both double him and one comes
 * off by the ordinary release reads (the rest). Backside, where the end has
 * his own inside man: the wing cuts the man over him off (50% / 48%) or
 * leaves him and climbs to the backside backer. An arcing wing releases flat and wide (about
 * 1.5 yd off the man) before he climbs. The pick is a hash of the players and the
 * ball spot, not a draw from the play's stream. A keeper under 85% of the
 * man's mass never stays on him in the double. Our wings ended on the man
 * 84% of the time (tracked receiver wings 37%). */
export const WING_CALL = process.env.WING_CALL !== '0';
/** WING_WORK (default off; with WING_CALL): a play-side wing's arc goes to a
 * box or alley defender (within 6 yd of the line), not a deep corner or
 * safety. With none unclaimed he doubles the man with the end instead, and
 * the pair's release reads send one of them on to the nearest box backer
 * (s7-8: the H arced 12 yd wide to a corner 8 yd deep while both backers
 * belonged to interior climbers who never reached them). */
export const WING_WORK = process.env.WING_WORK !== '0';
/** LEVEL2_TIME (default off): the zone's second-level assignment goes by who
 * gets there first, and wings beside the end of the line take part. Each
 * worker's cost to a backer is his start (a double's climber leaves at about
 * 0.9 s, the tracked leave; a lone climber or a wing at once) plus his run to
 * the backer at three quarters of his top speed; the assignment still never
 * crosses and leaves as few backers as it can. The wing call then plays its
 * technique toward the wing's backer. Tracked outside zone toward a wing with
 * a man over him (same operator): the wing blocks nobody 4% (ours 34%) and
 * the play-side backer goes unblocked 25% (ours 54%); the wing and the end
 * take him 37% (ours 21%). */
export const LEVEL2_TIME = process.env.LEVEL2_TIME !== '0';
function snapHash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const c of parts.join('|')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
/** FB_PLAYSIDE (default off): on stretch runs the lead fullback takes the
 * first free play-side defender in the core, or none (he reads his lane),
 * never a free man across the formation (he led to the backside corner). */
export const FB_PLAYSIDE = process.env.FB_PLAYSIDE !== '0';

/** DOUBLE_FLOW (default off): a double member does not hand the down man
 * to his partner while, in his own picture, the man is moving away from the
 * partner toward the climber's side (over 0.5 yd/s laterally): the partner
 * would be chasing him from behind (felt through the climber's hands on the
 * man in a joined double). The man's flow decides who climbs: he
 * works play side, the play-side man keeps him and the backside man climbs.
 * The installed check read only the keeper's chest and hands: the guard left
 * a 3-technique flowing play side to the centre behind him. On stretch runs
 * the man may be handed to a keeper level with him (the backside overtake):
 * only a keeper trailing his flow by more than 0.45 yd blocks the release. */
export const DOUBLE_FLOW = process.env.DOUBLE_FLOW !== '0';

/** CLIMB_RIP (default off): a climber leaving a double rips past the down
 * man's hip on his own side (the side away from his keeper): upfield along
 * the man until he is past his front, then the ordinary climb. The installed
 * departure kept only the sideways part of a request that ran through the
 * released man, rescaled to full speed; with the backer straight past the
 * man its sign flipped tick to tick and the climber stood beside him (s11-45
 * guards ~0.5 yd/s for 0.8 s after the climb), or a detour around the
 * bodies took him backward (s9-88 LG). */
export const CLIMB_RIP = process.env.CLIMB_RIP !== '0';
/** CLIMB_SLIDE (default off): a climber still touching the man he left slides
 * along him: his request loses only what points into the man relative to the
 * man's own motion, at the same speed. The rip took him straight at a spot past
 * a man flowing beside him at his own speed (s9-113 RT: 1.5-2.4 s glued
 * 0.64 yd from the 3-technique, both running 2.5 yd/s laterally); a body
 * cannot be walked through. Tracked play-side climbers are 1.4 yd from the
 * man 0.5 s into the climb; ours 0.75. */
export const CLIMB_SLIDE = process.env.CLIMB_SLIDE !== '0';
/** CUTOFF_RACE (default off): on a stretch call a solo cutoff is the backside
 * reach: the engaged reach footwork (REACH_TECHNIQUE, REACH_RACE) races for
 * the man's play-side shoulder instead of mirroring him. Tracked 2022 outside
 * zone backside guards/tackles are 2.0 / 3.7 yd play side of their snap spot
 * at 1.0 / 1.5 s; ours 0.6 / 1.2 (1.9 with the racing line), so the backside
 * man's vacated spot never opened (backside DL >= 1 yd in the backfield at
 * 1.5 s: tracked 17%, ours 1%). */
export const CUTOFF_RACE = process.env.CUTOFF_RACE !== '0';

/** A zone climber does not take a backer more than three gaps (4.5 yd)
 * from him across the formation. */
const ZONE_BACKER_REACH = 4.5;

/** The second back: the back lined up in the backfield beside the RB (a
 * fullback, or in split-back sets a tight end, receiver or second RB). */
function secondBack(sim: PlaySim): Agent | undefined {
  const slot = sim.offAlign.numbering.B2;
  return slot ? sim.slot(slot) : undefined;
}

export function planRunBlocking(sim: PlaySim, concept: RunConcept): Map<Agent, RunBlockPlan> {
  if (concept.pullers.includes('H') && concept.scheme !== 'counter')
    throw new Error('The off-ball H pull tag is installed only for Counter GH');
  const plans = new Map<Agent, RunBlockPlan>();
  const ps = playSideSign(sim, concept);
  const { dl, lb, db } = classify(sim);
  const by = sim.ballY;
  const rel = (a: Agent) => (a.pos.y - by) * ps; // + = playside
  // A core slicer sets within two yards outside the surface; a fixed 6 yd
  // missed a wing set outside an inline end at the wider line splits (5.9 yd,
  // 6.2 after an across motion), which the play caller installs.
  const surface = Math.max(Math.abs(sim.offAlign.coreEdge.S - by), Math.abs(sim.offAlign.coreEdge.W - by));
  const slicer = concept.scheme === 'splitZone' ? sim.offense.find((a) => (a.player.position === 'TE' || a.player.position === 'FB' || a === secondBack(sim))
    && !sim.offAlign.spots[a.slot]?.inline && Math.abs(a.pos.y-by) < Math.max(6, surface + 2) && a.pos.x < sim.los-.9) : null;
  if (concept.scheme === 'splitZone' && !slicer) throw new Error('Split zone requires a core off-ball TE or FB, or a second back');
  const sliceEnd = slicer ? dl.filter((d) => rel(d)<0).sort((a,b) => rel(a)-rel(b))[0] : null;
  const line = sim.offense.filter((a) => a !== slicer && (isOL(a) || (sim.offAlign.spots[a.slot]?.inline ?? false)));
  line.sort((p, q) => rel(q) - rel(p));
  const claimedDL = new Set<Agent>();
  const claimedLB = new Set<Agent>();
  const lbNear = (y: number, preferBackside = false, reach = Infinity): Agent | null => {
    let best: Agent | null = null;
    let bd = Infinity;
    for (const l of lb) {
      if (claimedLB.has(l) || Math.abs(l.pos.y - y) > reach) continue;
      let d = Math.abs(l.pos.y - y);
      if (preferBackside && (l.pos.y - y) * ps > 0) d += 1.5;
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    if (best) claimedLB.add(best);
    return best;
  };
  const up = (lat: number) => norm({ x: 1, y: lat });
  const combo = (b: Agent, partner: Agent, target: Agent, backer: Agent | null, drive: Vec2) => {
    const combination: Combination = { members: [partner, b], defender: target, backer, released: false, secureSince: -1, nextRead: 0,
      soloKind: plans.get(partner)!.kind };
    // ZONE_SCOOP: on a stretch call the helper play side of the shared man
    // (a man shaded to his backside, his backside teammate's to reach) only
    // checks him on the way to his backer: he stays if the man crosses his face.
    const scoop = ZONE_SCOOP && (concept.scheme === 'outsideZone' || concept.scheme === 'wideZone') && (b.pos.y - target.pos.y) * ps > 0;
    if (concept.scheme === 'insideZone' || concept.scheme === 'splitZone' || scoop)
      combination.helpPolicy = { kind: 'check', homeY: b.pos.y, side: Math.sign(b.pos.y - partner.pos.y) };
    if (scoop) combination.scoop = true;
    plans.get(partner)!.combination = combination;
    plans.set(b, { kind: 'combo', target, climbTo: backer, drive, combination });
  };

  const scheme = concept.scheme;
  const zoneLike = scheme === 'insideZone' || scheme === 'outsideZone' || scheme === 'wideZone' || scheme === 'splitZone' || scheme === 'toss' || scheme === 'draw' || scheme === 'qbDraw';

  if (zoneLike) {
    // Covered/uncovered ownership includes either shade and accounts for the
    // whole front before an uncovered blocker is available to help or climb.
    const onBall = (d: Agent) => !ZONE_ONBALL || (d.pos.x - sim.los) * sim.attackDir('O') <= 1.1;
    // ZONE_WINGS: wings at the ends of the line count for ownership.
    const depthO = (o: Agent) => (o.pos.x - sim.los) * sim.attackDir('O');
    const wings = !ZONE_WINGS ? [] : sim.offense.filter((o) => !line.includes(o) && !isOL(o) && o !== sim.qb && o.slot !== 'RB'
      && !(sim.offAlign.spots[o.slot]?.backfield) && depthO(o) > depthO(line[0]) - 1
      && [line[0], line[line.length - 1]].some((e) => Math.sign(o.pos.y - by) === Math.sign(e.pos.y - by)
        && Math.abs(o.pos.y - by) > Math.abs(e.pos.y - by) && Math.abs(o.pos.y - e.pos.y) <= 2.0));
    const zl = [...line, ...wings].sort((p, q) => rel(q) - rel(p));
    const mismatch = (b: Agent, d: Agent) => ZONE_WINGS ? 8 * Math.max(0, d.profile.massKg / b.profile.massKg - 1) : 0;
    const surfaceY = Math.max(...zl.map((o) => Math.abs(o.pos.y - by)));
    // A backer stacked behind a down man is that man's to cover, not a front
    // threat of his own (tracked: blocked first 28-33% vs 77-87% in a gap).
    const front = dl.filter((d) => d !== sliceEnd && onBall(d));
    const mugs = ZONE_MUG ? lb.filter((d) => (d.pos.x - sim.los) * sim.attackDir('O') <= 3.0 && Math.abs(d.pos.y - by) <= surfaceY
      && !front.some((f) => Math.abs(f.pos.y - d.pos.y) <= 1.0)) : [];
    for (const [b, d] of zoneOwnership(zl, [...dl.filter((d) => d !== sliceEnd && onBall(d)), ...mugs], undefined, mismatch,
      new Set([line[0], line[line.length - 1], ...wings]), ZONE_GAP && scheme !== 'draw' && scheme !== 'qbDraw' ? ps : 0)) {
      claimedDL.add(d);
      if (mugs.includes(d)) claimedLB.add(d);
      const reach = scheme === 'outsideZone' || scheme === 'wideZone' || scheme === 'toss';
      plans.set(b, { kind: reach ? 'reach' : 'drive', target: d, drive: up(ps * (scheme === 'wideZone' ? 1.8 : reach ? 1.1 : 0.6)) });
    }
    const pending = zl.filter((b) => !plans.has(b));
    // An uncovered man doubles with the covered man on his play side; the
    // rest climb. The uncovered men count the backers across the front in
    // order: every backer one of them can reach is someone's, the assignments
    // never cross, and among those they keep the shortest total walk from
    // their tracks. Taken one at a time outside-in, the outside double took
    // the Mike over the 3-technique's double and left the backside double the
    // overhang on the far side of the formation. A backer more than three
    // gaps from a climber is not his to take.
    const doubles: Array<{ b: Agent; neighbor: Agent; np: RunBlockPlan }> = [];
    const climbers: Agent[] = [];
    for (const b of pending) {
      const neighbor = line[line.indexOf(b) - 1];
      const np = neighbor ? plans.get(neighbor) : undefined;
      if (np?.target && (np.kind === 'drive' || np.kind === 'reach') && !doubles.some((d) => d.neighbor === neighbor))
        doubles.push({ b, neighbor, np });
      else climbers.push(b);
    }
    // Every uncovered man going to the second level counts: a double's
    // climber aims 1.5 yd play side of himself (inside zone and split zone
    // keep their backside preference), a lone climber 1 yd.
    const insideFirst = scheme === 'insideZone' || scheme === 'splitZone';
    // LEVEL2_TIME: wings set beside either end of the line take part.
    const lineEnds = [line[0], line[line.length - 1]];
    const wingWorkers = LEVEL2_TIME && WING_CALL && scheme !== 'draw' && scheme !== 'qbDraw' ? sim.offense.filter((o) => !plans.has(o) && !zl.includes(o)
      && !isOL(o) && o !== sim.qb && o.slot !== 'RB' && !(sim.offAlign.spots[o.slot]?.backfield)
      && lineEnds.some((e) => { const out = Math.sign(e.pos.y - by) || 1;
        return depthO(o) > depthO(e) - 1.5 && (o.pos.y - e.pos.y) * out > 0 && Math.abs(o.pos.y - e.pos.y) <= 2.2; })) : [];
    const workers = [...doubles.map((d) => ({ b: d.b, double: d, lead: 1.5, inside: insideFirst })),
      ...climbers.map((b) => ({ b, double: null, lead: 1.0, inside: false })),
      ...wingWorkers.map((b) => ({ b, double: null, lead: 1.0, inside: false }))].sort((p, q) => p.b.pos.y - q.b.pos.y);
    const cost = (w: (typeof workers)[number], l: Agent) => {
      const track = w.b.pos.y + ps * w.lead;
      if (LEVEL2_TIME) {
        const start = w.double ? .9 : .3, run = Math.hypot(l.pos.x - w.b.pos.x, l.pos.y - w.b.pos.y) / (.75 * w.b.profile.vmax);
        return start + run + (w.inside && (l.pos.y - track) * ps > 0 ? .3 : 0);
      }
      return Math.abs(l.pos.y - track) + (w.inside && (l.pos.y - track) * ps > 0 ? 1.5 : 0);
    };
    const open = lb.filter((l) => !claimedLB.has(l)).sort((p, q) => p.pos.y - q.pos.y);
    // Order-preserving assignment: fewest workers left without a backer
    // first, then the shortest total distance.
    type Count = { missed: number; total: number; picks: Array<Agent | null> };
    const memo = new Map<string, Count>();
    const assign = (i: number, j: number): Count => {
      if (i === workers.length) return { missed: 0, total: 0, picks: [] };
      const key = `${i}:${j}`, known = memo.get(key);
      if (known) return known;
      const skip = assign(i + 1, j);
      let best: Count = { missed: skip.missed + 1, total: skip.total, picks: [null, ...skip.picks] };
      for (let k = j; k < open.length; k++) {
        if (Math.abs(open[k].pos.y - workers[i].b.pos.y) > ZONE_BACKER_REACH) continue;
        const rest = assign(i + 1, k + 1), total = rest.total + cost(workers[i], open[k]);
        if (rest.missed < best.missed || (rest.missed === best.missed && total < best.total - 1e-9))
          best = { missed: rest.missed, total, picks: [open[k], ...rest.picks] };
      }
      memo.set(key, best);
      return best;
    };
    const counted = assign(0, 0).picks;
    const backerOf = new Map(workers.map((w, k) => [w.b, counted[k]]));
    for (const l of counted) if (l) claimedLB.add(l);
    const wingBacker = new Map(wingWorkers.map((w) => [w, backerOf.get(w) ?? null]));
    for (const { b, neighbor, np } of doubles) combo(b, neighbor, np.target!, backerOf.get(b) ?? null, np.drive);
    for (const b of climbers) plans.set(b, { kind: 'climb', target: backerOf.get(b) ?? null, drive: up(ps * 0.4) });
    // BACKSIDE_COMBO: the backside end outside the tackle is left alone; the
    // tackle doubles the backside guard's man with him and the guard climbs
    // to the backside backer nobody has.
    if (BACKSIDE_COMBO && scheme !== 'draw' && scheme !== 'qbDraw' && scheme !== 'toss') {
      const ol = line.filter((b) => isOL(b));
      const bt = ol[ol.length - 1], bg = ol[ol.length - 2];
      const tp = bt && plans.get(bt), gp = bg && plans.get(bg);
      const end = tp?.target, man = gp?.target;
      if (tp && gp && end && man && !tp.combination && !gp.combination
        && (tp.kind === 'drive' || tp.kind === 'reach') && (gp.kind === 'drive' || gp.kind === 'reach')
        && rel(end) < rel(bt) - .5 && dl.includes(man)) {
        const near = (l: Agent) => rel(l) < rel(bg) + 1.5 && Math.abs(l.pos.y - bg.pos.y) <= ZONE_BACKER_REACH;
        const byGuard = (p: Agent, q: Agent) => Math.abs(p.pos.y - bg.pos.y) - Math.abs(q.pos.y - bg.pos.y);
        let backer = lb.filter((l) => !claimedLB.has(l) && near(l)).sort(byGuard)[0];
        // BACKSIDE_SWAP: with none free, the backside backer a play-side
        // double was to climb to is the guard's; the double climbs to the
        // next free backer nearest its man. Only when it has one: a double
        // left without a climber costs the play side more than the swap buys.
        if (!backer && BACKSIDE_SWAP && (scheme === 'outsideZone' || scheme === 'wideZone')) {
          const owners = (l: Agent) => [...plans.values()].filter((p) => p.target === l || p.climbTo === l || p.combination?.backer === l);
          const nextFor = (c: Combination, taken: Agent) => lb.filter((l) => l !== taken && !claimedLB.has(l) && Math.abs(l.pos.y - c.defender.pos.y) <= ZONE_BACKER_REACH)
            .sort((x, y) => Math.abs(x.pos.y - c.defender.pos.y) - Math.abs(y.pos.y - c.defender.pos.y))[0] ?? null;
          backer = lb.filter((l) => near(l) && owners(l).length > 0 && owners(l).every((p) => p.combination && p.target !== l)
            && new Set(owners(l).map((p) => p.combination!)).size === 1 && !!nextFor(owners(l)[0].combination!, l)).sort(byGuard)[0];
          if (backer) {
            const c = owners(backer)[0].combination!, next = nextFor(c, backer)!;
            claimedLB.add(next);
            c.backer = next;
            for (const q of plans.values()) if (q.combination === c && q.climbTo === backer) q.climbTo = next;
          }
        }
        if (backer) {
          claimedLB.add(backer); claimedDL.delete(end);
          plans.set(bt, { kind: gp.kind, target: man, drive: gp.drive });
          combo(bg, bt, man, backer, gp.drive);
        }
      }
    }
    // Backside end of the line walls off (cutoff).
    const last = line[line.length - 1];
    const lp = plans.get(last);
    if (lp && (lp.kind === 'drive' || lp.kind === 'reach')) lp.kind = 'cutoff';
    if (WING_CALL && scheme !== 'draw' && scheme !== 'qbDraw') {
      const dirO = sim.attackDir('O'), depthOf = (o: Agent) => (o.pos.x - sim.los) * dirO;
      for (const end of [line[0], line[line.length - 1]]) {
        const ep = plans.get(end);
        if (!end || !ep) continue;
        const out = Math.sign(end.pos.y - by) || 1, playSide = rel(end) > 0;
        const wingOf = (man: Agent) => sim.offense.find((o) => o !== end && !plans.has(o) && !isOL(o) && o !== sim.qb && o.slot !== 'RB'
          && !(sim.offAlign.spots[o.slot]?.backfield) && depthOf(o) > depthOf(end) - 1.5 && (o.pos.y - end.pos.y) * out > 0
          && Math.abs(o.pos.y - end.pos.y) <= 2.2 && Math.abs(o.pos.y - man.pos.y) < Math.abs(end.pos.y - man.pos.y) - .3);
        const owned = new Set([...plans.values()].flatMap((p) => [p.target, p.climbTo, p.combination?.backer]));
        const deepest = WING_WORK ? 6 : 8;
        const nextFor = (wing: Agent) => [...dl, ...lb, ...db].filter((d) => !owned.has(d) && depthOf(d) > 1.1 && depthOf(d) < deepest && (d.pos.y - end.pos.y) * out > -1)
          .sort((p, q) => Math.hypot(p.pos.x - wing.pos.x, p.pos.y - wing.pos.y) - Math.hypot(q.pos.x - wing.pos.x, q.pos.y - wing.pos.y))[0] ?? null;
        if (!playSide) {
          // Backside: the end has his own (inside) man; the man over the wing
          // is the wing's to cut off, or the call leaves him (the wing climbs
          // to the backside backer). Tracked backside wings: the wing on him
          // 50% (TE) / 48% (receiver), off him the rest.
          const endHas = !!ep.target && dl.includes(ep.target) && !ep.combination && !!wingOf(ep.target);
          const man = endHas ? ep.target! : dl.filter((d) => !owned.has(d) && depthOf(d) <= 1.1 && (d.pos.y - end.pos.y) * out > -.3)
            .sort((p, q) => Math.abs(p.pos.y - end.pos.y) - Math.abs(q.pos.y - end.pos.y))[0];
          const wing = man && wingOf(man);
          if (!man || !wing) continue;
          const te = wing.player.position === 'TE' || wing.player.position === 'FB';
          const u = snapHash(wing.player.id, man.player.id, end.player.id, sim.los.toFixed(2), sim.ballY.toFixed(2));
          const next = wingBacker.get(wing) ?? nextFor(wing);
          if (u < (te ? .5 : .48) || !next) {
            plans.set(wing, { kind: 'cutoff', target: man, drive: up(ps * 0.4) }); claimedDL.add(man);
            // The end he relieved climbs to the backside backer.
            if (endHas && next) { plans.set(end, { kind: 'climb', target: next, drive: up(ps * 0.4) }); claimedLB.add(next); }
          } else {
            // He leaves the man (to the end, or unblocked): around him, then up.
            plans.set(wing, { kind: 'climb', target: next, drive: up(ps * 0.4), arcAround: man }); claimedLB.add(next);
          }
          continue;
        }
        if (!ep.target || ep.combination || !dl.includes(ep.target)) continue;
        const man = ep.target;
        const wing = wingOf(man);
        if (!wing) continue;
        const next = wingBacker.get(wing) ?? nextFor(wing);
        const te = wing.player.position === 'TE' || wing.player.position === 'FB';
        const u = snapHash(wing.player.id, man.player.id, end.player.id, sim.los.toFixed(2), sim.ballY.toFixed(2));
        // Play side (tracked, same operator): the end on him and the wing
        // elsewhere 51% (TE) / 62% (receiver), the pair on him 26/17%, the
        // wing alone 13/4%.
        const pEnd = te ? .55 : .7, pWing = te ? .15 : .08;
        if (next) claimedLB.add(next);
        if (WING_WORK && !next) {
          // Nobody worth an arc: the pair doubles the man and one comes off
          // to the nearest box backer (claimed or not) by the release reads.
          const near = (p: Agent, q: Agent) => Math.hypot(p.pos.x - wing.pos.x, p.pos.y - wing.pos.y) - Math.hypot(q.pos.x - wing.pos.x, q.pos.y - wing.pos.y);
          // The pair's second-level man is one nobody else has (teammates'
          // calls are known); a claimed backer only when nobody else is near.
          const backer = [...lb, ...db].filter((l) => !owned.has(l) && depthOf(l) > 1.1 && depthOf(l) < 8 && Math.abs(l.pos.y - wing.pos.y) < 6).sort(near)[0]
            ?? lb.filter((l) => depthOf(l) < 6 && Math.abs(l.pos.y - wing.pos.y) < 6).sort(near)[0] ?? null;
          combo(wing, end, man, backer, ep.drive);
        } else if (u < pEnd || !next) {
          // The end takes him; the wing arcs to the next man.
          if (next) plans.set(wing, { kind: 'climb', target: next, drive: up(ps * 0.4), arcAround: man });
        } else if (u < pEnd + pWing) {
          plans.set(wing, { kind: ep.kind, target: man, drive: ep.drive });
          plans.set(end, { kind: 'climb', target: next, drive: up(ps * 0.4) });
        } else combo(wing, end, man, next, ep.drive);
      }
    }
    if (scheme === 'draw' || scheme === 'qbDraw') for (const p of plans.values()) {
      p.presentation = 'draw';
      p.kind = p.kind === 'combo' || p.kind === 'climb' ? p.kind : 'draw';
    }
  } else if (scheme === 'duo') {
    // Duo uses vertical displacement and adjacent doubles to the inside
    // backers. It has no zone-side reach step and no pulling guard.
    for (const [b,d] of zoneOwnership(line,dl)) {
      claimedDL.add(d);
      plans.set(b,{kind:'drive',target:d,drive:up(0)});
    }
    for (const b of line.filter((b) => !plans.has(b))) {
      const partner = line.filter((p) => plans.get(p)?.target && !plans.get(p)?.combination && Math.abs(p.pos.y-b.pos.y)<2)
        .sort((p,q) => Math.abs(plans.get(p)!.target!.pos.y-b.pos.y)-Math.abs(plans.get(q)!.target!.pos.y-b.pos.y))[0];
      if (partner) combo(b,partner,plans.get(partner)!.target!,lbNear(b.pos.y,true),up(0));
      else plans.set(b,{kind:'climb',target:lbNear(b.pos.y),drive:up(0)});
    }
  } else {
    // Gap schemes.
    const guards = line.filter((a) => a.slot === 'LG' || a.slot === 'RG');
    const tackles = line.filter((a) => a.slot === 'LT' || a.slot === 'RT');
    const bsg = guards.find((g) => rel(g) < 0) ?? null;
    const bst = tackles.find((t) => rel(t) < 0) ?? null;
    const pullers = new Set<Agent>();
    if (concept.pullers.includes('BSG') && bsg) pullers.add(bsg);
    if (concept.pullers.includes('BST') && bst) pullers.add(bst);
    const h = sim.slot('H');
    if (concept.pullers.includes('H')) {
      if (scheme !== 'counter' || !h || sim.offAlign.spots.H?.inline || !bsg
        || !pullers.has(bsg) || (bst && pullers.has(bst)) || !sim.offAlign.spots.H || sim.offAlign.spots.H.pos.x > sim.los - 1)
        throw new Error('Counter GH requires a pulling backside guard and one off-ball H; no tackle pull');
      pullers.add(h);
    }
    // GH installs the H's immediate backer before optional double-team jobs.
    // GT retains its existing count; these are separately installed calls.
    const holeTE = ps === sim.offAlign.strongSign ? sim.offAlign.hasTE.S : sim.offAlign.hasTE.W;
    const hole = by + ps * lineOffset(concept.aim === 'A' ? 0.65 : concept.aim === 'B' ? 1.95 : 3.6, holeTE, sim.offAlign.line);
    const hBacker = concept.pullers.includes('H') ? lbNear(hole) : null;
    if (concept.pullers.includes('H') && !hBacker)
      throw new Error('Counter GH requires an installed second-level backer; all-walked-up accounting is not installed');
    const fb = secondBack(sim);
    const fbIsBack = !!fb;
    // Power's lead puller wraps for the first linebacker to show playside,
    // read inside-out; the PST/PSG combo works to the backside backer
    // (spread playbook p. 66). Count his backer before combos and climbs do.
    const leadBacker = scheme === 'power' && fbIsBack && pullers.size
      ? lb.filter((l) => !claimedLB.has(l) && rel(l) > -0.5).sort((p, q) => rel(p) - rel(q))[0] ?? null : null;
    if (leadBacker) claimedLB.add(leadBacker);

    // Reserve precisely the intentionally unblocked trap/kick defender.
    // The old trap rule left every playside lineman for one trapper. Trap is
    // run at the 3-technique; against a playside 1-technique the line makes it
    // a long trap of the next man out (spread playbook p. 62, Browns "log"
    // p. 37). The offense calls before seeing the front, so this is the check.
    // Techniques are read off the guard, not a yard mark: inside the
    // playside guard is the A-gap 1-technique; on or outside him, trapped.
    const psg = line.filter((b) => isOL(b) && rel(b) > 0).sort((p, q) => rel(p) - rel(q))[0];
    const trapReserved = scheme === 'trap' ? dl.filter((d) => rel(d) >= (psg ? rel(psg) : 1.05)).sort((p, q) => rel(p) - rel(q))[0] ?? null : null;
    // The end man on the line is the widest defender on it: a corner or
    // nickel standing off the ball over a split receiver is the receiver's
    // man, not the kick (the call names who kicks before the snap, from the
    // alignment the blockers see, not from where the snap left them).
    const edgeY = ps === sim.offAlign.strongSign ? sim.offAlign.coreEdge.S : sim.offAlign.coreEdge.W;
    const split = sim.offense.filter((o) => !isOL(o) && !(sim.offAlign.spots[o.slot]?.inline ?? false)
      && Math.abs(o.pos.x - sim.los) < 2 && rel(o) > Math.abs(edgeY - by) + 3).map(rel);
    // Down linemen are on the ball; a press defender stands off it (1.3 yd).
    const inCore = (d: Agent) => (d.pos.x - sim.los) * sim.attackDir('O') <= 1.1 || split.every((r) => rel(d) < r - 1);
    const kickReserved = scheme !== 'trap' && pullers.size ? dl.filter((d) => rel(d) > 0 && inCore(d)).sort((p, q) => rel(q) - rel(p))[0] ?? null : null;

    // Account for immediate inside threats first. Outside-in assignment can
    // send the tackle across a guard's covered man and expose the mesh.
    const gapLine = line.filter((b) => !pullers.has(b)).sort((a, b) => Math.abs(rel(a)) - Math.abs(rel(b)));
    const gapPending: Agent[] = [];
    for (const b of gapLine) {
      if (pullers.has(b)) continue;
      const r = rel(b);
      if (r >= -0.2) {
        const coverPull = b.slot === 'C' && bsg && pullers.has(bsg)
          ? dl.filter((d) => !claimedDL.has(d) && d !== trapReserved && d !== kickReserved && rel(d)<.2 && Math.abs(d.pos.y - bsg.pos.y) < 2.3)
            .sort((p, q) => Math.abs(p.pos.y - bsg.pos.y) - Math.abs(q.pos.y - bsg.pos.y))[0]
          : undefined;
        const cand = dl
          .filter((d) => !claimedDL.has(d) && d !== trapReserved && d !== kickReserved)
          .filter((d) => {
            const off = (d.pos.y - b.pos.y) * ps;
            return off > -2.0 && off < 0.6;
          })
          .sort((p, q) => rel(p) - rel(q));
        // Trap: leave the first DL past the center on the playside for the trapper.
        const d = coverPull ?? cand[cand.length - 1] ?? cand[0];
        if (d) {
          claimedDL.add(d);
          plans.set(b, { kind: 'down', target: d, drive: up(-ps * 1.0) });
        } else {
          gapPending.push(b);
        }
      } else {
        // Backside: hinge/cutoff. The playside gap the pullers vacated comes
        // first; the man outside only when that gap is empty (Browns "post
        // hinge", p. 33: inside B gap to outside C gap).
        const open = dl.filter((d) => !claimedDL.has(d) && d !== trapReserved && d !== kickReserved);
        const inGap = open.filter((d) => (d.pos.y - b.pos.y) * ps > 0.3 && (d.pos.y - b.pos.y) * ps < 1.3);
        const cand = (inGap.length ? inGap : open).sort((p, q) => Math.abs(p.pos.y - b.pos.y) - Math.abs(q.pos.y - b.pos.y));
        const d = cand[0] && Math.abs(cand[0].pos.y - b.pos.y) < 2.5 ? cand[0] : null;
        if (d) claimedDL.add(d);
        if (d) plans.set(b, { kind: 'cutoff', target: d, drive: up(ps * 0.8) });
        else gapPending.push(b);
      }
    }
    // A widened odd/reduced front can put an on-man outside the down-block
    // window. Account for that nearby body before assigning a spare double.
    for(const [b,d] of zoneOwnership(gapPending,dl.filter((d)=>!claimedDL.has(d)&&d!==trapReserved&&d!==kickReserved),2.6)) {
      claimedDL.add(d);
      plans.set(b,{kind:rel(b)<0?'cutoff':'down',target:d,drive:up(rel(b)<0 ? ps*.8 : -ps)});
    }
    for (const b of gapPending.filter((b)=>!plans.has(b))) {
      // With the trapped man over him the PST releases inside, never
      // across the trap (spread playbook p. 62).
      const trapOver = trapReserved && rel(b) > 0 && Math.abs((trapReserved.pos.y - b.pos.y) * ps - 0.45) < 0.85;
      const partners = gapLine.filter((p) => p !== b && plans.get(p)?.target && !plans.get(p)?.combination && Math.abs(p.pos.y - b.pos.y) < 2.0
        && !(trapOver && rel(plans.get(p)!.target!) > rel(b)))
        .sort((p, q) => Math.abs(plans.get(p)!.target!.pos.y - b.pos.y) - Math.abs(plans.get(q)!.target!.pos.y - b.pos.y));
      const partner = partners[0];
      const target = partner ? plans.get(partner)!.target : null;
      if (partner && target && Math.abs(target.pos.y - b.pos.y) < 2.5) {
        // With the playside backer counted for the puller, the double works
        // to the backside box backer; with none left it stays a double.
        combo(b, partner, target, leadBacker ? lbNear(by - ps, true, 3.0) : lbNear(b.pos.y - ps * 0.5, true), plans.get(partner)!.drive);
      } else plans.set(b, { kind: 'climb', target: lbNear(b.pos.y - ps * 1.0, true), drive: up(-ps * 0.5) });
    }
    // End man on the line on the playside (kick-out target).
    const emlos = kickReserved ?? dl.filter((d) => !claimedDL.has(d) && rel(d) > 0 && inCore(d)).sort((p, q) => rel(q) - rel(p))[0] ?? null;
    const trapTarget = trapReserved;
    // The pull step opens to the play side and gains depth on the way,
    // rather than dropping straight back first (docs/reviews/gait-step.md).
    const pullStep = ps * 0.9;
    // The flat leg runs tight behind the down wall: a short step back off his
    // own stance (NFL pullers are deepest 1.3-1.4 yd off the ball). Where the
    // wall's bodies he sees need more room, the run phase takes it from them.
    const behind = (b: Agent, depth: number) => Math.min(b.pos.x - depth, sim.los - lineDepth(.55));
    const pullPath = (b: Agent): Vec2[] => [
      { x: behind(b, .45), y: b.pos.y + pullStep },
      { x: behind(b, .35), y: hole - ps * 0.5 },
      { x: sim.los + 0.5, y: hole },
    ];
    for (const p of pullers) {
      let role: 'kick' | 'lead' | 'trap';
      if (scheme === 'trap') role = 'trap';
      else if (scheme === 'counter') role = p === bsg ? 'kick' : 'lead';
      else role = fbIsBack ? 'lead' : 'kick';
      const target = role === 'trap' ? trapTarget : role === 'kick' ? emlos : p === h && concept.pullers.includes('H') ? hBacker : leadBacker ?? lbNear(hole);
      if (target && role !== 'lead') claimedDL.add(target);
      const path = target && role !== 'lead' ? [
        // A trapper already runs at NFL depth off his installed corners.
        { x: role === 'trap' ? sim.los - lineDepth(1.05) : behind(p, .45), y: p.pos.y + pullStep },
        { x: role === 'trap' ? sim.los - lineDepth(0.85) : behind(p, .35), y: target.pos.y - ps * 0.65 },
        { x: sim.los - 0.1, y: target.pos.y - ps * 0.45 },
      ] : pullPath(p);
      // An off-ball wrapper already has his entry depth. Do not make him
      // step toward the line before crossing behind the down wall.
      if (p === h && concept.pullers.includes('H')) {
        path[0].x = Math.min(path[0].x, p.pos.x);
        path[1].x = Math.min(path[1].x, p.pos.x);
      }
      plans.set(p, { kind: 'pull', pullRole: role, target, drive: role === 'kick' ? norm({ x: 0.3, y: ps }) : role === 'trap' ? norm({ x: 0.4, y: ps }) : up(0), pullPath: path });
      if (p === h && concept.pullers.includes('H') && bsg && emlos) plans.get(p)!.pullSurface = { blocker: bsg, defender: emlos };
    }
    if (fb && fbIsBack && concept.scheme === 'power' && emlos && !claimedDL.has(emlos)) {
      plans.set(fb, { kind: 'lead', pullRole:'kick', target: emlos, drive: norm({ x: 0.3, y: ps }) });
      claimedDL.add(emlos);
    }
  }

  if (slicer && sliceEnd) {
    plans.set(slicer,{kind:'pull',target:sliceEnd,pullRole:'kick',drive:norm({x:.3,y:-ps}),
      pullPath:[{x:sim.los-1.4,y:slicer.pos.y},{x:sim.los-1.3,y:sliceEnd.pos.y+ps*.65}]});
  }

  // The second back's lead (zone/iso) and receivers stalking.
  const fb = secondBack(sim);
  if (fb && !plans.has(fb)) {
    // With every backer owned, the lead takes the most dangerous free box
    // defender, nearest the mesh; on counter and trap, the backside one the
    // pullers vacated first.
    // Nearest the mesh counts depth: a safety walked down outside the end is
    // farther from it than the edge on the line. The lead's backer is one
    // inside the surface; a box safety outside it is a perimeter blocker's.
    const owned = new Set([...plans.values()].flatMap((p) => [p.target, p.climbTo, p.combination?.backer]));
    const backsideFirst = scheme === 'counter' || scheme === 'trap';
    const fromMesh = (d: Agent) => Math.hypot(d.pos.x - sim.los, rel(d));
    const stretch = scheme === 'outsideZone' || scheme === 'wideZone' || scheme === 'toss';
    const coreW = Math.max(...line.map(rel)) + 3;
    const free = [...dl, ...lb].filter((d) => !owned.has(d) && !(FB_PLAYSIDE && stretch && (rel(d) < -.5 || rel(d) > coreW)))
      .sort((p, q) => (backsideFirst ? Number(rel(p) >= 0) - Number(rel(q) >= 0) : 0) || fromMesh(p) - fromMesh(q));
    const surface = line.map(rel), inside = (d: Agent) => rel(d) >= Math.min(...surface) - .5 && rel(d) <= Math.max(...surface) + .5;
    const backer = lbNear(by + ps * 1.5);
    if (FB_PLAYSIDE && stretch) {
      // Lead the stretch: run the play-side track just ahead of the back to
      // the landmark outside the end of the line, and block the first threat
      // to show there (the lead-puller read), not a man named at the snap.
      if (backer) claimedLB.delete(backer);
      const edge = by + ps * (Math.max(...line.map(rel)) + 2.5); // tracked leads are 5 yd wide at 1.5 s, 7 at 2.0
      plans.set(fb, { kind: 'lead', target: null, drive: up(0), leadLane: { x: sim.los + 0.5 * sim.attackDir('O'), y: edge } });
    } else
    plans.set(fb, { kind: 'lead', target: (backer && inside(backer) ? backer : null) ?? free[0] ?? null, drive: up(0) });
  }
  const stalkers = sim.offense.filter((a) => !plans.has(a) && a !== sim.qb && a.slot !== 'RB' && a !== fb);
  const near = (a: Agent, d: Agent) => Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
  // Alignment class is not ownership: shallow press/apex bodies can be in dl
  // without an inline job. Keep actual current/future assignments reserved,
  // including the explicitly installed GH H/backer, before restoring free dl.
  const reserved = new Set<Agent>();
  for (const p of plans.values()) {
    if (p.target) reserved.add(p.target);
    if (p.climbTo) reserved.add(p.climbTo);
    if (p.combination?.backer) reserved.add(p.combination.backer);
  }
  // Who a receiver can block follows where the defender stands relative to
  // him and to the line, not the defender's position label. He stalks the
  // deep secondary, or any man in front of him within a backer's reach: a
  // pressed corner, an apex nickel, a walked-down safety, or a backer split
  // out over him. A man on the line aligned on the surface rather than on a
  // receiver is the front's, and only a receiver aligned in the core (no
  // more than two yards outside the surface: a wing, a nub or a tight
  // bunch) walls him, in reach. A man across the formation is not his to
  // reach, and taking him leaves the defender over him free.
  const inCore = (a: Agent) => Math.abs(a.pos.y - by) <= surface + 2;
  const inReach = (a: Agent, d: Agent) => Math.abs(d.pos.y - a.pos.y) <= ZONE_BACKER_REACH;
  const lateral = (d: Agent, group: Agent[]) => Math.min(...group.map((o) => Math.abs(o.pos.y - d.pos.y)));
  const front = (d: Agent) => dl.includes(d) && lateral(d, line) < lateral(d, stalkers);
  const stalkPool = [...db, ...lb, ...dl.filter(d => !reserved.has(d))];
  // Gap runs keep their receiver ledger: the crack on a box defender nobody
  // owns on his side of the ball, at any distance (a loaded Z crack on the
  // trap/odd walked-down SS, who otherwise helps make the tackle), and any
  // off-ball man by closest pairs (a jet-motion Z already moving to the
  // unowned backer across the ball lands him). Only a front man stays the
  // core's. Zone runs take a non-secondary man only in reach.
  const gapCrack = scheme === 'power' || scheme === 'counter' || scheme === 'trap';
  const crack = (a: Agent, d: Agent) => lb.includes(d) && (d.pos.y - by) * (a.pos.y - by) > 0 && (gapCrack || inReach(a, d));
  const eligible = (a: Agent, d: Agent) => gapCrack ? !front(d) || (inCore(a) && inReach(a, d))
    : db.includes(d) || crack(a, d) || (inReach(a, d) && (!front(d) || inCore(a)));
  const stalkTargets = new Map<Agent, Agent | null>();
  if (STALK_CLAIM) {
    // Receivers share one ledger: closest unclaimed pairs first, skipping
    // backers a lineman or lead already owns. Only a receiver left with
    // nobody unclaimed helps on the nearest man.
    const open = stalkPool.filter(d => !reserved.has(d));
    // A box defender nobody owns is claimed before the secondary, by a
    // receiver on his side of the ball: the crack (on a zone run, only one
    // who can reach him). Then the closest pairs.
    // ZONE_ONBALL: an unowned man standing on the line (an overhang the
    // line's ownership left to the perimeter) is first priority too.
    const box = (a: Agent, d: Agent) => crack(a, d) || (ZONE_ONBALL && dl.includes(d) && !reserved.has(d)) ? 0 : 1;
    const pairs = stalkers.flatMap((a) => open.filter((d) => eligible(a, d)).map((d) => ({ a, d, dist: near(a, d), tier: box(a, d) })))
      .sort((p, q) => p.tier - q.tier || p.dist - q.dist);
    const taken = new Set<Agent>();
    for (const { a, d } of pairs) if (!stalkTargets.has(a) && !taken.has(d)) { stalkTargets.set(a, d); taken.add(d); }
  }
  for (const a of stalkers) {
    // Stalk the defensive back over him.
    let best: Agent | null = stalkTargets.get(a) ?? null;
    if (!best) {
      let bd = Infinity;
      for (const d of stalkPool) {
        if (!eligible(a, d)) continue;
        const dd = near(a, d);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
    }
    plans.set(a, { kind: 'stalk', target: best, drive: norm(sub(best?.pos ?? a.pos, { x: a.pos.x - 1, y: a.pos.y })),
      perimeterStalk: best && db.includes(best) ? best : undefined,
      insideStalk: best && lb.includes(best) ? best : undefined });
  }
  if (NO_CROSS) {
    // Solo blocks outside the line keep inside/outside order with each other.
    const solo = [...plans.entries()].filter(([b, p]) => !isOL(b) && p.target && !p.combination
      && (p.kind === 'cutoff' || p.kind === 'stalk' || p.kind === 'reach' || p.kind === 'drive'));
    for (let i = 0; i < solo.length; i++) for (let j = i + 1; j < solo.length; j++) {
      const [a, pa] = solo[i], [b, pb] = solo[j], ta = pa.target!, tb = pb.target!;
      if ((rel(a) - rel(b)) * (rel(ta) - rel(tb)) >= 0 || Math.abs(rel(a) - rel(b)) > 2.5) continue;
      // A man on the line is never traded for a man off it (first level first).
      const lvl = (d: Agent) => (d.pos.x - sim.los) * sim.attackDir('O') <= 1.6;
      if (lvl(ta) !== lvl(tb)) continue;
      if (Math.abs(tb.pos.y - a.pos.y) > 2.5 || Math.abs(ta.pos.y - b.pos.y) > 2.5) continue;
      pa.target = tb; pb.target = ta;
      for (const [o, p] of [[a, pa], [b, pb]] as const) {
        p.perimeterStalk = p.kind === 'stalk' && db.includes(p.target!) ? p.target! : undefined;
        p.insideStalk = p.kind === 'stalk' && lb.includes(p.target!) ? p.target! : undefined;
        if (p.kind === 'stalk') p.drive = norm(sub(p.target!.pos, { x: o.pos.x - 1, y: o.pos.y }));
      }
    }
  }
  // Save the finalized installation, including backside cutoff and Draw's
  // pass-influence conversion, rather than an intermediate owner label.
  for (const p of plans.values()) if (p.combination)
    p.combination.soloKind = plans.get(p.combination.members[0])!.kind;
  for (const [b, p] of plans) {
    // Only a clearly outside solo backside threat calls for this wall. Inside
    // shades, doubles, pullers and Draw retain their original contact frame.
    if (isOL(b) && p.kind === 'cutoff' && p.target && dl.includes(p.target) && !p.combination
      && rel(b) < 0 && (b.pos.y - p.target.pos.y) * ps > b.profile.radius + p.target.profile.radius)
      p.contactFit = { target: p.target, axis: norm({ x: -.3, y: p.drive.y * .6 }), sealTarget: 0 };
  }
  return plans;
}

/** On (STALK_CUSHION=0 for comparison): a receiver stalking a DB breaks down
 * at a stand-off and mirrors him until the DB attacks (downhill over
 * STALK_ATTACK, or inside toward the ball over STALK_ATTACK_IN, yd/s), rather
 * than running full speed to intercept him. Stalk coaching breaks down 2-3 yd
 * off the DB. Tracked receivers on runs are within 1 yd of a DB 9 / 17% of the
 * time at 1.5 / 2.0 s; ours 23 / 45% (out/wrrun.py, dbtempo.py). */
const STALK_CUSHION = process.env.STALK_CUSHION !== '0';
const STALK_STANDOFF = 2, STALK_ATTACK = 1, STALK_ATTACK_IN = 1.5;

/** On (BACK_BLOCK=0 for comparison): a blocker does not start a block on, or
 * drive into, a man whose back is to him once the runner is past that man. A
 * block in the back is a foul every blocker is coached out of, and his hands
 * have no front to fit. Both reads are his own picture (the man's body
 * facing, the runner's position). Develop at #205: 80% of the run blocks
 * started after the ball crossed are from behind the defender's facing, and
 * 61% of linemen are within 1 yd of a blocker when the back reaches 5 yd
 * (NFL 27%; rallybox.py). */
const BACK_BLOCK = process.env.BACK_BLOCK !== '0';

/** The man has turned his back to this blocker to chase a runner already
 * past him. */
function backTurned(a: Agent, sim: PlaySim, target: Agent): boolean {
  const c = sim.carrier;
  if (!BACK_BLOCK || !c || c.team !== a.team || (c === sim.qb && !sim.scrambled)) return false;
  const man = sim.see(a, target), runner = sim.see(a, c), dir = sim.attackDir(a.team);
  if ((runner.pos.x - man.pos.x) * dir <= 0) return false;
  return Math.cos(man.facing) * (a.pos.x - man.pos.x) + Math.sin(man.facing) * (a.pos.y - man.pos.y) < 0;
}

/** Receivers claim distinct stalk targets (STALK_CLAIM=0: each takes his nearest). */
const STALK_CLAIM = process.env.STALK_CLAIM !== '0';

/** Climb when the backer shows flow or will arrive shortly (FLOW_RELEASE=0: proximity only). */
const FLOW_RELEASE = process.env.FLOW_RELEASE !== '0';

/** Keeper eligibility from the achieved torso relation (KEEPER_TORSO=0: fixed frame). */
const KEEPER_TORSO = process.env.KEEPER_TORSO !== '0';

/** Climbs planned with previewed own movement (CLIMB_PLAN=0 off). */
const CLIMB_PLAN = process.env.CLIMB_PLAN !== '0';

/** ZONE_ARMS (default off): a zone lineman's first-phase track closes depth
 * only to arm's length from the man (his strike range: bodies plus a
 * hand's reach), not to body contact. Closing to the body, OZ linemen took a
 * diagonal first step (at 0.5 s 0.38 yd play side, 0.28 upfield) where
 * tracked 2022 OZ linemen step flat (0.59 / 0.13) and their hands meet the
 * man while they keep running the track. */
export const ZONE_ARMS = process.env.ZONE_ARMS !== '0';
/** REACH_FLAT (off): on a stretch, a zone lineman still short of his man's
 * play-side shoulder gains width before depth; he closes depth as the lateral
 * deficit shrinks, and presses depth only after two lateral steps. Tracked
 * stretch linemen are 0.1-0.2 yd upfield at 0.6 s (sim 0.36-0.48) and the
 * man comes to them; he keeps the track until his hands reach the man. */
export const REACH_FLAT = process.env.REACH_FLAT !== '0';
/** IZ_FLAT (off): the REACH_FLAT rule on inside/split zone against a man
 * aligned more than 1 yd outside the blocker (a wide edge): he gains width
 * before depth. Covered interior linemen still press. */
export const IZ_FLAT = process.env.IZ_FLAT !== '0';
/** REACH_CLOSE (off): with ZONE_ARMS, a stretch lineman closes to the depth
 * where his whole distance to the man is in reach (arm's length less 0.1 yd,
 * lateral offset included), not to arm's length straight upfield; and
 * REACH_FLAT's width-before-depth holds only while he is gaining width (his
 * lateral speed beats the man's acquired lateral speed by 0.3 yd/s, or within
 * 0.6 s of the snap). Beside a man flowing at his own pace he sat at
 * arm's-length depth, 0.3-0.5 yd to the side and so out of reach, for 2 s
 * (run-ref-2: free OZ reach depth gap to the fit 0.07-0.11 yd, request
 * 0.17-0.26 yd/s upfield damped to 0.0; tracked OZ linemen +0.9 to +1.1 yd
 * upfield by 2.0 s). */
export const REACH_CLOSE = process.env.REACH_CLOSE !== '0';
/** OWNER_KEEPS (off): in a double with no check installation, when the owner
 * carries the man alone and the helper is off him (not joined), the helper
 * climbs on the zone overtake read (readOvertaken), the mirror of the
 * overtaken owner. Before, an unjoined double without a check policy had no
 * release: only a joined pair or a check helper could leave, so on stretch
 * plays, where the helper runs the track and seldom joins, he ran beside the
 * play (run-ref-4 OZ restage at 1.0 s: owner alone and secure on the man in
 * 114 of ~230 live doubles; 76 of 239 doubles never released). */
export const OWNER_KEEPS = process.env.OWNER_KEEPS !== '0';
/** REACH_HANDS (off): on a stretch, a zone lineman within a short reach of his
 * man (his strike distance + 0.25 yd, as for every other zone lineman) hands
 * over to the ordinary fit and engages, instead of REACH_FLAT keeping him on
 * the track until his hands are already on the man. Level with a man he was
 * still racing for the shoulder of, he ran beside him 1.3 yd behind, just out
 * of his 1.24 yd strike, without taking the last step (run-ref-11 OZ restage
 * at 1.0 s: of interior DL with no OL within 1.2 yd, 156 of 176 had a free
 * reach/cutoff owner level with him, 1.31-1.52 yd away). With it, OZ interior
 * DL blocked at 1.0 s 71 -> 76% (NFL 93%), first contact deeper than 1 yd
 * behind the line 21.1 -> 26.2% (NFL 29.3%), 0-1 yd 32.6 -> 28.9% (NFL 19.0%),
 * DL lateral flow unchanged, paired OZ yards -0.03 (SE 0.21). */
export const REACH_HANDS = process.env.REACH_HANDS === '1';
/** GAP_CLIMB (off): a free zone lineman (drive, reach, cutoff; not in a live
 * double) whose man is beaten to his backside - more than 1 yd backside of
 * his body across the field and not gaining on him - has nobody in his
 * play-side gap, and climbs to the nearest second-level defender (1.5-8 yd
 * past the line, from 1 yd backside to 4 yd play side of him) whom no
 * lineman is nearer, from his own acquired pictures, from 0.6 s after his
 * snap. Before, only a combination release made a first-level lineman climb:
 * a cutoff already 1.1-1.4 yd play side of a flowing man ran beside him for
 * 2 s (run-ref-3 OZ, 1.5 yd past the line by 2.0 s: centre 6-10%, backside
 * guard 3-18%, backside tackle 2%; NFL 26-36 / 36-37 / 16-26%). */
export const GAP_CLIMB = process.env.GAP_CLIMB !== '0';

/** CLIMB_PATH (default off): a free climber steers one continuous path to
 * his backer's play-side shoulder by holding the bearing to it constant, the
 * way a runner closes on a moving man: he matches the shoulder's motion
 * across his line of sight and puts the rest of his speed into closing it.
 * The command follows the backer's acquired motion smoothly; it does not jump
 * when a read picks a new meeting point, and the near fit is the same path
 * (contact and hands are still the engagement's). Re-aiming at a fresh
 * meeting point each read, with separate near-fit and arc waypoints, swung
 * his request (decision-stage churn p50 35 deg/s, p75 188: re-reads 32%,
 * branch seams 19%, near-fit 15%); his path turned 45 deg/s and he levelled
 * at 3.2 yd/s. Tracked 2022 outside zone climbers turn 14 deg/s and reach
 * 4.0 yd/s by 1.4 s. He closes only as fast as his feet can still stop
 * from by the strike (half his braking over the room left, plus 1 yd/s over
 * the backer's own motion away), so he arrives on the backer's speed.
 * Access detours around bodies are unchanged. */
export const CLIMB_PATH = process.env.CLIMB_PATH !== '0';
/** CLIMB_PATH: closing speed (yd/s) over the backer's own he keeps into the
 * strike. Tracked 2022 climbers touch backers at about their speed (inside
 * zone 2.1 vs 2.0, outside 3.5 vs 3.6) and stay on 90% for 0.5 s. */
const CLIMB_PATH_STRIKE = 1;

/** CLIMB_PATH: constant-bearing interception of the backer's play-side
 * shoulder at full effort, from the climber's current acquired picture. */
function climbPath(a: Agent, sim: PlaySim, target: Agent): Intent {
  const seen = sim.see(a, target), run = sim.offCall.run;
  const side = run ? playSideSign(sim, run) * .5 : 0;
  const fx = seen.pos.x - a.pos.x, fy = clamp(seen.pos.y + side, .5, FIELD_WIDTH - .5) - a.pos.y;
  const d = Math.max(1e-6, Math.hypot(fx, fy)), ux = fx / d, uy = fy / d;
  // His motion across the line of sight is matched; what is left of this
  // body's top speed closes the distance along it.
  const along = seen.vel.x * ux + seen.vel.y * uy;
  let px = seen.vel.x - along * ux, py = seen.vel.y - along * uy;
  const V = a.profile.vmax, perp = Math.hypot(px, py), keep = Math.min(1, .95 * V / Math.max(1e-6, perp));
  px *= keep; py *= keep;
  // Closing on him is what his feet can still stop from by the strike: a
  // fit arrives near the backer's own speed, it does not run through him.
  const strike = a.profile.radius + target.profile.radius + .1 + a.player.measurables.armIn / 36 * .45;
  const room = Math.max(0, d - strike);
  const close = Math.min(Math.sqrt(Math.max(0, V * V - px * px - py * py)),
    Math.max(0, along) + Math.sqrt(2 * .5 * a.profile.brake * room) + CLIMB_PATH_STRIKE);
  const vel = { x: px + ux * close, y: py + uy * close };
  const toMan = Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x);
  return d > 2 ? { vel, facing: Math.atan2(vel.y, vel.x) } : { vel, facing: toMan, posture: .7 };
}
/** Climbs and leads intercept flowing backers (CLIMB_INTERCEPT=0: short lead). */
const CLIMB_INTERCEPT = process.env.CLIMB_INTERCEPT !== '0';

/** Zone linemen run the track before contact (ZONE_FLOW=0 disables, for A/B). */
const ZONE_FLOW = process.env.ZONE_FLOW !== '0';

export class RunBlocker implements Behavior {
  readonly kind = 'run-block';
  private pullIdx = 0;
  private retarget = 0;
  private homeY: number | null = null;
  private firstStep: Vec2 | null = null;
  private nextRuleRead = 0;
  private nextThreatRead = 0;
  private nextGapRead = 0;
  private soloKind: RunBlockKind | null = null;
  private soloDrive: Vec2 | null = null;
  /** The puller's last ordinary read, not the defender's current position. */
  private pullRead: { target: Agent; seen: Perceived; clearanceX: number | null; nextRead: number; at: number; braking: Vec2 } | null = null;
  private pullCleared = false;
  private nextSurfaceRead = 0;
  private wrapOutside = false;
  private wrapCorner: Vec2 | null = null;
  private wrapTraffic: {pos: Vec2; vel: Vec2}[] = [];
  private wrapTrafficAt = 0;
  private departureRead: { at: number; nextRead: number; exit: Vec2 | null;
    flow: Vec2; backer: Perceived } | null = null;
  /** A personally consumed near-gap emergency, held through the normal beat. */
  private presentationThreat: Agent | null = null;
  /** The uncovered man of a draw double has seen the rush commit onto his partner. */
  private showOver = false;
  /** Native technique read, retained between the player's ordinary decisions. */
  zoneRead: ZoneReachRead | null = null;
  private preparation: { combination: Combination; backer: Agent | null; at: number; until: number; exit: Vec2; flow: Vec2 } | null = null;
  private contactAt = -1;
  /** Held climb plan from one acquired picture of the backer. */
  private climbAccess: ClimbAccess | null = null;
  private departureAccess: ClimbAccessResult | null = null;
  private departureStrikeClear = false;
  /** CLIMB_RIP: the side of the released man he rips past, chosen once. */
  private ripSide: number | null = null;
  private climbRead: { target: Agent; nextRead: number; meet: Vec2; through: number; attainable: boolean; seenVel: Vec2 } | null = null;
  private collectionRead: {target:Agent;partner:Agent;at:number;nextRead:number;down:Perceived;choice:CollectionApproach|null}|null=null;
  private workPicture: BlockerWorkPicture | null = null;
  /** Keep acquired eligibility with the responsibility when a filling backer
   * changes its technique from climb to drive. Null target means finding work;
   * a null record means another installed job owns eligibility. */
  private acquiredWork: { target: Agent | null } | null = null;
  /** The called track he is running this tick (known to teammates). */
  private track: Vec2 | null = null;
  /** The kick or trap man the call gives this puller (known to teammates). */
  readonly calledKick: Agent | null;
  constructor(public plan: RunBlockPlan) {
    // The installed call names who kicks: a pulling kicker or trapper, or a
    // lead back told to kick the end. Teammates know the call, not the
    // state of the block.
    this.calledKick = (plan.kind === 'pull' || plan.kind === 'lead') && (plan.pullRole === 'kick' || plan.pullRole === 'trap') ? plan.target : null;
  }

  calledMotion(): Vec2 | null { return this.track; }

  contactMotion(a: Agent, work: 'reach' | 'runoff' | 'prepare' = 'reach'): Vec2 | null {
    if (work === 'prepare') {
      const read=this.preparation,combo=this.plan.combination;
      if (!read || combo!==read.combination || combo.released || combo.backer!==read.backer || this.plan.target!==combo.defender
        || !a.engagement || this.contactAt>=read.until) return null;
      const dt=this.contactAt-read.at;
      return track(a,{x:read.exit.x+read.flow.x*dt,y:read.exit.y+read.flow.y*dt},read.flow,
        {speed:1,gain:3}).vel;
    }
    const e = a.engagement, read = this.zoneRead;
    if (!e || e.blocker !== a || e.helpers.length || this.plan.kind !== 'reach'
      || !read || read.target !== e.defender.idx || read.phase !== work
      || (this.plan.combination && !this.plan.combination.released)) return null;
    // A runoff is selected from the acquired hip picture when the outside
    // surface is unattainable. Realize its chosen drive at the existing run
    // rep tempo; contact still bounds each component and supplies every force.
    if (work === 'runoff') return this.plan.target === e.defender
      ? { x: read.drive.x * 2.4, y: read.drive.y * 2.4 } : null;
    // The same track tempo as the free stretch step, until the acquired
    // shoulder picture changes the technique. Seal/runoff have their own fit.
    return { x: 0, y: read.side * a.profile.vmax * .45 };
  }

  get target(): Agent | null {
    return this.plan.target;
  }

  /** Still selling pass on a draw. */
  presentingDraw(t: number): boolean {
    return drawPresentation(this.plan, t) && !this.showOver;
  }

  update(a: Agent, sim: PlaySim): Intent {
    const plan = this.plan;
    const t = sim.t;
    this.contactAt=t;
    if(this.preparation && (plan.combination!==this.preparation.combination
      || plan.target!==this.preparation.combination.defender
      || plan.combination.backer!==this.preparation.backer))this.preparation=null;
    this.track = null;
    if (plan.contactFit && (plan.kind !== 'cutoff' || plan.target !== plan.contactFit.target
      || (plan.combination && !plan.combination.released))) delete plan.contactFit;
    this.homeY ??= a.pos.y;
    this.firstStep ??= {x:a.pos.x+.18,y:a.pos.y+plan.drive.y*.55};
    this.rememberSoloWork();
    // Draw blockers show pass first; everyone else fires out low.
    if (!this.showOver && plan.kind === 'combo' && plan.combination && drawPresentation(plan, t) && t >= startOf(a))
      this.showOver = rushOnPartner(a, sim, plan.combination);
    const presentingDraw = this.presentingDraw(t);
    a.stance = presentingDraw ? 'high' : 'low';
    if (t < startOf(a)) return stand();
    if (!a.engagement && t >= this.nextRuleRead) {
      this.nextRuleRead = t + a.mind.decisionInterval;
      this.readRules(a,sim);
    }
    if (plan.combination) readCombination(a, sim, plan.combination);
    if (this.acquiredWork && this.acquiredWork.target !== plan.target) this.acquiredWork = null;
    // Rules/combination reads can change work even when contact, a first step
    // or another branch returns without consuming block-fit this tick.
    a.mind.setAimTarget('block-fit', plan.target?.idx ?? null);
    if (a.engagement) {
      if (this.zoneEligible(a, sim)) this.readZone(a, sim, a.engagement.defender);
      return stand();
    }
    // Sell pass until just before the handoff.
    if (presentingDraw) {
      if (plan.kind !== 'draw') {
        // Presentation belongs to the installed call even if the original
        // double disappears. Keep the ordinary unavailable-work transition,
        // and let a personally read penetration use real attack/contact.
        const target = this.availableTarget(a, sim);
        if (target && target === this.presentationThreat) {
          a.stance = 'low';
          return this.withBase(a, sim, this.attack(a, sim, target));
        }
      } else {
        // A pass set still blocks the man who comes to it: once his rusher
        // reaches his strike, as he sees him, the high-set lineman takes him
        // on through the ordinary contact path instead of letting him by.
        const target = this.availableTarget(a, sim);
        if (target) {
          const seen = sim.see(a, target);
          const strike = a.profile.radius + target.profile.radius + .1 + a.player.measurables.armIn / 36 * .45;
          if (Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) < strike) return this.attack(a, sim, target, seen);
          // Against an edge rusher selling pass is a short vertical set: the
          // pass protector's kick (on his inside shoulder a beat ahead, a kick
          // lead deeper than he is) with no launch-point depth to protect;
          // never taking ground back toward the line, never behind the mesh.
          // Standing on a yard mark let a wide end run by untouched and left
          // the tackle chasing him from behind. Inside, the man comes to the set.
          if (seen.pose === 'up' && Math.abs(seen.pos.y - sim.ballY) > 3) {
            const qb = sim.see(a, sim.qb).pos, dir = sim.attackDir(a.team);
            const out = Math.sign(seen.pos.y - sim.ballY) || 1;
            const depth = (x: number) => (x - sim.los) * dir;
            const d = Math.max(depth(qb.x) + .5, Math.min(depth(a.pos.x), depth(seen.pos.x) - KICK_LEAD));
            const set = { x: sim.los + d * dir, y: seen.pos.y + seen.vel.y * KICK_LOOK - out * strike * .6 };
            const back = Math.min(0, seen.vel.x * dir);
            return track(a, set, { x: depth(a.pos.x) < depth(seen.pos.x) - KICK_LEAD ? 0 : back * dir, y: seen.vel.y },
              { facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x), gain: 2.5 });
          }
        }
      }
      return goTo(a, { x: sim.los - 1.2, y: a.pos.y }, { speed: 0.6, facing: 0 });
    }
    // Before contact every zone lineman runs the track. On stretch plays the
    // doubles do too: the pair steps play side together and each works to his
    // half of the man. Inside/split-zone doubles press with their own
    // coordination (checks, help, climb), as do all doubles once joined.
    const stretch = sim.offCall.run?.scheme === 'outsideZone' || sim.offCall.run?.scheme === 'wideZone';
    const coordinated = !!plan.combination && !plan.combination.released && !stretch;
    if (GAP_CLIMB && t >= this.nextGapRead) {
      this.nextGapRead = t + a.mind.decisionInterval;
      this.gapClimb(a, sim);
    }
    if (ZONE_FLOW && isOL(a) && ['drive', 'reach', 'cutoff', 'combo'].includes(plan.kind) && !coordinated) {
      const flow = this.zoneFlow(a, sim);
      if (flow) return this.withBase(a, sim, flow);
    }
    if (isOL(a) && ['drive','reach','down','combo','cutoff'].includes(plan.kind) && t < .24+startOf(a)) {
      // Establish the first foot and pad angle before running through a
      // target. Zone gains lateral ground; Duo stays vertical. These are
      // technique landmarks, still subject to acceleration and collisions.
      return this.withBase(a, sim, track(a,this.firstStep,{x:0,y:0},{speed:.45,gain:5,facing:0}));
    }

    if (t >= this.nextThreatRead) {
      this.nextThreatRead = t + a.mind.decisionInterval;
      this.rereadThreat(a, sim);
    }
    let target = this.availableTarget(a, sim);
    if (plan.departure && (plan.kind !== 'climb' || target !== plan.departure.backer)) {
      const sink = sim.blockingSink(a), previousWork = sink?.blockingState(a);
      delete plan.departure;
      this.departureRead = null;
      this.climbRead = null;
      this.climbAccess = null;
      this.departureAccess = null;
      this.departureStrikeClear = false;
      sink?.blockingChange(a, previousWork, 'departure-end: target or kind left the departure backer', sim);
    }
    if (plan.kind === 'climb' && plan.departure && target === plan.departure.backer) {
      const leaving = this.leaveCombination(a, sim);
      if (leaving) return leaving;
    }
    if (plan.kind === 'pull' && plan.pullPath && this.pullIdx < plan.pullPath.length) {
      if(plan.pullRole==='lead') {
        if (plan.pullSurface) {
          // GH follows the first block's acquired surface, not the guard's
          // private chosen technique. A visible inside wash permits an
          // outside insertion; it does not certify that the end is secured.
          if (t >= this.nextSurfaceRead) {
            this.nextSurfaceRead = t + a.mind.decisionInterval;
            const guard = plan.pullSurface.blocker, end = plan.pullSurface.defender;
            const g = sim.see(a, guard), d = sim.see(a, end);
            this.wrapTrafficAt = t;
            this.wrapTraffic = sim.offense.filter(b => b !== a && isOL(b)).map(b => {
              const seen=sim.see(a,b);return {pos:{...seen.pos},vel:{...seen.vel}};
            });
            const side = playSideSign(sim, sim.offCall.run!);
            const reach = guard.profile.radius + end.profile.radius + .1 + guard.player.measurables.armIn / 36 * .45;
            const joined = Math.hypot(g.pos.x-d.pos.x,g.pos.y-d.pos.y) <= reach;
            this.wrapOutside ||= joined && (g.pos.y-d.pos.y)*side > .25;
            if (this.wrapOutside && joined) this.wrapCorner = { x:Math.max(sim.los+.5,g.pos.x+.6),y:g.pos.y+side*1.1 };
          }
          if (this.wrapCorner) {
            plan.pullPath[plan.pullPath.length-1] = {...this.wrapCorner};
            a.tags.add('wrap-log');
          }
        } else {
          const kick=sim.offense.find((b)=>b.tags.has('block-log') && b.behavior instanceof RunBlocker);
          if(kick) {
            const s=sim.see(a,kick),side=playSideSign(sim,sim.offCall.run!);
            plan.pullPath[plan.pullPath.length-1]={x:Math.max(sim.los+.5,s.pos.x+.6),y:s.pos.y+side*1.1};
            a.tags.add('wrap-log');
          }
        }
      }
      const observedCorner = !plan.pullSurface && target &&
        (plan.pullRole === 'kick' || plan.pullRole === 'trap' || plan.pullRole === 'lead');
      // A puller rounds his corners on the arc his own speed and lateral grip
      // can hold, rather than braking to a pivot at each landmark: tracked
      // pullers turn at ~90-100 deg/s and keep ~2 yd/s through the turn
      // (pullshape.py, 2022 counter/power), where a 0.65 yd pivot had them at
      // 140-176 deg/s and ~1 yd/s. The same radius decides when a corner is
      // reached and where he starts bending onto the next leg.
      const turn = pullTurnRadius(a);
      // A corner with a next leg is rounded within his turn radius. The
      // route's end point is reached at the ordinary tolerance or once he has
      // run past it along his leg: he never circles back to a point he passed.
      const reached = (): boolean => {
        const path = plan.pullPath!, wp = path[this.pullIdx], d = Math.hypot(wp.x-a.pos.x, wp.y-a.pos.y);
        if (this.pullIdx < path.length - 1) return d < turn;
        if (d < .65) return true;
        const from = path[this.pullIdx - 1];
        if (!from) return false;
        const lx = wp.x - from.x, ly = wp.y - from.y, l = Math.hypot(lx, ly);
        return l > 1e-6 && ((a.pos.x - wp.x) * lx + (a.pos.y - wp.y) * ly) / l > 0;
      };
      while (this.pullIdx < plan.pullPath.length && reached()) {
        // Resolve the flat leg against its acquired rear surface below, not
        // against a snap x coordinate that may now lie inside the down wall.
        if (this.pullIdx === 1 && observedCorner) break;
        this.pullIdx++;
      }
      let wp = plan.pullPath[this.pullIdx];
      pathLeg: if (wp) {
        // Clear the wall with the feet before fitting the moving kick/trap
        // target. Reaching a waypoint's tolerance does not establish that
        // clearance, and a penetrator need not pass within an arbitrary
        // distance of the puller to become relevant work.
        let read = this.pullIdx > 0 && target && (plan.pullRole === 'kick' || plan.pullRole === 'trap' || plan.pullRole === 'lead')
          ? this.readPull(a, sim, target) : null;
        // A kick or trap man the runner has already passed is out of the
        // play: blocking him means turning back on a man behind the ball.
        // Turn up through the hole and take the first man in front instead.
        if (read && target && (plan.pullRole === 'kick' || plan.pullRole === 'trap') && this.behindRunner(a, sim, target)) {
          const trace = sim.blockingSink(a), previousWork = trace?.blockingState(a);
          sim.event('pull_turn_up', a, target, 'kick man is behind the runner');
          plan.pullRole = 'lead';
          // From his own pictures only: the first threat in the hole, else
          // acquired work in his lane. Unavailability then uses pictures too.
          plan.target = target = this.holeThreat(a, sim) ?? this.findWork(a, sim, true);
          this.acquiredWork = { target };
          // The pull's path ends here: he leads the runner from where he is.
          this.pullIdx = plan.pullPath.length;
          a.tags.add('pull-turned-up');
          delete plan.contactFit;
          this.pullRead = null;
          trace?.blockingChange(a, previousWork, 'pull: kick man behind the runner, turn up', sim);
          // The new job owns its first action (#251 lifetime): register it
          // before attacking, not on the next tick's availability read.
          a.mind.setAimTarget('block-fit', target?.idx ?? null);
          return target ? this.withBase(a, sim, this.attack(a, sim, target)) : this.leadRunner(a, sim);
        }
        const ps = playSideSign(sim, sim.offCall.run!) * (sim.offCall.run!.scheme === 'splitZone' ? -1 : 1);
        // He runs to where the man will be when he gets there, not where the
        // man was: an end squeezing down the line at 2 yd/s moved the corner
        // a yard toward him while he crossed, and he arrived at full speed
        // with no room to turn and ran past underneath him.
        const meetY = (r: NonNullable<RunBlocker['pullRead']>) => {
          const across = Math.abs(r.seen.pos.y - a.pos.y), closing = Math.max(1, (a.vel.y - r.seen.vel.y) * ps);
          return r.seen.pos.y + r.seen.vel.y * Math.min(1, across / closing);
        };
        if (read) {
          const clearNow = read.clearanceX === null || a.pos.x + a.profile.radius <= read.clearanceX;
          this.pullCleared ||= clearNow;
          // A cleared puller may pass the moving corner deeper than its old
          // snap landmark. Do not make him return upfield to finish that
          // waypoint, or add another retreat solely for being near a teammate.
          // An actually obstructed rear surface still requires gaining depth.
          const stationY = this.pullCleared && plan.pullRole !== 'lead'
            ? meetY(read) - ps * .65 : wp.y;
          if (observedCorner && this.pullIdx === 1 &&
              clearNow && (stationY-a.pos.y)*ps < Math.min(turn, 1)) {
            this.pullIdx++;
            wp = plan.pullPath[this.pullIdx];
          }
          const distance = Math.hypot(read.seen.pos.x-a.pos.x, read.seen.pos.y-a.pos.y);
          const lead = Math.min(.4, distance / Math.max(1, a.profile.vmax));
          const approachingDepth = read.seen.pos.x + Math.min(0, read.seen.vel.x) * lead;
          // The wrapper's existing near-target transition uses the same
          // acquired picture as its eventual approach, not private live
          // distance. Preserve the installed track and normal clearance.
          // A kick/trap man who has gone deeper than the pull path, behind the
          // ball and not coming back downfield is running away from the hole,
          // not into it (a chaser coming downfield at the ball still is work). The puller does not retreat after him: he keeps his path
          // to the hole (and turns up once the runner is past the man).
          // Judged a decision beat ahead at the speeds he sees: an end flying
          // upfield is behind the runner by the time a fit could land.
          const dir = sim.attackDir(a.team), beat = a.mind.decisionInterval;
          const away = plan.pullRole !== 'lead' && ((plan.pullPath[1]?.x ?? wp.x) - read.seen.pos.x) * dir > 1.5
            && read.seen.vel.x * dir < 0 && (() => {
              const ball = this.workReference(a, sim), carrier = this.workPicture?.carrier, ballVel = this.workPicture?.vel ?? { x: 0, y: 0 };
              return carrier != null && carrier !== sim.qb.idx
                && (read!.seen.pos.x + read!.seen.vel.x * beat - ball.x - ballVel.x * beat) * dir < 0;
            })();
          // A kick man closing along the line is fit once he is in front of
          // the puller, a beat ahead at the speed he sees, not after the
          // puller reaches his flat-leg corner beneath him.
          const contact = a.profile.radius + read.target.profile.radius + .1 + a.player.measurables.armIn / 36 * .45;
          const inFront = plan.pullRole === 'kick'
            && Math.abs(read.seen.pos.y + read.seen.vel.y * lead - a.pos.y) < contact + .5;
          // Past his corner, he takes his man once he can reach him within a
          // beat or two, on the way, rather than finishing the route to a
          // point and only then fitting within 1.2 yd (tracked wraps block
          // ~0.8 s before reaching 45 deg upfield; ours 0.1 s).
          const reachable = plan.pullRole === 'lead' && this.pullIdx >= plan.pullPath.length - 1
            && (read.seen.pos.x - a.pos.x) * dir > -contact
            && interceptPoint({ pos: a.pos, vel: a.vel, profile: a.profile },
              (tt) => ({ x: read!.seen.pos.x + read!.seen.vel.x * tt, y: read!.seen.pos.y + read!.seen.vel.y * tt }),
              { horizon: .8, step: .05, radius: contact }).estimate.status === 'estimated-feasible';
          const fit = away ? distance < 1.2 && (read.seen.pos.x - a.pos.x) * dir > 0
            : plan.pullRole === 'lead' ? distance < 1.2 || reachable
            : (plan.pullRole === 'kick' && this.pullIdx >= 2) || inFront || approachingDepth < sim.los || distance < 1.2;
          if (this.pullCleared && fit)
            return this.attack(a, sim, read.target, read.seen);
          if (away) read = null;
          // Passing the observed corner can finish a two-point path: he is
          // then past his path and takes his work like any finished puller.
          if (!wp) break pathLeg;
        }
        // Clear the line before turning up; approach the corner under control
        // so a heavy puller doesn't run through the waypoint and circle back.
        let path = read && this.pullCleared && plan.pullRole !== 'lead' ? { ...wp, y: meetY(read) - ps * (this.pullIdx === 1 ? .65 : .45) } : wp;
        // Progress is measured against the same observed landmark requested
        // by the feet, rather than a different old snap-coordinate waypoint.
        if (read && this.pullCleared && plan.pullRole !== 'lead') plan.pullPath[this.pullIdx] = path;
        const nearWall = plan.pullSurface
          ? this.wrapTraffic.some(p => {
            // The delivered picture already includes observation age. Carry
            // only time held since that read, keeping both bodies at this tick.
            const elapsed=t-this.wrapTrafficAt,x=p.pos.x+p.vel.x*elapsed,y=p.pos.y+p.vel.y*elapsed;
            return Math.hypot(x-a.pos.x,y-a.pos.y)<1.2 && x>a.pos.x;
          })
          : !read && sim.offense.some(o => {
            if (o === a || !isOL(o)) return false;
            const seen=sim.see(a,o);
            return Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y)<1.2 && seen.pos.x>a.pos.x;
          });
        if (this.pullIdx === 1 && observedCorner && read && read.clearanceX !== null) {
          path = {x:Math.min(wp.x,read.clearanceX-a.profile.radius),y:path.y};
        } else if (this.pullIdx === 1 && nearWall) {
          path = { x: Math.min(wp.x, a.pos.x - 0.35), y: wp.y };
        }
        // The leg after the corner ends at the same observed man, not at the
        // snap landmark: a stale end point made a square turn up onto a moving
        // end look like no turn at all, so he never slowed for it.
        const nextWp = plan.pullPath[this.pullIdx+1];
        const next = nextWp && read && this.pullCleared && plan.pullRole !== 'lead'
          ? { ...nextWp, y: meetY(read) - ps * .45 } : nextWp;
        // A corner held for the wall (flat leg, not yet clear) is not rounded.
        const held = this.pullIdx === 1 && observedCorner;
        const through = next ? cornerSpeed(a.body, path, next, turn)
          : plan.pullRole === 'lead' ? a.profile.vmax * .8 : 0;
        let aim = path;
        const toCorner = Math.hypot(path.x - a.pos.x, path.y - a.pos.y);
        if (next && !held && toCorner < turn) {
          // Inside the turn radius he steers onto the next leg, the way a
          // runner rounds a cone: the arc, not the cone, is his path.
          const ox = next.x - path.x, oy = next.y - path.y, ol = Math.hypot(ox, oy);
          if (ol > 1e-6) { const k = Math.min(ol, turn - toCorner); aim = { x: path.x + ox / ol * k, y: path.y + oy / ol * k }; }
        }
        // The open pull step keeps the hips toward the play side, never a
        // pivot toward our own end zone; the flat/fit legs face normally.
        return goTo(a, aim, { speed: 0.95, through,
          facing: this.pullIdx === 0 ? Math.atan2(ps, 0) : undefined });
      }
    }
    if (target && backTurned(a, sim, target)) {
      // Trail him at a stand-off: keep pace without running into his back.
      const man = sim.see(a, target), dirX = sim.attackDir(a.team);
      const trail = { x: man.pos.x - dirX * (a.profile.radius + target.profile.radius + .5), y: man.pos.y };
      if ((trail.x - a.pos.x) * dirX < 0) trail.x = a.pos.x;
      return goTo(a, trail, { speed: .85, through: Math.max(0, man.vel.x * dirX) });
    }
    if (!target) {
      const ref = this.workReference(a, sim);
      // A puller who turned up leads the runner: get in front of him and
      // keep looking for the first man to show.
      if (a.tags.has('pull-turned-up')) return this.leadRunner(a, sim);
      const lane = plan.leadLane;
      if (lane) {
        // Run the play-side track to the landmark, then on up that lane.
        // Tracked I-formation leads (2022, 218 outside-zone snaps) go flat to
        // the play side at the snap, behind the quarterback before he drops
        // (crossing his line at 0.2 s, 3 yd deeper), gain depth only once
        // 2 yd outside him (-4.3 yd at 0.6 s, -3.2 at 1.2 s, -2.4 yd and
        // 5 yd wide at 1.5 s), then turn up the lane. The quarterback drops
        // into the space he left.
        const dirL = sim.attackDir(a.team), side = Math.sign(lane.y - this.homeY!) || 1;
        const wide = (a.pos.y - this.homeY!) * side, there = (a.pos.x - lane.x) * dirL > -.6 && Math.abs(a.pos.y - lane.y) < 1;
        const flat = { x: a.pos.x + .6 * dirL, y: this.homeY! + side * 6 };
        const bend = { x: sim.los - 2.2 * dirL, y: lane.y };
        return runThrough(a, there ? { x: a.pos.x + 3 * dirL, y: lane.y } : wide < 2.2 ? flat : (a.pos.x - bend.x) * dirL < -.3 ? bend : lane);
      }
      if (BLOCKER_NEXT && (plan.kind === 'climb' || plan.kind === 'lead')) {
        // No work in sight: lead the runner's lane, never back toward him.
        const dirN = sim.attackDir(a.team), x = dirN > 0 ? Math.max(ref.x + 3, a.pos.x + 1.5) : Math.min(ref.x - 3, a.pos.x - 1.5);
        return goTo(a, { x, y: a.pos.y + clamp(ref.y - a.pos.y, -2, 2) * .5 }, { speed: .8 });
      }
      return goTo(a, { x: ref.x + 3, y: a.pos.y }, { speed: 0.5 });
    }
    if (plan.kind === 'stalk') {
      // Stay square on the DB until the run comes; engage when he closes.
      const dd = Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y);
      if (dd < a.profile.radius + target.profile.radius + 0.3 && sim.engage(a, target, 'run', plan.drive)) return stand();
      const seen = sim.see(a, target);
      if (STALK_CUSHION && plan.perimeterStalk === target) {
        // Break down short of a DB who is not attacking: mirror him at a
        // stand-off until he comes downhill or inside toward the ball.
        const dirX = sim.attackDir(a.team);
        const downhill = -seen.vel.x * dirX;
        const inside = (sim.ballY - seen.pos.y) * seen.vel.y > 0 ? Math.abs(seen.vel.y) : 0;
        if (downhill < STALK_ATTACK && inside < STALK_ATTACK_IN) {
          const stand = { x: seen.pos.x - dirX * STALK_STANDOFF, y: seen.pos.y };
          if ((stand.x - a.pos.x) * dirX < 0) stand.x = a.pos.x;
          return goTo(a, stand, { speed: .85, through: Math.max(0, seen.vel.x * dirX),
            facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x) });
        }
      }
      if (plan.perimeterStalk === target) {
        const capacity = a.body.support
          ? availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
        const surface = a.profile.radius + target.profile.radius + .15;
        const aim = { x: seen.pos.x-plan.drive.x*surface, y: seen.pos.y-plan.drive.y*surface };
        return { vel: movingArrivalVelocity(a.body, aim, seen.vel, a.profile.vmax * .85, .1, 1, 1, capacity),
          facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x) };
      }
      // The inside stalk must actually enter its unchanged contact envelope.
      // A fixed 1.2yd stand-off can strand him outside reach of a waiting or
      // retreating backer. Keep this ordinary approach distinct from the
      // installed perimeter interception above.
      const fit = plan.insideStalk === target
        ? { x: seen.pos.x - (a.profile.radius + target.profile.radius + .15), y: seen.pos.y }
        : { x: Math.max(seen.pos.x - 1.2, a.pos.x), y: seen.pos.y };
      return goTo(a, fit, { speed: .85, through: 1 });
    }
    return this.withBase(a, sim, this.attack(a, sim, target));
  }

  /** The climb, planned on the read cadence from one acquired picture of the
   * backer: candidate meeting points on his predicted path (at his play-side
   * shoulder) are each previewed with this body's own free movement (facing,
   * support, braking); the earliest one that is actually inside strike range
   * when he gets there is held until the next read. If none is attainable he
   * takes the closest approach and the plan says so. Empty-space forecast
   * only: grips, traffic and the backer's future cuts are unknown. */
  private plannedClimb(a: Agent, sim: PlaySim, target: Agent, strike: number): Intent | null {
    const read = this.climbRead;
    if (!read || read.target !== target || sim.t >= read.nextRead) {
      const seen = sim.see(a, target), run = sim.offCall.run!;
      let side = playSideSign(sim, run) * .5;
      // CLIMB_RUNNER_SIDE: once he has the runner in his own picture (not the
      // QB at the mesh), fit the backer's shoulder between him and the runner.
      if (CLIMB_RUNNER_SIDE) {
        const ref = this.workReference(a, sim), pic = this.workPicture;
        if (pic && pic.source === 'acquired' && pic.carrier !== sim.qb.idx && Math.abs(ref.y - seen.pos.y) > .5)
          side = Math.sign(ref.y - seen.pos.y) * .5;
      }
      const capacity = a.body.support
        ? availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
      const previousAccess=this.climbAccess;
      let best: { meet: Vec2; vel: Vec2; t: number; gap: number } | null = null;
      for (const lead of [.2, .4, .6, .8, 1.0, 1.3]) {
        const meet = { x: seen.pos.x + seen.vel.x * lead, y: clamp(seen.pos.y + seen.vel.y * lead + side, .5, FIELD_WIDTH - .5) };
        const vel = movingArrivalVelocity(a.body, meet, seen.vel, a.profile.vmax, .1, Math.hypot(seen.vel.x, seen.vel.y), 1, capacity);
        const facing = Math.atan2(meet.y - a.pos.y, meet.x - a.pos.x);
        const demand=(body: Readonly<import('../../physics/kinematics.js').Body>)=>{
          const base=body.support?availability(body.support,supportParams(body.profile),fatigueFactor(body.energy)):1;
          return {vel:movingArrivalVelocity(body,meet,seen.vel,a.profile.vmax,.1,Math.hypot(seen.vel.x,seen.vel.y),1,base),
            facing:Math.atan2(meet.y-body.pos.y,meet.x-body.pos.x)};
        };
        const path = previewFreeMovement(a.body, this.plan.departure?demand:{ vel, facing }, sim.t, 26, sim.world.handContact);
        for (const s of path) {
          const bx = seen.pos.x + seen.vel.x * s.t, by = seen.pos.y + seen.vel.y * s.t;
          const gap = Math.hypot(s.pos.x - bx, s.pos.y - by) - strike;
          if (!best || (gap <= 0 && (best.gap > 0 || s.t < best.t)) || (best.gap > 0 && gap < best.gap))
            best = { meet, vel, t: s.t, gap };
          if (gap <= 0) break;
        }
      }
      this.climbRead = { target, nextRead: sim.t + a.mind.decisionInterval, meet: best!.meet,
        through: Math.hypot(seen.vel.x, seen.vel.y), attainable: best!.gap <= 0, seenVel: { ...seen.vel } };
      this.climbAccess = null;
      this.departureAccess=null;
      if (this.plan.departure || Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y)>strike+a.profile.radius+target.profile.radius) {
        // A backer assignment does not remove the bodies between us. Read
        // first-level surfaces on the same beat; never inspect their private
        // assignments, engagement state or future controller requests.
        // The man he just released is his keeper's: a departing climber steps
        // off that man's hip, and World contact decides any rub. Every other
        // body, his keeper included, is still a surface he must not run into.
        const released = this.plan.departure?.defender;
        const surfaces = sim.agents.filter(b=>b!==a&&b!==target&&b!==released&&(isOL(b)
          || b===this.plan.departure?.keeper
          ||sim.offAlign.spots[b.slot]?.inline||['DE_W','DE_S','DT_W','DT_S','NT'].includes(b.slot)))
          .map(b=>({key:b.idx,radius:b.profile.radius,seen:sim.see(a,b)}))
          .filter(p=>Math.hypot(p.seen.pos.x-a.pos.x,p.seen.pos.y-a.pos.y)<6);
        const original = { vel:best!.vel, facing:Math.atan2(best!.meet.y-a.pos.y,best!.meet.x-a.pos.x) };
        if (this.plan.departure) {
          const control=(body: Readonly<import('../../physics/kinematics.js').Body>)=>{
            const base=body.support?availability(body.support,supportParams(body.profile),fatigueFactor(body.energy)):1;
            return {vel:movingArrivalVelocity(body,best!.meet,seen.vel,a.profile.vmax,.1,Math.hypot(seen.vel.x,seen.vel.y),1,base),
              facing:Math.atan2(best!.meet.y-body.pos.y,best!.meet.x-body.pos.x)};
          };
          const trace=sim.commandTraceFor(a);
          this.departureAccess=assessClimbAccess(a,seen,surfaces,original,sim.t,a.mind.decisionInterval,sim.world.handContact,true,control,previousAccess,
            trace&&(r=>trace.climbAccess(target,r,sim)));
          if (this.departureAccess.kind==='detour') this.climbAccess=this.departureAccess.plan;
          const dd=this.plan.departure!.defender, down={key:dd.idx,radius:dd.profile.radius,seen:sim.see(a,dd)};
          const keeper=surfaces.find(s=>s.key===this.plan.departure!.keeper.idx);
          const route=down&&keeper&&climbRoute(a,this.plan.departure.defender,down.seen,
            this.plan.departure.keeper,keeper.seen,seen,strike);
          this.departureStrikeClear=!!route&&!route.exit;
          if (this.departureStrikeClear && this.departureAccess.kind==='direct') {
            const sink = sim.blockingSink(a), previousWork = sink?.blockingState(a);
            delete this.plan.departure;
            this.departureRead=null;
            sink?.blockingChange(a, previousWork, 'departure-end: strike corridor clear, direct access', sim);
          }
        } else this.climbAccess = chooseClimbAccess(a,seen,surfaces,original,sim.t,a.mind.decisionInterval,sim.world.handContact);
      }
      if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'climb-plan',
        chose: this.climbRead.attainable ? 'attainable meeting point' : 'closest approach (no attainable fit)',
        cue: 'one acquired picture of the backer, previewed with own free movement',
        options: ['attainable meeting point', 'closest approach (no attainable fit)'],
        detail: `meet in ${best!.t.toFixed(2)} s, margin ${best!.gap.toFixed(2)} yd` });
    }
    if (this.plan.departure && this.departureAccess?.kind==='unvalidated') return this.departureAccess.command;
    if (this.climbAccess) return climbAccessCommand(a,this.climbAccess,sim.t);
    if (CLIMB_PATH) return climbPath(a, sim, target);
    const r = this.climbRead!;
    const capacity = a.body.support
      ? availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
    return { vel: movingArrivalVelocity(a.body, r.meet, r.seenVel, a.profile.vmax, .1, r.through, 1, capacity),
      facing: Math.atan2(r.meet.y - a.pos.y, r.meet.x - a.pos.x) };
  }

  /** A zone lineman runs the track toward the play side from the snap and
   * meets his defender's playside shoulder while moving, instead of stepping
   * and then attacking a stationary picture. Outside/wide zone run the track;
   * inside/split zone press it. Speed is the body's own: World caps it by
   * facing, acceleration and traction. NFL zone lines are 0.6 yd wide by
   * 0.5 s and their fronts flow with them; a stalled line never stretches. */
  private zoneFlow(a: Agent, sim: PlaySim): MoveCommand | null {
    const run = sim.offCall.run;
    if (!run || !['insideZone', 'outsideZone', 'wideZone', 'splitZone'].includes(run.scheme)) return null;
    const target = this.availableTarget(a, sim);
    if (!target) return null;
    const seen = sim.see(a, target);
    const dir = sim.attackDir(a.team);
    if ((seen.pos.x - sim.los) * dir > 1.5) return null; // second level: ordinary climb
    const ps = playSideSign(sim, run);
    const contact = a.profile.radius + target.profile.radius + .1 + a.player.measurables.armIn / 36 * .45;
    const d = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
    // Within reach the ordinary fit/engage owns contact, except during the
    // first step, which never strikes: it is where the lateral start is won.
    const firstStep = sim.t < .24 + startOf(a);
    // REACH_FLAT: a stretch reach still short of the shoulder keeps running
    // the track until his hands reach the man (arm's length), rather than
    // handing the last quarter yard to a fit that strikes upfield.
    const stretchFlat = REACH_FLAT && !REACH_HANDS && run.scheme !== 'insideZone' && run.scheme !== 'splitZone'
      && (seen.pos.y + (this.plan.combination && !this.plan.combination.released ? 0 : ps * .6) - a.pos.y) * ps > 0;
    if (d < contact + (stretchFlat ? 0 : .25) && !firstStep && !this.scoopsPast(a, sim, seen)) return null;
    const press = run.scheme === 'insideZone' || run.scheme === 'splitZone' ? .55 : 1;
    // Lateral intent: what it takes to be on his playside shoulder when we
    // meet, from his seen motion over our time to contact; never less than
    // the play's track tempo. The body's own limits decide what is achieved.
    const bodyContact = a.profile.radius + target.profile.radius;
    const closing = Math.max(1, (a.vel.x - seen.vel.x) * dir + 1.5);
    const meet = clamp(Math.max(0, (seen.pos.x - a.pos.x) * dir - bodyContact) / closing, .15, .6);
    // A double's two players take the halves of the man nearest each, the
    // same split as their combo aim; a solo reach takes the playside number.
    const combo = this.plan.combination && !this.plan.combination.released ? this.plan.combination : null;
    const partner = combo?.members.find((b) => b !== a);
    const scooping = this.scoopsPast(a, sim, seen);
    // Past the man he scoops, his work is his backer: he climbs to him now.
    const scoopBacker = scooping ? this.plan.combination?.backer : null;
    if (scoopBacker && !scoopBacker.isDown(sim.t) && sim.t >= .24 + startOf(a)) return climbPath(a, sim, scoopBacker);
    const half = scooping ? ps * (bodyContact + .3) : partner ? (Math.sign(a.pos.y - partner.pos.y) || ps) * .55 : ps * .6;
    const shoulder = seen.pos.y + seen.vel.y * meet + half;
    // The track races a man in front of him to the playside. Once that man
    // is already backside of the aim point and has run upfield past his
    // depth, more track only carries him away from the man, backpedaling
    // with his back to the line. Leave the track and fit the man's acquired
    // body from here (G1 P003/P029/P032 backside cutoff).
    if (!firstStep && (a.pos.y - shoulder) * ps > 0 && (seen.pos.x - a.pos.x) * dir < 0) return null;
    // Ask for the speed that gets there in time under his own acceleration
    // law (speed approaches the wanted speed with time constant tau): an
    // early, short distance needs an explosive first step, not a jog.
    const needed = requestToCover(gaitLag(a.profile), Math.max(0, (shoulder - a.pos.y) * ps), meet, a.vel.y * ps);
    const lateral = ps * Math.min(a.profile.vmax, Math.max(a.profile.vmax * .45 * press, needed));
    // The call's track tempo is what his teammates expect from him.
    this.track = { x: 0, y: ps * a.profile.vmax * .45 * press };
    // Depth: close to the defender's near surface without overrunning it.
    // ZONE_ARMS: close only to arm's length (his strike range); hands meet
    // the man there and he keeps running the track.
    // REACH_CLOSE: arm's length is a distance. Beside the man (lateral
    // offset), stopping at arm's length straight upfield leaves the hands
    // short; close to the depth where the whole distance is in reach.
    const armDepth = REACH_CLOSE ? Math.sqrt(Math.max(0, contact * contact - (seen.pos.y - a.pos.y) ** 2)) - .1 : contact;
    const fitX = seen.pos.x - dir * (ZONE_ARMS ? Math.max(bodyContact, armDepth) : bodyContact);
    let forward = clamp((fitX - a.pos.x) * 2.5, -1, 2.5);
    // REACH_FLAT: a stretch reach behind his man's play-side shoulder runs
    // flat; each yard closed toward depth is width the man keeps.
    // Stretch footwork is two lateral steps (bucket, crossover) before he
    // presses depth; the man's own charge closes the gap meanwhile.
    // IZ_FLAT: on a press scheme only a man aligned well outside him (a wide
    // edge) is worth gaining width on; a covered lineman still presses.
    // REACH_CLOSE: width first only while width is coming. A man flowing as
    // fast as the blocker keeps the shoulder out of reach; once the blocker is
    // not out-running him across (own vs acquired lateral motion), he presses.
    const gainingWidth = !REACH_CLOSE || (a.vel.y - seen.vel.y) * ps > .3 || sim.t < .6 + startOf(a);
    // KEEPER_HIP: a double member whose half of the man is his backside
    // half is not racing for a shoulder: he closes to the man's depth on the
    // intercept of the backside hip and takes him over there.
    const backsideHalf = KEEPER_HIP && !!partner && half * ps < 0;
    if ((press === 1 ? REACH_FLAT : IZ_FLAT && (seen.pos.y - a.pos.y) * ps > 1.0) && !scooping && !backsideHalf && forward * dir > 0 && gainingWidth)
      forward *= Math.min(clamp(1 - (shoulder - a.pos.y) * ps / .6, 0, 1),
        clamp((sim.t - startOf(a) - .24) / .36, 0, 1));
    // Open the hips toward the track (a bucket step) while the eyes stay on
    // the target: halfway between travel and the target's bearing.
    const travel = Math.atan2(lateral, forward), bearing = Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x);
    const facing = bearing + Math.atan2(Math.sin(travel - bearing), Math.cos(travel - bearing)) / 2;
    return { vel: { x: forward, y: lateral }, facing, cutSkill: .8 + .3 * a.r('runBlock') };
  }

  /** ZONE_SCOOP: an unjoined scoop helper whose man has not come across his
   * face (still on the helper's backside half, in his own picture) passes him. */
  private scoopsPast(a: Agent, sim: PlaySim, seen: Perceived): boolean {
    const combo = this.plan.combination, run = sim.offCall.run;
    if (!ZONE_SCOOP || !combo?.scoop || combo.released || combo.members[1] !== a || !run || a.engagement) return false;
    return (seen.pos.y - a.pos.y) * playSideSign(sim, run) < -.15;
  }

  private availableTarget(a: Agent, sim: PlaySim): Agent | null {
    const plan = this.plan, t = sim.t;
    let target = plan.target;
    // A named wrapper job cannot disappear because of the target's private
    // live contact. Approach and unavailability use its acquired picture.
    if (plan.kind === 'pull' && plan.pullRole === 'lead') {
      // A lead puller blocks the first threat to show in the hole, read from
      // his own pictures each beat, not a man named at the snap.
      // A surface wrapper reads on his surface beat and holds that picture.
      // He reads the hole once he has cleared the wall or run his path (the
      // man the call names until then, unless he sees that man on the ground),
      // not men still at the line when he steps off.
      const gone = () => { const pose = target && sim.see(a, target).pose; return pose === 'down' || pose === 'rising'; };
      if (!a.engagement && t >= this.retarget && !(plan.pullSurface && t < this.nextSurfaceRead)
        && (this.pullCleared || !target || this.pullIdx >= (plan.pullPath?.length ?? 0) || gone())) {
        this.retarget = t + a.mind.decisionInterval;
        const threat = this.holeThreat(a, sim, target);
        // Nobody threatens the hole in his pictures, his own man included
        // (on the ground, or behind his flow now): he leads the runner rather
        // than standing over, or turning back for, the man he lost.
        if (!threat && target) {
          const trace = sim.blockingSink(a), previousWork = trace?.blockingState(a);
          plan.target = target = null;
          this.pullRead = null;
          trace?.blockingChange(a, previousWork, 'pull lead: his man is down, lead the runner', sim);
        } else if (threat && threat !== target) {
          const trace = sim.blockingSink(a), previousWork = trace?.blockingState(a);
          plan.target = target = threat;
          this.acquiredWork = { target };
          this.pullRead = null;
          trace?.blockingChange(a, previousWork, 'pull lead: first threat in the hole', sim);
        }
      }
      if (target) { a.mind.setAimTarget('block-fit', target.idx); return target; }
      // No threat in his pictures: any replacement is found from pictures.
      this.acquiredWork = { target: null };
    }
    // This job selected a personally acquired first threat. Do not undo
    // that responsibility using a remote live pose or somebody else's hands.
    // The picture exposes pose, not engagement; nearby bodies do not prove a
    // block. Physical engage eligibility still owns any eventual contact.
    const acquiredEligibility = !!this.acquiredWork && this.acquiredWork.target === target;
    const picture = acquiredEligibility && target ? sim.see(a, target) : null;
    // Either member can land first. The covered owner's drive/reach/down
    // label does not make his partner's contact somebody else's block.
    // Keep the shared responsibility until the combination read releases it;
    // ordinary reach and useful helper contact still decide whether he joins.
    const partnerOwns = !acquiredEligibility && plan.combination && !plan.combination.released && target?.engagement
      && plan.combination.defender === target && plan.combination.members.includes(a)
      && plan.combination.members.includes(target.engagement.blocker);
    // A named stalk is still his job when a teammate momentarily gets hands
    // on that defender. Private engagement ownership is not an acquired
    // handoff; real spacing and contact eligibility still govern any help.
    if (!target || (acquiredEligibility
      ? picture?.pose === 'down' || picture?.pose === 'rising'
      : target.isDown(t) || (plan.kind !== 'stalk' && target.engagement && target.engagement.blocker !== a && !target.engagement.helpers.includes(a) && !partnerOwns))) {
      if (t >= this.retarget) {
        this.retarget = t + a.mind.decisionInterval;
        const previous = target;
        const replacement = this.findWork(a, sim, acquiredEligibility);
        const combination = plan.combination;
        if (combination && !combination.released && replacement !== combination.defender) {
          abandonCombination(a, sim, combination, 'original target unavailable; finding work');
        }
        const trace = sim.blockingSink(a), previousWork = trace?.blockingState(a);
        plan.target = target = replacement;
        if (acquiredEligibility) this.acquiredWork = { target: replacement };
        if (replacement !== previous) delete plan.contactFit;
        if (replacement && replacement !== previous && (!plan.combination || plan.combination.released))
          this.classifyWork(a, sim, replacement);
        trace?.blockingChange(a, previousWork, 'available-target/find-work', sim);
      }
    }
    a.mind.setAimTarget('block-fit', target?.idx ?? null);
    return target;
  }

  private withBase(a: Agent, sim: PlaySim, command: MoveCommand): Intent {
    // The visible low stance does not set the physical posture. Keep the
    // existing snap base through a first-level line approach; World supplies
    // finite posture changes, the movement cost and actual balance. Running
    // pullers, climbs, unassigned movement and contact techniques own theirs.
    return onLine(a, sim) && ['drive', 'reach', 'down', 'combo', 'cutoff'].includes(this.plan.kind)
      ? { ...command, posture: .7 } : command;
  }

  prepareCombination(a: Agent, sim: PlaySim, combo: Combination,
    route: {exit: Vec2|null;flow:Vec2} | null, until: number): void {
    this.preparation=route?.exit && combo.members[1]===a
      ? {combination:combo,backer:combo.backer,at:sim.t,until,exit:{...route.exit},flow:{...route.flow}} : null;
  }

  /** Keep the cue that authorized departure until the next ordinary read. */
  startDeparture(a: Agent, sim: PlaySim, defender: Agent, keeper: Agent, backer: Agent,
    picture: NonNullable<CombinationProposal['departure']>): void {
    this.preparation=null;
    this.plan.departure = { defender, keeper, backer };
    this.departureRead = { at: sim.t, nextRead: sim.t + a.mind.decisionInterval,
      exit: picture.exit?{ ...picture.exit }:null, flow: { ...picture.flow }, backer: structuredClone(picture.backer) };
    this.climbRead=null;
    this.climbAccess=null;
    this.departureAccess=null;
    this.departureStrikeClear=false;
  }

  private leaveCombination(a: Agent, sim: PlaySim): MoveCommand | null {
    const target=this.plan.departure!.backer;
    const strike=a.profile.radius+target.profile.radius+.1+a.player.measurables.armIn/36*.45;
    const approach=this.plannedClimb(a,sim,target,strike);
    if (!this.plan.departure) return this.attack(a,sim,target,undefined,approach);
    // A short unloaded preview being clear does not mean the old surface is
    // already behind us. Keep this access responsibility through subsequent
    // reads; only a clear near-strike corridor permits the normal hand/fit.
    const seen=sim.see(a,target);
    // Already within an acquired strike, fitting hands is not a demand to
    // walk the torso through the backer's center. The ordinary physical
    // strike still owns range, facing, budgets and whether hands exist.
    const near=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y)<=strike;
    // Stepping off the released man's hip: a rub is allowed, shoving him along is not a climb.
    const released=this.plan.departure.defender;
    if (CLIMB_RIP && !near) {
      const dirR = sim.attackDir(a.team), man = sim.see(a, released), keeper = sim.see(a, this.plan.departure.keeper);
      const reach = a.profile.radius + released.profile.radius;
      const past = (a.pos.x - man.pos.x) * dirR > .35;
      if (!past && Math.hypot(a.pos.x - man.pos.x, a.pos.y - man.pos.y) < reach + .7) {
        this.ripSide ??= Math.sign(man.pos.y - keeper.pos.y) || Math.sign(a.pos.y - man.pos.y) || 1;
        const spot = { x: man.pos.x + dirR * .9, y: man.pos.y + this.ripSide * (reach + .1) };
        const rip = { ...runThrough(a, spot), facing: dirR > 0 ? 0 : Math.PI };
        return CLIMB_SLIDE ? slidePast(a, sim, released, rip) : rip;
      }
    }
    if (!this.departureStrikeClear && !near) return offReleasedHip(a,sim,released,approach);
    const command=offReleasedHip(a,sim,released,this.attack(a,sim,target,seen,approach));
    if (a.engagement?.defender===target) {
      const sink = sim.blockingSink(a), previousWork = sink?.blockingState(a);
      delete this.plan.departure;
      this.departureRead=null;
      sink?.blockingChange(a, previousWork, 'departure-end: engaged the backer', sim);
    }
    return command;
  }

  /** His own pictures: the runner he sees carrying (not the QB at the mesh)
   * is going downhill (2 yd/s or more), moving away from this man, and is
   * downfield of him by more than their two bodies plus what the man closes
   * on him in a second. A man level with a runner still at the mesh, or one
   * the runner is bending toward, is still in the play. */
  private behindRunner(a: Agent, sim: PlaySim, man: Agent, picture_?: Perceived): boolean {
    const ref = this.workReference(a, sim), picture = this.workPicture;
    if (picture?.carrier == null || picture.carrier === sim.qb.idx) return false;
    const seen = picture_ ?? sim.see(a, man);
    const dir = sim.attackDir(a.team), runner = sim.agents[picture.carrier];
    if (picture.vel.x * dir < 2 || !this.opening(ref, picture.vel, seen)) return false;
    const gap = (ref.x - seen.pos.x) * dir, closing = Math.max(0, (seen.vel.x - picture.vel.x) * dir);
    return gap - closing * 1.0 > runner.profile.radius + man.profile.radius;
  }

  /** A man behind his own flow (judged a beat ahead) is an obsolete chaser,
   * not work, unless he is still live work: already inside this blocker's
   * strike reach, or a filler ahead of the runner he sees, the two closing on
   * each other, within a step of the blocker. Closing is their relative
   * motion in his pictures: a planted man is still live when the runner is
   * coming at him. Without an acquired runner picture there is no closing
   * evidence. Turning back for a chaser leaves the hole; letting a reachable
   * filler go leaves the runner. */
  private liveBehind(a: Agent, sim: PlaySim, d: Agent, seen: Perceived, ball: Vec2): boolean {
    const gap = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
    const strike = a.profile.radius + d.profile.radius + .1 + a.player.measurables.armIn / 36 * .45;
    if (gap <= strike) return true;
    const picture = this.workPicture;
    if (picture?.source !== 'acquired' || picture.carrier == null || picture.carrier === sim.qb.idx) return false;
    const dir = sim.attackDir(a.team), rx = ball.x - seen.pos.x, ry = ball.y - seen.pos.y, rl = Math.hypot(rx, ry) || 1;
    const ahead = (seen.pos.x - ball.x) * dir > 0;
    const closing = ((seen.vel.x - picture.vel.x) * rx + (seen.vel.y - picture.vel.y) * ry) / rl > .5;
    return ahead && closing && gap <= strike + 1;
  }

  /** The first threat to the hole in his own pictures: an upright defender
   * in front of him, near the hole's lane, whom the runner he sees carrying
   * has not already passed, closest to the hole a short beat ahead at the
   * speed he sees. The call gives a teammate puller's kick or trap man to
   * that puller. A man he sees in body contact with a teammate is a claim,
   * not proof of a block: any free threat comes first, and the claimed man
   * is still taken (help) when no free man threatens the hole. */
  private holeThreat(a: Agent, sim: PlaySim, current: Agent | null = null): Agent | null {
    const hole = this.plan.pullPath?.at(-1);
    if (!hole) return null;
    const dir = sim.attackDir(a.team), ball = this.workReference(a, sim), carrier = this.workPicture?.carrier;
    const side = playSideSign(sim, sim.offCall.run!) * (sim.offCall.run!.scheme === 'splitZone' ? -1 : 1);
    const runner = carrier != null && carrier !== sim.qb.idx ? sim.agents[carrier] : null;
    const mates = sim.offense.filter(o => o !== a && o !== runner).map(o => ({ pos: sim.see(a, o).pos, r: o.profile.radius }));
    const called = new Set(sim.offense.map(o => o !== a && o.behavior instanceof RunBlocker ? o.behavior.calledKick : null));
    const score = (d: Agent): number | null => {
      if (called.has(d)) return null;
      const seen = sim.see(a, d);
      if (seen.pose === 'down' || seen.pose === 'rising') return null;
      const depth = (seen.pos.x - sim.los) * dir;
      if (depth < -1.5 || depth > 7 || Math.abs(seen.pos.y - hole.y) > 4 || (seen.pos.x - a.pos.x) * dir < -.5) return null;
      // A man he has already passed on his way across (a backside chaser
      // behind his own flow), judged a beat ahead at the speeds he sees, is
      // not his: turning back against the grain for him left the wrapper
      // reversing out of the hole the runner needs.
      const beat = a.mind.decisionInterval;
      if ((seen.pos.y + seen.vel.y * beat - a.pos.y - a.vel.y * beat) * side < -1
        && !this.liveBehind(a, sim, d, seen, ball)) return null;
      if (runner && (ball.x - seen.pos.x) * dir > runner.profile.radius + d.profile.radius) return null;
      const lead = .3, s = Math.hypot(seen.pos.x + seen.vel.x * lead - hole.x, seen.pos.y + seen.vel.y * lead - hole.y);
      const claimed = mates.some(m => Math.hypot(m.pos.x - seen.pos.x, m.pos.y - seen.pos.y) <= m.r + d.profile.radius + .1);
      return s < 7 ? s + (claimed ? 100 : 0) : null;
    };
    let best: Agent | null = null, bestScore = Infinity;
    for (const d of sim.defense) {
      const s = score(d);
      if (s !== null && s < bestScore) { bestScore = s; best = d; }
    }
    // Keep a man who is still a threat unless another is clearly more urgent;
    // once he is closing on him (2.5 yd in his picture), or can already reach
    // him within a second at the speeds he sees, he finishes him. Re-picking
    // whoever is nearest the hole point each beat had counter's wrap change
    // men a median 3 times before blocking anyone (79% twice or more).
    const kept = current ? score(current) : null;
    const seenCurrent = current ? sim.see(a, current) : null;
    const closing = kept !== null && Math.hypot(seenCurrent!.pos.x - a.pos.x, seenCurrent!.pos.y - a.pos.y) < 2.5;
    const reachable = kept !== null && !closing && interceptPoint({ pos: a.pos, vel: a.vel, profile: a.profile },
      (tt) => ({ x: seenCurrent!.pos.x + seenCurrent!.vel.x * tt, y: seenCurrent!.pos.y + seenCurrent!.vel.y * tt }),
      { horizon: 1, step: .1, radius: a.profile.radius + current!.profile.radius }).estimate.status === 'estimated-feasible';
    return kept !== null && (closing || reachable || bestScore > kept - 1.5) ? current : best;
  }

  /** No man yet: get in front of the runner he sees and keep looking. */
  private leadRunner(a: Agent, sim: PlaySim): MoveCommand {
    const ref = this.workReference(a, sim), dir = sim.attackDir(a.team);
    return goTo(a, { x: dir > 0 ? Math.max(ref.x, a.pos.x) + 2.5 : Math.min(ref.x, a.pos.x) - 2.5, y: ref.y }, { speed: .95 });
  }

  /** The range from this man to the ball is opening at the speeds he sees:
   * a runner bending toward a man is not leaving him behind. */
  private opening(ball: Vec2, ballVel: Vec2, seen: Perceived): boolean {
    const rx = ball.x - seen.pos.x, ry = ball.y - seen.pos.y;
    return rx * (ballVel.x - seen.vel.x) + ry * (ballVel.y - seen.vel.y) > 0;
  }

  private readPull(a: Agent, sim: PlaySim, target: Agent): NonNullable<RunBlocker['pullRead']> {
    if (!this.pullRead || this.pullRead.target !== target || sim.t >= this.pullRead.nextRead) {
      const seen = sim.see(a, target);
      // Compare distinct sampled pictures, not their dead-reckoned positions
      // or repeated uses of a held read. A slowing man may stop; it is
      // not evidence of a future reversal or of a new burst of acceleration.
      const previous = this.pullRead;
      const elapsed = previous?.target === target
        ? sim.t - (seen.age ?? 0) - (previous.at - (previous.seen.age ?? 0)) : 0;
      const braking = elapsed <= 1e-6 && previous?.target === target
        ? { ...previous.braking } : { x: 0, y: 0 };
      if (elapsed > 1e-6 && previous) {
        const speed = Math.hypot(seen.vel.x, seen.vel.y);
        const rate = (speed - Math.hypot(previous.seen.vel.x, previous.seen.vel.y)) / elapsed;
        if (speed > 0 && rate < 0) {
          braking.x = seen.vel.x / speed * rate;
          braking.y = seen.vel.y / speed * rate;
        }
      }
      const exitY = this.plan.pullPath?.at(-1)?.y ?? a.pos.y;
      const fromY = this.homeY ?? a.pos.y;
      // The installed crossing corridor identifies teammates to check. Their
      // observed bodies, rather than their hidden block state, locate its rear
      // surface. Other pullers clear their own routes instead of becoming a
      // permanent wall for the first puller.
      const wall = sim.offense.filter(b => b !== a && (isOL(b) || sim.offAlign.spots[b.slot]?.inline)
        && !(b.behavior instanceof RunBlocker && b.behavior.plan.kind === 'pull')
        && sim.offAlign.spots[b.slot].pos.y >= Math.min(fromY, exitY)-b.profile.radius
        && sim.offAlign.spots[b.slot].pos.y <= Math.max(fromY, exitY)+b.profile.radius);
      const side = playSideSign(sim,sim.offCall.run!) * (sim.offCall.run!.scheme === 'splitZone' ? -1 : 1);
      const surfaces = wall.map(b => ({b,seen:sim.see(a,b)})).filter(({b,seen}) => {
        if (this.plan.pullSurface) return true; // GH retains its surface/traffic contract.
        // A lateral station alone does not put a body in this crossing path.
        // Bound the current/installed flat path and both observed sweeps for
        // this read, allowing their full ordinary ground acceleration. A body
        // wholly beyond that combined width cannot require a retreat to its
        // rear x coordinate. This adds no unseen future decision or clearance.
        const dt = a.mind.decisionInterval, flatX = this.plan.pullPath?.[1]?.x ?? a.pos.x;
        const ownLow = Math.min(a.pos.x, flatX, a.pos.x + a.vel.x * dt);
        const ownHigh = Math.max(a.pos.x, flatX, a.pos.x + a.vel.x * dt);
        const peerLow = Math.min(seen.pos.x, seen.pos.x + seen.vel.x * dt);
        const peerHigh = Math.max(seen.pos.x, seen.pos.x + seen.vel.x * dt);
        const width = a.profile.radius + b.profile.radius + .5 * dt * dt
          * (supportParams(a.profile).traction / a.profile.massKg + supportParams(b.profile).traction / b.profile.massKg);
        if (peerHigh < ownLow - width || peerLow > ownHigh + width) return false;
        // A down-blocker already behind the crossing body is no longer an
        // obstacle to this corner. Retain a closing body that can re-enter
        // their combined width before the next ordinary acquired read.
        const lateral = (seen.pos.y-a.pos.y)*side;
        const closing = Math.max(0,(seen.vel.y-a.vel.y)*side)*a.mind.decisionInterval;
        return lateral+closing >= -(a.profile.radius+b.profile.radius);
      });
      const clearanceX = surfaces.length ? Math.min(...surfaces.map(({b,seen}) => seen.pos.x-b.profile.radius))
        : this.plan.pullSurface ? this.plan.pullPath?.[0]?.x ?? a.pos.x+a.profile.radius : null;
      this.pullRead = { target, seen: { ...seen, pos: { ...seen.pos }, vel: { ...seen.vel } },
        clearanceX, nextRead: sim.t + a.mind.decisionInterval, at: sim.t, braking };
    }
    return this.pullRead;
  }

  /** Forecast from the acquired sample, undoing PerceptionBuffer's linear
   * age prediction first. Braking ends at rest, never at an invented reversal. */
  private kickPicture(sim: PlaySim, ahead = 0): Perceived {
    const read = this.pullRead!, seen = read.seen;
    const age = seen.age ?? 0, elapsed = age + sim.t - read.at + ahead;
    const pos = { ...seen.pos }, vel = { ...seen.vel };
    for (const axis of ['x', 'y'] as const) {
      const v = seen.vel[axis], brake = read.braking[axis];
      const dt = brake ? Math.min(elapsed, -v / brake) : elapsed;
      pos[axis] += v * (dt - age) + .5 * brake * dt * dt;
      vel[axis] = v + brake * dt;
    }
    return { ...seen, pos, vel };
  }

  /** REACH_TECHNIQUE: a zone reach on his own man races for the play-side shoulder. */
  reachGoal(a: Agent, sim: PlaySim, e: Engagement): EngagedGoal | null {
    const run = sim.offCall.run;
    // DOUBLE_OVERTAKE: the backside man of a stretch double races for the
    // man's play-side half with his partner on him (the overtake).
    if (DOUBLE_OVERTAKE && run && e.blocker === a && e.helpers.length && this.plan.target === e.defender
      && (run.scheme === 'outsideZone' || run.scheme === 'wideZone') && this.plan.combination) {
      const ps = playSideSign(sim, run), partner = this.plan.combination.members.find((m) => m !== a);
      if (partner && (partner.pos.y - a.pos.y) * ps > 0) return { kind: 'reach', side: ps };
    }
    const cutoffReach = CUTOFF_RACE && this.plan.kind === 'cutoff' && !!run && (run.scheme === 'outsideZone' || run.scheme === 'wideZone');
    if (e.blocker !== a || e.helpers.length || (this.plan.kind !== 'reach' && !cutoffReach) || this.plan.target !== e.defender) return null;
    return run ? { kind: 'reach', side: playSideSign(sim, run) } : null;
  }

  /** ENGAGED_TECHNIQUE: a climber on his backer with the runner in his
   * pictures walls him off from the ball; every other engaged job drives. */
  engagedGoal(a: Agent, sim: PlaySim, e: Engagement): EngagedGoal | null {
    if (e.blocker !== a || e.helpers.length) return null;
    const plan = this.plan;
    if (plan.kind === 'climb' && plan.target === e.defender) {
      const picture = this.workPicture;
      if (picture?.source === 'acquired' && picture.carrier != null && picture.carrier !== sim.qb.idx) {
        const ref = this.workReference(a, sim), seen = sim.see(a, e.defender), dy = seen.pos.y - ref.y;
        // A backer flowing hard across with the runner behind his flow is run
        // past the hole (take him where he is going; the back cuts behind).
        // One working back toward the runner's lane is walled off from it.
        const flow = Math.abs(seen.vel.y) > 1.5 ? Math.sign(seen.vel.y) : 0;
        if (flow && flow * Math.sign(dy) > 0) return { kind: 'runWith', flow };
        if (Math.abs(dy) >= .3) return { kind: 'wall', away: Math.sign(dy) };
      }
    }
    return { kind: 'drive' };
  }

  private attack(a: Agent, sim: PlaySim, target: Agent, picture?: Perceived, preparedClimb?: Intent | null): MoveCommand {
    const plan = this.plan;
    let seen = picture ?? (plan.kind === 'pull' && (plan.pullRole === 'kick' || plan.pullRole === 'trap')
      ? this.readPull(a, sim, target).seen : sim.see(a,target));
    // Ordinary held reads need only time since acquisition. The kick forecast
    // replaces the original age prediction as well when braking was observed.
    if (plan.kind === 'pull' && this.pullRead && seen === this.pullRead.seen) {
      const dt = sim.t - this.pullRead.at;
      seen = plan.pullRole === 'kick' ? this.kickPicture(sim)
        : { ...seen, pos: { x: seen.pos.x + seen.vel.x * dt, y: seen.pos.y + seen.vel.y * dt } };
    }
    if (plan.kind === 'pull' && plan.pullRole === 'lead' && (seen.pose === 'down' || seen.pose === 'rising')) return stand();
    const zone = this.zoneEligible(a, sim) ? this.readZone(a, sim, target, seen) : null;
    const combinationFit = this.combinationFit(a, sim, target);
    const contact = a.profile.radius + target.profile.radius + 0.1 + (a.player.measurables.armIn / 36) * 0.45;
    if ((plan.pullRole === 'kick' || plan.pullRole === 'trap') && !a.tags.has('block-log')) {
      const ps = playSideSign(sim,sim.offCall.run!)*(sim.offCall.run!.scheme === 'splitZone' ? -1 : 1);
      // If the end crosses the puller's inside shoulder, getting back inside
      // him would expose the runner. Fit his outside shoulder and wash inward.
      // A counter end who already ran behind the puller's strike envelope
      // has not wrong-armed his entry shoulder. Keep the kick responsibility
      // and its runner-side fit; do not signal a log from a distant rear cue.
      const entrySide = sim.offCall.run!.scheme !== 'counter'
        || (seen.pos.x-a.pos.x)*sim.attackDir(a.team) >= -contact;
      if (entrySide && (seen.pos.y-a.pos.y)*ps < -.25 && seen.pos.x < sim.los+.8) {
        plan.drive = norm({x:.45,y:-ps});
        a.tags.add('block-log');
        sim.event('block_log',a,target,'kick target crossed inside shoulder');
      }
    }
    const dd = Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y);
    // A run block starts with the strike, before torsos meet. Keep functional
    // extension shorter than a pass-pro punch; long arms can catch a slant.
    const fitCandidate = onLine(a, sim) && (plan.kind === 'drive' || plan.kind === 'reach' || plan.kind === 'cutoff' || plan.kind === 'down')
      && (!plan.combination || plan.combination.released)
      && !sim.world.joints.some(j => j.a === a.body || j.b === a.body);
    const contactFit = fitCandidate && plan.kind === 'cutoff' && plan.contactFit?.target === target
      ? plan.contactFit : null;
    // A clearly lost shoulder is a foot-recovery decision, not a fresh hold.
    // Keep marginal reaches and actual collisions; use the same observed
    // leverage boundary as an established run block, without a time grace.
    const fitDrive = contactFit ? { x: -contactFit.axis.x, y: -contactFit.axis.y }
      : zone ? { x: 1, y: 0 } : plan.drive;
    const installedLost = fitCandidate && Math.abs(observedBlockLeverage(a, seen, fitDrive)) >= 1.1;
    const runnerFit = !sim.world.joints.some(j => j.a === a.body || j.b === a.body)
      ? this.runnerSideFit(a, sim, target, seen) : null;
    const lost = runnerFit ? runnerFit.lost : installedLost;
    // A solo drive still strikes downhill from an ordinary fit. Once the
    // personally observed shoulder is gone, replace the feet before reaching
    // again, using the same bounded recovery as other first-level blocks.
    // Once the carrying back is acquired, crossing the old drive normal need
    // not lose useful screening position. Do not recover to its opposite side.
    const fit = fitCandidate && (plan.kind !== 'drive' || lost) && (!runnerFit || !installedLost);
    if (!lost && dd < contact && !this.scoopsPast(a, sim, seen)) {
      const e = sim.engage(a, target, 'run', plan.drive, contactFit ?? combinationFit?.surface);
      if (e) {
        if (zone && e.blocker === a && !e.helpers.length) this.applyZoneContact(a, sim, true);
        return stand();
      }
    }
    // An unjoined helper collecting the original first-level responsibility
    // may find its old half occupied by the former owner. Use acquired body
    // pictures to choose a free strike surface, never the defender's private
    // engagement flag. Real hands still require separate physical eligibility.
    const combo=plan.kind==='combo'&&plan.combination?.helpPolicy?.kind==='check'?plan.combination:null;
    if(combo&&!combo.released&&combo.members[1]===a&&combo.defender===target
      && !sim.world.joints.some(j=>j.a===a.body||j.b===a.body)){
      const partner=combo.members[0],read=this.collectionRead;
      if(!read||read.target!==target||read.partner!==partner||sim.t>=read.nextRead){
        const covered={seen:sim.see(a,partner),radius:partner.profile.radius};
        const others=sim.offense.filter(p=>p!==a&&p!==partner).map(p=>({seen:sim.see(a,p),radius:p.profile.radius}));
        const choice=readCollectionApproach(a,seen,covered,others,contact,sim.attackDir(a.team),
          a.mind.placementError*(1-.5*a.r('runBlock')),a.mind.decisionInterval);
        this.collectionRead={target,partner,at:sim.t,nextRead:sim.t+a.mind.decisionInterval,
          down:structuredClone(seen),choice};
      }
      const current=this.collectionRead!;
      if(current.choice)return collectionCommand(a,current.choice,sim.t-current.at,current.down);
    }else this.collectionRead=null;
    // Aiming point: reach blocks work to the playside shoulder.
    let aim = seen.pos;
    // DOUBLE_OVERTAKE: the backside man of a stretch double on a man flowing
    // play side runs to where the man is going, level with him.
    const overtakePartner = DOUBLE_OVERTAKE && plan.combination && !plan.combination.released && plan.combination.defender === target
      && sim.offCall.run && (sim.offCall.run.scheme === 'outsideZone' || sim.offCall.run.scheme === 'wideZone')
      ? plan.combination.members.find((b) => b !== a) : undefined;
    const overtakeSide = overtakePartner && sim.offCall.run ? playSideSign(sim, sim.offCall.run) : 0;
    if (overtakePartner && (overtakePartner.pos.y - a.pos.y) * overtakeSide > 0 && seen.vel.y * overtakeSide > 0)
      aim = { x: seen.pos.x - 0.35, y: seen.pos.y + seen.vel.y * .35 };
    else if (contactFit) {
      const sep = a.profile.radius + target.profile.radius + .15;
      aim = { x: seen.pos.x + contactFit.axis.x * sep, y: seen.pos.y + contactFit.axis.y * sep };
    } else if (zone) {
      const side = zone.phase === 'runoff' ? -zone.side : zone.side;
      aim = { x: seen.pos.x - .3, y: seen.pos.y + side * .6 };
    } else if (combinationFit) {
      aim = { x: seen.pos.x + combinationFit.offset.x, y: seen.pos.y + combinationFit.offset.y };
    } else if (plan.kind === 'combo' && plan.combination) {
      const partner = plan.combination.members.find((b) => b !== a)!;
      const side = Math.sign(a.pos.y - partner.pos.y) || 1;
      aim = { x: seen.pos.x - 0.35, y: seen.pos.y + side * 0.55 };
    } else if (a.tags.has('block-log')) aim = {x:seen.pos.x-.3,y:seen.pos.y-plan.drive.y*.65};
    else if (plan.kind === 'reach' || plan.kind === 'cutoff') aim = { x: seen.pos.x - 0.3, y: seen.pos.y + plan.drive.y * 0.6 };
    else if (plan.kind === 'down') {
      // A down or back block fits the shoulder the man would run through to
      // the ball, where he will be when this body gets there, as the kick
      // fits the end: between him and the ball he sees. Aimed at his spot, a
      // center blocking back on a tackle firing into the pulled guard's
      // vacated spot met him beside his track, upfield of the line, and the
      // tackle ran past his hip into the backfield. Tracked centers stay
      // flat, half a yard in front of him and on his play-side hip.
      const at = interceptPoint({ pos: a.pos, vel: a.vel, profile: a.profile },
        (tt) => ({ x: seen.pos.x + seen.vel.x * tt, y: seen.pos.y + seen.vel.y * tt }),
        { horizon: 1.0, step: .05, radius: a.profile.radius + target.profile.radius }).point;
      const ref = this.workReference(a, sim), dx = ref.x - at.x, dy = ref.y - at.y, n = Math.hypot(dx, dy);
      const sep = a.profile.radius + target.profile.radius;
      aim = n > sep ? { x: at.x + dx / n * sep, y: at.y + dy / n * sep } : { x: at.x - 0.2, y: at.y - plan.drive.y * 0.4 };
    }
    else if (plan.kind === 'climb' || plan.kind === 'lead' || (plan.kind === 'pull' && plan.pullRole === 'lead')) {
      // Climbs and leads intercept: aim where the backer will be when this
      // body can get there (his seen motion carried forward, our own reach
      // law), not a quarter second ahead of a flowing backer. CLIMB_INTERCEPT=0
      // restores the short lead.
      const lead = CLIMB_INTERCEPT ? interceptPoint({ pos: a.pos, vel: a.vel, profile: a.profile },
        (tt) => ({ x: seen.pos.x + seen.vel.x * tt, y: seen.pos.y + seen.vel.y * tt }),
        { horizon: 1.5, step: .05, radius: a.profile.radius + target.profile.radius }).point
        : { x: seen.pos.x + seen.vel.x * 0.25, y: seen.pos.y + seen.vel.y * 0.25 };
      aim = a.mind.aim('block-fit', lead, sim.t);
    }
    const nominalAim = aim;
    const placementError = a.mind.placementError * (1 - 0.5 * a.r('runBlock'));
    aim = { x: aim.x, y: clamp(aim.y + placementError, 0.5, FIELD_WIDTH - 0.5) };
    // A kick/trap is a fit on a moving shoulder, not a sprint through the
    // defender's old spot. Match his lateral motion and brake the offset;
    // ordinary drive blocks retain their downhill strike.
    if (plan.kind === 'pull' && (plan.pullRole === 'kick' || plan.pullRole === 'trap')) {
      const facing = Math.atan2(seen.pos.y-a.pos.y,seen.pos.x-a.pos.x);
      if (a.tags.has('block-log')) {
        const side = Math.sign(plan.drive.y) || 1;
        return track(a, { x: aim.x-.25, y: aim.y-side*.45 }, seen.vel, { speed: .95, gain: 3, facing });
      }
      // Kick him out from inside: fit the shoulder he would run through to
      // the ball, on his line to the runner the puller has acquired. Matching
      // the end's own velocity let a penetrating end drag the puller 6 yd
      // deep while still 3-5 yd away laterally, never touching him (G1 P031).
      // Going for his path to the runner meets him wherever he comes from.
      // Where he will be when this body gets there, a short beat ahead: an
      // end squeezing along the line crossed in front of a puller who fit
      // his seen spot and passed under him.
      const at = plan.pullRole === 'kick' ? interceptPoint({ pos: a.pos, vel: a.vel, profile: a.profile },
        (tt) => this.kickPicture(sim, tt).pos,
        { horizon: .6, step: .05, radius: a.profile.radius + target.profile.radius }).point : seen.pos;
      const ref = this.workReference(a, sim), dx = ref.x - at.x, dy = ref.y - at.y, n = Math.hypot(dx, dy);
      const sep = a.profile.radius + target.profile.radius + .15;
      const shoulder = n > sep ? { x: at.x + dx / n * sep, y: clamp(at.y + dy / n * sep + placementError, .5, FIELD_WIDTH - .5) }
        : { x: aim.x-.25, y: aim.y-(Math.sign(plan.drive.y) || 1)*.45 };
      return track(a, shoulder, { x: 0, y: 0 }, { speed: .95, gain: 3, facing });
    }
    if (plan.arcAround && plan.kind === 'climb') {
      // WING_CALL arc: flat outside the man over him at the line, then up.
      const dirA = sim.attackDir(a.team), man = sim.see(a, plan.arcAround), out = Math.sign(a.pos.y - sim.ballY) || 1;
      // A flat, wide first release: stay about 1.5 yd off the man until past him.
      const clear = 1.6;
      if ((a.pos.x - man.pos.x) * dirA < .3 && (a.pos.y - man.pos.y) * out < clear - .2)
        return runThrough(a, { x: Math.min(a.pos.x * dirA + .3, man.pos.x * dirA - .6) * dirA, y: man.pos.y + out * (clear + .3) });
    }
    if (CLIMB_PLAN && plan.kind === 'climb' && sim.offCall.run) {
      const fit = preparedClimb ?? this.plannedClimb(a, sim, target, contact);
      if (fit) {
        const bodyContact = a.profile.radius + target.profile.radius;
        // Interception supplies the approach, not permission to run through
        // the man. Use the same acquired near-strike fit as other climbs.
        if (!CLIMB_PATH && !this.climbAccess && Math.hypot(seen.pos.x-a.pos.x, seen.pos.y-a.pos.y) <= contact + bodyContact)
          return secondLevelBlockApproach(a, seen, plan.drive, this.climbRead!.meet,
            placementError, contact, bodyContact, fit, sim.t);
        return fit;
      }
    }
    if (plan.kind === 'climb' || plan.kind === 'lead' || (plan.kind === 'pull' && plan.pullRole === 'lead')) {
      const command = track(a, aim, seen.vel, { speed: 1, gain: 3,
        facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x) });
      return secondLevelBlockApproach(a, seen, plan.drive, nominalAim, placementError,
        contact, a.profile.radius + target.profile.radius, command, sim.t);
    }
    const original = runThrough(a, aim, { speed: 1 });
    if (runnerFit?.lost) return chooseRunBlockFit(a, seen,
      { x: -runnerFit.axis.x, y: -runnerFit.axis.y }, runnerFit.aim, placementError,
      contact, a.profile.radius + target.profile.radius, original, sim.t, true);
    return fit ? chooseRunBlockFit(a, seen, fitDrive, nominalAim, placementError,
      contact, a.profile.radius + target.profile.radius, { ...original, posture: .7 }, sim.t,
      !!zone || !!contactFit, zone ? 2.4 : 0) : original;
  }

  /** Neighboring zone halves share a depth normal, not the diagonal drive
   * direction. The first member's own installed half is the desired angle.
   * Pass this only at acquisition: existing hands retain their actual frame. */
  private combinationFit(a: Agent, sim: PlaySim, target: Agent):
    { offset: Vec2; surface: RunContactSurface } | null {
    const combo = this.plan.combination, scheme = sim.offCall.run?.scheme;
    if (!combo || combo.released || combo.defender !== target || !combo.members.includes(a)
      || (scheme !== 'outsideZone' && scheme !== 'wideZone')) return null;
    const partner = combo.members.find(member => member !== a)!;
    const ownY = sim.offAlign.spots[a.slot]?.pos.y, partnerY = sim.offAlign.spots[partner.slot]?.pos.y;
    if (ownY === undefined || partnerY === undefined || ownY === partnerY) return null;
    const half = Math.sign(ownY - partnerY), direction = sim.attackDir(a.team);
    // Bisect the two authored half-man landmarks (-.35, +/-.55). Their
    // shared normal admits both halves; the angle keeps each member's job.
    const axis = norm({ x: -.35 * direction, y: 0 });
    const offset = { x: -.35 * direction, y: half * .55 }, lat = { x: -axis.y, y: axis.x };
    const sealTarget = Math.atan2(-(offset.x * lat.x + offset.y * lat.y),
      offset.x * axis.x + offset.y * axis.y) / (Math.PI / 2);
    return { offset, surface: { axis, sealTarget } };
  }

  private zoneEligible(a: Agent, sim: PlaySim): boolean {
    const e = a.engagement;
    return (isOL(a) || !!sim.offAlign.spots[a.slot]?.inline) && this.plan.kind === 'reach'
      && (sim.offCall.run?.scheme === 'outsideZone' || sim.offCall.run?.scheme === 'wideZone')
      && (!this.plan.combination || this.plan.combination.released)
      && (!e || (e.type === 'run' && e.blocker === a && !e.helpers.length))
      && !sim.world.joints.some(j => (j.a === a.body || j.b === a.body) && j !== e?.hands);
  }

  private readZone(a: Agent, sim: PlaySim, target: Agent, picture?: Perceived): ZoneReachRead {
    if (!this.zoneRead || this.zoneRead.target !== target.idx || sim.t >= this.zoneRead.nextRead) {
      const seen = picture ?? sim.see(a, target);
      const bodyContact = a.profile.radius + target.profile.radius;
      const contact = bodyContact + .1 + a.player.measurables.armIn / 36 * .45;
      const side = playSideSign(sim, sim.offCall.run!);
      const choice = readZoneReach(a, seen, side, this.soloDrive!, contact, bodyContact);
      this.zoneRead = { ...choice, target: target.idx, side, t: sim.t,
        nextRead: sim.t + a.mind.decisionInterval,
        seen: { ...seen, pos: { ...seen.pos }, vel: { ...seen.vel } } };
      this.plan.drive = { ...choice.drive };
      this.applyZoneContact(a, sim);
    }
    return this.zoneRead;
  }

  private applyZoneContact(a: Agent, sim: PlaySim, acquired = false): void {
    const e = a.engagement, read = this.zoneRead;
    if (!e || !read || e.blocker !== a || e.helpers.length) return;
    // Acquire new solo-zone hands in the vertical fit frame. A real rep that
    // arrived through another job retains its acquired surface instead: a
    // new read must not rotate the loss angle of loaded hands without motion.
    e.surfaceAxis ??= acquired ? { x: -1, y: 0 } : { ...axisOf(sim, e) };
    e.drive = { ...read.drive };
    // Project the desired world-lateral fit into that persistent frame. This
    // is an intention, never a body-position or hand-control assignment.
    e.sealTarget = 2 / Math.PI * Math.asin(
      Math.sin(read.sealTarget * Math.PI / 2) * -e.surfaceAxis.x);
  }

  private rememberSoloWork(): void {
    const p = this.plan;
    this.soloKind ??= p.kind === 'combo' ? combinationSoloKind(p.combination)
      : p.kind === 'climb' ? 'drive' : p.kind;
    this.soloDrive ??= { ...p.drive };
  }

  private classifyWork(a: Agent, sim: PlaySim, target: Agent): void {
    const p = this.plan;
    delete p.contactFit;
    // Reserved kick/trap jobs and pass influence retain their installed
    // responsibility. A wrap/lead already has a second-level approach.
    if (RESERVED_RUN_KINDS.has(p.kind)) return;
    const seen = sim.see(a, target);
    // Location in the consumed picture, not a linebacker roster label or the
    // defender's unseen current depth, identifies a new second-level job.
    if (seen.pos.x > sim.los + 2) {
      p.kind = 'climb';
      p.drive = { x: 1, y: 0 };
    } else {
      p.kind = this.soloKind ?? 'drive';
      p.drive = { ...this.soloDrive! };
      // An explicit planned-backer climb can encounter a backer who has
      // already filled the surface. Use the ordinary solo collection there.
      if (p.kind === 'combo' || p.kind === 'climb') p.kind = 'drive';
    }
  }

  private readRules(a: Agent, sim: PlaySim): void {
    const p = this.plan;
    if (!isOL(a) || RESERVED_RUN_KINDS.has(p.kind)) return;
    // Adjacent unengaged owners can pass crossing shades. Both must benefit;
    // an engaged defender or a live double is never reassigned remotely.
    for (const b of sim.offense) {
      if (b === a || !isOL(b) || b.engagement || !(b.behavior instanceof RunBlocker) || Math.abs(b.pos.y-a.pos.y)>2) continue;
      const q = b.behavior.plan;
      if (!p.target || !q.target || p.target === q.target || p.combination || q.combination || RESERVED_RUN_KINDS.has(q.kind)) continue;
      if (p.target.engagement || q.target.engagement) continue;
      const d = sim.see(a,p.target), other = sim.see(a,q.target);
      const mine = Math.abs(d.pos.y-a.pos.y), theirs = Math.abs(other.pos.y-b.pos.y);
      if (Math.abs(other.pos.y-a.pos.y)+.35 < mine && Math.abs(d.pos.y-b.pos.y)+.35 < theirs) {
        const traceA = sim.blockingSink(a), previousA = traceA?.blockingState(a);
        const traceB = sim.blockingSink(b), previousB = traceB?.blockingState(b);
        // The recipient may not have updated yet. Save his installed solo
        // technique before exchanging and reclassifying either responsibility.
        b.behavior.rememberSoloWork();
        [p.target,q.target] = [q.target,p.target];
        // An exchanged responsibility changes the approach too. Each player
        // classifies his new work from his own delayed picture, not the
        // exchanging neighbor's image or the defender's roster position.
        this.classifyWork(a, sim, p.target);
        b.behavior.classifyWork(b, sim, q.target);
        traceA?.blockingChange(a, previousA, 'crossing-exchange', sim);
        traceB?.blockingChange(b, previousB, 'crossing-exchange', sim);
        sim.event('block_exchange',a,b,'adjacent crossing threats');
        return;
      }
    }
    // Look–lean–climb: an uncovered lineman collects a penetrating body in
    // his gap before leaving for the backer. Reserved kick targets are only
    // collected after they have actually penetrated the surface.
    if (p.kind !== 'climb' && p.kind !== 'combo' && !this.presentingDraw(sim.t)) return;
    const threat = sim.defense.filter((d) => !d.engagement && !d.isDown(sim.t)).find((d) => {
      const s = sim.see(a,d);
      return s.pos.x < sim.los-.25 && s.pos.x > a.pos.x-1 && Math.abs(s.pos.y-(this.homeY ?? a.pos.y)) < .9;
    });
    this.presentationThreat = threat ?? null;
    if (!threat || threat === p.target) return;
    if (p.combination && !p.combination.released)
      abandonCombination(a, sim, p.combination, 'collecting penetration before climb');
    const trace = sim.blockingSink(a), previousWork = trace?.blockingState(a);
    p.target = threat; p.kind = 'drive';
    delete p.contactFit;
    a.tags.add('block-collect');
    trace?.blockingChange(a, previousWork, 'penetration-collection', sim);
    sim.event('block_collect',a,threat,'penetration before climb');
  }

  /** First threat to show: a free climbing lineman or lead back whose man
   * is not the danger to the runner takes the free defender who is. All of
   * it comes from his own delayed pictures: the runner he has acquired, each
   * defender's body and whether it is visibly blocked, and his teammates'
   * bodies. He switches only to a man clearly nearer the runner than his own,
   * one he is nearer than the runner is, and one no teammate is nearer.
   * Stalks keep their perimeter ledger. */
  /** GAP_CLIMB: a free zone lineman whose man is beaten to his backside
   * (a yard behind his body across, not gaining on him) has nobody in his
   * play-side gap: he climbs to the nearest second-level man in front of that
   * gap whom no teammate is nearer. All from his own acquired pictures. */
  private gapClimb(a: Agent, sim: PlaySim): void {
    const p = this.plan, run = sim.offCall.run, target = p.target;
    if (!run || !isOL(a) || a.engagement || !target || !['reach', 'cutoff', 'drive'].includes(p.kind)
      || !['insideZone', 'outsideZone', 'wideZone', 'splitZone'].includes(run.scheme)
      || (p.combination && !p.combination.released) || p.departure || sim.t < startOf(a) + .6) return;
    const ps = playSideSign(sim, run), dir = sim.attackDir(a.team), seen = sim.see(a, target);
    if ((seen.pos.x - sim.los) * dir > 1.5) return; // already a second-level job
    const beaten = (a.pos.y - seen.pos.y) * ps > 1 && (seen.vel.y - a.vel.y) * ps <= 0;
    if (!beaten) return;
    const mates = sim.offense.filter(o => o !== a && o !== sim.qb && isOL(o)).map(o => sim.see(a, o).pos);
    let best: Agent | null = null, bd = Infinity;
    for (const d of sim.defense) {
      if (d === target) continue;
      const s = sim.see(a, d);
      if (s.pose === 'down' || s.pose === 'rising') continue;
      const depth = (s.pos.x - sim.los) * dir, across = (s.pos.y - a.pos.y) * ps;
      if (depth < 1.5 || depth > 8 || across < -1 || across > 4) continue;
      const reach = Math.hypot(s.pos.x - a.pos.x, s.pos.y - a.pos.y);
      if (mates.some(m => Math.hypot(m.x - s.pos.x, m.y - s.pos.y) < reach - .5)) continue;
      if (reach < bd) { bd = reach; best = d; }
    }
    if (!best) return;
    const trace = sim.blockingSink(a), previousWork = trace?.blockingState(a);
    p.target = best;
    this.acquiredWork = { target: best };
    delete p.contactFit;
    this.climbRead = null;
    this.climbAccess = null;
    this.departureAccess = null;
    this.rememberSoloWork();
    p.kind = 'climb';
    p.drive = { x: 1, y: 0 };
    trace?.blockingChange(a, previousWork, 'gap-climb: man beaten to his backside, play-side gap empty', sim);
    sim.event('block_threat', a, best, 'play-side gap empty: climb');
  }

  private rereadThreat(a: Agent, sim: PlaySim): void {
    const p = this.plan, target = p.target;
    if (!target || (p.kind !== 'climb' && p.kind !== 'lead')
      || (p.combination && !p.combination.released) || p.departure) return;
    const ref = this.workReference(a, sim), picture = this.workPicture!;
    if (picture.source !== 'acquired' || picture.carrier === sim.qb.idx) return;
    const dir = sim.attackDir(a.team), beat = a.mind.decisionInterval;
    // Distance to the runner, less what his closing speed takes off it over
    // one second: a man running at the runner counts as nearer than he is.
    const danger = (seen: Perceived) => {
      const dx = ref.x - seen.pos.x, dy = ref.y - seen.pos.y, d = Math.hypot(dx, dy);
      const closing = d > 1e-9 ? ((seen.vel.x - picture.vel.x) * dx + (seen.vel.y - picture.vel.y) * dy) / d : 0;
      return { d, score: d - Math.max(0, closing) };
    };
    // His own man is judged as any other: one who has run under him and is
    // behind his back a beat ahead (a backer flowing with the play beneath a
    // climber) is pursuit now, not a block in front of him. He takes the
    // next threat in front of him instead of turning back for that man.
    const seenMine = sim.see(a, target);
    // A live filler behind him stays his only while he can still meet him:
    // a backer running under a climber at speed is past him whatever his
    // course to the ball.
    const strike = a.profile.radius + target.profile.radius + .1 + a.player.measurables.armIn / 36 * .45;
    const passed = !a.engagement && (seenMine.pos.x + seenMine.vel.x * beat - a.pos.x - a.vel.x * beat) * dir < -1
      && !(this.liveBehind(a, sim, target, seenMine, ref) && interceptPoint({ pos: a.pos, vel: a.vel, profile: a.profile },
        (tt) => ({ x: seenMine.pos.x + seenMine.vel.x * tt, y: seenMine.pos.y + seenMine.vel.y * tt }),
        { horizon: beat, step: .05, radius: strike }).estimate.status === 'estimated-feasible');
    const mine = passed ? { d: Infinity, score: Infinity } : danger(seenMine);
    if (mine.d < 4) return;
    const mates = sim.offense.filter(o => o !== a && o !== sim.qb && o.idx !== picture.carrier).map(o => ({ o, pos: sim.see(a, o).pos }));
    let best: { d: Agent; score: number } | null = null;
    for (const d of sim.defense) {
      if (d === target) continue;
      const seen = sim.see(a, d);
      if (seen.pose === 'down' || seen.pose === 'rising') continue;
      const threat = danger(seen);
      // Behind the runner he is pursuit, not a man to block in front of him.
      if ((seen.pos.x - ref.x) * dir < -1 || threat.score > mine.score - 2.5) continue;
      // A man he has already climbed past, judged a beat ahead, is behind his
      // back: turning around to chase him is pursuit too, not a block.
      if ((seen.pos.x + seen.vel.x * beat - a.pos.x - a.vel.x * beat) * dir < -1
        && !this.liveBehind(a, sim, d, seen, ref)) continue;
      const reach = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
      // A teammate nearer the man, or one he sees in contact range of him
      // (a keeper at arm's length on the man he just left), already has him.
      if (reach >= threat.d || mates.some(({ o, pos }) => {
        const gap = Math.hypot(pos.x - seen.pos.x, pos.y - seen.pos.y);
        return gap < reach - .5 || gap <= o.profile.radius + d.profile.radius + o.player.measurables.armIn / 36;
      })) continue;
      if (!best || threat.score < best.score) best = { d, score: threat.score };
    }
    if (!best) return;
    const trace = sim.blockingSink(a), previousWork = trace?.blockingState(a);
    p.target = best.d;
    this.acquiredWork = { target: best.d };
    delete p.contactFit;
    this.climbRead = null;
    this.climbAccess = null;
    this.departureAccess = null;
    this.classifyWork(a, sim, best.d);
    trace?.blockingChange(a, previousWork, 'threat-reread', sim);
    sim.event('block_threat', a, best.d, 'first threat to the runner');
  }

  /** A free first-level blocker recovers between his defender and the back
   * he has acquired, rather than blindly returning to the original drive
   * angle. This chooses feet only: target, drive and contact frame stay owned
   * by the installation. Unknown possession and a snap-carrying QB keep it.
   */
  private runnerSideFit(a: Agent, sim: PlaySim, target: Agent, seen: Perceived):
    { axis: Vec2; aim: Vec2; lost: boolean } | null {
    if (!onLine(a, sim)
      || !['drive', 'reach', 'down', 'cutoff'].includes(this.plan.kind)
      || (this.plan.combination && !this.plan.combination.released)) return null;
    const ref = this.workReference(a, sim);
    if (this.workPicture?.source !== 'acquired' || this.workPicture.carrier !== sim.slot('RB')?.idx) return null;
    // Existing run-contact continuation ends once the runner has passed the
    // defender by this depth. This recovery does not renew an obsolete job.
    if ((ref.x - seen.pos.x) * sim.attackDir(a.team) > 2.5) return null;
    const dx = ref.x - seen.pos.x, dy = ref.y - seen.pos.y, distance = Math.hypot(dx, dy);
    if (distance < 1e-9) return null;
    const axis = { x: dx / distance, y: dy / distance }, drive = { x: -axis.x, y: -axis.y };
    const sep = a.profile.radius + target.profile.radius + .15;
    return { axis, aim: { x: seen.pos.x + axis.x * sep, y: seen.pos.y + axis.y * sep },
      lost: Math.abs(observedBlockLeverage(a, seen, drive)) >= 1.1 };
  }

  private workReference(a: Agent, sim: PlaySim): Vec2 {
    if (!this.workPicture || sim.t >= this.workPicture.nextRead)
      this.workPicture = readBlockerWorkPicture(a, sim);
    return blockerWorkPoint(this.workPicture, sim.t);
  }

  private findWork(a: Agent, sim: PlaySim, acquiredEligibility: boolean): Agent | null {
    const ref = this.workReference(a, sim);
    let best: Agent | null = null;
    let bs = Infinity;
    for (const d of sim.defense) {
      if (!acquiredEligibility && (d.engagement || d.isDown(sim.t))) continue;
      const seen = sim.see(a, d);
      if (acquiredEligibility && (seen.pose === 'down' || seen.pose === 'rising')) continue;
      // Find work within this responsibility, not the omniscient nearest man
      // to the ball anywhere on the field. Pullers/lead blockers own the exit.
      const runnerLane = BLOCKER_NEXT && (this.plan.kind === 'climb' || this.plan.kind === 'lead') && this.workPicture?.source === 'acquired'
        && this.workPicture.carrier !== sim.qb.idx;
      const laneY = runnerLane ? ref.y : this.plan.pullPath?.at(-1)?.y ?? this.plan.leadLane?.y ?? (this.plan.kind === 'lead' ? ref.y : this.homeY ?? a.pos.y);
      if (Math.abs(seen.pos.y - laneY) > 3.0 || seen.pos.x < a.pos.x - 1.0) continue;
      // FB_PLAYSIDE: the stretch lead takes the first man nobody's call has
      // (the call is known to every teammate; block states are not).
      if (this.plan.leadLane && sim.offense.some((o) => o !== a && o.behavior instanceof RunBlocker && o.behavior.plan.target === d)) continue;
      // A man the runner has already passed is nobody's work.
      if (this.behindRunner(a, sim, d, seen)) continue;
      const toMe = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
      if (toMe > 6) continue;
      const toBall = Math.hypot(seen.pos.x - ref.x, seen.pos.y - ref.y);
      const s = toMe + 0.5 * toBall;
      if (s < bs) {
        bs = s;
        best = d;
      }
    }
    return best;
  }
}

/** End an obsolete shared assignment, without releasing any actual contact.
 * A former helper resumes the covered owner's first-level technique. Capture
 * it before mutation and clear only this exact job: a member may already have
 * another plan. Earned releases have their own contact/ownership transition. */
function abandonCombination(observer: Agent, sim: PlaySim, combo: Combination, reason: string): void {
  if (combo.released) return;
  const solo = combinationSoloKind(combo);
  combo.released = true;
  for (const member of combo.members) {
    if (!(member.behavior instanceof RunBlocker)) continue;
    const p = member.behavior.plan;
    if (p.combination !== combo) continue;
    const trace = sim.blockingSink(member), previousWork = trace?.blockingState(member);
    p.combination = undefined;
    p.climbTo = undefined;
    if (p.kind === 'combo') p.kind = solo;
    trace?.blockingChange(member, previousWork, `combination-abandoned: ${reason}`, sim);
  }
  sim.event('block_abandon', observer, combo.defender, reason);
}

function combinationSoloKind(combo: Combination | undefined): RunBlockKind {
  const owner = combo?.members[0].behavior;
  const original = combo?.soloKind ?? (owner instanceof RunBlocker && owner.plan.combination === combo ? owner.plan.kind : null);
  return original && ['drive', 'reach', 'down', 'cutoff', 'draw'].includes(original) ? original : 'drive';
}

/** The uncovered player's own picture of the near surface and replacing work.
 * Native contact/support eligibility is checked separately, never presented as
 * his exact knowledge of a partner's control or footing. */
function readCheckSurface(helper: Agent, sim: PlaySim, combo: Combination): Perceived | null {
  const policy = combo.helpPolicy!, owner = combo.members[0];
  const covered = sim.see(helper, owner), down = sim.see(helper, combo.defender);
  const drive = (helper.behavior as RunBlocker).plan.drive;
  const axis = norm({ x: -drive.x, y: -drive.y }), lat = { x: -axis.y, y: axis.x };
  const relative = norm(sub(covered.pos, down.pos));
  const phi = Math.atan2(-(relative.x * lat.x + relative.y * lat.y),
    relative.x * axis.x + relative.y * axis.y) / (Math.PI / 2);
  // A full measured arm is a visible contact envelope, not a demand to
  // reacquire extended existing hands at the shorter fresh-strike range.
  const reach = owner.profile.radius + combo.defender.profile.radius + owner.player.measurables.armIn / 36;
  if (covered.pose !== 'up' || down.pose !== 'up' || Math.abs(phi) >= .55
    || Math.hypot(covered.pos.x - down.pos.x, covered.pos.y - down.pos.y) > reach
    || policy.side * (down.pos.y - covered.pos.y) >= 0) return null;

  for (const d of sim.defense) {
    if (d === combo.defender || d === combo.backer || d.isDown(sim.t)) continue;
    const seen = sim.see(helper, d);
    // Preserve the installed gap even after the helper has drifted toward a
    // far shoulder. Use the existing near-level and collection-lane bounds.
    if (seen.pos.x >= sim.los + 2 || seen.pos.x <= helper.pos.x - 1
      || Math.min(Math.abs(seen.pos.y - policy.homeY), Math.abs(seen.pos.y - helper.pos.y)) >= .9) continue;
    const e = d.engagement, hands = e?.hands;
    const held = !!e && !!hands && hands.a === e.blocker.body && hands.b === d.body
      && sim.world.joints.includes(hands);
    // A real adjacent contact accounts for an upfield body. Observed actual
    // penetration remains a reason to stay even if that contact still exists.
    if (!held || seen.pos.x < sim.los - .25) return null;
  }
  return down;
}

/** Does the observed near body leave room for the requested backer approach?
 * Project its observed flow only until this player's next decision. World,
 * not this visual corridor, determines whether the climb is executable. */
function checkBackerCorridor(helper: Agent, defender: Agent, down: Perceived, backer: Perceived): boolean {
  const clear = (dt: number) => {
    const goal = { x: backer.pos.x + backer.vel.x * dt, y: backer.pos.y + backer.vel.y * dt };
    const point = { x: down.pos.x + down.vel.x * dt, y: down.pos.y + down.vel.y * dt };
    const lane = sub(goal, helper.pos), length2 = lane.x * lane.x + lane.y * lane.y;
    const along = clamp(((point.x - helper.pos.x) * lane.x + (point.y - helper.pos.y) * lane.y) / Math.max(1e-12, length2), 0, 1);
    return Math.hypot(point.x - helper.pos.x - along * lane.x, point.y - helper.pos.y - along * lane.y)
      > helper.profile.radius + defender.profile.radius;
  };
  return clear(0) && clear(helper.mind.decisionInterval);
}

/** A short step off the observed surface. This is navigation, not a claim
 * that the whole climb or linebacker block will succeed. Check the DL and
 * partner through the next read; a moving or mistaken picture can still lose. */
/** A departing climber in contact with the man he just released steps off
 * his hip. The part of his request that drives into that man's center is
 * dropped and the speed is kept along the man's surface. World contact still
 * decides any rub; what he no longer does is push the man along with him on
 * his way to the backer (in contact, 74% of inside-zone departure commands
 * pointed into the released man and carried him at over 1 yd/s). */
/** The arc a puller can round at his current speed with his lateral grip
 * (the same high-speed envelope cornerSpeed uses), within a stride and a
 * half: never tighter than the old 0.65 yd pivot. */
export function pullTurnRadius(a: Agent): number {
  const v = Math.hypot(a.vel.x, a.vel.y);
  return clamp(v * v / Math.max(1e-6, a.profile.lateral * .8), .65, 1.8);
}

function offReleasedHip<T extends { vel: Vec2 } | null>(a: Agent, sim: PlaySim, released: Agent, command: T): T {
  if (!command) return command;
  if (CLIMB_SLIDE) return slidePast(a, sim, released, command as { vel: Vec2 }) as T;
  const seen = sim.see(a, released), rx = seen.pos.x - a.pos.x, ry = seen.pos.y - a.pos.y, r = Math.hypot(rx, ry);
  if (r < 1e-9 || r > a.profile.radius + released.profile.radius + .15) return command;
  const ux = rx / r, uy = ry / r, v = command.vel, into = v.x * ux + v.y * uy;
  if (into <= 0) return command;
  const tx = v.x - into * ux, ty = v.y - into * uy, tl = Math.hypot(tx, ty), speed = Math.hypot(v.x, v.y);
  return { ...command, vel: tl > 1e-9 ? { x: tx / tl * speed, y: ty / tl * speed } : { x: 0, y: 0 } };
}

/** CLIMB_SLIDE: the part of the request into the man he is touching, taken
 * relative to the man's own seen motion, is removed; the rest keeps the
 * requested speed. */
function slidePast<T extends { vel: Vec2 }>(a: Agent, sim: PlaySim, man: Agent, command: T): T {
  const seen = sim.see(a, man), rx = seen.pos.x - a.pos.x, ry = seen.pos.y - a.pos.y, r = Math.hypot(rx, ry);
  if (r < 1e-9 || r > a.profile.radius + man.profile.radius + .15) return command;
  const ux = rx / r, uy = ry / r, v = command.vel;
  const relx = v.x - seen.vel.x, rely = v.y - seen.vel.y, into = relx * ux + rely * uy;
  // Bodies still pressed together: the rip makes space first (about 1 yd/s
  // off him relative to his motion), or friction carries him with the man.
  const pressed = r < a.profile.radius + man.profile.radius;
  if (into <= 0 && !pressed) return command;
  const speed = Math.hypot(v.x, v.y), off = pressed ? 1 : 0;
  const nx = v.x - (Math.max(0, into) + off) * ux, ny = v.y - (Math.max(0, into) + off) * uy, nl = Math.hypot(nx, ny);
  return { ...command, vel: nl > 1e-9 ? { x: nx / nl * speed, y: ny / nl * speed } : { x: 0, y: 0 } };
}

function climbRoute(a: Agent, defender: Agent, down: Perceived,
  partner: Agent, covered: Perceived, backer: Perceived, strike = 0): { exit: Vec2 | null; flow: Vec2 } | null {
  const bodies = [{ seen: down, radius: a.profile.radius + defender.profile.radius },
    { seen: covered, radius: a.profile.radius + partner.profile.radius }];
  const clear = (goal: Vec2, flow: Vec2): boolean => bodies.every(({ seen, radius }) => {
    for (const dt of [0, a.mind.decisionInterval]) {
      const point = { x: seen.pos.x + seen.vel.x * dt, y: seen.pos.y + seen.vel.y * dt };
      const end = { x: goal.x + flow.x * dt, y: goal.y + flow.y * dt };
      const lane = sub(end, a.pos), length2 = lane.x * lane.x + lane.y * lane.y;
      const relative = sub(point, a.pos);
      const along = clamp((relative.x * lane.x + relative.y * lane.y) / Math.max(1e-12, length2), 0, 1);
      const nearest = Math.hypot(relative.x - along * lane.x, relative.y - along * lane.y);
      // Contact may start with small overlap. A departure must move out,
      // rather than requiring an impossible already-separated first frame.
      const initial = Math.hypot(relative.x, relative.y);
      if (nearest < Math.min(radius, initial) - 1e-9
        || (initial < radius && Math.hypot(end.x-point.x,end.y-point.y) <= initial)) return false;
    }
    return true;
  });
  const ray = sub(backer.pos, a.pos), distance = Math.hypot(ray.x, ray.y);
  const through = Math.max(0, distance - strike) / Math.max(distance, 1e-12);
  const first = strike > 0 ? { x: a.pos.x + ray.x * through, y: a.pos.y + ray.y * through } : backer.pos;
  if (clear(first, backer.vel)) return { exit: null, flow: backer.vel };
  for (const body of bodies) {
    const relative = sub(a.pos, body.seen.pos), goal = sub(backer.pos, body.seen.pos);
    const distance = Math.hypot(relative.x,relative.y);
    if (distance < 1e-9) continue;
    const turn = Math.atan2(relative.x*goal.y-relative.y*goal.x,relative.x*goal.x+relative.y*goal.y);
    const direction = Math.sign(turn) || Math.sign(a.pos.y-covered.pos.y) || 1;
    // Same short arc and body clearance as first-level fit recovery. Choose
    // an available shoulder, not a route through the old defender's center.
    for (const sign of [direction, -direction]) {
      const angle = sign * Math.min(.35, Math.abs(turn) || .35);
      const radius = Math.max(body.radius+.15,distance);
      const exit = { x: body.seen.pos.x + (relative.x*Math.cos(angle)-relative.y*Math.sin(angle))*radius/distance,
        y: body.seen.pos.y + (relative.x*Math.sin(angle)+relative.y*Math.cos(angle))*radius/distance };
      if (exit.y >= .5 && exit.y <= FIELD_WIDTH-.5 && clear(exit,body.seen.vel))
        return { exit, flow: body.seen.vel };
    }
  }
  return null;
}

/** A shared physical fit is eligibility, not either member's perception. */
function joinedEngagement(sim: PlaySim, combo: Combination): Engagement | null {
  const e = combo.defender.engagement;
  return !combo.released && e?.type === 'run' && combo.members.includes(e.blocker)
    && !combo.defender.isDown(sim.t) && combo.members.every((a) => a.engagement === e
      && !a.isDown(sim.t) && a.behavior instanceof RunBlocker
      && a.behavior.plan.combination === combo && a.behavior.plan.target === combo.defender)
    ? e : null;
}

/** Evaluate only this player's departure; the partner's hands already exist. */
function keeperCandidate(climber: Agent, sim: PlaySim, combo: Combination, e: Engagement): Omit<CombinationProposal, 't' | 'cost'> | null {
  const keeper = combo.members.find((a) => a !== climber);
  if (!keeper || keeper.isDown(sim.t) || combo.defender.isDown(sim.t)) return null;
  const axis = e.drive || e.surfaceAxis ? axisOf(sim, e) : { x: -1, y: 0 };
  const lat = { x: -axis.y, y: axis.x }, bd = norm(sub(keeper.pos, combo.defender.pos));
  const phi = Math.atan2(-(bd.x * lat.x + bd.y * lat.y), bd.x * axis.x + bd.y * axis.y) / (Math.PI / 2);
  // The keeper's achieved torso relation: the defender in front of the chest
  // he actually has (no credited turn), on the same scale as phi.
  const off = chestOff(keeper.facing, keeper.pos, combo.defender.pos);
  const hands = keeper === e.blocker ? e.hands : e.helperHands?.get(keeper);
  const base = keeper.body.support
    ? availability(keeper.body.support, supportParams(keeper.profile), fatigueFactor(keeper.body.energy)) : 1;
  const contact = !!hands && hands.a === keeper.body && hands.b === combo.defender.body
    && sim.world.joints.includes(hands);
  const distance = Math.hypot(keeper.pos.x-combo.defender.pos.x, keeper.pos.y-combo.defender.pos.y);
  const workingReach = keeper.profile.radius + combo.defender.profile.radius
    + .30 * traits(hands?.actor === combo.defender.body ? combo.defender : keeper, 'run').arm / 36;
  // A remembered hand position or old force cannot certify a distant arm.
  // Balanced hands need not carry load, but an extended contact must actually
  // have carried force and remain within the same hand law's attainable reach.
  const touching = hands && ((distance <= workingReach && (distance <= hands.extension
    || Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0) > 1e-6))
    // DOUBLE_HANDOFF: on a moving double his hands on the man within working
    // reach (plus the drift of a moving pair) are a takeover; four hands on
    // the down man, and the keeper overtakes when the partner leaves.
    || (DOUBLE_HANDOFF && distance <= workingReach + .35));
  const useful = keeper === e.blocker || helperSupport(sim, e, keeper) >= .25 || DOUBLE_HANDOFF;
  // The keeper's hand-fight standing is his private state, not the climber's
  // evidence. The climber reads his partner's chest on the man in his own
  // picture (readJoinedSurface); the transfer still needs the keeper's hands.
  // ZONE_WINGS: the man he would leave behind must be holdable by his
  // partner as he sees them (a receiver left on a defensive end is not a
  // keeper; the bigger blocker stays and the wing comes off).
  if ((ZONE_WINGS || WING_CALL) && keeper.profile.massKg < .85 * combo.defender.profile.massKg) return null;
  // DOUBLE_OVERTAKE: on a stretch the backside member of a double on a man
  // flowing play side is the overtaker: he stays, and his partner climbs once
  // he has the man (the checks below). He leaves only a man not flowing.
  const stretchRun = sim.offCall.run?.scheme === 'outsideZone' || sim.offCall.run?.scheme === 'wideZone';
  if (DOUBLE_OVERTAKE && stretchRun && sim.offCall.run) {
    const ps = playSideSign(sim, sim.offCall.run);
    const man = sim.see(climber, combo.defender);
    // He stays while the overtake is on: the man flowing play side within
    // his working reach and not pulling away from him. A man he cannot gain
    // on stays his partner's, and he checks to the backer.
    const ahead = (man.pos.y - climber.pos.y) * ps, gaining = (climber.vel.y - man.vel.y) * ps > -.3;
    if ((keeper.pos.y - climber.pos.y) * ps > 0 && man.vel.y * ps > .3
      && ahead <= climber.profile.radius + combo.defender.profile.radius + .2 && gaining) return null;
  }
  if (DOUBLE_FLOW) {
    // His hands are on the man (a joined double): he feels the man's motion
    // through them; it is not a delayed visual picture.
    const side = Math.sign(climber.pos.y - keeper.pos.y), run = sim.offCall.run;
    const stretch = run?.scheme === 'outsideZone' || run?.scheme === 'wideZone';
    // DOUBLE_OVERTAKE: the man flowing toward the climber can be handed to a
    // keeper who has replaced the hip (within a quarter yard of level with the
    // man's middle, hands on, keeping pace); otherwise the man escapes into
    // the gap the climber leaves (tracked: 2-3% escapes with the hip
    // replaced, about half without).
    const trail = (combo.defender.pos.y - keeper.pos.y) * side;
    const holding = DOUBLE_OVERTAKE && trail <= .25 && (keeper.vel.y - combo.defender.vel.y) * side > -.3;
    if (stretch) {
      // On stretch runs the backside man overtakes a man flowing into the
      // play-side man (tracked outside-zone climbers are the play-side
      // member 66% of the time, the down man flowing 2.4 yd/s): the handoff
      // is valid once the keeper is level with the man, not trailing his
      // flow by more than half a yard (s7-63: the centre behind and inside a
      // 3-technique getting upfield could not take him over).
      if (side !== 0 && combo.defender.vel.y * side > .5 && trail > .45 && !holding) return null;
    } else if (side !== 0 && combo.defender.vel.y * side > .5 && !holding) return null;
  }
  if ((KEEPER_TORSO ? off : Math.abs(phi)) >= .65 || base <= .60 || !contact || !touching || !useful
    || contactControl(e, keeper) === null) return null;
  return { climber, keeper, engagement: e, hands: hands!, phi };
}

/** RELEASE_INTERCEPT (default off): a double member leaves for his backer
 * when waiting one more read would make him late, not at a fixed radius.
 * From his own picture: his time to cut the backer off (his own sprint law
 * onto the backer's seen path) against the backer's time to the line in
 * front of him (or the runner's, whichever is sooner). A backer sitting deep
 * gives the double time to keep working the man; a triggering backer pulls
 * the member who can still cut him off. The installed reads released at a
 * fixed 4.2 yd radius or when the back came within 2.8 yd of the line: the
 * nearer member left for a backer still sitting (s27-13 centre) and his
 * partner, the man the backer then scraped to, never got a read. */
export const RELEASE_INTERCEPT = process.env.RELEASE_INTERCEPT !== '0';
function releaseTiming(observer: Agent, sim: PlaySim, backer: Perceived, d: Agent, d0?: Agent): { go: boolean; cut: number } {
  const dir = sim.attackDir(observer.team), me = { pos: observer.pos, vel: observer.vel, profile: observer.profile };
  const reach = observer.profile.radius + d.profile.radius + .2;
  // DOUBLE_OVERTAKE: the man he is leaving (and his partner on him) stand
  // between some climbers and the backer; the way there goes around them.
  const block = DOUBLE_OVERTAKE ? [sim.see(observer, d0 ?? observer)].filter(() => !!d0) : [];
  const around = (p: Vec2): number => {
    let extra = 0;
    for (const b of block) {
      const r = observer.profile.radius + (d0!.profile.radius) + .45;
      const ax = p.x - observer.pos.x, ay = p.y - observer.pos.y, L2 = ax * ax + ay * ay || 1;
      const u = clamp(((b.pos.x - observer.pos.x) * ax + (b.pos.y - observer.pos.y) * ay) / L2, 0, 1);
      const miss = Math.hypot(observer.pos.x + u * ax - b.pos.x, observer.pos.y + u * ay - b.pos.y);
      if (u > 0 && u < 1 && miss < r) extra += 2 * (r - miss);
    }
    return extra / Math.max(1, observer.profile.vmax * .8);
  };
  let cut = Infinity;
  for (let t = .1; t <= 2.5; t += .05) {
    const p = { x: backer.pos.x + backer.vel.x * t, y: backer.pos.y + backer.vel.y * t };
    if (timeToReach(me, p, reach) + around(p) <= t) { cut = t; break; }
  }
  const fill = timeToReach({ pos: backer.pos, vel: backer.vel, profile: d.profile },
    { x: sim.los + .6 * dir, y: backer.pos.y + backer.vel.y * .4 }, 0);
  const runner = sim.slot('RB');
  const r = runner ? sim.see(observer, runner) : null;
  const runnerAt = r && runner ? timeToReach({ pos: r.pos, vel: r.vel, profile: runner.profile }, { x: sim.los, y: r.pos.y }, 0) : Infinity;
  const due = Math.min(fill, runnerAt + .3);
  return { go: Number.isFinite(cut) && cut + observer.mind.decisionInterval + .1 >= due, cut };
}

/** A backer "shows" when this player's own picture has him arriving within
 * reach shortly (his seen motion carried half a second) or flowing toward
 * the play side, where he must be cut off before he outruns the climb. */
function backerShows(observer: Agent, sim: PlaySim, backer: Perceived): boolean {
  const ahead = { x: backer.pos.x + backer.vel.x * .5, y: backer.pos.y + backer.vel.y * .5 };
  if (Math.hypot(ahead.x - observer.pos.x, ahead.y - observer.pos.y) < 4.2) return true;
  const run = sim.offCall.run;
  return !!run && backer.vel.y * playSideSign(sim, run) > 1.5;
}

/** Angle between a blocker's chest and the man, in units of a right angle. */
/** SHOULDERS BY MEANING, reads the hips for now (TRUNK_TWIST Stage 1, docs/reviews/2026-11-14-facing-consumer-map.md):
 * this is where a man's chest points, so it will read `shouldersOf(body)` in the stage that gives linemen a trunk. Until
 * then a lineman has none (trunk 0), so hips and shoulders are the same number here. Do not mistake it for done. */
function chestOff(facing: number, from: Vec2, to: Vec2): number {
  const toMan = Math.atan2(to.y - from.y, to.x - from.x);
  return Math.abs(Math.atan2(Math.sin(toMan - facing), Math.cos(toMan - facing))) / (Math.PI / 2);
}

/** The reader's own delayed evidence that his partner can carry the surface. */
function readJoinedSurface(observer: Agent, sim: PlaySim, keeper: Agent, e: Engagement): { covered: Perceived; down: Perceived } | null {
  const covered = sim.see(observer, keeper), down = sim.see(observer, e.defender);
  const axis = e.drive || e.surfaceAxis ? axisOf(sim, e) : { x: -1, y: 0 };
  const lat = { x: -axis.y, y: axis.x }, bd = norm(sub(covered.pos, down.pos));
  const phi = Math.atan2(-(bd.x * lat.x + bd.y * lat.y), bd.x * axis.x + bd.y * axis.y) / (Math.PI / 2);
  const reach = keeper.profile.radius + e.defender.profile.radius + keeper.player.measurables.armIn / 36;
  // The reader's own picture of his partner's chest on the man (facing is
  // sampled with position), not a fixed-frame angle.
  const relation = KEEPER_TORSO ? chestOff(covered.facing, covered.pos, down.pos) : Math.abs(phi);
  return covered.pose === 'up' && down.pose === 'up' && relation < .55
    && Math.hypot(covered.pos.x - down.pos.x, covered.pos.y - down.pos.y) <= reach ? { covered, down } : null;
}

function readJoinedCombination(observer: Agent, sim: PlaySim, combo: Combination, e: Engagement, defer: boolean): void {
  combo.reads ??= [
    { nextRead: 0, secureSince: -1, readAt: -1, proposal: null },
    { nextRead: 0, secureSince: -1, readAt: -1, proposal: null },
  ];
  const read = combo.reads[combo.members.indexOf(observer)];
  if (sim.t < read.nextRead) return;
  read.nextRead = sim.t + observer.mind.decisionInterval;
  read.readAt = sim.t;
  read.proposal = null;
  if (observer.behavior instanceof RunBlocker)
    observer.behavior.prepareCombination(observer,sim,combo,null,read.nextRead);
  const candidate = keeperCandidate(observer, sim, combo, e);
  const surface = candidate && readJoinedSurface(observer, sim, candidate.keeper, e);
  if (!candidate || !surface) {
    read.secureSince = -1;
    observer.tags.add('combo-held');
    return;
  }
  if (read.secureSince < 0) read.secureSince = sim.t;
  const backer = sim.see(observer, combo.backer!);
  const filling = Math.hypot(backer.pos.x - observer.pos.x, backer.pos.y - observer.pos.y) < 4.2
    || (FLOW_RELEASE && backerShows(observer, sim, backer));
  const runner = sim.slot('RB');
  const arriving = runner && sim.see(observer, runner).pos.x > sim.los - 2.8;
  const prepareRoute=climbRoute(observer,combo.defender,surface.down,candidate.keeper,surface.covered,backer);
  const relative=sub(observer.pos,surface.down.pos);
  const inward=(observer.vel.x-surface.down.vel.x)*relative.x+(observer.vel.y-surface.down.vel.y)*relative.y<0;
  const needsFeet=!prepareRoute||!!prepareRoute.exit||inward;
  const axis = axisOf(sim,e), lat = {x:-axis.y,y:axis.x};
  const ownHalf = relative.x*lat.x+relative.y*lat.y;
  const partnerHalf = (surface.covered.pos.x-surface.down.pos.x)*lat.x
    +(surface.covered.pos.y-surface.down.pos.y)*lat.y;
  const backerHalf = (backer.pos.x-surface.down.pos.x)*lat.x
    +(backer.pos.y-surface.down.pos.y)*lat.y;
  // The uncovered member may have to KEEP while his partner climbs. Do not
  // start clearing away from the double for a backer on the partner's half.
  // This changes preparation only; both members retain their release reads.
  const acrossKeeper = ownHalf*partnerHalf<0 && ownHalf*backerHalf<0 && partnerHalf*backerHalf>0;
  if (needsFeet && !acrossKeeper && backer.pose==='up' && observer.behavior instanceof RunBlocker) {
    // Match the acquired surface while gathering the current contact half
    // if a ray is clear but loaded momentum has not yet prepared the feet.
    const preparation=prepareRoute?.exit?prepareRoute:{exit:{...observer.pos},flow:{...surface.down.vel}};
    observer.behavior.prepareCombination(observer,sim,combo,preparation,read.nextRead);
  }
  // RELEASE_QUICK: a backer he sees showing does not wait out the keeper's
  // secure dwell; the read cadence itself still paces the decision.
  if (sim.t - read.secureSince < .15 && !(RELEASE_QUICK && filling)) return;
  // A draw invites the rush; the backer who reads pass sits or drops instead
  // of filling. Once the reader sees his partner carrying the man, the
  // climber goes and gets him.
  const draw = sim.offCall.run?.scheme === 'draw' || sim.offCall.run?.scheme === 'qbDraw';
  const timing = RELEASE_INTERCEPT ? releaseTiming(observer, sim, backer, combo.backer!, combo.defender) : null;
  if (timing ? !timing.go && !draw : (!filling && !arriving && !draw)) return;
  const route = climbRoute(observer, combo.defender, surface.down, candidate.keeper, surface.covered, backer);
  if (!route) { observer.tags.add('combo-held'); return; }
  if (sim.offCall.run?.scheme === 'duo' && route.exit) {
    // A vertical double's acquired backer can still belong to the other
    // half of the surface. Permission for the keeper to stay does not give
    // this member useful access across that surface. Retain the double;
    // either member can still earn his own release from the next picture.
    const own = observer.pos.y - surface.down.pos.y;
    const partner = surface.covered.pos.y - surface.down.pos.y;
    const key = backer.pos.y - surface.down.pos.y;
    const dt = observer.mind.decisionInterval;
    const nextKey = key + (backer.vel.y - surface.down.vel.y) * dt;
    const nextPartner = partner + (surface.covered.vel.y - surface.down.vel.y) * dt;
    if (own * partner < 0 && own * key < 0 && partner * key > 0
      && own * nextKey < 0 && nextPartner * nextKey > 0) {
      observer.tags.add('combo-held');
      return;
    }
  }
  const cost = route.exit ? Math.hypot(route.exit.x-observer.pos.x,route.exit.y-observer.pos.y)
    + Math.hypot(backer.pos.x-route.exit.x,backer.pos.y-route.exit.y)
    : Math.hypot(backer.pos.x-observer.pos.x,backer.pos.y-observer.pos.y);
  read.proposal = { ...candidate, t: sim.t, departure: { ...route, backer },
    cost: timing ? timing.cut * 5 : cost + (observer === e.blocker ? .30 : 0) };
  if (!defer) {
    const valid = revalidateJoinedProposal(read.proposal, sim, combo);
    if (valid) applyCombinationRelease(valid, sim, combo, false);
  }
}

function revalidateJoinedProposal(p: CombinationProposal, sim: PlaySim, combo: Combination): CombinationProposal | null {
  const e = joinedEngagement(sim, combo);
  if (!e || p.t !== sim.t || p.engagement !== e || sim.t < p.climber.snapReadyAt
    || !combo.backer || combo.backer.isDown(sim.t)) return null;
  const candidate = keeperCandidate(p.climber, sim, combo, e);
  if (!candidate || candidate.keeper !== p.keeper || candidate.hands !== p.hands) return null;
  return { ...p, phi: candidate.phi };
}

/** Resolve simultaneous self-proposals without letting update order pick a climber. */
export function resolveJoinedCombination(sim: PlaySim, combo: Combination): void {
  const valid: CombinationProposal[] = [];
  for (const [index, read] of (combo.reads ?? []).entries()) {
    const p = read.proposal;
    if (!p || p.climber !== combo.members[index] || read.readAt !== sim.t) continue;
    const current = revalidateJoinedProposal(p, sim, combo);
    if (current) valid.push(current);
  }
  valid.sort((a, b) => {
    const difference = a.cost - b.cost;
    // Equal geometric costs can differ by a few arithmetic ulps; this is
    // representation noise, not a football distance tolerance.
    const roundoff = 4 * Number.EPSILON * Math.max(1, Math.abs(a.cost), Math.abs(b.cost));
    return Math.abs(difference) > roundoff ? difference
      : combo.members.indexOf(b.climber) - combo.members.indexOf(a.climber) || a.climber.idx - b.climber.idx;
  });
  if (valid[0]) applyCombinationRelease(valid[0], sim, combo, false);
}

/** Read both joined players before their ordinary movement commands. */
export function prepareJoinedCombinations(sim: PlaySim): void {
  const pairs = new Set<Combination>();
  for (const a of sim.offense) if (a.behavior instanceof RunBlocker && a.behavior.plan.combination)
    pairs.add(a.behavior.plan.combination);
  const ordered = [...pairs].sort((a, b) => Math.min(...a.members.map((m) => m.idx)) - Math.min(...b.members.map((m) => m.idx))
    || a.defender.idx - b.defender.idx);
  for (const combo of ordered) {
    if (!joinedEngagement(sim, combo)) continue;
    for (const member of combo.members) readCombination(member, sim, combo, true);
    resolveJoinedCombination(sim, combo);
  }
}

/** WING_WORK: a double's backer already met by a teammate (in this member's
 * picture: a teammate's body against him) is no longer the pair's work; the
 * nearest second-level man he sees with nobody on him, within 6 yd of the
 * line and 5 yd across of the pair, is. */
function retargetTakenBacker(observer: Agent, sim: PlaySim, combo: Combination): void {
  const dir = sim.attackDir(observer.team), mates = sim.offense.filter((o) => !combo.members.includes(o));
  const taken = (d: Agent) => { const s = sim.see(observer, d);
    return mates.some((m) => { const ms = sim.see(observer, m); return Math.hypot(ms.pos.x - s.pos.x, ms.pos.y - s.pos.y) < m.profile.radius + d.profile.radius + .25; }); };
  if (!taken(combo.backer!)) return;
  const here = combo.defender.pos;
  const next = sim.defense.filter((d) => d !== combo.defender && !d.isDown(sim.t)).map((d) => ({ d, s: sim.see(observer, d) }))
    .filter(({ s }) => (s.pos.x - sim.los) * dir > 1.1 && (s.pos.x - sim.los) * dir < 6 && Math.abs(s.pos.y - here.y) < 5)
    .filter(({ d }) => !taken(d))
    .sort((p, q) => Math.hypot(p.s.pos.x - observer.pos.x, p.s.pos.y - observer.pos.y) - Math.hypot(q.s.pos.x - observer.pos.x, q.s.pos.y - observer.pos.y))[0];
  if (next) {
    combo.backer = next.d;
    for (const m of combo.members) if (m.behavior instanceof RunBlocker && m.behavior.plan.combination === combo && m.behavior.plan.climbTo) m.behavior.plan.climbTo = next.d;
  }
}

/** A player may propose only his own departure from the double team. */
export function readCombination(observer: Agent, sim: PlaySim, combo: Combination, deferJoined = false): void {
  if (WING_WORK && combo.backer && !combo.released) retargetTakenBacker(observer, sim, combo);
  const index = combo.members.indexOf(observer);
  if (index < 0 || combo.released || !combo.backer || combo.backer.isDown(sim.t)
    || sim.t < observer.snapReadyAt
    || (observer.behavior instanceof RunBlocker && observer.behavior.presentingDraw(sim.t))) return;
  if (observer.isDown(sim.t) || !combo.members.every((a) => a.behavior instanceof RunBlocker
    && a.behavior.plan.combination === combo && a.behavior.plan.target === combo.defender)) {
    const read = combo.reads?.[index];
    if (read) { read.secureSince = -1; read.proposal = null; }
    if (index === 1 && combo.helpPolicy) combo.checkSince = -1;
    return;
  }
  const e = joinedEngagement(sim, combo);
  if (e) {
    if (combo.helpPolicy) combo.checkSince = -1;
    readJoinedCombination(observer, sim, combo, e, deferJoined);
  } else {
    // Losing the common contact invalidates this member's own confirmation.
    const read = combo.reads?.[index];
    if (read) { read.secureSince = -1; read.proposal = null; }
    readUnjoinedCombination(observer, sim, combo);
  }
}

/** Preserve the original helper's optional check and unjoined schedule. */
function readUnjoinedCombination(observer: Agent, sim: PlaySim, combo: Combination): void {
  if (combo.released || !combo.backer || combo.backer.isDown(sim.t)) return;
  const [owner, helper] = combo.members;
  const e = combo.defender.engagement;
  // Overtaken: the partner has the man alone and this member is off him (he
  // ran his track past the man, or lost him). He climbs on his own read.
  // (The reverse, an owner holding him alone, is the helper's check below.)
  if (e && e.type === 'run' && e.helpers.length === 0 && e.blocker === helper && observer === owner
    && !observer.engagement && !observer.isDown(sim.t)
    && !sim.world.joints.some((j) => j.a === observer.body || j.b === observer.body)) {
    readOvertaken(observer, sim, combo, e);
    return;
  }
  // OWNER_KEEPS: the mirror case of a double with no check installation: the
  // owner carries the man alone and the helper is off him. The helper climbs
  // on the same overtake read (keeper on the man in his own picture, held,
  // backer fills or runner arrives, a route exists).
  if (OWNER_KEEPS && !combo.helpPolicy && e && e.type === 'run' && e.helpers.length === 0 && e.blocker === owner
    && observer === helper && !observer.engagement && !observer.isDown(sim.t)
    && !sim.world.joints.some((j) => j.a === observer.body || j.b === observer.body)) {
    readOvertaken(observer, sim, combo, e);
    return;
  }
  const check = !!combo.helpPolicy && (!e || helper.engagement !== e);
  if (check) {
    // Preserve the ordinary double-team schedule while not yet joined. Its
    // first observer still advances the read and finds no shared secure fit.
    if (sim.t >= combo.nextRead) {
      combo.nextRead = sim.t + observer.mind.decisionInterval;
      combo.secureSince = -1;
    }
    // Optional work belongs to the uncovered player's own eyes and cadence.
    if (observer !== helper || sim.t < (combo.checkNextRead ?? 0)) return;
    combo.checkNextRead = sim.t + helper.mind.decisionInterval;
  } else {
    if (combo.helpPolicy) combo.checkSince = -1;
    if (sim.t < combo.nextRead) return;
    combo.nextRead = sim.t + observer.mind.decisionInterval;
    // A joined pair belongs exclusively to the personal read path. Legacy
    // unjoined scheduling may never act as a release fallback.
    combo.secureSince = -1;
    return;
  }
  const hands = e?.hands;
  const base = owner.body.support
    ? availability(owner.body.support, supportParams(owner.profile), fatigueFactor(owner.body.energy)) : 1;
  if (!e || e.type !== 'run' || e.blocker !== owner || owner.engagement !== e || e.helpers.length
    || owner.isDown(sim.t) || base <= .60 || helper.engagement || helper.isDown(sim.t) || combo.defender.isDown(sim.t)
    || !(helper.behavior instanceof RunBlocker) || helper.behavior.plan.combination !== combo || helper.behavior.plan.kind !== 'combo'
    || !(owner.behavior instanceof RunBlocker) || owner.behavior.plan.combination !== combo
    || !hands || hands.a !== owner.body || hands.b !== combo.defender.body || !sim.world.joints.includes(hands)
    || sim.world.joints.some((j) => j.a === helper.body || j.b === helper.body)) {
    combo.checkSince = -1;
    return;
  }
  const secure = e.baseB > 0.60 && Math.abs(e.phi) < 0.55;
  if (!secure) {
    combo.checkSince = -1;
    observer.tags.add('combo-held');
    return;
  }
  const surface = readCheckSurface(observer, sim, combo);
  if (!surface) { combo.checkSince = -1; return; }
  if ((combo.checkSince ?? -1) < 0) combo.checkSince = sim.t;
  if (sim.t - combo.checkSince! < .15) return;
  const backer = sim.see(observer, combo.backer);
  const filling = Math.hypot(backer.pos.x - observer.pos.x, backer.pos.y - observer.pos.y) < 4.2;
  const runner = sim.slot('RB');
  const arriving = runner && sim.see(observer, runner).pos.x > sim.los - 2.8;
  if (RELEASE_INTERCEPT ? !releaseTiming(observer, sim, backer, combo.backer, combo.defender).go : (!filling && !arriving)) return;
  if (!checkBackerCorridor(observer, combo.defender, surface, backer)) return;

  const candidate = keeperCandidate(observer, sim, combo, e);
  if (candidate) applyCombinationRelease({ ...candidate, t: sim.t,
    cost: Math.hypot(backer.pos.x - observer.pos.x, backer.pos.y - observer.pos.y) + (observer === e.blocker ? .30 : 0) }, sim, combo, true);
}

/** The zone overtake: his partner carries the man they were to share, and
 * he is off him. The joined double's own evidence decides it, read from this
 * member's picture: his partner is a keeper on the man (keeperCandidate, the
 * same hands, reach, torso and balance checks) and his partner's chest is on
 * the man as he sees it, held 0.15 s; the backer fills or the runner arrives;
 * a route to the backer exists. Before this, only an owner left alone could
 * be checked off by his helper; a helper who took the man while the owner ran
 * his track past him left the owner running the track with nobody to block
 * (35% of outside-zone double time). */
function readOvertaken(observer: Agent, sim: PlaySim, combo: Combination, e: Engagement): void {
  const own = overtakeReads.get(combo) ?? { nextRead: 0, secureSince: -1 };
  overtakeReads.set(combo, own);
  if (sim.t < own.nextRead) return;
  own.nextRead = sim.t + observer.mind.decisionInterval;
  const candidate = keeperCandidate(observer, sim, combo, e);
  const surface = candidate && readJoinedSurface(observer, sim, candidate.keeper, e);
  if (!candidate || !surface) { own.secureSince = -1; return; }
  if (own.secureSince < 0) own.secureSince = sim.t;
  if (sim.t - own.secureSince < .15) return;
  const backer = sim.see(observer, combo.backer!);
  const filling = Math.hypot(backer.pos.x - observer.pos.x, backer.pos.y - observer.pos.y) < 4.2
    || (FLOW_RELEASE && backerShows(observer, sim, backer));
  const runner = sim.slot('RB');
  const arriving = runner && sim.see(observer, runner).pos.x > sim.los - 2.8;
  if (RELEASE_INTERCEPT ? !releaseTiming(observer, sim, backer, combo.backer!, combo.defender).go : (!filling && !arriving)) return;
  if (!climbRoute(observer, combo.defender, surface.down, candidate.keeper, surface.covered, backer)) return;
  applyCombinationRelease({ ...candidate, t: sim.t,
    cost: Math.hypot(backer.pos.x - observer.pos.x, backer.pos.y - observer.pos.y) }, sim, combo, true);
}
const overtakeReads = new WeakMap<Combination, { nextRead: number; secureSince: number }>();

/** A release changes jobs/contact ownership, never a player's body or capacity. */
function applyCombinationRelease(choice: CombinationProposal, sim: PlaySim, combo: Combination, check: boolean): void {
  const { climber, keeper, phi, engagement: e } = choice;
  if (!(climber.behavior instanceof RunBlocker)) return;
  const climberTrace = sim.blockingSink(climber), previousClimber = climberTrace?.blockingState(climber);
  const keeperTrace = sim.blockingSink(keeper), previousKeeper = keeperTrace?.blockingState(keeper);
  const solo = combinationSoloKind(combo);
  if (keeper !== e.blocker) {
    // Transfer ownership of hands that already exist, not a fresh hand fight.
    // Ordinary synchronization removes only the departing member's contact.
    if (!promoteContact(e, keeper)) return;
  }
  e.blocker = keeper;
  e.helpers = e.helpers.filter((b) => b !== climber && b !== keeper);
  // A check player never joined these hands. Leave the unchanged owner's
  // contact state for the ordinary engagement refresh; no ownership changed.
  if (!check) e.phi = phi;
  climber.engagement = null;
  climber.behavior.plan.kind = 'climb';
  climber.behavior.plan.target = combo.backer;
  delete climber.behavior.plan.contactFit;
  // The installed backer fit drives upfield. The old diagonal wall/stretch
  // vector belongs to the keeper's first-level job, not the new approach.
  climber.behavior.plan.drive = { x: 1, y: 0 };
  if (!check && choice.departure)
    climber.behavior.startDeparture(climber, sim, combo.defender, keeper, combo.backer!, choice.departure);
  combo.released = true;
  for (const member of combo.members) {
    if (!(member.behavior instanceof RunBlocker) || member.behavior.plan.combination !== combo) continue;
    const p = member.behavior.plan;
    p.combination = undefined;
    p.climbTo = undefined;
    if (member === keeper) p.kind = solo;
  }
  climber.tags.add('combo-climb');
  if (check) climber.tags.add('combo-check-climb');
  keeper.tags.add('combo-stay');
  climberTrace?.blockingChange(climber, previousClimber, 'combination-release', sim);
  keeperTrace?.blockingChange(keeper, previousKeeper, 'combination-release', sim);
  sim.event('block_climb', climber, combo.backer, `${check ? 'check' : 'secured'} ${combo.defender.slot}; ${keeper.slot} stays`);
}

/**
 * A run block on a thrown run-pass option. He blocks the run, but until the
 * ball is out an unengaged lineman keeps within a yard of the line (NFL
 * 8-3-1): he asks for no more forward speed than brings him to 0.7 yd past
 * it. Contact begun there may be driven on; once the ball is out he is free.
 */
export class RpoRunBlocker extends RunBlocker {
  override update(a: Agent, sim: PlaySim): MoveCommand {
    const cmd = super.update(a, sim);
    const thrown = sim.ball.kind === 'air' || (sim.carrier !== null && sim.carrier !== sim.qb);
    if (thrown || a.engagement) return cmd;
    const dir = sim.attackDir(a.team);
    const cap = Math.max(0, 3 * (0.7 - (a.pos.x - sim.los) * dir));
    return cmd.vel.x * dir > cap ? { ...cmd, vel: { x: cap * dir, y: cmd.vel.y } } : cmd;
  }
}
