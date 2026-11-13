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
import { advanceRecovery, availability, baseRadiusAt, comHeightAt, fallTime, newSupport, omega0, padHeightAt, recoverySpeed, supportParams, type Support, type SupportParams } from './support.js';
import { ARM_SPEED, turnBody, workFraction } from './actuation.js';
import { newVirtualFoot, recoveryRamp, supportInverseMass, supportVelocity, supportWorkChange } from './virtual-foot.js';
import { boundedAttachment, inverseBoundedAttachment, type BoundedAttachment } from './bounded-attachment.js';
import { integrateFilteredFollow } from './filtered-follow.js';

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
  /** Body supplying muscular work (default a); technique may give b control. */
  actor?: Body;
  /** Owner of a tensile hold (default a), distinct from who controls a shove. */
  holder?: Body;
  /** Center distance the extended arms hold. */
  extension: number;
  /** Max compressive arm force, kg·yd/s². */
  push: number;
  /** Max tension (a grab of cloth), kg·yd/s². */
  hold: number;
  /** Max tangential (steering) force, kg·yd/s². */
  steer: number;
  /** Height of the hand contact, yd; defaults to the lower player's pads. */
  height?: number;
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
  /** Height of the hold, yd; otherwise interpolates from torso to lower legs. */
  height?: number;
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

/** Achieved technique impulse, aggregated over one requested action's tick.
 * Requested or out-of-reach strikes are not physical contact. */
export interface StrikeRecord {
  i: number;
  j: number;
  impulse: Vec2;
  work: number;
  /** Requested height; the support load uses its ordinary body-height clamp. */
  height?: number;
}

export interface StepReport {
  /** Substeps used by the contact island (1 when nobody was near contact). */
  substeps: number;
  /** External (ground/gravity) impulse on each body, kg·yd/s. */
  groundImpulse: Vec2[];
  /** Work of those external forces on each body, kg·yd²/s². */
  groundWork: number[];
  groundYawImpulse: number[];
  groundYawWork: number[];
  /** Positive final channel work plus real strike/reel effort, bounded per tick. */
  armWork: number[];
  armWorkLimit: number[];
  /** Scalar sum of hand/strike impulse magnitudes (one shared arm budget). */
  armImpulse: number[];
  armImpulseLimit: number[];
  /** Signed planar kinetic work, including contact yaw. No vertical/pitch
   * energy is represented by the reduced support model. */
  work: { before: number; after: number; hands: number; grasps: number; strikes: number; contacts: number; residual: number };
  contacts: ContactRecord[];
  strikes: StrikeRecord[];
  /** Bodies that started to fall, reached the ground, or got up this step. */
  falls: number[];
  downs: number[];
  rises: number[];
  maxPenetration: number;
  /** Unsettled force-equivalent lean release after the local projection, kg·yd/s². */
  maxLeanReleaseResidual: number;
  /** Most iterations needed to settle one finite committed-lean transfer. */
  maxLeanReleaseIterations: number;
  /** Finite committed-lean geometry transferred into each body's support, yd. */
  leanRelease: Vec2[];
  /** Reduced support motor's signed work and common leg-work bound.
   * Arrays are zero for unheld production bodies. This work is
   * included in work.grasps, not an additional body-energy reservoir. */
  supportMotorWork: number[];
  supportMotorWorkLimit: number[];
  /** Largest held corrective displacement before reach validation, yd. */
  maxHeldRecoveryExcursion: number;
  /** Lower holds lost because their reduced support attachment exceeded reach. */
  lowerHoldReleases: number;
  /** Work left in passive grips after subtracting support motor work. */
  passiveGraspWork: number;
  /** Experimental local impact boundaries; nominal substeps stay unchanged. */
  impactSplits: number;
  impactSplitLimitHits: number;
  /** Error estimate of frozen-frame filtered follow integration, yd/s. */
  maxSupportIntegrationError: number | null;
  supportIntegrationFailures: number;
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
// Accuracy/cost audit: docs/reviews/hand-fight-convergence.md. Sustained
// technique feedback remains resolution-sensitive, so this is a reduction
// of error, not a declaration of complete temporal stability.
const MIN_SUBSTEPS = 12;
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
const POSTURE_RATE = 2.5;
const DEFAULT_POSTURE = 0.2;
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
  /** An anisotropic lower attachment has a different tangent mobility. */
  mt?: number;
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
  actor: number;
  steerActor: number;
  /** Active reel already transmitted through this grip in the substep. */
  reel: number;
  /** Identical numerical copies share one physical compliant attachment. */
  members?: GraspJoint[];
  /** Corrections can recover only this channel's earlier numerical work
   * within the same physical substep, never another channel or interval. */
  normalWork?: { net: number };
  tangentWork?: { net: number };
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
  /** Production uses analytic recovery except during a lower hold. The
   * global averaged-motor mode remains a research comparison. */
  readonly supportModel: 'legacy' | 'virtual-foot';
  /** Sustained bounded hand force acts over the interval, unlike an impact.
   * The end rule is retained for source-matched numerical comparisons. */
  readonly handIntegration: 'end' | 'centered';
  /** Numerical row accounting; per-update remains only for comparison. */
  readonly constraintWork: 'per-update' | 'per-solve';
  /** Research-only onset handling; production keeps speculative contacts. */
  readonly impactTiming: 'speculative' | 'local-sweep';
  readonly supportIntegration: 'mean' | 'integrated';
  /** Live reduced lower geometry; false retains the historical linear law. */
  readonly boundedAttachment: boolean;
  joints: Joint[] = [];
  /** World clock, seconds (the owner may set it to keep a shared clock). */
  time = 0;
  /** Fixed substep count for convergence studies; adaptive when unset. */
  substeps?: number;
  private readonly index = new Map<Body, number>();
  /** Technique impulses queued for the next step: equal and opposite between two bodies. */
  private pending: Array<{ a: Body; b: Body; x: number; y: number; height?: number; delivered?: StrikeRecord }> = [];
  private readonly reels = new Map<GraspJoint, number>();
  /** Reference adjustment preserves the held point when a grip slides down. */
  private readonly attachments = new WeakMap<GraspJoint, { share: number; reference: Vec2; foot: NonNullable<Support['foot']>; bounded?: boolean;
    geometry?: { x: number; y: number; limit: number; value: BoundedAttachment } }>();
  private readonly heldBodies = new Set<Body>();
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
  /** Translation used by position integration, before velocity relaxation. */
  private readonly travelVx: Float64Array;
  private readonly travelVy: Float64Array;
  /** Correction to trapezoidal ground travel when a passive body stops early. */
  private readonly travelAdjustX: Float64Array;
  private readonly travelAdjustY: Float64Array;
  private readonly tipX: Float64Array;
  private readonly tipY: Float64Array;
  private readonly braceX: Float64Array;
  private readonly braceY: Float64Array;
  private readonly comHeight: Float64Array;
  private readonly padHeight: Float64Array;
  private readonly v0x: Float64Array;
  private readonly v0y: Float64Array;
  private readonly amx: Float64Array;
  private readonly amy: Float64Array;
  private readonly alpha: Float64Array;
  private readonly cut: Float64Array;
  private readonly leanX: Float64Array;
  private readonly leanY: Float64Array;
  private readonly armScale: Float64Array;
  private readonly armCap: Float64Array;
  private readonly active: Float64Array;
  private readonly footImpulseX: Float64Array;
  private readonly footImpulseY: Float64Array;
  /** Peak corrective speed allocated from this interval's common leg budget. */
  private readonly recovery: Float64Array;
  private report!: StepReport;
  private tickDt = .05;

  constructor(bodies: Body[], opts: { substeps?: number; supportModel?: 'legacy' | 'virtual-foot'; constraintWork?: 'per-update' | 'per-solve'; impactTiming?: 'speculative' | 'local-sweep'; supportIntegration?: 'mean' | 'integrated'; boundedAttachment?: boolean; handIntegration?: 'end' | 'centered' } = {}) {
    this.bodies = bodies;
    this.substeps = opts.substeps;
    this.handIntegration = opts.handIntegration ?? 'centered';
    this.supportModel = opts.supportModel ?? 'legacy';
    this.constraintWork = opts.constraintWork ?? 'per-solve';
    this.impactTiming = opts.impactTiming ?? 'speculative';
    this.supportIntegration = opts.supportIntegration ?? 'mean';
    this.boundedAttachment = opts.boundedAttachment ?? (this.supportModel === 'legacy');
    if (this.boundedAttachment && this.supportModel !== 'legacy')
      throw new RangeError('Bounded attachments require the live held-only support lifecycle');
    const n = (this.n = bodies.length);
    bodies.forEach((b, i) => {
      this.index.set(b, i);
      b.support ??= newSupport();
      if (this.supportModel === 'virtual-foot') b.support.foot ??= newVirtualFoot(b.pos);
      else delete b.support.foot; // an inherited experimental state cannot select the model
      b.spin ??= 0;
    });
    this.sp = bodies.map((b) => supportParams(b.profile));
    this.mass = Float64Array.from(bodies, (b) => b.profile.massKg);
    this.inertia = Float64Array.from(this.sp, (s) => s.yawInertia);
    const f = () => new Float64Array(n);
    this.fat = f(); this.impX = f(); this.impY = f(); this.tripX = f(); this.tripY = f();
    this.travelVx = f(); this.travelVy = f();
    this.travelAdjustX = f(); this.travelAdjustY = f();
    this.tipX = f(); this.tipY = f(); this.braceX = f(); this.braceY = f();
    this.comHeight = f(); this.padHeight = f();
    this.v0x = f(); this.v0y = f(); this.amx = f(); this.amy = f(); this.alpha = f(); this.cut = f();
    this.leanX = f(); this.leanY = f();
    this.armScale = f(); this.armCap = f(); this.active = f();
    this.footImpulseX = f(); this.footImpulseY = f();
    this.recovery = f();
  }

  indexOf(b: Body): number {
    return this.index.get(b) ?? -1;
  }

  /**
   * A technique's strike, pull or shove: impulse J (kg·yd/s) on `b` and −J on
   * `a`, applied inside the next step so balance and loads respond to it.
   * Internal: total momentum is unchanged.
   */
  strike(a: Body, b: Body, j: Vec2, height?: number): void {
    if (this.indexOf(a) < 0 || this.indexOf(b) < 0 || a === b || !Number.isFinite(j.x + j.y)) return;
    this.pending.push({ a, b, x: j.x, y: j.y, height });
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
    // Restored/reused bodies follow this world's explicit model. Production
    // owns the held-coordinate lifecycle below; record presence cannot select it.
    for (const b of bs) {
      if (this.supportModel === 'virtual-foot') b.support!.foot ??= newVirtualFoot(b.pos);
      else if (!this.heldBodies.has(b)) {
        if (b.support!.foot) delete b.support!.foot;
        b.support!.feetLock = 0;
      }
    }
    const report: StepReport = { substeps: 1, groundImpulse: bs.map(() => ({ x: 0, y: 0 })),
      groundWork: new Array(n).fill(0), groundYawImpulse: new Array(n).fill(0), groundYawWork: new Array(n).fill(0),
      armWork: new Array(n).fill(0), armWorkLimit: new Array(n).fill(0), armImpulse: new Array(n).fill(0), armImpulseLimit: new Array(n).fill(0),
      work: {before: this.kineticEnergy(),after: 0,hands: 0,grasps: 0,strikes: 0,contacts: 0,residual: 0},
      contacts: [], strikes: [], falls: [], downs: [], rises: [], maxPenetration: 0,
      maxLeanReleaseResidual: 0, maxLeanReleaseIterations: 0, leanRelease: bs.map(() => ({ x: 0, y: 0 })),
      supportMotorWork: new Array(n).fill(0), supportMotorWorkLimit: new Array(n).fill(0), passiveGraspWork: 0,
      maxHeldRecoveryExcursion: 0, lowerHoldReleases: 0,
      impactSplits: 0, impactSplitLimitHits: 0, maxSupportIntegrationError: 0, supportIntegrationFailures: 0 };
    this.report = report; this.tickDt = dt;
    this.joints = this.joints.filter((j) => !(j.kind === 'grasp' && j.broken) && this.indexOf(j.a) >= 0 && this.indexOf(j.b) >= 0 && j.a !== j.b
      && (j.kind!=='hands'||(this.indexOf(j.actor??j.a)>=0&&this.indexOf(j.holder??j.a)>=0)));
    this.syncHeldSupport();
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
      this.armCap[i] = this.sp[i].armForce * this.fat[i] * (b.support!.state === 'up' ? 1 : .7);
      report.armImpulseLimit[i] = this.armCap[i] * dt;
      report.armWorkLimit[i] = this.armCap[i] * ARM_SPEED * dt;
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
      const divisor = this.impactTiming === 'local-sweep' ? dt : steps;
      const lx = this.leanX[i] / divisor, ly = this.leanY[i] / divisor;
      spendEnergy(b, { x: plan.ax + lx / this.mass[i], y: plan.ay + ly / this.mass[i] }, Math.hypot(lx, ly) / Math.max(1, this.sp[i].pushForce), dt);
    }
    report.contacts = [...pairs.values()];
    this.pending = [];
    for (const j of this.joints) {
      if (j.kind === 'hands') { j.normalForce = (j.normalForce ?? 0) / dt; j.tangentForce = (j.tangentForce ?? 0) / dt; }
      else j.force = (j.force ?? 0) / dt;
    }
    report.work.after = this.kineticEnergy();
    report.work.residual = report.work.after-report.work.before
      - report.groundWork.reduce((s,w)=>s+w,0)-report.groundYawWork.reduce((s,w)=>s+w,0)
      - report.work.hands-report.work.grasps-report.work.strikes-report.work.contacts;
    return report;
  }

  /** Translational plus yaw kinetic energy; reduced support is not 3D energy. */
  kineticEnergy(): number {
    return this.bodies.reduce((s,b)=>s+.5*b.profile.massKg*(b.vel.x*b.vel.x+b.vel.y*b.vel.y)
      +.5*supportParams(b.profile).yawInertia*(b.spin??0)**2,0);
  }

  private canStrike(a: Body,b: Body): boolean {
    return a.support!.state==='up' && Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)<=a.profile.reach+b.profile.radius;
  }

  /** Requested actions share one scalar arm capacity, so duplicate joints
   * or strike requests cannot multiply a body's force. Allocation uses
   * requested vector magnitudes, independent of body/solver iteration order. */
  private allocateArms(): void {
    this.active.fill(0);
    for (const jt of this.joints) {
      if (jt.kind==='hands') {
        const actor=this.indexOf(jt.actor??jt.a),holder=this.indexOf(jt.holder??jt.a);
        this.active[actor]+=Math.hypot(Math.max(0,jt.push,actor===holder?jt.hold:0),Math.max(0,jt.steer));
        if(actor!==holder)this.active[holder]+=Math.max(0,jt.hold);
      }
      else if (!jt.broken && jt.pull!>0) this.active[this.indexOf(jt.a)]+=this.armCap[this.indexOf(jt.a)];
    }
    for (const p of this.pending) if(this.canStrike(p.a,p.b)) this.active[this.indexOf(p.a)]+=Math.hypot(p.x,p.y)/this.tickDt;
    for(let i=0;i<this.n;i++) this.armScale[i]=this.active[i]>0?Math.min(1,this.armCap[i]/this.active[i]):1;
  }

  /** Active reeling and passive restraint use the same physical grip.
   * All grasps from one holder share his strongest structural claim, so
   * duplicated joints cannot supply another holding-force allowance. */
  private gripCapacity(jt: GraspJoint): number {
    const i=this.indexOf(jt.a);
    const holds=this.joints.filter((j):j is GraspJoint=>j.kind==='grasp'&&!j.broken&&j.a===jt.a);
    const total=holds.reduce((s,j)=>s+Math.max(0,j.capacity),0);
    const structural=Math.min(3.36*this.sp[i].armForce,Math.max(0,...holds.map(j=>j.capacity)));
    return Math.max(0,jt.capacity)*Math.min(1,structural/Math.max(1e-9,total))*(jt.a.support!.state==='up'?1:.7);
  }

  /** Apply internal impulse and record its exact planar kinetic work.
   * Passive channels finish with nonpositive work. Numerical corrections
   * may refund their own earlier guess in this solve; real actions share
   * the owner's remaining tick budget without cross-interval credit. */
  private pairImpulse(i: number,j: number,x: number,y: number,actor: number,
    kind: 'hands'|'grasps'|'strikes', active=true, channel?: { net: number }): number {
    const a=this.bodies[i],b=this.bodies[j];
    const linear=(b.vel.x-a.vel.x)*x+(b.vel.y-a.vel.y)*y;
    const quadratic=.5*(x*x+y*y)*(1/this.mass[i]+1/this.mass[j]);
    const ledger = this.constraintWork === 'per-solve' ? channel : undefined;
    const previous = ledger?.net ?? 0;
    const budget=(active?Math.max(0,this.report.armWorkLimit[actor]-this.report.armWork[actor]):0)
      + (ledger ? Math.max(0,-previous) : 0);
    const fraction=workFraction(linear,quadratic,budget);
    x*=fraction;y*=fraction;
    const work=linear*fraction+quadratic*fraction*fraction;
    a.vel.x-=x/this.mass[i];a.vel.y-=y/this.mass[i];
    b.vel.x+=x/this.mass[j];b.vel.y+=y/this.mass[j];
    this.report.work[kind]+=work;
    if (kind === 'grasps' && !active) this.report.passiveGraspWork += work;
    if (ledger) ledger.net = previous + work;
    if(active)this.report.armWork[actor]+=ledger
      ? Math.max(0,ledger.net)-Math.max(0,previous) : Math.max(0,work);
    return fraction;
  }

  /** The attachment and velocity use the same reduced coordinate/Jacobian.
   * Body-only reach paired with foot-point velocity would be inconsistent. */
  private boundedGeometry(jt: GraspJoint): BoundedAttachment {
    const attachment = this.attachments.get(jt)!;
    const share = clamp(jt.legs, 0, 1), foot = jt.b.support!.foot!;
    const x = share * foot.offset.x + attachment.reference.x;
    const y = share * foot.offset.y + attachment.reference.y;
    const limit = this.sp[this.indexOf(jt.b)].comHeight, cached = attachment.geometry;
    // Geometry is fixed through a force solve. Reuse its map/Jacobian while
    // impulses change velocities; actual coordinate/reference changes invalidate
    // the exact key. Body translation is added separately by graspPoint.
    if (cached && cached.x === x && cached.y === y && cached.limit === limit) return cached.value;
    const value = boundedAttachment({ x, y }, limit);
    attachment.geometry = { x, y, limit, value };
    return value;
  }

  private graspPoint(jt: GraspJoint): Vec2 {
    const foot = jt.b.support!.foot, share = foot ? clamp(jt.legs, 0, 1) : 0;
    const attachment = foot && share > 0 ? this.attachments.get(jt) : undefined;
    const reference = attachment?.reference;
    if (attachment?.bounded) {
      const r = this.boundedGeometry(jt).offset;
      return { x: jt.b.pos.x + r.x, y: jt.b.pos.y + r.y };
    }
    return { x: jt.b.pos.x + share * (foot?.offset.x ?? 0) + (reference?.x ?? 0),
      y: jt.b.pos.y + share * (foot?.offset.y ?? 0) + (reference?.y ?? 0) };
  }

  /** Same derivative owns point velocity, generalized load and directional
   * mobility. The corrective coordinate stays fixed throughout each solve. */
  private graspJacobian(jt: GraspJoint): { xx: number; xy: number; yy: number } {
    const foot = jt.b.support!.foot, share = foot ? clamp(jt.legs, 0, 1) : 0;
    const attachment = this.attachments.get(jt);
    if (!foot || !attachment?.bounded) return { xx: share, xy: 0, yy: share };
    const d = this.boundedGeometry(jt).derivative;
    return { xx: share * d.xx, xy: share * d.xy, yy: share * d.yy };
  }

  private attachmentMobility(jt: GraspJoint, nx: number, ny: number): number {
    const j = this.graspJacobian(jt), x = j.xx * nx + j.xy * ny, y = j.xy * nx + j.yy * ny;
    return (jt.b.support!.foot?.mobility ?? 0) * (x * x + y * y);
  }

  private sameAttachmentJacobian(a: GraspJoint, b: GraspJoint): boolean {
    if (this.attachments.get(a)?.bounded !== this.attachments.get(b)?.bounded) return false;
    const x = this.graspJacobian(a), y = this.graspJacobian(b);
    return Math.abs(x.xx - y.xx) < 1e-12 && Math.abs(x.xy - y.xy) < 1e-12 && Math.abs(x.yy - y.yy) < 1e-12;
  }

  /** A held corrective support coordinate is sufficient here; ordinary gait
   * and hand contact keep analytic recovery and spend no extra motor reserve.
   * Bind new holds where the technique acquired them, rather than inheriting
   * displacement accumulated during another holder's earlier recovery. */
  private syncHeldSupport(): void {
    if (this.supportModel !== 'legacy') return;
    const byBody = new Map<Body, GraspJoint[]>();
    for (const jt of this.joints) {
      if (jt.kind !== 'grasp') continue;
      if (jt.legs <= 0) { this.attachments.delete(jt); continue; }
      if (jt.broken || jt.capacity <= 0) continue;
      const holds = byBody.get(jt.b);
      if (holds) holds.push(jt); else byBody.set(jt.b, [jt]);
    }
    for (const b of this.heldBodies) if (!byBody.has(b)) {
      delete b.support!.foot; b.support!.feetLock = 0;
      this.heldBodies.delete(b);
    }
    for (const [b, holds] of byBody) {
      this.heldBodies.add(b);
      const foot = b.support!.foot ??= newVirtualFoot(b.pos);
      const reach = supportParams(b.profile).comHeight;
      const excursion = Math.hypot(foot.offset.x, foot.offset.y);
      this.report.maxHeldRecoveryExcursion = Math.max(this.report.maxHeldRecoveryExcursion, excursion);
      for (const jt of holds) {
        const share = clamp(jt.legs, 0, 1), old = this.attachments.get(jt);
        if (!old || old.foot !== foot) this.attachments.set(jt, { share, reference: { x: -share * foot.offset.x, y: -share * foot.offset.y }, foot,
          bounded: this.boundedAttachment });
        else {
          if (old.share !== share) {
            old.reference.x += (old.share - share) * foot.offset.x;
            old.reference.y += (old.share - share) * foot.offset.y;
            old.share = share;
          }
          // An explicitly restored linear attachment converts once without
          // moving its acquired point. At/outside the finite map's domain,
          // retain the linear law and its ordinary reach validation.
          if (this.boundedAttachment && old.bounded === undefined) {
            const z = inverseBoundedAttachment({ x: share * foot.offset.x + old.reference.x,
              y: share * foot.offset.y + old.reference.y }, reach);
            old.bounded = z !== null;
            if (z) old.reference = { x: z.x - share * foot.offset.x, y: z.y - share * foot.offset.y };
          }
        }
        const point = this.graspPoint(jt);
        // Only actual held geometry can invalidate a grip, not how far the
        // common correction chart has accumulated under a small leg share.
        if (!this.attachments.get(jt)!.bounded && Math.hypot(point.x - b.pos.x, point.y - b.pos.y) > reach) {
          jt.broken = true; this.report.lowerHoldReleases++;
        }
      }
      if (holds.every(jt => jt.broken)) {
        delete b.support!.foot; b.support!.feetLock = 0; this.heldBodies.delete(b);
      } else if (excursion > reach) {
        // Change coordinates, not physical placement: p+s*q+r is unchanged
        // by q'=0, r'=r+s*q. Keep the motor, balance and work history. This
        // bounds the chart without popping a physically reachable low hold.
        for (const jt of holds) if (!jt.broken) {
          const attachment = this.attachments.get(jt)!;
          attachment.reference.x += attachment.share * foot.offset.x;
          attachment.reference.y += attachment.share * foot.offset.y;
        }
        foot.target.x -= foot.offset.x; foot.target.y -= foot.offset.y;
        foot.offset = { x: 0, y: 0 }; foot.anchor = { ...b.pos };
      }
    }
  }

  private graspVelocity(jt: GraspJoint): Vec2 {
    const foot = jt.b.support!.foot, share = foot ? clamp(jt.legs, 0, 1) : 0;
    const u = foot ? supportVelocity(foot, foot.force) : { x: 0, y: 0 };
    if (this.attachments.get(jt)?.bounded) {
      const j = this.graspJacobian(jt);
      return { x: jt.b.vel.x - jt.a.vel.x + j.xx * u.x + j.xy * u.y,
        y: jt.b.vel.y - jt.a.vel.y + j.xy * u.x + j.yy * u.y };
    }
    return { x: jt.b.vel.x - jt.a.vel.x + share * u.x,
      y: jt.b.vel.y - jt.a.vel.y + share * u.y };
  }

  /** Internal equal/opposite body load, with work of one common support
   * motor separated from passive grip dissipation. Solver updates telescope
   * in aggregate foot impulse; they do not refill/spend a motor budget. */
  private supportImpulse(jt: GraspJoint, x: number, y: number, h: number, active = false, channel?: { net: number }): number {
    const i = this.indexOf(jt.a), j = this.indexOf(jt.b), a = jt.a, b = jt.b;
    const foot = b.support!.foot!, share = clamp(jt.legs, 0, 1);
    const bodyLinear = (b.vel.x - a.vel.x) * x + (b.vel.y - a.vel.y) * y;
    const bodyQuadratic = .5 * (x * x + y * y) * (1 / this.mass[i] + 1 / this.mass[j]);
    let change = { x: share * x, y: share * y };
    if (this.attachments.get(jt)?.bounded) {
      const jacobian = this.graspJacobian(jt);
      change = { x: jacobian.xx * x + jacobian.xy * y, y: jacobian.xy * x + jacobian.yy * y };
    }
    const motor = supportWorkChange(foot, { x: this.footImpulseX[j], y: this.footImpulseY[j] },
      change, h);
    const ledger = this.constraintWork === 'per-solve' ? channel : undefined;
    const previous = ledger?.net ?? 0;
    const budget = (active ? Math.max(0, this.report.armWorkLimit[i] - this.report.armWork[i]) : 0)
      + (ledger ? Math.max(0,-previous) : 0);
    const fraction = workFraction(bodyLinear - motor.linear, bodyQuadratic - motor.quadratic, budget);
    x *= fraction; y *= fraction;
    const bodyWork = bodyLinear * fraction + bodyQuadratic * fraction * fraction;
    const motorWork = motor.linear * fraction + motor.quadratic * fraction * fraction;
    a.vel.x -= x / this.mass[i]; a.vel.y -= y / this.mass[i];
    b.vel.x += x / this.mass[j]; b.vel.y += y / this.mass[j];
    // Preserve the old operation order on the default linear path.
    this.footImpulseX[j] += this.attachments.get(jt)?.bounded ? change.x * fraction : share * x;
    this.footImpulseY[j] += this.attachments.get(jt)?.bounded ? change.y * fraction : share * y;
    foot.force = { x: this.footImpulseX[j] / h, y: this.footImpulseY[j] / h };
    this.report.work.grasps += bodyWork;
    const passive = bodyWork - motorWork;
    if (ledger) ledger.net = previous + passive;
    if (active) this.report.armWork[i] += ledger
      ? Math.max(0,ledger.net)-Math.max(0,previous) : Math.max(0,passive);
    else this.report.passiveGraspWork += bodyWork - motorWork;
    return fraction;
  }

  /** Common recovery allocation, including the analytic unheld path. The
   * body's finite compliance comes from its profile, not unused effort:
   * exhausting active drive cannot make a weak grip infinitely effective. */
  private prepareRecovery(i: number, h: number, capacity: number): number {
    const b = this.bodies[i], sup = b.support!, foot = sup.foot;
    const sp = this.sp[i];
    const mobility = sp.pushForce > 0 ? sp.stepSpeed / sp.pushForce : 0;
    const speed = Math.min(sp.stepSpeed * this.fat[i], mobility * capacity);
    if (!foot) return speed;
    const e = Math.hypot(sup.xi.x, sup.xi.y), rb = baseRadiusAt(sp, sup.posture);
    foot.capacity = capacity;
    foot.mobility = mobility;
    foot.state = e > rb ? 'placing' : 'supported';
    if (e <= rb) return speed;
    const requested = Math.min(speed * recoveryRamp(sup.out, STEP_LATENCY, h), (e - rb) / h);
    foot.desired = { x: sup.xi.x / e * requested, y: sup.xi.y / e * requested };
    foot.target = { x: foot.anchor.x + sup.xi.x / e * (e - rb),
      y: foot.anchor.y + sup.xi.y / e * (e - rb) };
    this.report.supportMotorWorkLimit[i] += capacity * speed * h;
    return speed;
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
    if (!contact || this.impactTiming === 'speculative') {
      this.integrateSubstep(ids, intents, plans, h, remaining, report, pairs, contact);
      return;
    }
    // This World currently advances all near bodies as one island. A split
    // would change every attached/struck body's physical solve, even if that
    // body was excluded from the free-flight prediction. Restrict the entire
    // experiment to an island with no live joints or pending strikes.
    if (this.joints.some(jt => !(jt.kind === 'grasp' && jt.broken)) || this.pending.length) {
      this.integrateSubstep(ids, intents, plans, h, remaining, report, pairs, contact);
      return;
    }
    let left = h, splits = 0;
    while (left > 1e-12) {
      const onset = this.firstImpactTime(ids, plans, left);
      // Bounded local experiment. The predictor is a constant-acceleration
      // chord, not a full coupled trajectory oracle. A miss is re-evaluated
      // after the segment; persistent loads continue through the same solve.
      if (onset > 1e-6 && onset < left - 1e-6 && splits < 8) {
        this.integrateSubstep(ids, intents, plans, onset, remaining - (h-left), report, pairs, true, false);
        left -= onset; splits++; report.impactSplits++;
      } else {
        if (splits >= 8 && onset > 1e-6 && onset < left - 1e-6) report.impactSplitLimitHits++;
        this.integrateSubstep(ids, intents, plans, left, remaining - (h-left), report, pairs, true);
        return;
      }
    }
  }

  /** Approximate incoming circle-contact time. The planned acceleration
   * supplies a chord of the free trajectory; contact/joint loads can change
   * it, so every local segment is re-evaluated and fallback is observable. */
  private firstImpactTime(ids: number[], plans: Plan[], h: number): number {
    let first = h;
    for (let ii = 0; ii < ids.length; ii++) for (let jj = ii+1; jj < ids.length; jj++) {
      const i=ids[ii],j=ids[jj],a=this.bodies[i],b=this.bodies[j];
      const dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=Math.hypot(dx,dy);
      if (d < 1e-9) continue;
      const R=CONTACT_SCALE*(bodyRadius(a,dx/d,dy/d)+bodyRadius(b,dx/d,dy/d));
      if (d-R <= 1e-7) continue;
      const acc=(k:number) => this.bodies[k].support!.state==='up'&&!plans[k].free
        ? {x:plans[k].ax+this.bodies[k].support!.lean.x/this.mass[k],y:plans[k].ay+this.bodies[k].support!.lean.y/this.mass[k]}
        : {x:0,y:0};
      const aa=acc(i),ab=acc(j);
      const vx=b.vel.x-a.vel.x+.5*(ab.x-aa.x)*h,vy=b.vel.y-a.vel.y+.5*(ab.y-aa.y)*h;
      const qa=vx*vx+vy*vy,qb=dx*vx+dy*vy,qc=d*d-R*R,disc=qb*qb-qa*qc;
      if (qa<1e-12||qb>=0||disc<0) continue;
      const t=(-qb-Math.sqrt(disc))/qa;
      if (t>0&&t<first) first=t;
    }
    return first;
  }

  private integrateSubstep(ids: number[], intents: ReadonlyArray<Intent | null | undefined>, plans: Plan[], h: number, remaining: number,
    report: StepReport, pairs: Map<number, ContactRecord>, contact: boolean, swept = true): void {
    const bs = this.bodies;
    this.syncHeldSupport();
    this.reels.clear();
    for (const i of ids) {
      this.impX[i] = 0; this.impY[i] = 0; this.tripX[i] = 0; this.tripY[i] = 0;
      this.tipX[i] = 0; this.tipY[i] = 0; this.braceX[i] = 0; this.braceY[i] = 0;
      this.travelAdjustX[i] = 0; this.travelAdjustY[i] = 0;
      bs[i].support!.feetLock = 0;
      this.footImpulseX[i] = 0; this.footImpulseY[i] = 0;
      const foot = bs[i].support!.foot;
      if (foot) {
        foot.force = { x: 0, y: 0 };
        foot.desired = foot.achieved = { x: 0, y: 0 };
        foot.capacity = foot.mobility = 0; foot.state = 'unloaded';
        foot.anchor = { x: bs[i].pos.x + foot.offset.x, y: bs[i].pos.y + foot.offset.y };
        foot.target = { ...foot.anchor };
      }
    }
    // A grasp that cannot exist must not spend arms, transmit one last
    // remote impulse or restrict a foot before being released. Validate
    // current geometry/capacity before all load and support paths.
    if (contact) for (const jt of this.joints) {
      if (jt.kind !== 'grasp' || jt.broken) continue;
      const reach = jt.a.support!.state === 'up' ? jt.reach
        : Math.max(jt.reach, jt.ground ?? jt.reach + GROUND_STRETCH);
      const point = this.graspPoint(jt);
      const d = Math.hypot(point.x - jt.a.pos.x, point.y - jt.a.pos.y);
      if (this.gripCapacity(jt) <= 0 || d > reach || (jt.hold ?? d) > reach) jt.broken = true;
    }
    this.syncHeldSupport();
    this.allocateArms();
    // A low hold affects support through its actual transmitted impulse and
    // contact-height moment below. Its existence alone cannot remove recovery
    // capacity. The reduced body model does not simulate individual held feet.

    // ---- 1. ground forces
    for (const i of ids) this.feet(i, intents[i] ?? STAND, plans[i], h, remaining, report);
    for (const i of ids) {
      this.comHeight[i] = comHeightAt(this.sp[i], bs[i].support!.posture);
      this.padHeight[i] = padHeightAt(this.sp[i], bs[i].support!.posture);
    }

    // Strikes develop over the controller tick, sharing arm force with all
    // hand actions. A distant target cannot receive a remote shove.
    if (contact && this.pending.length) {
      for (const p of this.pending) {
        const ia = this.indexOf(p.a), ib = this.indexOf(p.b);
        if (!this.canStrike(p.a,p.b)) continue;
        const scale = this.armScale[ia] * h / this.tickDt;
        const x = p.x*scale, y = p.y*scale;
        const workBefore = report.work.strikes;
        const delivered = this.pairImpulse(ia,ib,x,y,ia,'strikes');
        // A technique strike is a bounded force developed across h, just
        // like hands, rather than a collision impulse at its start. Center
        // only its achieved dose after shared force/work limits. Ground and
        // hand corrections still accumulate independently; impacts do not.
        this.travelAdjustX[ia] += .5 * x * delivered / this.mass[ia];
        this.travelAdjustY[ia] += .5 * y * delivered / this.mass[ia];
        this.travelAdjustX[ib] -= .5 * x * delivered / this.mass[ib];
        this.travelAdjustY[ib] -= .5 * y * delivered / this.mass[ib];
        if (delivered > 0 && Math.hypot(x, y) > 0) {
          if (!p.delivered) {
            p.delivered = { i: ia, j: ib, impulse: { x: 0, y: 0 }, work: 0, height: p.height };
            report.strikes.push(p.delivered);
          }
          const record = p.delivered;
          record.impulse.x += x * delivered;
          record.impulse.y += y * delivered;
          record.work += report.work.strikes - workBefore;
        }
        report.armImpulse[ia] += Math.hypot(x,y)*delivered;
        this.addLoad(ia, ib, 1, 0, x*delivered, y*delivered, p.height);
      }
    }
    // Active reeling is distinct from passive grip. Arms apply a finite
    // force; the passive joint never invents work to shorten its landmark.
    if (contact) for (const jt of this.joints) {
      if (jt.kind !== 'grasp' || jt.broken || !(jt.pull! > 0)) continue;
      const i=this.indexOf(jt.a), j=this.indexOf(jt.b);
      const point=this.graspPoint(jt);
      const dx=point.x-jt.a.pos.x,dy=point.y-jt.a.pos.y,d=Math.hypot(dx,dy);
      const touch=CONTACT_SCALE*(jt.a.profile.radius+jt.b.profile.radius);
      if (d <= touch || d>jt.reach || jt.a.support!.state!=='up') continue;
      const nx=dx/d,ny=dy/d;
      const rv=this.graspVelocity(jt);
      const vn=rv.x*nx+rv.y*ny;
      const foot=jt.b.support!.foot, share=foot?clamp(jt.legs,0,1):0;
      const demandMobility = (1 / this.mass[i] + 1 / this.mass[j]) * this.tickDt
        + (this.attachments.get(jt)?.bounded ? this.attachmentMobility(jt,nx,ny) : share * share * (foot?.mobility ?? 0));
      // Preserve the production operation order: tiny rounding changes can
      // alter later closed-loop contacts even with the experiment disabled.
      const wanted=foot ? Math.max(0,vn+Math.min(ARM_SPEED,jt.pull!))/demandMobility
        : Math.max(0,vn+Math.min(ARM_SPEED,jt.pull!))/(1/this.mass[i]+1/this.mass[j])/this.tickDt;
      const impulse=Math.min(wanted,this.armCap[i]*this.armScale[i],this.gripCapacity(jt))*h;
      const fraction=share>0?this.supportImpulse(jt,-nx*impulse,-ny*impulse,h,true)
        :this.pairImpulse(i,j,-nx*impulse,-ny*impulse,i,'grasps');
      if (share === 0) {
        // Torso reeling is a bounded force across h, like hands and strikes.
        // Center only its achieved impulse; passive capture keeps its timing.
        // Lower attachments retain their separately coupled support solve.
        const x = -nx * impulse * fraction, y = -ny * impulse * fraction;
        this.travelAdjustX[i] += .5 * x / this.mass[i];
        this.travelAdjustY[i] += .5 * y / this.mass[i];
        this.travelAdjustX[j] -= .5 * x / this.mass[j];
        this.travelAdjustY[j] -= .5 * y / this.mass[j];
      }
      this.reels.set(jt,impulse*fraction);
      report.armImpulse[i]+=impulse*fraction;
      // Active reel and passive tension act through the same hand position.
      // A leg grip cannot pull at shoulder height while its passive restraint
      // trips the foot below it.
      const height=jt.height??this.comHeight[j]*(1-.55*clamp(jt.legs,0,1));
      this.addLoad(i,j,nx,ny,-impulse*fraction,0,height,jt.legs>0);
    }

    // ---- 2. constraints
    let contacts: Contact[] = [];
    if (contact) {
      const soft = softness(CONTACT_HZ, CONTACT_ZETA, h);
      contacts = this.detect(ids, h, soft, report, swept);
      const rows = this.jointRows(h);
      const handSoft = softness(HANDS_HZ, HANDS_ZETA, h);
      const graspSoft = softness(GRASP_HZ, GRASP_ZETA, h);
      for (let it = 0; it < ITERATIONS; it++) {
        for (const c of contacts) this.solveContact(c, soft);
        for (const r of rows) {
          if (r.joint.kind === 'hands') this.solveHands(r, handSoft);
          else this.solveGrasp(r, graspSoft, h);
        }
      }
      // Joint outputs and the loads they put on each body.
      for (const r of rows) {
        const jt = r.joint;
        const height = jt.height ?? (jt.kind === 'grasp'
          ? this.comHeight[r.j] * (1 - 0.55 * clamp(jt.legs, 0, 1))
          : undefined);
        this.addLoad(r.i, r.j, r.nx, r.ny, r.ln, r.lt, height, jt.kind === 'grasp' && jt.legs > 0);
        if (jt.kind === 'hands') {
          if (this.handIntegration === 'centered') {
            // These are achieved finite-force impulses, accumulated over h,
            // rather than instantaneous torso impacts. Carry their midpoint
            // velocity over the interval: the old end velocity adds a
            // spurious half-impulse of travel on every solver substep. Use the
            // final net row, including work-limited corrections and tangent
            // steering, so iterations/duplicate constraints add no travel.
            const x = r.nx * r.ln - r.ny * r.lt;
            const y = r.ny * r.ln + r.nx * r.lt;
            this.travelAdjustX[r.i] += .5 * x / this.mass[r.i];
            this.travelAdjustY[r.i] += .5 * y / this.mass[r.i];
            this.travelAdjustX[r.j] -= .5 * x / this.mass[r.j];
            this.travelAdjustY[r.j] -= .5 * y / this.mass[r.j];
          }
          if(r.actor===r.steerActor) report.armImpulse[r.actor] += Math.hypot(r.ln,r.lt);
          else { report.armImpulse[r.actor]+=Math.abs(r.ln);report.armImpulse[r.steerActor]+=Math.abs(r.lt); }
          jt.normalForce = (jt.normalForce ?? 0) + r.ln;
          jt.tangentForce = (jt.tangentForce ?? 0) + r.lt;
        } else {
          const used = Math.hypot(r.ln-r.reel, r.lt);
          if (!r.members) {
            jt.force = (jt.force ?? 0) + used;
            jt.slipping = used >= 0.98 * r.limit && r.limit > 0;
          }
          for (const member of r.members ?? []) {
            const share = r.limit > 0 ? this.gripCapacity(member) * h / r.limit : 0;
            member.force = (member.force ?? 0) + used * share;
            member.slipping = used >= 0.98 * r.limit && r.limit > 0;
          }
        }
      }
    }

    // ---- 3. integrate positions (ground and sustained torso forces use midpoint
    // velocity; instantaneous torso impacts keep their impulse timing)
    for (const i of ids) {
      const b = bs[i];
      this.travelVx[i] = b.vel.x - 0.5 * this.amx[i] * h + this.travelAdjustX[i];
      this.travelVy[i] = b.vel.y - 0.5 * this.amy[i] * h + this.travelAdjustY[i];
      b.pos.x += this.travelVx[i] * h;
      b.pos.y += this.travelVy[i] * h;
      const foot = b.support!.foot;
      if (foot) {
        foot.force = { x: this.footImpulseX[i] / h, y: this.footImpulseY[i] / h };
        foot.achieved = supportVelocity(foot, foot.force);
        foot.offset.x += foot.achieved.x * h; foot.offset.y += foot.achieved.y * h;
        foot.anchor = { x: b.pos.x + foot.offset.x, y: b.pos.y + foot.offset.y };
        const desired = Math.hypot(foot.desired.x, foot.desired.y);
        b.support!.feetLock = desired > 1e-9 ? clamp(1 - (foot.achieved.x * foot.desired.x
          + foot.achieved.y * foot.desired.y) / (desired * desired), 0, 1) : 0;
        b.support!.feetVel = { x: this.travelVx[i] + foot.achieved.x, y: this.travelVy[i] + foot.achieved.y };
        // Numerical solver updates telescope. Only the achieved aggregate
        // load over this physical interval spends the motor's work budget.
        report.supportMotorWork[i] += -(this.footImpulseX[i] * foot.achieved.x + this.footImpulseY[i] * foot.achieved.y);
      }
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
      // Established lean and a bounded ankle/hip response balance settled
      // moments. A cancelling COM force alone cannot prove he is braced.
      const l2 = sup.felt.x ** 2 + sup.felt.y ** 2;
      const oldTip = sup.feltTip ?? { x: 0, y: 0 };
      const leanBrace = l2 > 1e-9 ? clamp(-(this.braceX[i] * sup.felt.x + this.braceY[i] * sup.felt.y) / l2, 0, 1) : 0;
      // An upright player can also shift pressure within his existing base.
      // Its moment budget is weight × base radius, not an unlimited torque
      // cancellation just because ground force cancels the COM acceleration.
      const hc = this.comHeight[i];
      const feltMoment = Math.hypot(oldTip.x, oldTip.y) * this.mass[i] * this.sp[i].pitchRadiusSq / hc;
      const ankleMoment = plans[i].free || sup.state !== 'up' ? 0
        : this.mass[i] * G * baseRadiusAt(this.sp[i], sup.posture) * this.alpha[i];
      const braced = Math.max(leanBrace, feltMoment > 1e-9 ? Math.min(1, ankleMoment / feltMoment) : 0);
      const tx = this.tipX[i] / h, ty = this.tipY[i] / h;
      this.tipX[i] -= oldTip.x * braced * h;
      this.tipY[i] -= oldTip.y * braced * h;
      sup.feltTip = { x: oldTip.x + (tx - oldTip.x) * kf, y: oldTip.y + (ty - oldTip.y) * kf };
      sup.load = { x: lx, y: ly };
      sup.felt = { x: sup.felt.x + (lx - sup.felt.x) * kf, y: sup.felt.y + (ly - sup.felt.y) * kf };
    }
    // Grasps that slipped slide out; past reach they are broken.
    if (contact) for (const j of this.joints) {
      if (j.kind !== 'grasp' || j.broken) continue;
      const point = this.graspPoint(j);
      const d = Math.hypot(point.x - j.a.pos.x, point.y - j.a.pos.y);
      const touch = CONTACT_SCALE * (j.a.profile.radius + j.b.profile.radius);
      // A secure grip reels in: the arms shorten toward a wrap at their own
      // rate; the tension that does it is bounded by the same grip budget.
      const held = j.slipping ? Math.max(j.hold ?? d, d) : Math.min(j.hold ?? d, Math.max(d, touch));
      j.hold = held;
      // Arms dragged along a running body slide down it, to the thighs and
      // ankles: a slipping hold becomes a hold on his legs.
      if (j.slipping) j.legs += (1 - j.legs) * (1 - Math.exp(-h / LEG_SLIDE));
      // A holder pulled off his feet hangs on stretched out behind his arms.
      const reach = j.a.support!.state === 'up' ? j.reach : Math.max(j.reach, j.ground ?? j.reach + GROUND_STRETCH);
      if ((j.hold ?? d) > reach) j.broken = true;
    }
    // ---- 4. support
    for (const i of ids) {
      if (bs[i].support!.state === 'up') this.updateSupport(i, h, report);
      else {
        // Perception of motion continues while down. Freezing these filters
        // would deliver the old hit again when he eventually gets up.
        const sup = bs[i].support!, k = 1 - Math.exp(-h / GAIT_LAG);
        const acc = sup.accel ?? { x: 0, y: 0 }, tip = sup.tipAccel ?? { x: 0, y: 0 };
        sup.accel = { x: acc.x + ((bs[i].vel.x - this.v0x[i]) / h - acc.x) * k,
          y: acc.y + ((bs[i].vel.y - this.v0y[i]) / h - acc.y) * k };
        sup.tipAccel = { x: tip.x + (this.tipX[i] / h - tip.x) * k, y: tip.y + (this.tipY[i] / h - tip.y) * k };
      }
    }
    // Consume this interval's achieved recovery before retiring a hold that
    // just broke. Deleting its motor first would erase a transmitted load
    // from balance while retaining that same impulse in velocity and work.
    this.syncHeldSupport();
    this.time += h;
  }

  /** The feet: gait plan, lean into a felt load, one shared budget; or off-feet motion. */
  private feet(i: number, intent: Intent, plan: Plan, h: number, remaining: number, report: StepReport): void {
    const b = this.bodies[i];
    const sup = b.support!;
    const p = b.profile;
    const sp = this.sp[i];
    const m = this.mass[i];
    this.recovery[i] = 0;
    const spinBefore=b.spin??0;
    this.v0x[i] = b.vel.x; this.v0y[i] = b.vel.y;
    let fx = 0, fy = 0;
    if (sup.state === 'up') {
      if (plan.free) {
        this.alpha[i] = 1; this.cut[i] = 1;
        b.facing += (b.spin ?? 0) * h;
      } else if (plan.dive) {
        // Finite launch force over the controller tick, independent of the
        // contact subdivision. He leaves his feet at the end of that plant.
        const launch = Math.min(sp.traction, Math.min(1.5, Math.max(0, p.vmax - Math.hypot(b.vel.x, b.vel.y))) * plan.launch * m / this.tickDt);
        fx += plan.dive.x * launch; fy += plan.dive.y * launch;
        if (remaining<=h+1e-9) { this.startFall(sup, plan.dive, 'dive', report, i); plan.dive=null;plan.free=true; }
        this.alpha[i] = 0; this.cut[i] = 1;
      } else {
        const fat = this.fat[i];
        let a = availability(sup, sp, fat);
        this.alpha[i] = a;
        this.cut[i] = plan.cut;
        // Pad level moves at a finite rate. Contact geometry affects support,
        // rather than granting a power bonus or standing him up by a heuristic.
        const target = clamp(intent.posture ?? DEFAULT_POSTURE, 0, 1) - 0.2 * (1 - b.energy);
        sup.posture = clamp(sup.posture + clamp(target - sup.posture, -POSTURE_RATE * h, POSTURE_RATE * h), 0, 1);
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
            const capacity = sp.pushForce * dir * clamp(1 - vp / p.vmax, 0, 1.2) * fat * a * push;
            const mag = Math.min(capacity, L * (1 + PUSH_GROWTH), m * ex / h);
            tx = ux * mag; ty = uy * mag;
          }
        }
        let leanX = sup.lean.x, leanY = sup.lean.y;
        // A lean is his COM held ahead of his feet by the load. Whatever the
        // load no longer balances, beyond what his gait can accept as planned
        // acceleration, is a capture-point offset now: an overextension.
        const releaseUnsupported = () => {
          const excess = () => {
            const mag = Math.hypot(leanX, leanY);
            if (mag <= 1e-6) return 0;
            const hx = leanX / mag, hy = leanY / mag;
            const balanced = Math.max(0, -(sup.felt.x * hx + sup.felt.y * hy));
            const unsupported = mag - balanced * (1 + PUSH_GROWTH);
            if (unsupported <= 0) return 0;
            const env = followAccel(b, { x: hx * 1e3, y: hy * 1e3 }, plan.cut, a);
            const absorb = Math.max(0, Math.hypot(env.x, env.y) - Math.max(0, plan.ax * hx + plan.ay * hy)) * m;
            return Math.min(mag, Math.max(0, unsupported - absorb));
          };
          let iterations = 0, conv = excess();
          const w0 = omega0(sp, sup.posture);
          // Each pass consumes only the remaining committed lean. A finite
          // local projection settles the existing reduced-model feedback;
          // it does not add solver steps, muscles or a new force constant.
          while (conv > 1e-9 && iterations < 64) {
            const mag = Math.hypot(leanX, leanY), hx = leanX / mag, hy = leanY / mag;
            const dx = hx * conv / (m * w0 * w0), dy = hy * conv / (m * w0 * w0);
            sup.xi = { x: sup.xi.x + dx, y: sup.xi.y + dy };
            report.leanRelease[i].x += dx; report.leanRelease[i].y += dy;
            leanX -= hx * conv; leanY -= hy * conv;
            // Transferred geometry changes what the same feet can absorb.
            a = availability(sup, sp, fat); this.alpha[i] = a;
            conv = excess(); iterations++;
          }
          // Expose any unresolved local solve instead of silently claiming
          // that the iteration limit establishes convergence.
          report.maxLeanReleaseResidual = Math.max(report.maxLeanReleaseResidual, conv);
          report.maxLeanReleaseIterations = Math.max(report.maxLeanReleaseIterations, iterations);
        };
        // Existing committed lean is geometry, not a new force request.
        // Transfer the unsupported share before damping it away; otherwise
        // a coarse substep erases more of the same incoming overextension.
        releaseUnsupported();
        const rising = tx * tx + ty * ty >= leanX * leanX + leanY * leanY;
        const k = 1 - Math.exp(-h / (rising ? LEAN_RISE : LEAN_DECAY));
        leanX += (tx - leanX) * k; leanY += (ty - leanY) * k;
        releaseUnsupported();
        sup.lean = { x: leanX, y: leanY };
        // One budget: locomotion and lean share traction and leg strength.
        // Leg drive is directional: full straight ahead, a shuffle's or a
        // backpedal's share sideways or backward. Traction caps all of it.
        const tfx = lx + leanX, tfy = ly + leanY;
        const along = tfx * tfx + tfy * tfy > 1e-18 ? directionalSpeedFactor(p, angleDiff(b.facing, Math.atan2(tfy, tfx))) : 1;
        const capacity = Math.min(Math.max(Math.hypot(lx, ly), sp.pushForce * along * a), sp.traction * a);
        // Availability already limits gait during recovery. Reserve actual
        // unused effort after ordinary translation and yaw, for every body.
        const cap = capacity;
        let px = leanX, py = leanY;
        if (tfx * tfx + tfy * tfy > cap * cap) {
          const qa = px * px + py * py, qb = lx * px + ly * py, qc = lx * lx + ly * ly - cap * cap;
          const scale = qa > 1e-12 ? clamp((-qb + Math.sqrt(Math.max(0, qb * qb - qa * qc))) / qa, 0, 1) : 0;
          px *= scale; py *= scale;
          if (qc > 0) { const r = cap / Math.max(1e-9, Math.hypot(lx, ly)); lx *= r; ly *= r; }
        }
        fx += lx + px; fy += ly + py;
        this.braceX[i] = px; this.braceY[i] = py;
        const leanWeight = this.impactTiming === 'local-sweep' ? h : 1;
        this.leanX[i] += px * leanWeight; this.leanY[i] += py * leanWeight;
        const yaw = turnBody(b,plan.facing,remaining,h,turnRateOf(b),a,Math.hypot(fx,fy));
        // Strength limits drive+correction; traction also pays for yaw at
        // the physical support radius. Difference-of-squares keeps the
        // near-saturation subtraction well conditioned. Passive compliance
        // stays finite even when this active reserve is zero.
        // Correction uses profile strength, independent of the direction of
        // an arbitrarily small residual gait request. The existing gait law
        // can demand more than pushForce; that leaves zero corrective effort
        // rather than expanding strength to fund another simultaneous action.
        const total = sp.pushForce, force = Math.hypot(fx, fy);
        const yawForce = yaw.impulse / (h * baseRadiusAt(sp, sup.posture));
        const groundDemand = Math.hypot(force, yawForce);
        const reserve = Math.sqrt(Math.max(0, Math.min((total - force) * (total + force),
          (sp.traction - groundDemand) * (sp.traction + groundDemand))));
        this.recovery[i] = this.prepareRecovery(i, h, reserve);
      }
    } else {
      this.alpha[i] = 0; this.cut[i] = 1;
      this.passive(b, sup, sp, report, i);
      const fr = sup.state === 'falling' ? FALL_FRICTION : DOWN_FRICTION;
      if (sup.state === 'falling') { fx += sup.fall.x * FALL_TIP * m; fy += sup.fall.y * FALL_TIP * m; }
      // Translation and yaw share one passive ground-friction allowance.
      // The mean lever of a uniformly loaded circular footprint is 2r/3;
      // this geometry proxy is not a measured prone-athlete contact patch.
      const vx = b.vel.x + fx / m * h, vy = b.vel.y + fy / m * h;
      const spin = b.spin ?? 0, lever = 2 * p.radius / 3;
      const wantedX = -m * vx / h, wantedY = -m * vy / h;
      const wantedTorque = -this.inertia[i] * spin / h;
      const demand = Math.hypot(wantedX, wantedY, wantedTorque / lever);
      const capacity = fr * G * m;
      const fraction = demand > 0 ? Math.min(1, capacity / demand) : 0;
      fx += wantedX * fraction; fy += wantedY * fraction;
      b.spin = spin * (1 - fraction);
      const movingTime = Math.min(h, demand / capacity * h);
      b.facing += .5 * (spin + b.spin) * movingTime;
      if (sup.state !== 'falling') {
        // With no fall drive, constant coupled drag stops both motions at
        // movingTime. A full-step trapezoid otherwise moves an already
        // stopped body too far. Keep the same interval mean for held feet.
        const factor = .5 * (2 - fraction) * (movingTime / h - 1);
        this.travelAdjustX[i] = vx * factor;
        this.travelAdjustY[i] = vy * factor;
      }
    }
    // Includes the small remaining spin removed when he finishes rising.
    const spinAfter=b.spin??0;
    report.groundYawImpulse[i]+=this.inertia[i]*(spinAfter-spinBefore);
    report.groundYawWork[i]+=.5*this.inertia[i]*(spinAfter*spinAfter-spinBefore*spinBefore);
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
      // Standing up cannot teleport a lower point that is still held.
      if (sup.foot && this.supportModel === 'virtual-foot') sup.foot = newVirtualFoot(b.pos);
      sup.out = 0;
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
    const followCapacity = Math.max(this.alpha[i], 0.1) * FOLLOW_MARGIN;
    let f = followAccel(b, { x: mx, y: my }, this.cut[i], followCapacity);
    if (this.supportIntegration === 'integrated') {
      // Preserve the same frozen body/envelope used by the old call, while
      // applying its nonlinear limit before averaging the filter response.
      // This does not infer missing within-step impulse timing or leg motion.
      const followed = integrateFilteredFollow(b, acc, {x:ux,y:uy}, GAIT_LAG, h, this.cut[i], followCapacity);
      f = {x:followed.integral.x/h,y:followed.integral.y/h};
      if (followed.errorEstimate === null) report.maxSupportIntegrationError = null;
      else if (report.maxSupportIntegrationError !== null) report.maxSupportIntegrationError
        = Math.max(report.maxSupportIntegrationError, followed.errorEstimate);
      if (!followed.converged) report.supportIntegrationFailures++;
    }
    let dx = (mx - f.x) * h / w0;
    let dy = (my - f.y) * h / w0;
    // Pitch/roll angular momentum from contact height. Keep the translational
    // impulse untouched; reduce its moment into the same capture-point state.
    // Integrate the exact mean of the 40 ms response, reducing step error.
    const tip = sup.tipAccel ?? { x: 0, y: 0 };
    const tx = this.tipX[i] / h, ty = this.tipY[i] / h;
    const tmx = tx + (tip.x - tx) * mean, tmy = ty + (tip.y - ty) * mean;
    sup.tipAccel = { x: tip.x + (tx - tip.x) * kg, y: tip.y + (ty - tip.y) * kg };
    dx += tmx * h / w0; dy += tmy * h / w0;
    // The actual low-contact impulse pitches him over the held base.
    // Corrective restraint is solved through the motor below, rather than
    // inferred from the mere presence of a grasp.
    const legX = this.tripX[i] / w0;
    const legY = this.tripY[i] / w0;
    dx += legX; dy += legY;
    // Remember what has been displacing him (decays over ~0.3 s).
    const decay = Math.exp(-h / 0.3);
    causes.contact = causes.contact * decay + Math.hypot(mx - f.x + tmx, my - f.y + tmy) * h / w0;
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
    const rec = recoverySpeed(sp, 0, fat);
    // Recovery step speed ramps over the response latency while gravity acts
    // on a deviation beyond the base.
    const outsideBefore = sup.out;
    sup.out = e > rb ? outsideBefore + h : 0;
    // Inside the base the ankles and hips damp it; beyond it gravity makes it
    // diverge while stepping pulls it back (exact for the substep).
    // Use the same analytic free recovery in both paths. Only the actual
    // force-coupled velocity difference alters it; a tiny grip cannot switch
    // off inside-base damping merely by creating a motor record.
    const foot = sup.foot;
    if (!foot && e <= rb) {
      // Common unheld path: retain the original direct damping without
      // allocating a motor response or solving a nonexistent correction.
      const next = e * Math.exp(-w0 * h);
      if (e > 1e-12) { xx *= next / e; xy *= next / e; }
      sup.out = 0;
    } else {
      const deficit = foot ? { x: foot.achieved.x - foot.desired.x,
        y: foot.achieved.y - foot.desired.y } : { x: 0, y: 0 };
      const nx = e > 1e-12 ? xx / e : 1, ny = e > 1e-12 ? xy / e : 0;
      const radial = deficit.x * nx + deficit.y * ny;
      const recovery = advanceRecovery(e, rb, w0, this.recovery[i], outsideBefore, STEP_LATENCY, h, radial);
      if (e > 1e-12) { xx *= recovery.next / e; xy *= recovery.next / e; }
      else { xx = nx * recovery.next; xy = ny * recovery.next; }
      xx -= (deficit.x - radial * nx) * recovery.weight;
      xy -= (deficit.y - radial * ny) * recovery.weight;
      if (foot) causes.legs += Math.hypot(deficit.x, deficit.y) * h;
      sup.out = Math.hypot(xx, xy) > rb ? outsideBefore + h : 0;
    }
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

  private addLoad(i: number, j: number, nx: number, ny: number, ln: number, lt: number, height?: number, legHold = false): void {
    const fx = nx * ln - ny * lt, fy = ny * ln + nx * lt;
    // The impulse on j is +(n·ln + t·lt); on i its opposite.
    this.impX[j] += fx; this.impY[j] += fy;
    this.impX[i] -= fx; this.impY[i] -= fy;
    const bs = this.bodies;
    const z = clamp(height ?? Math.min(this.padHeight[i], this.padHeight[j]),
      0, Math.min(bs[i].profile.heightYd, bs[j].profile.heightYd));
    const ci = this.comHeight[i], cj = this.comHeight[j];
    const fi = -(z - ci) * ci / this.sp[i].pitchRadiusSq / this.mass[i];
    const fj = (z - cj) * cj / this.sp[j].pitchRadiusSq / this.mass[j];
    this.tipX[i] += fx * fi; this.tipY[i] += fy * fi;
    if (legHold) {
      // A held foot cannot actively brace this moment: it pitches the body
      // over the base, in addition to restricting the recovery step.
      this.tripX[j] += fx * fj; this.tripY[j] += fy * fj;
    } else {
      this.tipX[j] += fx * fj; this.tipY[j] += fy * fj;
    }
  }

  private detect(ids: number[], h: number, soft: Softness, report: StepReport, swept = true): Contact[] {
    const bs = this.bodies;
    const out: Contact[] = [];
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
          if (!swept) continue;
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
      }
    }
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
    this.report.work.contacts+=vn*dn+.5*dn*dn/c.mn+vt*dt+.5*dt*dt/c.mt;
  }

  private jointRows(h: number): JointRow[] {
    const rows: JointRow[] = [];
    for (const jt of this.joints) {
      if (jt.kind === 'grasp' && jt.broken) continue;
      const i = this.indexOf(jt.a), j = this.indexOf(jt.b);
      const a = jt.a, b = jt.b;
      const point = jt.kind === 'grasp' ? this.graspPoint(jt) : b.pos;
      const dx = point.x - a.pos.x, dy = point.y - a.pos.y;
      const dist = Math.hypot(dx, dy);
      const nx = dist > 1e-8 ? dx / dist : 1, ny = dist > 1e-8 ? dy / dist : 0;
      const row: JointRow = { joint: jt, i, j, nx, ny, mn: 1 / (1 / this.mass[i] + 1 / this.mass[j]),
        mode: 0, c: 0, ln: 0, lt: 0, limit: 0, pushLim: 0, holdLim: 0, steerLim: 0,actor: i,steerActor: i,reel: 0 };
      if (jt.kind === 'hands') {
        row.actor=row.steerActor=this.indexOf(jt.actor??jt.a);
        const holder=this.indexOf(jt.holder??jt.a),scale=this.armScale[row.actor];
        row.pushLim = Math.max(0, jt.push) * h * scale;
        row.holdLim = Math.max(0, jt.hold) * h * this.armScale[holder];
        row.steerLim = Math.max(0, jt.steer) * h * scale;
        const c = dist - jt.extension;
        if (c < 0) { row.mode = 1; row.c = c; }
        else if (c > HANDS_SLACK) { row.mode = -1; row.c = c - HANDS_SLACK;row.actor=holder; }
      } else {
        // The arms hold where they are; a holder off his feet keeps most of
        // his grip (he hangs on).
        const hold = jt.hold ?? dist;
        jt.hold = hold;
        row.mode = -1;
        row.c = Math.max(0, dist - hold);
        row.limit = this.gripCapacity(jt)*h;
        row.reel = this.reels.get(jt)??0;
        const foot = b.support!.foot;
        if (foot) row.mn = 1 / supportInverseMass(1 / this.mass[i] + 1 / this.mass[j], foot, clamp(jt.legs, 0, 1), h);
        if (foot && this.attachments.get(jt)?.bounded) {
          const inverseBodyMass = 1 / this.mass[i] + 1 / this.mass[j];
          row.mn = 1 / (inverseBodyMass + this.attachmentMobility(jt,nx,ny) / h);
          row.mt = 1 / (inverseBodyMass + this.attachmentMobility(jt,-ny,nx) / h);
        }
        if (foot) {
          // Duplicating the same physical attachment must not create another
          // spring, motor or grip capacity. Distinct locations stay distinct.
          const same = rows.find(r => {
            const old = r.joint;
            return old.kind === 'grasp' && old.a === jt.a && old.b === jt.b
              && old.legs === jt.legs && old.height === jt.height && old.reach === jt.reach
              && old.ground === jt.ground && old.hold === jt.hold && old.pull === jt.pull
              && Math.hypot(this.graspPoint(old).x - point.x, this.graspPoint(old).y - point.y) < 1e-10
              && (!this.boundedAttachment || this.sameAttachmentJacobian(old,jt));
          });
          if (same) {
            same.limit += row.limit; same.reel += row.reel;
            same.members!.push(jt); continue;
          }
          row.members = [jt];
        }
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
      const fraction=this.pairImpulse(r.i,r.j,r.nx*dn,r.ny*dn,r.actor,'hands',true,r.normalWork??={net:0});
      r.ln+=dn*fraction;
    }
    if (r.steerLim > 0) this.solveTangent(r, a, b, r.steerLim);
  }

  private solveGrasp(r: JointRow, soft: Softness, h: number): void {
    const a = this.bodies[r.i], b = this.bodies[r.j];
    const ima = 1 / this.mass[r.i], imb = 1 / this.mass[r.j];
    const jt = r.joint as GraspJoint, rv = this.graspVelocity(jt);
    const vn = rv.x * r.nx + rv.y * r.ny;
    if (b.support!.foot && jt.legs > 0) {
      // Preserve the spring/damper's body-derived physical stiffness. Merely
      // replacing mass while retaining its Hz softness makes the grasp's
      // transmitted force vanish as h approaches zero.
      const ratio = 1 / (r.mn * (ima + imb));
      const a2 = (1 - soft.impulseScale) / soft.impulseScale * ratio;
      soft = { ...soft, massScale: a2 / (1 + a2), impulseScale: 1 / (1 + a2) };
    }
    // Tension only: the arms resist separation beyond their hold, never push.
    const imp = -r.mn * soft.massScale * (vn + soft.biasRate * r.c) - soft.impulseScale * r.ln;
    let ln = Math.min(0, r.ln + imp);
    // Shared grip budget with the sliding (tangential) resistance.
    const lim = r.limit;
    const passiveNormal=Math.max(0,Math.sqrt(Math.max(0,lim*lim-r.lt*r.lt))-r.reel);
    ln=Math.max(ln,-passiveNormal);
    const dn = ln - r.ln;
    const coupled = !!b.support!.foot && jt.legs > 0;
    const channel=r.normalWork??={net:0};
    const fraction=coupled?this.supportImpulse(jt,r.nx*dn,r.ny*dn,h,false,channel)
      :this.pairImpulse(r.i,r.j,r.nx*dn,r.ny*dn,r.actor,'grasps',false,channel);
    r.ln+=dn*fraction;
    const tangentLimit = Math.sqrt(Math.max(0, lim * lim - (r.ln-r.reel)**2));
    if (coupled) {
      const rv = this.graspVelocity(jt), tx = -r.ny, ty = r.nx;
      const vt = rv.x * tx + rv.y * ty;
      const lt = clamp(r.lt - (r.mt ?? r.mn) * vt, -tangentLimit, tangentLimit), dt = lt - r.lt;
      r.lt += dt * this.supportImpulse(jt, tx * dt, ty * dt, h,false,r.tangentWork??={net:0});
    } else this.solveTangent(r, a, b, tangentLimit);
  }

  /** Hands and holds couple the bodies' sideways motion directly; a grip
   * around a torso does not let him roll past like two touching pads. */
  private solveTangent(r: JointRow, a: Body, b: Body, lim: number): void {
    const ima = 1 / this.mass[r.i], imb = 1 / this.mass[r.j];
    const tx = -r.ny, ty = r.nx;
    const vt = (b.vel.x - a.vel.x) * tx + (b.vel.y - a.vel.y) * ty;
    const lt = clamp(r.lt - r.mn * vt, -lim, lim);
    const dt = lt - r.lt;
    const fraction=this.pairImpulse(r.i,r.j,tx*dt,ty*dt,r.actor,r.joint.kind==='hands'?'hands':'grasps',false,r.tangentWork??={net:0});
    r.lt+=dt*fraction;
  }
}
