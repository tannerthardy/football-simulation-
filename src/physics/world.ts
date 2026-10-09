/**
 * The physical world: every player body, every contact and hold, one solver.
 *
 * Controllers (brains, block and tackle techniques) run at the 20 Hz decision
 * rate and publish intents: desired velocity and facing, willingness to lean
 * into contact, pad level, and the hand/grasp joints their technique holds.
 * The world advances physics in substeps without new observations or random
 * draws:
 *
 *   1. Ground forces. The gait plans each tick exactly as the calibrated
 *      free-movement integrator (kinematics.ts) does. A lean adds leg drive
 *      beyond it, but only against a load the body actually feels (you
 *      cannot lean on air), and only within one traction/strength budget
 *      shared with locomotion. Recovering balance scales the whole budget.
 *      Every ground impulse and its work are recorded: they are the only
 *      external momentum.
 *   2. Contacts. Swept circle tests find every encounter inside the substep.
 *      Torsos meet a compliant (soft) contact with Coulomb friction and
 *      torque; a speculative guard stops any pair from passing through
 *      another within one substep. Hand joints hold an arm's-length gap with
 *      bounded push, hold and steering force; grasp joints resist separation
 *      and sliding with a bounded grip that slips and breaks. All constraint
 *      impulses are equal and opposite.
 *   3. Integration, then support (physics/support.ts): accelerations the
 *      feet cannot follow, or travel faster than they can step, displace the
 *      body's capture point; past the point of no return he falls.
 *
 * Bodies that cannot touch anyone this tick move in one exact step; bodies
 * in or near contact share adaptive substeps (an island).
 *
 * Units are kg, yards and seconds; forces are kg·yd/s².
 */
import { G } from '../core/units.js';
import { angleDiff, clamp, type Vec2 } from '../core/vec.js';
import { bodyRadius } from './bodyshape.js';
import { commandFacing, directionalSpeedFactor, fatigueFactor, followAccel, locomotionAccel, spendEnergy, turnRateOf, updateSqueeze, type Body, type MoveCommand } from './kinematics.js';
import { availability, baseRadiusAt, comHeightAt, fallTime, newSupport, omega0, recoverySpeed, supportParams, type Support, type SupportParams } from './support.js';

export interface Intent extends MoveCommand {
  /** 0–1 willingness to lean into a felt load with leg drive beyond free movement. */
  push?: number;
  /** Target pad level, 0 upright … 1 as low as he can get. */
  posture?: number;
  /** Deliberately leave his feet in this direction (dive, layout). A unit
   * vector launches the body with full leg drive; a shorter one launches it
   * that fraction (near zero: he just lets his legs go). */
  dive?: Vec2;
  /** Drive the body this way beyond what the feet can follow (a tackle
   * strike, a lunge): extra velocity wanted, yd/s. The legs deliver it within
   * traction over the next substeps; what the feet cannot follow displaces
   * his support, so a strike that meets nothing leaves him overextended. */
  lunge?: Vec2;
  /** No ground force this step: airborne, or a passive body in a mechanics test. */
  free?: boolean;
}

/** Arm's-length hand fight between two bodies (block, jam, stiff arm). */
export interface HandJoint {
  kind: 'hands';
  a: Body;
  b: Body;
  /** Center distance the extended arms hold. */
  extension: number;
  /** Max compressive arm force, kg·yd/s². */
  push: number;
  /** Max tension (a grab of cloth), kg·yd/s². */
  hold: number;
  /** Max tangential (steering) force, kg·yd/s². */
  steer: number;
  /** Last step's mean force on b from a: normal (+ pushes apart) and tangential. */
  normalForce?: number;
  tangentForce?: number;
}

/** A hold by `a` (holder) on `b` (held): a tackle grasp. */
export interface GraspJoint {
  kind: 'grasp';
  a: Body;
  b: Body;
  /** Center distance beyond which the arms cannot keep hold while the holder is on his feet. */
  reach: number;
  /** The same with the holder off his feet, stretched along the ground behind
   * his arms (default: reach plus a body length's share). */
  ground?: number;
  /** Grip force limit, kg·yd/s². */
  capacity: number;
  /** 0–1: share of the hold around his legs (locks his stepping). */
  legs: number;
  /** Rate the holder's arms reel the two bodies together, yd/s (bounded by the grip). */
  pull?: number;
  /** Current arm distance; ratchets in as the holder closes, slides out when the grip slips. */
  hold?: number;
  /** True while the grip is at its limit this step. */
  slipping?: boolean;
  /** Set once the hold has slid past reach. */
  broken?: boolean;
  /** Mean grip force used last step, kg·yd/s². */
  force?: number;
  /** How the hold was made (diagnostics: 'form', 'reach', 'block', 'dive'). */
  origin?: string;
}

export type Joint = HandJoint | GraspJoint;

export interface ContactRecord {
  i: number;
  j: number;
  /** Total normal impulse over the step, kg·yd/s. */
  impulse: number;
  /** Largest closing speed at a touch this step, yd/s. */
  closing: number;
}

export interface StepReport {
  /** Substeps used by the contact island (1 when nobody was near contact). */
  substeps: number;
  /** External (ground/gravity) impulse on each body, kg·yd/s. */
  groundImpulse: Vec2[];
  /** Work of those external forces on each body, kg·yd²/s². */
  groundWork: number[];
  contacts: ContactRecord[];
  /** Bodies that started to fall, reached the ground, or got up this step. */
  falls: number[];
  downs: number[];
  rises: number[];
  maxPenetration: number;
}

/** Touch distance as a fraction of the two torso radii (pads and arms compress). */
export const CONTACT_SCALE = 0.9;
const CONTACT_HZ = 9;
const CONTACT_ZETA = 1.0;
const CONTACT_FRICTION = 0.35;
const MAX_PUSHOUT = 3;
/** Deepest penetration admitted within one substep before the speculative guard acts. */
const GUARD_DEPTH = 0.2;
/** Target relative travel per substep for adaptive stepping, yd. */
const SUBSTEP_TRAVEL = 0.06;
const MIN_SUBSTEPS = 6;
const MAX_SUBSTEPS = 16;
const ITERATIONS = 8;
/** Velocity-only iterations after the position update (see Relax). */
const RELAX_ITERATIONS = 4;
const HANDS_HZ = 5;
const HANDS_ZETA = 0.7;
const HANDS_SLACK = 0.06;
const GRASP_HZ = 6;
const GRASP_ZETA = 0.8;
/** A lean can grow past the felt load by this fraction (force development). */
const PUSH_GROWTH = 0.25;
/** Time constant of the sensed load, s. */
const FEEL = 0.04;
const LEAN_RISE = 0.04;
const LEAN_DECAY = 0.15;
const YAW_RESPONSE = 0.05;
const POSTURE_RATE = 2.5;
const DEFAULT_POSTURE = 0.2;
const STAND_UP = 1.5;
const LEVERAGE_GAIN = 1.2;
const FALL_TIP = 3;
const FALL_FRICTION = 0.25;
const DOWN_FRICTION = 0.75;
const FOLLOW_MARGIN = 1.1;
/** Time constant of a slipping hold sliding down to the legs, s. */
const LEG_SLIDE = 0.3;
/** Extra hold distance of a holder stretched along the ground, yd. */
export const GROUND_STRETCH = 0.9;
/** Gait response time to body acceleration, s. */
const GAIT_LAG = 0.04;
/** Reaction latency of the first recovery step, s. */
const STEP_LATENCY = 0.12;

const STAND: Intent = { vel: { x: 0, y: 0 } };
const RIGID = { biasRate: 0, massScale: 1, impulseScale: 0 };

interface Softness { biasRate: number; massScale: number; impulseScale: number }

function softness(hertz: number, zeta: number, h: number): Softness {
  const omega = 2 * Math.PI * hertz;
  const a1 = 2 * zeta + h * omega;
  const a2 = h * omega * a1;
  const a3 = 1 / (1 + a2);
  return { biasRate: omega / a1, massScale: a2 * a3, impulseScale: a3 };
}

interface Contact {
  i: number;
  j: number;
  nx: number;
  ny: number;
  /** Touch distance along the normal, yd. */
  R: number;
  ri: number;
  rj: number;
  mn: number;
  mt: number;
  guard: boolean;
  bias: number;
  ln: number;
  lt: number;
  closing: number;
  /** The compliant solve pressed them together (before the relax). */
  touched?: boolean;
}

interface JointRow {
  joint: Joint;
  i: number;
  j: number;
  nx: number;
  ny: number;
  mn: number;
  /** Normal regime: +1 compressive (hands), −1 tension, 0 inactive. */
  mode: number;
  c: number;
  ln: number;
  lt: number;
  /** Grip budget (grasp) for this substep, kg·yd/s. */
  limit: number;
  /** Hand limits for this substep (push, hold, steer), kg·yd/s. */
  pushLim: number;
  holdLim: number;
  steerLim: number;
}

/** The gait's plan for one 20 Hz tick: locomotion force, facing and footing. */
interface Plan {
  ax: number;
  ay: number;
  facing: number;
  cut: number;
  free: boolean;
  dive: Vec2 | null;
  /** 0–1 share of full leg drive behind a dive. */
  launch: number;
}

export class World {
  readonly bodies: Body[];
  joints: Joint[] = [];
  /** World clock, seconds (the owner may set it to keep a shared clock). */
  time = 0;
  /** Fixed substep count for convergence studies; adaptive when unset. */
  substeps?: number;
  private readonly index = new Map<Body, number>();
  /** Technique impulses queued for the next step: equal and opposite between two bodies. */
  private pending: Array<{ a: Body; b: Body; x: number; y: number }> = [];
  // Per-body scratch, reused every substep.
  private readonly n: number;
  private readonly sp: SupportParams[];
  private readonly mass: Float64Array;
  private readonly inertia: Float64Array;
  private readonly fat: Float64Array;
  private readonly impX: Float64Array;
  private readonly impY: Float64Array;
  private readonly tripX: Float64Array;
  private readonly tripY: Float64Array;
  private readonly v0x: Float64Array;
  private readonly v0y: Float64Array;
  private readonly amx: Float64Array;
  private readonly amy: Float64Array;
  private readonly alpha: Float64Array;
  private readonly cut: Float64Array;
  private readonly height: Float64Array;
  private readonly lev: Float64Array;
  private readonly leanX: Float64Array;
  private readonly leanY: Float64Array;

  constructor(bodies: Body[], opts: { substeps?: number } = {}) {
    this.bodies = bodies;
    this.substeps = opts.substeps;
    const n = (this.n = bodies.length);
    bodies.forEach((b, i) => {
      this.index.set(b, i);
      b.support ??= newSupport();
      b.spin ??= 0;
    });
    this.sp = bodies.map((b) => supportParams(b.profile));
    this.mass = Float64Array.from(bodies, (b) => b.profile.massKg);
    this.inertia = Float64Array.from(this.sp, (s) => s.yawInertia);
    const f = () => new Float64Array(n);
    this.fat = f(); this.impX = f(); this.impY = f(); this.tripX = f(); this.tripY = f();
    this.v0x = f(); this.v0y = f(); this.amx = f(); this.amy = f(); this.alpha = f(); this.cut = f();
    this.height = f(); this.lev = f(); this.leanX = f(); this.leanY = f();
  }

  indexOf(b: Body): number {
    return this.index.get(b) ?? -1;
  }

  /**
   * A technique's strike, pull or shove: impulse J (kg·yd/s) on `b` and −J on
   * `a`, applied inside the next step so balance and loads respond to it.
   * Internal: total momentum is unchanged.
   */
  strike(a: Body, b: Body, j: Vec2): void {
    if (this.indexOf(a) < 0 || this.indexOf(b) < 0) return;
    this.pending.push({ a, b, x: j.x, y: j.y });
  }

  /** Energy stored in compressed torso contacts (the compliant springs), kg·yd²/s². */
  contactEnergy(): number {
    const bs = this.bodies;
    const k = (2 * Math.PI * CONTACT_HZ) ** 2;
    let e = 0;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, d = Math.hypot(dx, dy);
      const nx = d > 1e-8 ? dx / d : 1, ny = d > 1e-8 ? dy / d : 0;
      const s = d - CONTACT_SCALE * (bodyRadius(a, nx, ny) + bodyRadius(b, nx, ny));
      if (s < 0) e += 0.5 * k / (1 / a.profile.massKg + 1 / b.profile.massKg) * s * s;
    }
    return e;
  }

  step(intents: ReadonlyArray<Intent | null | undefined>, dt: number): StepReport {
    const bs = this.bodies, n = this.n;
    const report: StepReport = { substeps: 1, groundImpulse: bs.map(() => ({ x: 0, y: 0 })),
      groundWork: new Array(n).fill(0), contacts: [], falls: [], downs: [], rises: [], maxPenetration: 0 };
    this.joints = this.joints.filter((j) => !(j.kind === 'grasp' && j.broken) && this.indexOf(j.a) >= 0 && this.indexOf(j.b) >= 0 && j.a !== j.b);
    for (const j of this.joints) {
      if (j.kind === 'hands') { j.normalForce = 0; j.tangentForce = 0; }
      else j.force = 0;
    }
    for (let i = 0; i < n; i++) {
      const b = bs[i];
      this.sp[i] = supportParams(b.profile);
      this.mass[i] = b.profile.massKg;
      this.inertia[i] = this.sp[i].yawInertia;
      // Fresh vectors: the solver updates them in place during the step.
      b.pos = { x: b.pos.x, y: b.pos.y };
      b.vel = { x: b.vel.x, y: b.vel.y };
      this.fat[i] = fatigueFactor(b.energy);
      this.leanX[i] = 0; this.leanY[i] = 0;
    }
    // The gait plans at the controller rate, like stepBody: a free body
    // moves exactly as the calibrated integrator, at any substep count.
    const plans = bs.map((b, i) => this.plan(b, i, intents[i] ?? STAND, dt));
    for (let i = 0; i < n; i++) {
      const l = intents[i]?.lunge, sup = bs[i].support!;
      if (l && sup.state === 'up' && Math.hypot(l.x, l.y) > 1e-6) sup.strike = { x: l.x, y: l.y };
    }

    // Islands: who can touch whom within this tick, or is held, or struck.
    const near = new Uint8Array(n);
    let fastest = 0;
    for (const j of this.joints) { near[this.indexOf(j.a)] = 1; near[this.indexOf(j.b)] = 1; }
    for (const p of this.pending) { near[this.indexOf(p.a)] = 1; near[this.indexOf(p.b)] = 1; }
    for (let i = 0; i < n; i++) {
      const a = bs[i];
      for (let j = i + 1; j < n; j++) {
        const b = bs[j];
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        const rvx = b.vel.x - a.vel.x, rvy = b.vel.y - a.vel.y;
        const rel = Math.sqrt(rvx * rvx + rvy * rvy);
        const reach = (a.profile.radius + b.profile.radius) * 1.15 + rel * dt + 0.3;
        if (dx * dx + dy * dy > reach * reach) continue;
        near[i] = 1; near[j] = 1;
        if (rel > fastest) fastest = rel;
      }
    }
    const island: number[] = [], alone: number[] = [];
    for (let i = 0; i < n; i++) (near[i] ? island : alone).push(i);
    const pairs = new Map<number, ContactRecord>();
    const t0 = this.time;
    if (alone.length) this.substep(alone, intents, plans, dt, dt, report, pairs, false);
    if (island.length) {
      const steps = this.substeps ?? clamp(Math.ceil(fastest * dt / SUBSTEP_TRAVEL), MIN_SUBSTEPS, MAX_SUBSTEPS);
      report.substeps = steps;
      const h = dt / steps;
      this.time = t0;
      for (let s = 0; s < steps; s++) this.substep(island, intents, plans, h, dt - s * h, report, pairs, true);
    } else if (this.substeps) report.substeps = this.substeps;
    this.time = t0 + dt;
    // Metabolic cost once per tick on the planned effort (as stepBody).
    for (let i = 0; i < n; i++) {
      const b = bs[i], plan = plans[i];
      if (plan.free || plan.dive || b.support!.state !== 'up') continue;
      const steps = near[i] ? report.substeps : 1;
      const lx = this.leanX[i] / steps, ly = this.leanY[i] / steps;
      spendEnergy(b, { x: plan.ax + lx / this.mass[i], y: plan.ay + ly / this.mass[i] }, Math.hypot(lx, ly) / Math.max(1, this.sp[i].pushForce), dt);
    }
    report.contacts = [...pairs.values()];
    for (const j of this.joints) {
      if (j.kind === 'hands') { j.normalForce = (j.normalForce ?? 0) / dt; j.tangentForce = (j.tangentForce ?? 0) / dt; }
      else j.force = (j.force ?? 0) / dt;
    }
    return report;
  }

  private plan(b: Body, i: number, intent: Intent, dt: number): Plan {
    const sup = b.support!;
    const none: Plan = { ax: 0, ay: 0, facing: b.facing, cut: 1, free: !!intent.free, dive: null, launch: 0 };
    if (sup.state !== 'up' || intent.free) return none;
    if (intent.dive && Math.hypot(intent.dive.x, intent.dive.y) > 1e-9) {
      const l = Math.hypot(intent.dive.x, intent.dive.y);
      return { ...none, dive: { x: intent.dive.x / l, y: intent.dive.y / l }, launch: Math.min(1, l) };
    }
    const a = availability(sup, this.sp[i], this.fat[i]);
    updateSqueeze(b, intent, dt);
    const tr = turnRateOf(b);
    const facing = b.facing + clamp(angleDiff(b.facing, commandFacing(b, intent)), -tr * dt, tr * dt);
    // Pad level costs a little speed when he plays low.
    const low = 1 - 0.12 * Math.max(0, sup.posture - 0.3);
    const cmd = low < 1 ? { ...intent, effort: (intent.effort ?? 1) * low } : intent;
    const saved = b.facing;
    b.facing = facing;
    const acc = locomotionAccel(b, cmd, dt, a);
    b.facing = saved;
    return { ax: acc.x, ay: acc.y, facing, cut: intent.cutSkill ?? 1, free: false, dive: null, launch: 0 };
  }

  private substep(ids: number[], intents: ReadonlyArray<Intent | null | undefined>, plans: Plan[], h: number, remaining: number,
    report: StepReport, pairs: Map<number, ContactRecord>, contact: boolean): void {
    const bs = this.bodies;
    for (const i of ids) { this.impX[i] = 0; this.impY[i] = 0; bs[i].support!.feetLock = 0; }
    // Holds on the legs restrict stepping for this substep.
    if (contact) for (const j of this.joints) {
      if (j.kind !== 'grasp' || j.broken || j.legs <= 0) continue;
      const sup = j.b.support!;
      const touch = CONTACT_SCALE * (j.a.profile.radius + j.b.profile.radius);
      // A holder on the ground is stretched out behind his arms.
      const d = Math.hypot(j.b.pos.x - j.a.pos.x, j.b.pos.y - j.a.pos.y) - (j.a.support!.state === 'up' || j.ground !== undefined ? 0 : GROUND_STRETCH);
      // Hands sliding down a leg still hang the holder's weight on it.
      const firm = clamp(1 - (d - touch) / Math.max(0.05, j.reach - touch), 0, 1) * (j.slipping ? 0.8 : 1);
      const lock = clamp(j.legs * firm, 0, 1);
      if (lock > sup.feetLock) { sup.feetLock = lock; sup.feetVel = { x: j.a.vel.x, y: j.a.vel.y }; }
    }

    // ---- 1. ground forces
    for (const i of ids) this.feet(i, intents[i] ?? STAND, plans[i], h, remaining, report);

    // Technique impulses land once, after the feet and before contact.
    if (contact && this.pending.length) {
      for (const p of this.pending) {
        const ia = this.indexOf(p.a), ib = this.indexOf(p.b);
        p.a.vel.x -= p.x / this.mass[ia]; p.a.vel.y -= p.y / this.mass[ia];
        p.b.vel.x += p.x / this.mass[ib]; p.b.vel.y += p.y / this.mass[ib];
        this.impX[ia] -= p.x; this.impY[ia] -= p.y;
        this.impX[ib] += p.x; this.impY[ib] += p.y;
      }
      this.pending = [];
    }

    // ---- 2. constraints
    let contacts: Contact[] = [];
    if (contact) {
      const soft = softness(CONTACT_HZ, CONTACT_ZETA, h);
      contacts = this.detect(ids, h, soft, report);
      const rows = this.jointRows(h);
      const handSoft = softness(HANDS_HZ, HANDS_ZETA, h);
      const graspSoft = softness(GRASP_HZ, GRASP_ZETA, h);
      for (let it = 0; it < ITERATIONS; it++) {
        for (const c of contacts) this.solveContact(c, soft);
        for (const r of rows) {
          if (r.joint.kind === 'hands') this.solveHands(r, handSoft);
          else this.solveGrasp(r, graspSoft);
        }
      }
      // Joint outputs and the loads they put on each body.
      for (const i of ids) { this.tripX[i] = 0; this.tripY[i] = 0; }
      for (const r of rows) {
        this.addLoad(r.i, r.j, r.nx, r.ny, r.ln, r.lt);
        const jt = r.joint;
        if (jt.kind === 'grasp' && jt.legs > 0) {
          // A hold below his COM pulls the base out from under him: the body
          // pitches the other way (a trip), on top of the COM's own momentum.
          const held = bs[r.j];
          const hc = comHeightAt(this.sp[r.j], held.support!.posture);
          const k2 = (0.3 * held.profile.heightYd) ** 2;
          const factor = (jt.legs * 0.55 * hc) * hc / k2 / this.mass[r.j];
          const jx = r.nx * r.ln - r.ny * r.lt, jy = r.ny * r.ln + r.nx * r.lt;
          this.tripX[r.j] -= jx * factor; this.tripY[r.j] -= jy * factor;
        }
        if (jt.kind === 'hands') {
          jt.normalForce = (jt.normalForce ?? 0) + r.ln;
          jt.tangentForce = (jt.tangentForce ?? 0) + r.lt;
        } else {
          const used = Math.hypot(r.ln, r.lt);
          jt.force = (jt.force ?? 0) + used;
          jt.slipping = used >= 0.98 * r.limit && r.limit > 0;
        }
      }
    } else for (const i of ids) { this.tripX[i] = 0; this.tripY[i] = 0; }

    // ---- 3. integrate positions (trapezoidal in the ground force)
    for (const i of ids) {
      const b = bs[i];
      b.pos.x += (b.vel.x - 0.5 * this.amx[i] * h) * h;
      b.pos.y += (b.vel.y - 0.5 * this.amy[i] * h) * h;
    }
    // Relax: the soft contact has already moved overlapping torsos apart;
    // now take back the velocity that correction left behind. Bodies do not
    // bounce off each other, and pushing out an overlap adds no energy, so
    // a hit transfers the same momentum at any substep.
    if (contacts.length) {
      for (const c of contacts) c.touched = c.ln > 0;
      for (let it = 0; it < RELAX_ITERATIONS; it++) {
        for (const c of contacts) {
          // A pair the correction left apart may still close that gap within
          // a substep (speculative), never more.
          const a = bs[c.i], b = bs[c.j];
          const gap = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y) - c.R;
          c.bias = gap > 0 ? gap / h : 0;
          this.solveContact(c, RIGID, true);
        }
      }
      for (const c of contacts) {
        this.addLoad(c.i, c.j, c.nx, c.ny, c.ln, c.lt);
        if (c.ln > 0 || c.touched) {
          const key = c.i * 1024 + c.j;
          const rec = pairs.get(key);
          if (rec) { rec.impulse += c.ln; rec.closing = Math.max(rec.closing, c.closing); }
          else pairs.set(key, { i: c.i, j: c.j, impulse: c.ln, closing: c.closing });
        }
      }
    }
    // Loads felt for the next substep's lean.
    const kf = 1 - Math.exp(-h / FEEL);
    for (const i of ids) {
      const sup = bs[i].support!;
      const lx = this.impX[i] / h, ly = this.impY[i] / h;
      sup.load = { x: lx, y: ly };
      sup.felt = { x: sup.felt.x + (lx - sup.felt.x) * kf, y: sup.felt.y + (ly - sup.felt.y) * kf };
    }
    // Grasps that slipped slide out; past reach they are broken.
    if (contact) for (const j of this.joints) {
      if (j.kind !== 'grasp' || j.broken) continue;
      const d = Math.hypot(j.b.pos.x - j.a.pos.x, j.b.pos.y - j.a.pos.y);
      const touch = CONTACT_SCALE * (j.a.profile.radius + j.b.profile.radius);
      // A secure grip reels in: the arms shorten toward a wrap at their own
      // rate; the tension that does it is bounded by the same grip budget.
      const held = j.slipping ? Math.max(j.hold ?? d, d) : Math.min(j.hold ?? d, Math.max(d, touch));
      j.hold = j.slipping ? held : Math.max(touch, held - (j.pull ?? 0) * h);
      // Arms dragged along a running body slide down it, to the thighs and
      // ankles: a slipping hold becomes a hold on his legs.
      if (j.slipping) j.legs += (1 - j.legs) * (1 - Math.exp(-h / LEG_SLIDE));
      // A holder pulled off his feet hangs on stretched out behind his arms.
      const reach = j.a.support!.state === 'up' ? j.reach : Math.max(j.reach, j.ground ?? j.reach + GROUND_STRETCH);
      if ((j.hold ?? d) > reach) j.broken = true;
    }

    // ---- 4. support
    for (const i of ids) if (bs[i].support!.state === 'up') this.updateSupport(i, h, report);
    this.time += h;
  }

  /** The feet: gait plan, lean into a felt load, one shared budget; or off-feet motion. */
  private feet(i: number, intent: Intent, plan: Plan, h: number, remaining: number, report: StepReport): void {
    const b = this.bodies[i];
    const sup = b.support!;
    const p = b.profile;
    const sp = this.sp[i];
    const m = this.mass[i];
    this.v0x[i] = b.vel.x; this.v0y[i] = b.vel.y;
    let fx = 0, fy = 0;
    if (sup.state === 'up') {
      if (plan.free) {
        this.alpha[i] = 1; this.cut[i] = 1;
        b.facing += (b.spin ?? 0) * h;
      } else if (plan.dive) {
        this.startFall(sup, plan.dive, 'dive', report, i);
        // The launch: legs drive the body out along the dive.
        const launch = Math.min(1.5, Math.max(0, p.vmax - Math.hypot(b.vel.x, b.vel.y))) * plan.launch * m / h;
        fx += plan.dive.x * launch; fy += plan.dive.y * launch;
        plan.dive = null; plan.free = true;
        this.alpha[i] = 0; this.cut[i] = 1;
      } else {
        const fat = this.fat[i];
        const a = availability(sup, sp, fat);
        this.alpha[i] = a;
        this.cut[i] = plan.cut;
        // Pad level moves at a finite rate; a lower opponent stands him up.
        const target = clamp(intent.posture ?? DEFAULT_POSTURE, 0, 1) - 0.2 * (1 - b.energy);
        sup.posture = clamp(sup.posture + clamp(target - sup.posture, -POSTURE_RATE * h, POSTURE_RATE * h), 0, 1);
        if (sup.leverage < 0) {
          const loaded = clamp(Math.hypot(sup.felt.x, sup.felt.y) / sp.pushForce, 0, 1.5);
          sup.posture = Math.max(0, sup.posture - STAND_UP * -sup.leverage * loaded * h);
        }
        // Yaw: the feet follow the planned facing; a contact-induced spin
        // is a disturbance they cancel at a bounded (traction) rate.
        const tr = turnRateOf(b);
        const yawAcc = tr / YAW_RESPONSE * (0.3 + 0.7 * a);
        const motor = angleDiff(b.facing, plan.facing) / Math.max(h, remaining);
        const dev = (b.spin ?? 0) - (sup.yaw ?? 0);
        const settled = dev - clamp(dev, -yawAcc * h, yawAcc * h);
        sup.yaw = motor;
        b.spin = motor + settled;
        b.facing += b.spin * h;
        // Locomotion: the tick's planned force, while he is still on his feet.
        let lx = plan.ax * m, ly = plan.ay * m;
        // A strike: the legs drive the body on beyond the gait, as hard as
        // traction allows, until the extra velocity is delivered.
        const st = sup.strike;
        if (st) {
          const need = Math.hypot(st.x, st.y);
          const ux = st.x / need, uy = st.y / need;
          const capT = sp.traction * a;
          const lu = lx * ux + ly * uy;
          const disc = lu * lu - (lx * lx + ly * ly) + capT * capT;
          const f = Math.min(disc > 0 ? Math.max(0, -lu + Math.sqrt(disc)) : 0, m * need / h);
          lx += ux * f; ly += uy * f;
          const left = need - f * h / m;
          sup.strike = f > 0 && left > 1e-3 ? { x: ux * left, y: uy * left } : undefined;
        }
        // Lean: leg drive into a felt load, along that load's axis.
        const push = clamp(intent.push ?? 0, 0, 1);
        let tx = 0, ty = 0;
        const L = Math.hypot(sup.felt.x, sup.felt.y);
        if (push > 0 && L > 1e-6) {
          const ux = -sup.felt.x / L, uy = -sup.felt.y / L;
          const ex = (intent.vel.x - (b.vel.x + plan.ax * h)) * ux + (intent.vel.y - (b.vel.y + plan.ay * h)) * uy;
          if (ex > 0) {
            const vp = b.vel.x * ux + b.vel.y * uy;
            // Legs drive hardest straight ahead; sideways or backward far less.
            const dir = directionalSpeedFactor(p, angleDiff(b.facing, Math.atan2(uy, ux)));
            const capacity = sp.pushForce * dir * clamp(1 - vp / p.vmax, 0, 1.2) * fat * (1 + sup.leverage) * a * push;
            const mag = Math.min(capacity, L * (1 + PUSH_GROWTH), m * ex / h);
            tx = ux * mag; ty = uy * mag;
          }
        }
        const rising = tx * tx + ty * ty >= sup.lean.x * sup.lean.x + sup.lean.y * sup.lean.y;
        const k = 1 - Math.exp(-h / (rising ? LEAN_RISE : LEAN_DECAY));
        let leanX = sup.lean.x + (tx - sup.lean.x) * k, leanY = sup.lean.y + (ty - sup.lean.y) * k;
        // A lean is his COM held ahead of his feet by the load. Whatever the
        // load no longer balances, beyond what his gait can accept as planned
        // acceleration, is a capture-point offset now: an overextension.
        const Ll = Math.hypot(leanX, leanY);
        if (Ll > 1e-6) {
          const hx = leanX / Ll, hy = leanY / Ll;
          const balanced = Math.max(0, -(sup.felt.x * hx + sup.felt.y * hy));
          const unsupported = Ll - balanced * (1 + PUSH_GROWTH);
          if (unsupported > 0) {
            const env = followAccel(b, { x: hx * 1e3, y: hy * 1e3 }, plan.cut, a);
            const absorb = Math.max(0, Math.hypot(env.x, env.y) - Math.max(0, plan.ax * hx + plan.ay * hy)) * m;
            const conv = Math.min(Ll, Math.max(0, unsupported - absorb));
            if (conv > 0) {
              const w0 = omega0(sp, sup.posture);
              sup.xi = { x: sup.xi.x + hx * conv / (m * w0 * w0), y: sup.xi.y + hy * conv / (m * w0 * w0) };
              leanX -= hx * conv; leanY -= hy * conv;
            }
          }
        }
        sup.lean = { x: leanX, y: leanY };
        // One budget: locomotion and lean share traction and leg strength.
        // Leg drive is directional: full straight ahead, a shuffle's or a
        // backpedal's share sideways or backward. Traction caps all of it.
        const lev = 1 + sup.leverage;
        const tfx = lx + leanX, tfy = ly + leanY;
        const along = tfx * tfx + tfy * tfy > 1e-18 ? directionalSpeedFactor(p, angleDiff(b.facing, Math.atan2(tfy, tfx))) : 1;
        const cap = Math.max(Math.hypot(lx, ly), Math.min(sp.pushForce * 1.2 * along, sp.traction) * lev * a);
        let px = leanX, py = leanY;
        if (tfx * tfx + tfy * tfy > cap * cap) {
          const qa = px * px + py * py, qb = lx * px + ly * py, qc = lx * lx + ly * ly - cap * cap;
          const scale = qa > 1e-12 ? clamp((-qb + Math.sqrt(Math.max(0, qb * qb - qa * qc))) / qa, 0, 1) : 0;
          px *= scale; py *= scale;
          if (qc > 0) { const r = cap / Math.max(1e-9, Math.hypot(lx, ly)); lx *= r; ly *= r; }
        }
        fx += lx + px; fy += ly + py;
        this.leanX[i] += px; this.leanY[i] += py;
      }
    } else {
      this.alpha[i] = 0; this.cut[i] = 1;
      this.passive(b, sup, sp, report, i);
      const fr = sup.state === 'falling' ? FALL_FRICTION : DOWN_FRICTION;
      if (sup.state === 'falling') { fx += sup.fall.x * FALL_TIP * m; fy += sup.fall.y * FALL_TIP * m; }
      // Ground friction: never reverses the motion within the substep.
      const vx = b.vel.x + fx / m * h, vy = b.vel.y + fy / m * h;
      const sv = Math.hypot(vx, vy);
      const stop = Math.min(sv, fr * G * h);
      if (sv > 1e-9) { fx -= vx / sv * stop * m / h; fy -= vy / sv * stop * m / h; }
      b.spin = (b.spin ?? 0) * Math.exp(-h / 0.15);
      b.facing += (b.spin ?? 0) * h;
    }
    const v0x = b.vel.x, v0y = b.vel.y;
    b.vel.x = v0x + fx / m * h;
    b.vel.y = v0y + fy / m * h;
    this.amx[i] = fx / m; this.amy[i] = fy / m;
    const gi = report.groundImpulse[i];
    gi.x += fx * h; gi.y += fy * h;
    report.groundWork[i] += (fx * (v0x + b.vel.x) + fy * (v0y + b.vel.y)) * 0.5 * h;
  }

  /** Off-feet motion: a fall runs its course, a downed body slides to rest and rises. */
  private passive(b: Body, sup: Support, sp: SupportParams, report: StepReport, i: number): void {
    const t = this.time;
    if (sup.state === 'falling' && t - sup.since >= fallTime(sp, sup.posture)) {
      sup.state = 'down'; sup.since = t; report.downs.push(i);
    } else if (sup.state === 'down' && Math.hypot(b.vel.x, b.vel.y) < 0.3 && t - sup.since >= 0.3) {
      sup.state = 'rising'; sup.since = t;
    } else if (sup.state === 'rising' && t - sup.since >= sp.getUp) {
      sup.state = 'up'; sup.since = t; sup.xi = { x: 0, y: 0 }; sup.lean = { x: 0, y: 0 };
      sup.posture = 0.45; sup.peak = 0; b.spin = 0; report.rises.push(i);
    }
  }

  private startFall(sup: Support, dir: Vec2, cause: Support['cause'], report: StepReport, i: number): void {
    sup.state = 'falling';
    sup.since = this.time;
    sup.fall = dir;
    sup.cause = cause;
    sup.lean = { x: 0, y: 0 };
    sup.strike = undefined;
    report.falls.push(i);
  }

  private updateSupport(i: number, h: number, report: StepReport): void {
    const b = this.bodies[i];
    const sup = b.support!;
    const sp = this.sp[i];
    const fat = this.fat[i];
    const w0 = omega0(sp, sup.posture);
    const lock = sup.feetLock;
    const causes = (sup.causes ??= { contact: 0, legs: 0, overspeed: 0 });
    // Joints and muscles smooth an impulse before the base must answer it:
    // the gait responds to the body's acceleration over ~40 ms. The filter
    // is integrated exactly over the substep (the step's acceleration is
    // constant within it), so the response does not depend on the step.
    const kg = 1 - Math.exp(-h / GAIT_LAG);
    const acc = sup.accel ?? { x: 0, y: 0 };
    const ux = (b.vel.x - this.v0x[i]) / h, uy = (b.vel.y - this.v0y[i]) / h;
    const ax = acc.x + (ux - acc.x) * kg, ay = acc.y + (uy - acc.y) * kg;
    sup.accel = { x: ax, y: ay };
    const mean = GAIT_LAG / h * kg;
    const mx = ux + (acc.x - ux) * mean, my = uy + (acc.y - uy) * mean;
    // Accelerations the feet can follow are planned; the rest displaces support.
    const f = followAccel(b, { x: mx, y: my }, this.cut[i], Math.max(this.alpha[i], 0.1) * (1 - lock) * FOLLOW_MARGIN);
    let dx = (mx - f.x) * h / w0;
    let dy = (my - f.y) * h / w0;
    // A hold on his legs pitches him over the held base, and a held foot
    // cannot be placed under him: it moves with whoever holds it, and his
    // body runs on past it.
    const legX = this.tripX[i] / w0 + lock * (b.vel.x - sup.feetVel.x) * h;
    const legY = this.tripY[i] / w0 + lock * (b.vel.y - sup.feetVel.y) * h;
    dx += legX; dy += legY;
    // Remember what has been displacing him (decays over ~0.3 s).
    const decay = Math.exp(-h / 0.3);
    causes.contact = causes.contact * decay + Math.hypot(mx - f.x, my - f.y) * h / w0;
    causes.legs = causes.legs * decay + Math.hypot(legX, legY);
    causes.overspeed *= decay;
    // Carried faster than his legs can run.
    const speed = Math.hypot(b.vel.x, b.vel.y);
    const vcap = b.profile.vmax * fat * 1.05;
    if (speed > vcap) {
      dx += b.vel.x / speed * (speed - vcap) * h; dy += b.vel.y / speed * (speed - vcap) * h;
      causes.overspeed += (speed - vcap) * h;
    }
    // What displaced him arrived through the substep: on average it has half
    // the substep to grow or be recovered.
    let xx = sup.xi.x + 0.5 * dx, xy = sup.xi.y + 0.5 * dy;
    let e = Math.hypot(xx, xy);
    const rb = baseRadiusAt(sp, sup.posture);
    const rec = recoverySpeed(sp, lock, fat);
    // The first recovery step needs a reaction latency; until it lands,
    // gravity alone acts on a deviation beyond the base.
    sup.out = e > rb ? sup.out + h : 0;
    const stepping = rec * clamp(sup.out / STEP_LATENCY, 0, 1);
    // Inside the base the ankles and hips damp it; beyond it gravity makes it
    // diverge while stepping pulls it back (exact for the substep).
    let next: number;
    if (e <= rb) next = e * Math.exp(-w0 * h);
    else {
      const eq = stepping / w0;
      next = Math.max(rb, rb + eq + (e - rb - eq) * Math.exp(w0 * h));
    }
    if (e > 1e-12) { xx *= next / e; xy *= next / e; }
    xx += 0.5 * dx; xy += 0.5 * dy;
    e = Math.hypot(xx, xy);
    sup.xi = { x: xx, y: xy };
    const crit = rb + rec / w0;
    sup.peak = Math.max(sup.peak, e / Math.max(1e-6, crit));
    if (e > crit && e > rb + 1e-6) {
      const cause = causes.legs >= causes.contact && causes.legs >= causes.overspeed ? 'legs' : causes.overspeed > causes.contact ? 'overspeed' : 'contact';
      this.startFall(sup, { x: xx / e, y: xy / e }, cause, report, i);
    }
  }

  private addLoad(i: number, j: number, nx: number, ny: number, ln: number, lt: number): void {
    const fx = nx * ln - ny * lt, fy = ny * ln + nx * lt;
    // The impulse on j is +(n·ln + t·lt); on i its opposite.
    this.impX[j] += fx; this.impY[j] += fy;
    this.impX[i] -= fx; this.impY[i] -= fy;
  }

  private detect(ids: number[], h: number, soft: Softness, report: StepReport): Contact[] {
    const bs = this.bodies;
    const out: Contact[] = [];
    for (const i of ids) { this.lev[i] = 0; this.height[i] = comHeightAt(this.sp[i], bs[i].support!.posture); }
    for (let ii = 0; ii < ids.length; ii++) {
      const i = ids[ii];
      const a = bs[i];
      const ra = a.profile.radius;
      for (let jj = ii + 1; jj < ids.length; jj++) {
        const j = ids[jj];
        const b = bs[j];
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        const rvx = b.vel.x - a.vel.x, rvy = b.vel.y - a.vel.y;
        const rsum = ra + b.profile.radius;
        const rmax = CONTACT_SCALE * 1.12 * rsum;
        const d2 = dx * dx + dy * dy;
        const reach = rmax + Math.sqrt(rvx * rvx + rvy * rvy) * h + 0.02;
        if (d2 > reach * reach) continue;
        const dist = Math.sqrt(d2);
        // Normal from the current separation; an exact coincidence uses the
        // approach direction, then a stable index-based direction.
        let nx: number, ny: number;
        const rel = Math.sqrt(rvx * rvx + rvy * rvy);
        if (dist > 1e-8) { nx = dx / dist; ny = dy / dist; }
        else if (rel > 1e-8) { nx = -rvx / rel; ny = -rvy / rel; }
        else { const ang = ((i + 1) * 13 + (j + 1) * 7) * 0.618; nx = Math.cos(ang); ny = Math.sin(ang); }
        let R = CONTACT_SCALE * (bodyRadius(a, nx, ny) + bodyRadius(b, nx, ny));
        let s = dist - R;
        let guard = false;
        if (s > 0) {
          // Swept test: do the two circles touch within this substep?
          const qa = rvx * rvx + rvy * rvy, qb = dx * rvx + dy * rvy, qc = d2 - R * R;
          const disc = qb * qb - qa * qc;
          if (qa < 1e-12 || qb >= 0 || disc < 0) continue;
          const toi = (-qb - Math.sqrt(disc)) / qa;
          if (toi > h) continue;
          const cx = dx + rvx * toi, cy = dy + rvy * toi;
          const cl = Math.hypot(cx, cy) || 1;
          nx = cx / cl; ny = cy / cl;
          R = CONTACT_SCALE * (bodyRadius(a, nx, ny) + bodyRadius(b, nx, ny));
          s = dx * nx + dy * ny - R;
          // Touching within the substep: the implicit compliant contact acts
          // on the predicted overlap. A rigid backstop forbids deep
          // pass-through when the substep is coarse.
          guard = s + (rvx * nx + rvy * ny) * h < -GUARD_DEPTH;
        } else if (-s > report.maxPenetration) report.maxPenetration = -s;
        const ma = this.mass[i], mb = this.mass[j];
        const ri = R * ra / rsum;
        const rj = R - ri;
        const vn = rvx * nx + rvy * ny;
        out.push({ i, j, nx, ny, R, ri, rj, mn: 1 / (1 / ma + 1 / mb), mt: 1 / (1 / ma + 1 / mb + ri * ri / this.inertia[i] + rj * rj / this.inertia[j]),
          guard, bias: guard ? (s + GUARD_DEPTH) / h : Math.max(soft.biasRate * s, -MAX_PUSHOUT), ln: 0, lt: 0, closing: vn < 0 ? -vn : 0 });
        // Pad level: the lower man gets under the other's pads.
        if (!guard) { const dh = (this.height[j] - this.height[i]) * LEVERAGE_GAIN; this.lev[i] += dh; this.lev[j] -= dh; }
      }
    }
    for (const jt of this.joints) {
      if (jt.kind !== 'hands') continue;
      const i = this.indexOf(jt.a), j = this.indexOf(jt.b);
      const dh = (this.height[j] - this.height[i]) * LEVERAGE_GAIN;
      this.lev[i] += dh; this.lev[j] -= dh;
    }
    for (const i of ids) bs[i].support!.leverage = clamp(this.lev[i], -0.2, 0.2);
    return out;
  }

  private solveContact(c: Contact, soft: Softness, relax = false): void {
    const a = this.bodies[c.i], b = this.bodies[c.j];
    const ima = 1 / this.mass[c.i], imb = 1 / this.mass[c.j];
    const av = a.vel, bv = b.vel;
    const vn = (bv.x - av.x) * c.nx + (bv.y - av.y) * c.ny;
    const imp = relax || c.guard ? -c.mn * (vn + c.bias) : -c.mn * soft.massScale * (vn + c.bias) - soft.impulseScale * c.ln;
    const ln = Math.max(0, c.ln + imp);
    const dn = ln - c.ln;
    c.ln = ln;
    av.x -= c.nx * dn * ima; av.y -= c.ny * dn * ima;
    bv.x += c.nx * dn * imb; bv.y += c.ny * dn * imb;
    // Coulomb friction at the contact point; off-center friction turns bodies.
    const tx = -c.ny, ty = c.nx;
    const vt = (bv.x - av.x) * tx + (bv.y - av.y) * ty - (b.spin ?? 0) * c.rj - (a.spin ?? 0) * c.ri;
    const lim = CONTACT_FRICTION * c.ln;
    const lt = clamp(c.lt - c.mt * vt, -lim, lim);
    const dt = lt - c.lt;
    c.lt = lt;
    av.x -= tx * dt * ima; av.y -= ty * dt * ima;
    bv.x += tx * dt * imb; bv.y += ty * dt * imb;
    a.spin = (a.spin ?? 0) - c.ri * dt / this.inertia[c.i];
    b.spin = (b.spin ?? 0) - c.rj * dt / this.inertia[c.j];
  }

  private jointRows(h: number): JointRow[] {
    const rows: JointRow[] = [];
    for (const jt of this.joints) {
      if (jt.kind === 'grasp' && jt.broken) continue;
      const i = this.indexOf(jt.a), j = this.indexOf(jt.b);
      const a = jt.a, b = jt.b;
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
      const dist = Math.hypot(dx, dy);
      const nx = dist > 1e-8 ? dx / dist : 1, ny = dist > 1e-8 ? dy / dist : 0;
      const row: JointRow = { joint: jt, i, j, nx, ny, mn: 1 / (1 / this.mass[i] + 1 / this.mass[j]),
        mode: 0, c: 0, ln: 0, lt: 0, limit: 0, pushLim: 0, holdLim: 0, steerLim: 0 };
      if (jt.kind === 'hands') {
        row.pushLim = Math.max(0, jt.push) * h;
        row.holdLim = Math.max(0, jt.hold) * h;
        row.steerLim = Math.max(0, jt.steer) * h;
        const c = dist - jt.extension;
        if (c < 0) { row.mode = 1; row.c = c; }
        else if (c > HANDS_SLACK) { row.mode = -1; row.c = c - HANDS_SLACK; }
      } else {
        // The arms hold where they are; a holder off his feet keeps most of
        // his grip (he hangs on).
        const hold = jt.hold ?? dist;
        jt.hold = hold;
        row.mode = -1;
        row.c = Math.max(0, dist - hold);
        row.limit = jt.capacity * (a.support!.state === 'up' ? 1 : 0.7) * h;
      }
      rows.push(row);
    }
    return rows;
  }

  private solveHands(r: JointRow, soft: Softness): void {
    const a = this.bodies[r.i], b = this.bodies[r.j];
    const ima = 1 / this.mass[r.i], imb = 1 / this.mass[r.j];
    if (r.mode !== 0) {
      const vn = (b.vel.x - a.vel.x) * r.nx + (b.vel.y - a.vel.y) * r.ny;
      const bias = r.mode > 0 ? Math.max(soft.biasRate * r.c, -MAX_PUSHOUT) : Math.min(soft.biasRate * r.c, MAX_PUSHOUT);
      const imp = -r.mn * soft.massScale * (vn + bias) - soft.impulseScale * r.ln;
      const ln = r.mode > 0 ? clamp(r.ln + imp, 0, r.pushLim) : clamp(r.ln + imp, -r.holdLim, 0);
      const dn = ln - r.ln;
      r.ln = ln;
      a.vel.x -= r.nx * dn * ima; a.vel.y -= r.ny * dn * ima;
      b.vel.x += r.nx * dn * imb; b.vel.y += r.ny * dn * imb;
    }
    if (r.steerLim > 0) this.solveTangent(r, a, b, r.steerLim);
  }

  private solveGrasp(r: JointRow, soft: Softness): void {
    const a = this.bodies[r.i], b = this.bodies[r.j];
    const ima = 1 / this.mass[r.i], imb = 1 / this.mass[r.j];
    const vn = (b.vel.x - a.vel.x) * r.nx + (b.vel.y - a.vel.y) * r.ny;
    // Tension only: the arms resist separation beyond their hold, never push.
    const imp = -r.mn * soft.massScale * (vn + soft.biasRate * r.c) - soft.impulseScale * r.ln;
    let ln = Math.min(0, r.ln + imp);
    // Shared grip budget with the sliding (tangential) resistance.
    const lim = r.limit;
    if (ln * ln + r.lt * r.lt > lim * lim) ln = Math.max(ln, -Math.sqrt(Math.max(0, lim * lim - r.lt * r.lt)));
    const dn = ln - r.ln;
    r.ln = ln;
    a.vel.x -= r.nx * dn * ima; a.vel.y -= r.ny * dn * ima;
    b.vel.x += r.nx * dn * imb; b.vel.y += r.ny * dn * imb;
    this.solveTangent(r, a, b, Math.sqrt(Math.max(0, lim * lim - r.ln * r.ln)));
  }

  /** Hands and holds couple the bodies' sideways motion directly; a grip
   * around a torso does not let him roll past like two touching pads. */
  private solveTangent(r: JointRow, a: Body, b: Body, lim: number): void {
    const ima = 1 / this.mass[r.i], imb = 1 / this.mass[r.j];
    const tx = -r.ny, ty = r.nx;
    const vt = (b.vel.x - a.vel.x) * tx + (b.vel.y - a.vel.y) * ty;
    const lt = clamp(r.lt - r.mn * vt, -lim, lim);
    const dt = lt - r.lt;
    r.lt = lt;
    a.vel.x -= tx * dt * ima; a.vel.y -= ty * dt * ima;
    b.vel.x += tx * dt * imb; b.vel.y += ty * dt * imb;
  }
}
