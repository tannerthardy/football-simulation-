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
import { chooseComboBlockApproach, chooseRunBlockFit, observedBlockLeverage, secondLevelBlockApproach } from '../run-block-fit.js';
import { axisOf, contactControl, helperSupport, passSetDepth, promoteContact, traits } from '../engagement.js';
import { readZoneReach, type ZoneReachRead } from '../zone-reach.js';
import { interceptPoint } from '../../physics/reach.js';
import type { Perceived } from '../perception.js';
import { goTo, runThrough, stand, track } from './common.js';

/** Experimental (PULL_STEP=1, off): open pull step toward the play side. */
const PULL_STEP = process.env.PULL_STEP === '1';
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
export const isOL = (a: Agent): boolean => OL.has(a.slot);

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

  private isRusher(sim: PlaySim, d: Agent): boolean {
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
      return Number.isFinite(near) ? 2 + 0.6 * near : 14;
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
    while (i > 0 || j > 0) {
      const h = how[i][j];
      if (h === 3) {
        this.sticky.set(ol[i - 1], rs[j - 1]);
        i--;
        j--;
      } else if (h === 2) j--;
      else i--;
    }
  }

  private declared = false;

  update(sim: PlaySim): void {
    if (this.lastT === sim.t) return;
    this.lastT = sim.t;
    const rushers = sim.defense.filter((d) => !d.isDown(sim.t) && this.isRusher(sim, d));
    if (!this.declared && rushers.length) {
      this.declared = true;
      this.declare(sim, rushers);
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
      if (!free.includes(b) || r.isDown(sim.t) || r.engagement || taken.has(r) || Math.abs(r.pos.y - home) > zoneOf(b) + 1.5) {
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
        if (Math.abs(r.pos.y - home) > zone) continue;
        // Don't chase rushers who are already past.
        if (r.pos.x < b.pos.x - 1.5 && isOL(b)) continue;
        let cost = Math.abs(r.pos.y - b.pos.y) + 0.35 * Math.max(0, r.pos.x - b.pos.x);
        if (!isOL(b)) cost += 0.8; // backs/TEs pick up leftovers
        // Interior first: centers and guards take A/B gap threats.
        if (isOL(b) && Math.abs(r.pos.y - sim.ballY) < 2.5 && !isT) cost -= 0.4;
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
        const dd = Math.abs(e.defender.pos.y - b.pos.y);
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
  ) {}

  /** Inspect existing protection state without running the coordinator. */
  recordedTarget(a: Agent): number | null {
    return a.engagement?.defender.idx ?? this.coord.assigned.get(a)?.idx ?? null;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    // Play action: everyone shows a low, aggressive pad level at first.
    a.stance = isOL(a) && sim.t < 0.35 && sim.offCall.kind === 'pass' && sim.offCall.pass?.fake ? 'low' : 'high';
    const home = this.coord.homeY.get(a) ?? a.pos.y;
    const outside = a.slot === 'LT' || a.slot === 'RT' ? Math.sign(home - sim.ballY) : 0;
    a.passSet = { depth: passSetDepth(sim, a), laneY: home + outside * 0.8, outside };
    if (sim.t < a.mind.snapDelay) return stand(0);
    if (a.engagement) return stand();
    if (sim.carrier !== sim.qb || !sim.isPass) {
      return stand();
    }
    this.coord.update(sim);
    const r = this.coord.assigned.get(a) ?? null;
    if (!r && this.releaseTo && sim.t > this.releaseAfter) {
      this.released = true;
      a.behavior = this.releaseTo();
      return a.behavior.update(a, sim);
    }
    const qb = sim.qb;
    if (!r) {
      // Set: tackles kick, interior sets short; backs hold near the QB.
      const isT = a.slot === 'LT' || a.slot === 'RT';
      const out = Math.sign(home - sim.ballY);
      const depth = isOL(a) ? passSetDepth(sim, a) : 0;
      // A back steps up beside the QB's launch point, not toward the line:
      // from under center the QB starts at the line and drops away.
      let set = isOL(a) ? { x: sim.los - 0.6 - depth, y: home + (isT ? out * 0.8 : 0) } : { x: Math.min(qb.pos.x + 1.2, sim.snapX[a.idx] + 1.5), y: qb.pos.y + Math.sign(home - qb.pos.y || 1) * 1.4 };
      if (runLook(a, sim)) set = { x: sim.los - 0.2, y: set.y };
      return goTo(a, set, { speed: 0.7, facing: 0 });
    }
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
    if (this.oversetBias < 0) this.oversetBias = sim.rng.range(0.2, 1.4);
    const overset = (1 - traits(a).feet) * 0.9 * fear * this.oversetBias;
    // Kick-slide: gain depth (tackles more than interior), staying on the
    // rusher's line to the QB at punching distance. Make the rusher come to you.
    const isT = a.slot === 'LT' || a.slot === 'RT';
    const setDepth = passSetDepth(sim, a);
    // Anticipate the rusher's path a beat ahead (better feet read it sooner).
    const lead = 0.15 + 0.2 * traits(a).feet;
    const rp = { x: r.pos.x + r.vel.x * lead, y: r.pos.y + r.vel.y * lead };
    const toQBp = norm(sub(qb.pos, rp));
    let along = contact * 0.85;
    if (toQBp.x < -0.2) along = Math.max(along, (sim.los - setDepth - rp.x) / toQBp.x);
    let set = { x: rp.x + toQBp.x * along, y: rp.y + toQBp.y * along + out * overset };
    // An edge rusher runs an arc, not the straight line to the QB: a tackle
    // who sets on that line sits on the chord, a couple of yards inside him,
    // all the way back. Kick to cut the arc off instead — meet him at the
    // earliest point on his projected path you can reach first, on his inside
    // shoulder — and let the hands decide the rep.
    let ride = false;
    if (edgeRusher && isOL(a)) {
      const meet = cutOffPoint(a, r, qb.pos, contact);
      if (meet) set = { x: meet.x, y: meet.y + out * overset };
      else if (r.pos.x < a.pos.x + 1.0 && Math.hypot(r.pos.x - a.pos.x, r.pos.y - a.pos.y) < 4) {
        // Beaten to the corner: run him past the QB — chase his inside hip
        // and get hands on him from a losing angle.
        const toQBr = norm(sub(qb.pos, r.pos));
        set = { x: r.pos.x + r.vel.x * 0.2 + toQBr.x * contact * 0.5, y: r.pos.y + r.vel.y * 0.2 + toQBr.y * contact * 0.5 };
        ride = true;
      }
    }
    if (runLook(a, sim)) set = { x: Math.max(set.x, sim.los - 0.3), y: set.y };
    const dd = Math.hypot(r.pos.x - a.pos.x, r.pos.y - a.pos.y);
    // A tackle late to the spot can still get a punch on a speed rusher's near
    // shoulder as he goes by; the rep then starts from a losing angle.
    const passing = r.speed > 4.5 && r.pos.x < a.pos.x + 0.6;
    const reachOut = edgeRusher && passing ? 0.15 + 0.3 * traits(a).feet : 0;
    if (dd < contact + 0.15 + reachOut && sim.engage(a, r, 'pass')) return stand();
    const facing = Math.atan2(r.pos.y - a.pos.y, r.pos.x - a.pos.x);
    const quick = 0.85 + 0.3 * traits(a).feet;
    if (ride) return track(a, set, r.vel, { cutSkill: quick, gain: 3 });
    return track(a, set, { x: r.vel.x * 0.7, y: r.vel.y }, { facing, cutSkill: quick, gain: 2.5 });
  }
}

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
  combination?: Combination;
  /** A solo cutoff's installed shoulder belongs to this exact down threat. */
  contactFit?: RunContactSurface & { target: Agent };
  /** The old surface must be cleared before the new linebacker approach. */
  departure?: { defender: Agent; keeper: Agent; backer: Agent };
}

function drawPresentation(plan: RunBlockPlan, t: number): boolean {
  return (plan.presentation === 'draw' || plan.kind === 'draw') && t < 1.0;
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
function zoneOwnership(line: Agent[], down: Agent[], reachLimit?:number): Map<Agent, Agent> {
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
        if (distance >= (reachLimit ?? (i === 0 || i === line.length - 1 ? 4.5 : 2.2))) continue;
        const targets = new Map(choice.targets);
        targets.set(b, d);
        keep(mask | (1 << i), { missed: choice.missed, distance: choice.distance + distance, targets });
      }
    }
    choices = next;
  }
  let best: Choice | undefined;
  for (const choice of choices.values()) if (better(choice, best)) best = choice;
  return best?.targets ?? new Map();
}

export function planRunBlocking(sim: PlaySim, concept: RunConcept): Map<Agent, RunBlockPlan> {
  const plans = new Map<Agent, RunBlockPlan>();
  const ps = playSideSign(sim, concept);
  const { dl, lb, db } = classify(sim);
  const by = sim.ballY;
  const rel = (a: Agent) => (a.pos.y - by) * ps; // + = playside
  const slicer = concept.scheme === 'splitZone' ? sim.offense.find((a) => (a.player.position === 'TE' || a.player.position === 'FB')
    && !sim.offAlign.spots[a.slot]?.inline && Math.abs(a.pos.y-by) < 6 && a.pos.x < sim.los-.9) : null;
  if (concept.scheme === 'splitZone' && !slicer) throw new Error('Split zone requires a core off-ball TE or FB');
  const sliceEnd = slicer ? dl.filter((d) => rel(d)<0).sort((a,b) => rel(a)-rel(b))[0] : null;
  const line = sim.offense.filter((a) => a !== slicer && (isOL(a) || (sim.offAlign.spots[a.slot]?.inline ?? false)));
  line.sort((p, q) => rel(q) - rel(p));
  const claimedDL = new Set<Agent>();
  const claimedLB = new Set<Agent>();
  const lbNear = (y: number, preferBackside = false): Agent | null => {
    let best: Agent | null = null;
    let bd = Infinity;
    for (const l of lb) {
      if (claimedLB.has(l)) continue;
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
    if (concept.scheme === 'insideZone' || concept.scheme === 'splitZone')
      combination.helpPolicy = { kind: 'check', homeY: b.pos.y, side: Math.sign(b.pos.y - partner.pos.y) };
    plans.get(partner)!.combination = combination;
    plans.set(b, { kind: 'combo', target, climbTo: backer, drive, combination });
  };

  const scheme = concept.scheme;
  const zoneLike = scheme === 'insideZone' || scheme === 'outsideZone' || scheme === 'wideZone' || scheme === 'splitZone' || scheme === 'toss' || scheme === 'draw' || scheme === 'qbDraw';

  if (zoneLike) {
    // Covered/uncovered ownership includes either shade and accounts for the
    // whole front before an uncovered blocker is available to help or climb.
    for (const [b, d] of zoneOwnership(line, dl.filter((d) => d !== sliceEnd))) {
      claimedDL.add(d);
      const reach = scheme === 'outsideZone' || scheme === 'wideZone' || scheme === 'toss';
      plans.set(b, { kind: reach ? 'reach' : 'drive', target: d, drive: up(ps * (scheme === 'wideZone' ? 1.8 : reach ? 1.1 : 0.6)) });
    }
    const pending = line.filter((b) => !plans.has(b));
    for (const b of pending) {
      if (plans.has(b)) continue;
      const i = line.indexOf(b);
      const neighbor = line[i - 1];
      const np = neighbor ? plans.get(neighbor) : undefined;
      if (np?.target && !np.combination && (np.kind === 'drive' || np.kind === 'reach')) {
        combo(b, neighbor, np.target, lbNear(b.pos.y + ps * 1.5, scheme === 'insideZone' || scheme === 'splitZone'), np.drive);
      } else {
        plans.set(b, { kind: 'climb', target: lbNear(b.pos.y + ps * 1.0), drive: up(ps * 0.4) });
      }
    }
    // Backside end of the line walls off (cutoff).
    const last = line[line.length - 1];
    const lp = plans.get(last);
    if (lp && (lp.kind === 'drive' || lp.kind === 'reach')) lp.kind = 'cutoff';
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

    // Reserve precisely the intentionally unblocked trap/kick defender.
    // The old trap rule left every playside lineman for one trapper.
    const trapReserved = scheme === 'trap' ? dl.filter((d) => rel(d) >= 1.05).sort((p, q) => rel(p) - rel(q))[0] ?? null : null;
    const kickReserved = scheme !== 'trap' && pullers.size ? dl.filter((d) => rel(d) > 0).sort((p, q) => rel(q) - rel(p))[0] ?? null : null;

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
        // Backside: hinge/cutoff.
        const cand = dl.filter((d) => !claimedDL.has(d) && d !== trapReserved && d !== kickReserved).sort((p, q) => Math.abs(p.pos.y - b.pos.y) - Math.abs(q.pos.y - b.pos.y));
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
      const partners = gapLine.filter((p) => p !== b && plans.get(p)?.target && !plans.get(p)?.combination && Math.abs(p.pos.y - b.pos.y) < 2.0)
        .sort((p, q) => Math.abs(plans.get(p)!.target!.pos.y - b.pos.y) - Math.abs(plans.get(q)!.target!.pos.y - b.pos.y));
      const partner = partners[0];
      const target = partner ? plans.get(partner)!.target : null;
      if (partner && target && Math.abs(target.pos.y - b.pos.y) < 2.5) {
        combo(b, partner, target, lbNear(b.pos.y - ps * 0.5, true), plans.get(partner)!.drive);
      } else plans.set(b, { kind: 'climb', target: lbNear(b.pos.y - ps * 1.0, true), drive: up(-ps * 0.5) });
    }
    // End man on the line on the playside (kick-out target).
    const emlos = kickReserved ?? dl.filter((d) => !claimedDL.has(d) && rel(d) > 0).sort((p, q) => rel(q) - rel(p))[0] ?? null;
    const trapTarget = trapReserved;
    const hole = by + ps * (concept.aim === 'A' ? 0.65 : concept.aim === 'B' ? 1.95 : 3.6);
    const fb = sim.slot('F');
    const fbIsBack = fb && sim.offAlign.spots.F?.backfield;
    // PULL_STEP (experimental, off): the pull step opens to the play side and
    // gains depth on the way, rather than dropping straight back first.
    const pullStep = PULL_STEP ? ps * 0.9 : 0;
    const pullPath = (b: Agent): Vec2[] => [
      { x: sim.los - 1.25, y: b.pos.y + pullStep },
      { x: sim.los - 1.15, y: hole - ps * 0.5 },
      { x: sim.los + 0.5, y: hole },
    ];
    for (const p of pullers) {
      let role: 'kick' | 'lead' | 'trap';
      if (scheme === 'trap') role = 'trap';
      else if (scheme === 'counter') role = p === bsg ? 'kick' : 'lead';
      else role = fbIsBack ? 'lead' : 'kick';
      const target = role === 'trap' ? trapTarget : role === 'kick' ? emlos : lbNear(hole);
      if (target && role !== 'lead') claimedDL.add(target);
      const path = target && role !== 'lead' ? [
        { x: sim.los - (role === 'trap' ? 1.05 : 1.25), y: p.pos.y + pullStep },
        { x: sim.los - (role === 'trap' ? 0.85 : 1.15), y: target.pos.y - ps * 0.65 },
        { x: sim.los - 0.1, y: target.pos.y - ps * 0.45 },
      ] : pullPath(p);
      plans.set(p, { kind: 'pull', pullRole: role, target, drive: role === 'kick' ? norm({ x: 0.3, y: ps }) : role === 'trap' ? norm({ x: 0.4, y: ps }) : up(0), pullPath: path });
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

  // Fullback lead (zone/iso) and receivers stalking.
  const fb = sim.slot('F');
  if (fb && sim.offAlign.spots.F?.backfield && !plans.has(fb)) {
    plans.set(fb, { kind: 'lead', target: lbNear(by + ps * 1.5), drive: up(0) });
  }
  const stalkers = sim.offense.filter((a) => !plans.has(a) && a !== sim.qb && a.slot !== 'RB'
    && !(a.slot === 'F' && sim.offAlign.spots.F?.backfield));
  const near = (a: Agent, d: Agent) => Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
  const stalkTargets = new Map<Agent, Agent | null>();
  if (STALK_CLAIM) {
    // Receivers share one ledger: closest unclaimed pairs first, skipping
    // backers a lineman or lead already owns. Only a receiver left with
    // nobody unclaimed helps on the nearest man.
    const open = [...db, ...lb.filter((l) => !claimedLB.has(l))];
    const pairs = stalkers.flatMap((a) => open.map((d) => ({ a, d, dist: near(a, d) }))).sort((p, q) => p.dist - q.dist);
    const taken = new Set<Agent>();
    for (const { a, d } of pairs) if (!stalkTargets.has(a) && !taken.has(d)) { stalkTargets.set(a, d); taken.add(d); }
  }
  for (const a of stalkers) {
    // Stalk the defensive back over him.
    let best: Agent | null = stalkTargets.get(a) ?? null;
    if (!best) {
      let bd = Infinity;
      for (const d of [...db, ...lb]) {
        const dd = near(a, d);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
    }
    plans.set(a, { kind: 'stalk', target: best, drive: norm(sub(best?.pos ?? a.pos, { x: a.pos.x - 1, y: a.pos.y })) });
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

/** Receivers claim distinct stalk targets (STALK_CLAIM=0: each takes his nearest). */
const STALK_CLAIM = process.env.STALK_CLAIM !== '0';

/** Climb when the backer shows flow or will arrive shortly (FLOW_RELEASE=0: proximity only). */
const FLOW_RELEASE = process.env.FLOW_RELEASE !== '0';

/** Keeper eligibility from the achieved torso relation (KEEPER_TORSO=0: fixed frame). */
const KEEPER_TORSO = process.env.KEEPER_TORSO !== '0';

/** Climbs planned with previewed own movement (CLIMB_PLAN=0 off). */
const CLIMB_PLAN = process.env.CLIMB_PLAN !== '0';

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
  private soloKind: RunBlockKind | null = null;
  private soloDrive: Vec2 | null = null;
  /** The puller's last ordinary read, not the defender's current position. */
  private pullRead: { target: Agent; seen: Perceived; clearanceX: number; nextRead: number } | null = null;
  private pullCleared = false;
  private departureRead: { at: number; nextRead: number; exit: Vec2 | null;
    flow: Vec2; backer: Perceived } | null = null;
  /** A personally consumed near-gap emergency, held through the normal beat. */
  private presentationThreat: Agent | null = null;
  /** Native technique read, retained between the player's ordinary decisions. */
  zoneRead: ZoneReachRead | null = null;
  /** Held climb plan from one acquired picture of the backer. */
  private climbRead: { target: Agent; nextRead: number; meet: Vec2; through: number; attainable: boolean; seenVel: Vec2 } | null = null;
  /** The called track he is running this tick (known to teammates). */
  private track: Vec2 | null = null;
  constructor(public plan: RunBlockPlan) {}

  calledMotion(): Vec2 | null { return this.track; }

  contactMotion(a: Agent): Vec2 | null {
    const e = a.engagement, read = this.zoneRead;
    if (!e || e.blocker !== a || e.helpers.length || this.plan.kind !== 'reach'
      || !read || read.target !== e.defender.idx || read.phase !== 'reach'
      || (this.plan.combination && !this.plan.combination.released)) return null;
    // The same track tempo as the free stretch step, until the acquired
    // shoulder picture changes the technique. Seal/runoff have their own fit.
    return { x: 0, y: read.side * a.profile.vmax * .45 };
  }

  get target(): Agent | null {
    return this.plan.target;
  }

  update(a: Agent, sim: PlaySim): Intent {
    const plan = this.plan;
    const t = sim.t;
    this.track = null;
    if (plan.contactFit && (plan.kind !== 'cutoff' || plan.target !== plan.contactFit.target
      || (plan.combination && !plan.combination.released))) delete plan.contactFit;
    this.homeY ??= a.pos.y;
    this.firstStep ??= {x:a.pos.x+.18,y:a.pos.y+plan.drive.y*.55};
    this.rememberSoloWork();
    // Draw blockers show pass first; everyone else fires out low.
    const presentingDraw = drawPresentation(plan, t);
    a.stance = presentingDraw ? 'high' : 'low';
    if (t < a.mind.snapDelay) return stand();
    if (!a.engagement && t >= this.nextRuleRead) {
      this.nextRuleRead = t + a.mind.decisionInterval;
      this.readRules(a,sim);
    }
    if (plan.combination) readCombination(a, sim, plan.combination);
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
          return this.withBase(a, this.attack(a, sim, target));
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
    if (ZONE_FLOW && isOL(a) && ['drive', 'reach', 'cutoff', 'combo'].includes(plan.kind) && !coordinated) {
      const flow = this.zoneFlow(a, sim);
      if (flow) return this.withBase(a, flow);
    }
    if (isOL(a) && ['drive','reach','down','combo','cutoff'].includes(plan.kind) && t < .24+a.mind.snapDelay) {
      // Establish the first foot and pad angle before running through a
      // target. Zone gains lateral ground; Duo stays vertical. These are
      // technique landmarks, still subject to acceleration and collisions.
      return this.withBase(a, track(a,this.firstStep,{x:0,y:0},{speed:.45,gain:5,facing:0}));
    }

    const target = this.availableTarget(a, sim);
    if (plan.departure && (plan.kind !== 'climb' || target !== plan.departure.backer)) {
      delete plan.departure;
      this.departureRead = null;
    }
    if (plan.kind === 'climb' && plan.departure && target === plan.departure.backer) {
      const leaving = this.leaveCombination(a, sim);
      if (leaving) return leaving;
    }
    if (plan.kind === 'pull' && plan.pullPath && this.pullIdx < plan.pullPath.length) {
      if(plan.pullRole==='lead') {
        const kick=sim.offense.find((b)=>b.tags.has('block-log') && b.behavior instanceof RunBlocker);
        if(kick) {
          const s=sim.see(a,kick),side=playSideSign(sim,sim.offCall.run!);
          plan.pullPath[plan.pullPath.length-1]={x:Math.max(sim.los+.5,s.pos.x+.6),y:s.pos.y+side*1.1};
          a.tags.add('wrap-log');
        }
      }
      while (this.pullIdx < plan.pullPath.length && Math.hypot(plan.pullPath[this.pullIdx].x-a.pos.x,plan.pullPath[this.pullIdx].y-a.pos.y)<.65) this.pullIdx++;
      const wp = plan.pullPath[this.pullIdx];
      if (wp) {
        // The wrapper's separate second-level interception is unchanged.
        if (plan.pullRole === 'lead' && this.pullIdx > 0 && target
          && Math.hypot(target.pos.x-a.pos.x, target.pos.y-a.pos.y) < 1.2) return this.attack(a, sim, target);
        // Clear the wall with the feet before fitting the moving kick/trap
        // target. Reaching a waypoint's tolerance does not establish that
        // clearance, and a penetrator need not pass within an arbitrary
        // distance of the puller to become relevant work.
        const read = this.pullIdx > 0 && target && (plan.pullRole === 'kick' || plan.pullRole === 'trap')
          ? this.readPull(a, sim, target) : null;
        if (read) {
          this.pullCleared ||= a.pos.x + a.profile.radius <= read.clearanceX;
          const distance = Math.hypot(read.seen.pos.x-a.pos.x, read.seen.pos.y-a.pos.y);
          const lead = Math.min(.4, distance / Math.max(1, a.profile.vmax));
          const approachingDepth = read.seen.pos.x + Math.min(0, read.seen.vel.x) * lead;
          if (this.pullCleared && (approachingDepth < sim.los || distance < 1.2))
            return this.attack(a, sim, read.target, read.seen);
        }
        // Clear the line before turning up; approach the corner under control
        // so a heavy puller doesn't run through the waypoint and circle back.
        const ps = playSideSign(sim, sim.offCall.run!) * (sim.offCall.run!.scheme === 'splitZone' ? -1 : 1);
        let path = read && this.pullCleared ? { ...wp, y: read.seen.pos.y - ps * (this.pullIdx === 1 ? .65 : .45) } : wp;
        // Progress is measured against the same observed landmark requested
        // by the feet, rather than a different old snap-coordinate waypoint.
        if (read && this.pullCleared) plan.pullPath[this.pullIdx] = path;
        if (this.pullIdx === 1 && sim.offense.some((o) => o !== a && isOL(o) && Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) < 1.2 && o.pos.x > a.pos.x)) {
          path = { x: Math.min(wp.x, a.pos.x - 0.35), y: wp.y };
        }
        const next = plan.pullPath[this.pullIdx+1];
        const through = next ? cornerSpeed(a.body, path, next, .65) : 0;
        // The pull step opens the hips to the play side: he does not turn to
        // face his own backfield while he gains depth (PULL_STEP).
        return goTo(a, path, { speed: 0.95, through, facing: PULL_STEP && this.pullIdx === 0 ? Math.atan2(ps, 0) : undefined });
      }
    }
    if (!target) {
      const c = sim.carrier;
      return goTo(a, { x: (c?.pos.x ?? sim.los) + 3, y: a.pos.y }, { speed: 0.5 });
    }
    if (plan.kind === 'stalk') {
      // Stay square on the DB until the run comes; engage when he closes.
      const dd = Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y);
      if (dd < a.profile.radius + target.profile.radius + 0.3 && sim.engage(a, target, 'run', plan.drive)) return stand();
      const fit = { x: Math.max(target.pos.x - 1.2, a.pos.x), y: target.pos.y };
      return goTo(a, fit, { speed: 0.85, through: 1 });
    }
    return this.withBase(a, this.attack(a, sim, target));
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
      const side = playSideSign(sim, run) * .5;
      const capacity = a.body.support
        ? availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
      let best: { meet: Vec2; vel: Vec2; t: number; gap: number } | null = null;
      for (const lead of [.2, .4, .6, .8, 1.0, 1.3]) {
        const meet = { x: seen.pos.x + seen.vel.x * lead, y: clamp(seen.pos.y + seen.vel.y * lead + side, .5, FIELD_WIDTH - .5) };
        const vel = movingArrivalVelocity(a.body, meet, seen.vel, a.profile.vmax, .1, Math.hypot(seen.vel.x, seen.vel.y), 1, capacity);
        const facing = Math.atan2(meet.y - a.pos.y, meet.x - a.pos.x);
        const path = previewFreeMovement(a.body, { vel, facing }, sim.t, 26, sim.world.handContact);
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
      if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'climb-plan',
        chose: this.climbRead.attainable ? 'attainable meeting point' : 'closest approach (no attainable fit)',
        cue: 'one acquired picture of the backer, previewed with own free movement',
        options: ['attainable meeting point', 'closest approach (no attainable fit)'],
        detail: `meet in ${best!.t.toFixed(2)} s, margin ${best!.gap.toFixed(2)} yd` });
    }
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
    const firstStep = sim.t < .24 + a.mind.snapDelay;
    if (d < contact + .25 && !firstStep) return null;
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
    const half = partner ? (Math.sign(sim.offAlign.spots[a.slot].pos.y - sim.offAlign.spots[partner.slot].pos.y) || ps) * .55 : ps * .6;
    const shoulder = seen.pos.y + seen.vel.y * meet + half;
    // Ask for the speed that gets there in time under his own acceleration
    // law (speed approaches the wanted speed with time constant tau): an
    // early, short distance needs an explosive first step, not a jog.
    const needed = requestToCover(gaitLag(a.profile), Math.max(0, (shoulder - a.pos.y) * ps), meet, a.vel.y * ps);
    const lateral = ps * Math.min(a.profile.vmax, Math.max(a.profile.vmax * .45 * press, needed));
    // The call's track tempo is what his teammates expect from him.
    this.track = { x: 0, y: ps * a.profile.vmax * .45 * press };
    // Depth: close to the defender's near surface without overrunning it.
    const fitX = seen.pos.x - dir * bodyContact;
    const forward = clamp((fitX - a.pos.x) * 2.5, -1, 2.5);
    // Open the hips toward the track (a bucket step) while the eyes stay on
    // the target: halfway between travel and the target's bearing.
    const travel = Math.atan2(lateral, forward), bearing = Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x);
    const facing = bearing + Math.atan2(Math.sin(travel - bearing), Math.cos(travel - bearing)) / 2;
    return { vel: { x: forward, y: lateral }, facing, cutSkill: .8 + .3 * a.r('runBlock') };
  }

  private availableTarget(a: Agent, sim: PlaySim): Agent | null {
    const plan = this.plan, t = sim.t;
    let target = plan.target;
    // Either member can land first. The covered owner's drive/reach/down
    // label does not make his partner's contact somebody else's block.
    // Keep the shared responsibility until the combination read releases it;
    // ordinary reach and useful helper contact still decide whether he joins.
    const partnerOwns = target?.engagement && plan.combination && !plan.combination.released
      && plan.combination.defender === target && plan.combination.members.includes(a)
      && plan.combination.members.includes(target.engagement.blocker);
    if (!target || target.isDown(t) || (target.engagement && target.engagement.blocker !== a && !target.engagement.helpers.includes(a) && !partnerOwns)) {
      if (t >= this.retarget) {
        this.retarget = t + a.mind.decisionInterval;
        const previous = target;
        const replacement = this.findWork(a, sim);
        const combination = plan.combination;
        if (combination && !combination.released && replacement !== combination.defender) {
          abandonCombination(a, sim, combination, 'original target unavailable; finding work');
        }
        plan.target = target = replacement;
        if (replacement !== previous) delete plan.contactFit;
        if (replacement && replacement !== previous && (!plan.combination || plan.combination.released))
          this.classifyWork(a, sim, replacement);
      }
    }
    return target;
  }

  private withBase(a: Agent, command: MoveCommand): Intent {
    // The visible low stance does not set the physical posture. Keep the
    // existing snap base through a first-level OL approach; World supplies
    // finite posture changes, the movement cost and actual balance. Running
    // pullers, climbs, unassigned movement and contact techniques own theirs.
    return isOL(a) && ['drive', 'reach', 'down', 'combo', 'cutoff'].includes(this.plan.kind)
      ? { ...command, posture: .7 } : command;
  }

  /** Keep the cue that authorized departure until the next ordinary read. */
  startDeparture(a: Agent, sim: PlaySim, defender: Agent, keeper: Agent, backer: Agent,
    picture: NonNullable<CombinationProposal['departure']>): void {
    if (!picture.exit) return;
    this.plan.departure = { defender, keeper, backer };
    this.departureRead = { at: sim.t, nextRead: sim.t + a.mind.decisionInterval,
      exit: { ...picture.exit }, flow: { ...picture.flow }, backer: structuredClone(picture.backer) };
  }

  private leaveCombination(a: Agent, sim: PlaySim): MoveCommand | null {
    const departure = this.plan.departure!;
    if (!this.departureRead || sim.t >= this.departureRead.nextRead) {
      const down = sim.see(a, departure.defender), keeper = sim.see(a, departure.keeper);
      const backer = sim.see(a, departure.backer);
      const route = climbRoute(a, departure.defender, down, departure.keeper, keeper, backer);
      this.departureRead = { at: sim.t, nextRead: sim.t + a.mind.decisionInterval,
        exit: route?.exit ?? null, flow: { ...(route?.flow ?? down.vel) }, backer };
      // Only a personally observed clear route ends the departure. A blocked
      // first step waits for another read; it cannot tunnel through the old DL.
      if (route && !route.exit) {
        delete this.plan.departure;
        this.departureRead = null;
        return null;
      }
    }
    const read = this.departureRead;
    if (!read?.exit) return stand();
    const dt = sim.t - read.at;
    const goal = { x: read.exit.x + read.flow.x * dt,
      y: read.exit.y + read.flow.y * dt + a.mind.placementError * (1 - .5 * a.r('runBlock')) };
    return track(a, goal, read.flow, { speed: 1, gain: 3,
      facing: Math.atan2(read.backer.pos.y-a.pos.y, read.backer.pos.x-a.pos.x) });
  }

  private readPull(a: Agent, sim: PlaySim, target: Agent): NonNullable<RunBlocker['pullRead']> {
    if (!this.pullRead || this.pullRead.target !== target || sim.t >= this.pullRead.nextRead) {
      const seen = sim.see(a, target);
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
      const clearanceX = wall.length ? Math.min(...wall.map(b => sim.see(a, b).pos.x-b.profile.radius))
        : this.plan.pullPath?.[0]?.x ?? a.pos.x+a.profile.radius;
      this.pullRead = { target, seen: { ...seen, pos: { ...seen.pos }, vel: { ...seen.vel } },
        clearanceX, nextRead: sim.t + a.mind.decisionInterval };
    }
    return this.pullRead;
  }

  private attack(a: Agent, sim: PlaySim, target: Agent, picture?: Perceived): MoveCommand {
    const plan = this.plan;
    const seen = picture ?? (plan.kind === 'pull' && (plan.pullRole === 'kick' || plan.pullRole === 'trap')
      ? this.readPull(a, sim, target).seen : sim.see(a,target));
    const zone = this.zoneEligible(a, sim) ? this.readZone(a, sim, target, seen) : null;
    if ((plan.pullRole === 'kick' || plan.pullRole === 'trap') && !a.tags.has('block-log')) {
      const ps = playSideSign(sim,sim.offCall.run!)*(sim.offCall.run!.scheme === 'splitZone' ? -1 : 1);
      // If the end crosses the puller's inside shoulder, getting back inside
      // him would expose the runner. Fit his outside shoulder and wash inward.
      if ((seen.pos.y-a.pos.y)*ps < -.25 && seen.pos.x < sim.los+.8) {
        plan.drive = norm({x:.45,y:-ps});
        a.tags.add('block-log');
        sim.event('block_log',a,target,'kick target crossed inside shoulder');
      }
    }
    const dd = Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y);
    // A run block starts with the strike, before torsos meet. Keep functional
    // extension shorter than a pass-pro punch; long arms can catch a slant.
    const contact = a.profile.radius + target.profile.radius + 0.1 + (a.player.measurables.armIn / 36) * 0.45;
    const fitCandidate = isOL(a) && (plan.kind === 'drive' || plan.kind === 'reach' || plan.kind === 'cutoff' || plan.kind === 'down')
      && (!plan.combination || plan.combination.released)
      && !sim.world.joints.some(j => j.a === a.body || j.b === a.body);
    const contactFit = fitCandidate && plan.kind === 'cutoff' && plan.contactFit?.target === target
      ? plan.contactFit : null;
    // A clearly lost shoulder is a foot-recovery decision, not a fresh hold.
    // Keep marginal reaches and actual collisions; use the same observed
    // leverage boundary as an established run block, without a time grace.
    const fitDrive = contactFit ? { x: -contactFit.axis.x, y: -contactFit.axis.y }
      : zone ? { x: 1, y: 0 } : plan.drive;
    const lost = fitCandidate && Math.abs(observedBlockLeverage(a, seen, fitDrive)) >= 1.1;
    // A solo drive still strikes downhill from an ordinary fit. Once the
    // personally observed shoulder is gone, replace the feet before reaching
    // again, using the same bounded recovery as other first-level blocks.
    const fit = fitCandidate && (plan.kind !== 'drive' || lost);
    if (!lost && dd < contact) {
      const e = sim.engage(a, target, 'run', plan.drive, contactFit ?? undefined);
      if (e) {
        if (zone && e.blocker === a && !e.helpers.length) this.applyZoneContact(a, sim, true);
        return stand();
      }
    }
    // Aiming point: reach blocks work to the playside shoulder.
    let aim = seen.pos;
    if (contactFit) {
      const sep = a.profile.radius + target.profile.radius + .15;
      aim = { x: seen.pos.x + contactFit.axis.x * sep, y: seen.pos.y + contactFit.axis.y * sep };
    } else if (zone) {
      const side = zone.phase === 'runoff' ? -zone.side : zone.side;
      aim = { x: seen.pos.x - .3, y: seen.pos.y + side * .6 };
    } else if (plan.kind === 'combo' && plan.combination) {
      const partner = plan.combination.members.find((b) => b !== a)!;
      const side = Math.sign(sim.offAlign.spots[a.slot].pos.y - sim.offAlign.spots[partner.slot].pos.y) || 1;
      aim = { x: seen.pos.x - 0.35, y: seen.pos.y + side * 0.55 };
    } else if (a.tags.has('block-log')) aim = {x:seen.pos.x-.3,y:seen.pos.y-plan.drive.y*.65};
    else if (plan.kind === 'reach' || plan.kind === 'cutoff') aim = { x: seen.pos.x - 0.3, y: seen.pos.y + plan.drive.y * 0.6 };
    else if (plan.kind === 'down') aim = { x: seen.pos.x - 0.2, y: seen.pos.y - plan.drive.y * 0.4 };
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
      const side = Math.sign(plan.drive.y) || 1;
      const shoulder = { x: aim.x-.25, y: aim.y-side*.45 };
      return track(a, shoulder, seen.vel, { speed: .95, gain: 3, facing: Math.atan2(seen.pos.y-a.pos.y,seen.pos.x-a.pos.x) });
    }
    if (CLIMB_PLAN && plan.kind === 'climb' && sim.offCall.run) {
      const fit = this.plannedClimb(a, sim, target, contact);
      if (fit) return fit;
    }
    if (plan.kind === 'climb' || plan.kind === 'lead' || (plan.kind === 'pull' && plan.pullRole === 'lead')) {
      const command = track(a, aim, seen.vel, { speed: 1, gain: 3,
        facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x) });
      return secondLevelBlockApproach(a, seen, plan.drive, nominalAim, placementError,
        contact, a.profile.radius + target.profile.radius, command, sim.t);
    }
    const original = runThrough(a, aim, { speed: 1 });
    if (plan.kind === 'combo' && plan.combination && !plan.combination.released) {
      const partner = plan.combination.members.find(b => b !== a)!;
      const picture = sim.teammateInformation(a, partner);
      return chooseComboBlockApproach(a, seen, picture.source === 'unavailable' ? undefined
        : { picture, radius: partner.profile.radius }, nominalAim, placementError,
      a.profile.radius + target.profile.radius, original);
    }
    return fit ? chooseRunBlockFit(a, seen, fitDrive, nominalAim, placementError,
      contact, a.profile.radius + target.profile.radius, { ...original, posture: .7 }, sim.t,
      !!zone || !!contactFit, zone ? 2.4 : 0) : original;
  }

  private zoneEligible(a: Agent, sim: PlaySim): boolean {
    const e = a.engagement;
    return isOL(a) && this.plan.kind === 'reach'
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
        // The recipient may not have updated yet. Save his installed solo
        // technique before exchanging and reclassifying either responsibility.
        b.behavior.rememberSoloWork();
        [p.target,q.target] = [q.target,p.target];
        // An exchanged responsibility changes the approach too. Each player
        // classifies his new work from his own delayed picture, not the
        // exchanging neighbor's image or the defender's roster position.
        this.classifyWork(a, sim, p.target);
        b.behavior.classifyWork(b, sim, q.target);
        sim.event('block_exchange',a,b,'adjacent crossing threats');
        return;
      }
    }
    // Look–lean–climb: an uncovered lineman collects a penetrating body in
    // his gap before leaving for the backer. Reserved kick targets are only
    // collected after they have actually penetrated the surface.
    if (p.kind !== 'climb' && p.kind !== 'combo' && !drawPresentation(p, sim.t)) return;
    const threat = sim.defense.filter((d) => !d.engagement && !d.isDown(sim.t)).find((d) => {
      const s = sim.see(a,d);
      return s.pos.x < sim.los-.25 && s.pos.x > a.pos.x-1 && Math.abs(s.pos.y-(this.homeY ?? a.pos.y)) < .9;
    });
    this.presentationThreat = threat ?? null;
    if (!threat || threat === p.target) return;
    if (p.combination && !p.combination.released)
      abandonCombination(a, sim, p.combination, 'collecting penetration before climb');
    p.target = threat; p.kind = 'drive';
    delete p.contactFit;
    a.tags.add('block-collect');
    sim.event('block_collect',a,threat,'penetration before climb');
  }

  private findWork(a: Agent, sim: PlaySim): Agent | null {
    const c = sim.carrier;
    const ref = c && c.team === a.team ? c.pos : { x: sim.los, y: sim.ballY };
    let best: Agent | null = null;
    let bs = Infinity;
    for (const d of sim.defense) {
      if (d.engagement || d.isDown(sim.t)) continue;
      const seen = sim.see(a, d);
      // Find work within this responsibility, not the omniscient nearest man
      // to the ball anywhere on the field. Pullers/lead blockers own the exit.
      const laneY = this.plan.pullPath?.at(-1)?.y ?? (this.plan.kind === 'lead' ? ref.y : this.homeY ?? a.pos.y);
      if (Math.abs(seen.pos.y - laneY) > 3.0 || seen.pos.x < a.pos.x - 1.0) continue;
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
    p.combination = undefined;
    p.climbTo = undefined;
    if (p.kind === 'combo') p.kind = solo;
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
function climbRoute(a: Agent, defender: Agent, down: Perceived,
  partner: Agent, covered: Perceived, backer: Perceived): { exit: Vec2 | null; flow: Vec2 } | null {
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
  if (clear(backer.pos, backer.vel)) return { exit: null, flow: backer.vel };
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
  const touching = hands && distance <= workingReach && (distance <= hands.extension
    || Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0) > 1e-6);
  const useful = keeper === e.blocker || helperSupport(sim, e, keeper) >= .25;
  const control = contactControl(e, keeper);
  if ((KEEPER_TORSO ? off : Math.abs(phi)) >= .65 || base <= .60 || !contact || !touching || !useful || control === null
    || control <= -.12 + .12 * (.5 - climber.mind.urgency)) return null;
  return { climber, keeper, engagement: e, hands: hands!, phi };
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
  const candidate = keeperCandidate(observer, sim, combo, e);
  const surface = candidate && readJoinedSurface(observer, sim, candidate.keeper, e);
  if (!candidate || !surface) {
    read.secureSince = -1;
    observer.tags.add('combo-held');
    return;
  }
  if (read.secureSince < 0) read.secureSince = sim.t;
  if (sim.t - read.secureSince < .15) return;
  const backer = sim.see(observer, combo.backer!);
  const filling = Math.hypot(backer.pos.x - observer.pos.x, backer.pos.y - observer.pos.y) < 4.2
    || (FLOW_RELEASE && backerShows(observer, sim, backer));
  const runner = sim.slot('RB');
  const arriving = runner && sim.see(observer, runner).pos.x > sim.los - 2.8;
  if (!filling && !arriving) return;
  const route = climbRoute(observer, combo.defender, surface.down, candidate.keeper, surface.covered, backer);
  if (!route) { observer.tags.add('combo-held'); return; }
  const cost = route.exit ? Math.hypot(route.exit.x-observer.pos.x,route.exit.y-observer.pos.y)
    + Math.hypot(backer.pos.x-route.exit.x,backer.pos.y-route.exit.y)
    : Math.hypot(backer.pos.x-observer.pos.x,backer.pos.y-observer.pos.y);
  read.proposal = { ...candidate, t: sim.t, departure: { ...route, backer },
    cost: cost + (observer === e.blocker ? .30 : 0) };
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

/** A player may propose only his own departure from the double team. */
export function readCombination(observer: Agent, sim: PlaySim, combo: Combination, deferJoined = false): void {
  const index = combo.members.indexOf(observer);
  if (index < 0 || combo.released || !combo.backer || combo.backer.isDown(sim.t)
    || sim.t < observer.snapReadyAt
    || (observer.behavior instanceof RunBlocker && drawPresentation(observer.behavior.plan, sim.t))) return;
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
  const secure = e.control > -0.12 + 0.12 * (0.5 - observer.mind.urgency) && e.baseB > 0.60 && Math.abs(e.phi) < 0.55;
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
  if (!filling && !arriving) return;
  if (!checkBackerCorridor(observer, combo.defender, surface, backer)) return;

  const candidate = keeperCandidate(observer, sim, combo, e);
  if (candidate) applyCombinationRelease({ ...candidate, t: sim.t,
    cost: Math.hypot(backer.pos.x - observer.pos.x, backer.pos.y - observer.pos.y) + (observer === e.blocker ? .30 : 0) }, sim, combo, true);
}

/** A release changes jobs/contact ownership, never a player's body or capacity. */
function applyCombinationRelease(choice: CombinationProposal, sim: PlaySim, combo: Combination, check: boolean): void {
  const { climber, keeper, phi, engagement: e } = choice;
  if (!(climber.behavior instanceof RunBlocker)) return;
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
  sim.event('block_climb', climber, combo.backer, `${check ? 'check' : 'secured'} ${combo.defender.slot}; ${keeper.slot} stays`);
}
