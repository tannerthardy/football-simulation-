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
import { ARM_SPEED, turnBodyResponse, workFraction } from './actuation.js';
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

/** Material contact selected by an executing technique. These descriptors
 * identify the represented patch; officiating still validates the delivered
 * height, geometry and impulse. Omission means unknown anatomy. */
export interface ContactAnatomy {
  actorPart: 'hand' | 'forearm' | 'shoulder' | 'helmet' | 'chest' | 'leg';
  targetRegion: 'head_neck' | 'above_waist' | 'thigh' | 'knee_or_below';
  gripLocation?: 'facemask' | 'helmet_opening' | 'inside_back_side_collar' | 'nameplate_or_above' | 'other';
  handShape?: 'open' | 'palm' | 'fist';
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
  /** Center distance, or (with contact) the other center's distance to that point. */
  extension: number;
  /** Persistent material point on a torso, in that body's local frame. A
   * release/re-grab creates a new contact; never move it to follow a shoulder.
   * Requires handContact: 'patch'. Omission uses the reduced shared patch. */
  readonly contact?: { readonly on: 'a' | 'b'; readonly local: Readonly<Vec2> };
  /** Max compressive arm force, kg·yd/s². */
  push: number;
  /** Max tension (a grab of cloth), kg·yd/s². */
  hold: number;
  /** Max tangential (steering) force, kg·yd/s². */
  steer: number;
  /** Height of the hand contact, yd; defaults to the lower player's pads. */
  height?: number;
  readonly contactAnatomy?: Readonly<ContactAnatomy>;
  /** Last achieved height after the ordinary World clamp, not desired height. */
  achievedContactHeight?: number;
  /** First actually loaded row of this controller step, in a/b order. */
  firstApplied?: ContactSnapshot;
  /** HAND_MOTOR (experimental, off): wanted velocity of b past a along the
   * hands' tangent, yd/s; the arms work toward it within steer and arm budgets. */
  drive?: number;
  /** HAND_MOTOR: wanted separating speed while the hands are on, yd/s (a punch
   * or shove), within push and arm budgets. */
  shove?: number;
  /** Last step's mean force on b from a: normal (+ pushes apart) and tangential. */
  normalForce?: number;
  tangentForce?: number;
  /** Achieved normal and steering world-force channels, valid in both
   * integration modes even when their shared frame rotates during a tick. */
  normalForceOnB?: Vec2;
  tangentForceOnB?: Vec2;
  /** Patch mode: attained mean world force on b and yaw moments on each body.
   * Use these for felt load; scalar components cannot recover a changing frame. */
  forceOnB?: Vec2;
  momentOnA?: number;
  momentOnB?: number;
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
  /** 0–1: lower-body share, which determines the default hold height. */
  legs: number;
  /** Optional 0–1 coupling of an acquired lower hold to corrective placement.
   * Omission retains `legs`. This is a point-motion Jacobian, not a free
   * feet-lock multiplier: the same derivative transmits force and work. */
  recoveryCoupling?: number;
  /** Optional acquired arm span, yd. Inside this distance the arms can
   * resist compression through existing arm/grip budgets; never a rigid
   * body exclusion or promised separation. Omission remains tension-only. */
  brace?: number;
  /** Height of the hold, yd; otherwise interpolates from torso to lower legs. */
  height?: number;
  readonly contactAnatomy?: Readonly<ContactAnatomy>;
  achievedContactHeight?: number;
  firstApplied?: ContactSnapshot;
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
  normalForce?: number;
  tangentForce?: number;
  /** Ground force his bound legs lost to this hold this substep, kg·yd/s². */
  strideForce?: number;
  normalForceOnB?: Vec2;
  tangentForceOnB?: Vec2;
  /** How the hold was made (diagnostics: 'form', 'reach', 'block', 'dive'). */
  origin?: string;
}

export type Joint = HandJoint | GraspJoint;

const recoveryShare = (j: GraspJoint): number => j.legs > 0 ? clamp(j.recoveryCoupling ?? j.legs, 0, 1) : 0;

export interface ContactRecord {
  i: number;
  j: number;
  /** Total normal impulse over the step, kg·yd/s. */
  impulse: number;
  /** Largest closing speed at a touch this step, yd/s. */
  closing: number;
  /** First delivered torso contact of this controller interval. These are
   * observed solver coordinates, not intended targets or anatomical claims.
   * The normal points from i to j. Optional for historical saved reports. */
  first?: ContactSnapshot;
}

export interface ContactSnapshot {
  time: number;
  intervalEnd: number;
  normal: Vec2;
  positionI: Vec2;
  positionJ: Vec2;
  facingI: number;
  facingJ: number;
  velocityI: Vec2;
  velocityJ: Vec2;
  /** The reduced contact-height load actually used by this World row. */
  height: number;
  supportI: 'up' | 'falling' | 'down' | 'rising';
  supportJ: 'up' | 'falling' | 'down' | 'rising';
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
  /** Deliberate strike request time, separate from its achieved force. */
  requestedAt?: number;
  first?: ContactSnapshot;
  readonly contactAnatomy?: Readonly<ContactAnatomy>;
}

export interface StepReport {
  /** Substeps used by the contact island (1 when nobody was near contact). */
  substeps: number;
  /** External (ground/gravity) impulse on each body, kg·yd/s. */
  groundImpulse: Vec2[];
  /** Work of those external forces on each body, kg·yd²/s². */
  groundWork: number[];
  /** Friction the feet could supply this step, on each body's actual normal load (standing weight less any pad lift), as an impulse. */
  groundImpulseLimit: number[];
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
/** Experimental (HOLD_SUBSTEPS=n, off): minimum substeps while a grasp is live. */
const HOLD_SUBSTEPS = Number(process.env.HOLD_SUBSTEPS ?? 0);
/** Experimental active hand motor (HAND_MOTOR=1): HandJoint.drive and .shove. */
const HAND_MOTOR = process.env.HAND_MOTOR === '1';
/** Default on (PAD_LEVERAGE=0 turns it off): pad level loads and unloads the feet.
 * A push runs from the pusher's pads to the other man's; when one man's pads
 * are lower, the line of action tilts up into the higher man. Its vertical
 * part lifts the higher man (less weight on his cleats, so less traction)
 * and presses the lower man down (more). Traction stays Coulomb friction on
 * the actual normal load; nothing else changes. Off, every body keeps the
 * traction of his standing weight whatever the contact geometry: the low
 * man's advantage in football had no physical path. */
const PAD_LEVERAGE = process.env.PAD_LEVERAGE !== '0';
/** Leg force-velocity (PHY-1): ground drive scales as 1 - v/vmax along the
 * force. Yielding legs, driven backward, keep up to this multiple of their
 * isometric strength (multi-joint eccentric force is about 1.1-1.3x). */
const ECCENTRIC_GAIN = 1.2;
/** Steepest line of action credited, rise over run (about 30 degrees). */
const LEVERAGE_SLOPE = .6;
/** Knee height as a fraction of COM height (knee ~0.28, COM ~0.55 of stature). */
const KNEE = 0.5;
/** Peak hip-extension torque per kg of body mass, kg·yd²/s² per kg
 * (about 3.5 N·m/kg in sprinting and strength athletes; 1 N·m = 1.196). */
const HIP_TORQUE_PER_KG = 3.5 * 1.196;
/** Share of a grounded holder's weight his arms carry on a leg hold: a body
 * resting on the ground at one end and held at the other carries half its
 * weight at each end. */
const HANG_SHARE = 0.5;
/** Extra hold distance of a holder stretched along the ground, yd. */
export const GROUND_STRETCH = 0.9;
/** Gait response time to body acceleration, s. */
const GAIT_LAG = 0.04;
/** Reaction latency of the first recovery step, s. */
const STEP_LATENCY = 0.12;

// Every body in an interval uses these same clock-only filter coefficients.
// Keep one entry: local impact splits can supply arbitrarily many different h.
let lastSupportInterval: { h: number; gait: number; mean: number; decay: number } | undefined;
function supportInterval(h: number) {
  if (!lastSupportInterval || lastSupportInterval.h !== h) {
    const gait = 1 - Math.exp(-h / GAIT_LAG);
    lastSupportInterval = { h, gait, mean: GAIT_LAG / h * gait, decay: Math.exp(-h / .3) };
  }
  return lastSupportInterval;
}

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
  /** Normal impulse moments at a common patch; zero for legacy contacts. */
  ni: number;
  nj: number;
  mn: number;
  mt: number;
  guard: boolean;
  bias: number;
  ln: number;
  lt: number;
  closing: number;
  /** The compliant solve pressed them together (before the relax). */
  touched?: boolean;
  observed: ContactSnapshot;
}

interface JointRow {
  joint: Joint;
  observed: ContactSnapshot;
  i: number;
  j: number;
  nx: number;
  ny: number;
  mn: number;
  /** Body-only normal mobility before lower support is added. */
  bodyInverseMass?: number;
  /** An anisotropic lower attachment has a different tangent mobility. */
  mt?: number;
  /** Lever arms to the joint's common force point, along its frozen normal. */
  ri?: number;
  rj?: number;
  /** Normal impulse moments at the same physical point as steering. */
  ni?: number;
  nj?: number;
  /** Normal regime: +1 compressive (hands), −1 tension, 0 inactive. */
  mode: number;
  c: number;
  ln: number;
  lt: number;
  /** Grip budget (grasp) for this substep, kg·yd/s. */
  limit: number;
  /** HAND_MOTOR targets for this row: tangential drive and separating shove, yd/s. */
  drive?: number;
  shove?: number;
  /** Hand limits for this substep (push, hold, steer), kg·yd/s. */
  pushLim: number;
  holdLim: number;
  steerLim: number;
  actor: number;
  steerActor: number;
  /** Active reel transmitted through this grip in the substep. */
  reel: number;
  /** Identical numerical copies share one physical compliant attachment. */
  members?: GraspJoint[];
  /** Coincident hands share one compliant row and divide its achieved load. */
  handMembers?: HandJoint[];
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
  /** Active-foot exposure and delivered action work for this controller tick. */
  activeTime: number;
  activeSteps: number;
  hadPassive: boolean;
  actionWork: number;
  activeNow: boolean;
  effortVx: number;
  effortVy: number;
}

/** Forecast Worlds usually contain one body. Keep ordinary, independently
 * owned report arrays, without the generic allocation/fill for that case. */
function reportZeros(count: number): number[] {
  return count === 1 ? [0] : new Array(count).fill(0);
}

function reportVector(): Vec2 { return { x: 0, y: 0 }; }

/** The current lean's unsupported share. Keep this outside the substep loop:
 * constructing nested closures here is costly in the development runner.
 * Each call still reads the current support and availability after a release. */
function unsupportedLean(b: Body, plan: Plan, leanX: number, leanY: number,
  capacity: number, mass: number): number {
  const mag = Math.hypot(leanX, leanY);
  if (mag <= 1e-6) return 0;
  const hx = leanX / mag, hy = leanY / mag;
  const balanced = Math.max(0, -(b.support!.felt.x * hx + b.support!.felt.y * hy));
  const unsupported = mag - balanced * (1 + PUSH_GROWTH);
  if (unsupported <= 0) return 0;
  const env = followAccel(b, { x: hx * 1e3, y: hy * 1e3 }, plan.cut, capacity);
  const absorb = Math.max(0, Math.hypot(env.x, env.y) - Math.max(0, plan.ax * hx + plan.ay * hy)) * mass;
  return Math.min(mag, Math.max(0, unsupported - absorb));
}

/** Gait gets the budget first; lean fills what is left; the attained net is
 * then rechecked. Writes [gait x, gait y, lean x, lean y, gait scale] to out.
 * Opposing gait and lean can leave a positive lean share after gait alone is
 * clipped to the cap, so the net is scaled back to the cap: no ground force
 * beyond traction, even at zero traction. Exported for the law test. */
export function allocateGroundForce(out: Float64Array, lx: number, ly: number,
  leanX: number, leanY: number, cap: number): Float64Array {
  let px = leanX, py = leanY, r = 1;
  const tfx = lx + leanX, tfy = ly + leanY;
  if (tfx * tfx + tfy * tfy > cap * cap) {
    const qa = px * px + py * py, qb = lx * px + ly * py, qc = lx * lx + ly * ly - cap * cap;
    const scale = qa > 1e-12 ? clamp((-qb + Math.sqrt(Math.max(0, qb * qb - qa * qc))) / qa, 0, 1) : 0;
    px *= scale; py *= scale;
    if (qc > 0) {
      r = cap / Math.max(1e-9, Math.hypot(lx, ly));
      lx *= r; ly *= r;
    }
    // Recheck the attained net after clipping gait separately from lean.
    const attained = Math.hypot(lx + px, ly + py);
    if (attained > cap + 1e-9) {
      const k = cap / attained;
      lx *= k; ly *= k; px *= k; py *= k; r *= k;
    }
  }
  out[0] = lx; out[1] = ly; out[2] = px; out[3] = py; out[4] = r;
  return out;
}
const allocation = new Float64Array(5);

export class World {
  readonly bodies: Body[];
  /** Production uses analytic recovery except during a lower hold. The
   * global averaged-motor mode remains a research comparison. */
  readonly supportModel: 'legacy' | 'virtual-foot';
  /** Sustained bounded hand and patch grip forces act over the interval.
   * The end rule is retained for source-matched numerical comparisons. */
  readonly handIntegration: 'end' | 'centered';
  /** Experimental common-point angular transfer for torsos, hands and grips.
   * Lower grips use material contact plus the existing recovery motor.
   * Center retains production until native helper/controller controls pass. */
  readonly handContact: 'center' | 'patch';
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
  private pending: Array<{ a: Body; b: Body; x: number; y: number; height?: number; contactAnatomy?: Readonly<ContactAnatomy>; requestedAt: number; delivered?: StrikeRecord }> = [];
  private readonly reels = new Map<GraspJoint, number>();
  /** Reference adjustment preserves the held point when a grip slides down. */
  private readonly attachments = new WeakMap<GraspJoint, { share: number; reference: Vec2; foot: NonNullable<Support['foot']>; bounded?: boolean;
    /** Patch lower contact in the held body's local frame. This is not the
     * world-oriented averaged support anchor; only its existing motor moves z. */
    material?: Vec2;
    geometry?: { x: number; y: number; angle?: number; limit: number; value: BoundedAttachment } }>();
  private readonly heldBodies = new Set<Body>();
  // Per-body scratch, reused every substep.
  private readonly n: number;
  private readonly sp: SupportParams[];
  private readonly mass: Float64Array;
  private readonly inertia: Float64Array;
  private readonly fat: Float64Array;
  private readonly impX: Float64Array;
  private readonly impY: Float64Array;
  /** Grip a hold on his legs puts against his stride (see the ground forces). */
  private readonly strideHolds: Float64Array;
  /** Share of his hip torque the last substep's thigh brace used. */
  private readonly hipUsed: Float64Array;
  private readonly tripX: Float64Array;
  /** Pitch from holds above the knee, which the hips can brace. */
  private readonly thighX: Float64Array;
  private readonly thighY: Float64Array;
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
  /** PAD_LEVERAGE: upward contact impulse this substep, and its felt force (+ lifts). */
  private readonly liftImp: Float64Array;
  private readonly liftFelt: Float64Array;
  private readonly v0x: Float64Array;
  private readonly v0y: Float64Array;
  private readonly facing0: Float64Array;
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
  /** Tick-local scratch never escapes through bodies, joints or StepReport.
   * Reuse its storage; each step still rebuilds all values in body order. */
  private readonly plans: Plan[];
  private readonly near: Uint8Array;
  private readonly island: number[] = [];
  private readonly alone: number[] = [];
  private readonly pairs = new Map<number, ContactRecord>();
  private report!: StepReport;
  private tickDt = .05;

  constructor(bodies: Body[], opts: { substeps?: number; supportModel?: 'legacy' | 'virtual-foot'; constraintWork?: 'per-update' | 'per-solve'; impactTiming?: 'speculative' | 'local-sweep'; supportIntegration?: 'mean' | 'integrated'; boundedAttachment?: boolean; handIntegration?: 'end' | 'centered'; handContact?: 'center' | 'patch' } = {}) {
    this.bodies = bodies;
    this.substeps = opts.substeps;
    this.handIntegration = opts.handIntegration ?? 'centered';
    this.handContact = opts.handContact ?? 'center';
    if (this.handContact === 'patch' && this.handIntegration !== 'centered')
      throw new RangeError('Common hand patches require centered force integration');
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
    this.fat = f(); this.impX = f(); this.impY = f(); this.tripX = f(); this.tripY = f(); this.strideHolds = f(); this.hipUsed = f(); this.thighX = f(); this.thighY = f();
    this.travelVx = f(); this.travelVy = f();
    this.travelAdjustX = f(); this.travelAdjustY = f();
    this.tipX = f(); this.tipY = f(); this.braceX = f(); this.braceY = f();
    this.comHeight = f(); this.padHeight = f(); this.liftImp = f(); this.liftFelt = f();
    this.v0x = f(); this.v0y = f(); this.facing0 = f(); this.amx = f(); this.amy = f(); this.alpha = f(); this.cut = f();
    this.leanX = f(); this.leanY = f();
    this.armScale = f(); this.armCap = f(); this.active = f();
    this.footImpulseX = f(); this.footImpulseY = f();
    this.recovery = f();
    this.plans = bodies.map(b => ({ ax: 0, ay: 0, facing: b.facing, cut: 1, free: false, dive: null, launch: 0,
      activeTime: 0, activeSteps: 0, hadPassive: false, actionWork: 0, activeNow: false, effortVx: 0, effortVy: 0 }));
    this.near = new Uint8Array(n);
  }

  indexOf(b: Body): number {
    return this.index.get(b) ?? -1;
  }

  /**
   * A technique's strike, pull or shove: impulse J (kg·yd/s) on `b` and −J on
   * `a`, applied inside the next step so balance and loads respond to it.
   * Internal: total momentum is unchanged.
   */
  strike(a: Body, b: Body, j: Vec2, height?: number, contactAnatomy?: Readonly<ContactAnatomy>): void {
    if (this.indexOf(a) < 0 || this.indexOf(b) < 0 || a === b || !Number.isFinite(j.x + j.y)) return;
    this.pending.push({ a, b, x: j.x, y: j.y, height, contactAnatomy, requestedAt: this.time });
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
    const report: StepReport = { substeps: 1, groundImpulse: bs.map(reportVector),
      groundWork: reportZeros(n), groundImpulseLimit: reportZeros(n), groundYawImpulse: reportZeros(n), groundYawWork: reportZeros(n),
      armWork: reportZeros(n), armWorkLimit: reportZeros(n), armImpulse: reportZeros(n), armImpulseLimit: reportZeros(n),
      work: {before: this.kineticEnergy(),after: 0,hands: 0,grasps: 0,strikes: 0,contacts: 0,residual: 0},
      contacts: [], strikes: [], falls: [], downs: [], rises: [], maxPenetration: 0,
      maxLeanReleaseResidual: 0, maxLeanReleaseIterations: 0, leanRelease: bs.map(reportVector),
      supportMotorWork: reportZeros(n), supportMotorWorkLimit: reportZeros(n), passiveGraspWork: 0,
      maxHeldRecoveryExcursion: 0, lowerHoldReleases: 0,
      impactSplits: 0, impactSplitLimitHits: 0, maxSupportIntegrationError: 0, supportIntegrationFailures: 0 };
    this.report = report; this.tickDt = dt;
    this.joints = this.joints.filter((j) => !(j.kind === 'grasp' && j.broken) && this.indexOf(j.a) >= 0 && this.indexOf(j.b) >= 0 && j.a !== j.b
      && (j.kind!=='hands'||(this.indexOf(j.actor??j.a)>=0&&this.indexOf(j.holder??j.a)>=0)));
    this.syncHeldSupport();
    for (const j of this.joints) {
      j.achievedContactHeight = undefined;
      j.firstApplied = undefined;
      if (j.kind === 'hands') {
        j.normalForce = 0; j.tangentForce = 0;
        j.normalForceOnB = { x: 0, y: 0 }; j.tangentForceOnB = { x: 0, y: 0 };
        if (this.handContact === 'patch') { j.forceOnB = { x: 0, y: 0 }; j.momentOnA = j.momentOnB = 0; }
      }
      else {
        j.force = 0; j.normalForce = 0; j.tangentForce = 0;
        j.normalForceOnB = { x: 0, y: 0 }; j.tangentForceOnB = { x: 0, y: 0 };
      }
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
    // Hold gait effort at the controller rate; physics subdivisions do not
    // become extra decisions. Center keeps stepBody's historical turn credit.
    // Patch plans from attained facing, before the loaded turn is executed.
    const plans = this.plans;
    for (let i = 0; i < n; i++) this.plan(bs[i], i, intents[i] ?? STAND, dt);
    for (let i = 0; i < n; i++) {
      const l = intents[i]?.lunge, sup = bs[i].support!;
      if (l && sup.state === 'up' && Math.hypot(l.x, l.y) > 1e-6) sup.strike = { x: l.x, y: l.y };
    }

    // Islands: who can touch whom within this tick, or is held, or struck.
    const near = this.near;
    near.fill(0);
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
    const island = this.island, alone = this.alone;
    island.length = 0; alone.length = 0;
    for (let i = 0; i < n; i++) (near[i] ? island : alone).push(i);
    const pairs = this.pairs;
    pairs.clear();
    const t0 = this.time;
    if (alone.length) this.substep(alone, intents, plans, dt, dt, report, pairs, false);
    if (island.length) {
      let steps = this.substeps ?? clamp(Math.ceil(fastest * dt / SUBSTEP_TRAVEL), MIN_SUBSTEPS, MAX_SUBSTEPS);
      // HOLD_SUBSTEPS (experimental, off): a held body's balance is gravity-
      // unstable outside its base and integration error grows ~e^(w t), so an
      // island carrying a live grasp is resolved finer.
      if (HOLD_SUBSTEPS && !this.substeps && this.joints.some(j => j.kind === 'grasp' && !j.broken))
        steps = Math.max(steps, HOLD_SUBSTEPS);
      report.substeps = steps;
      const h = dt / steps;
      this.time = t0;
      for (let s = 0; s < steps; s++) this.substep(island, intents, plans, h, dt - s * h, report, pairs, true);
    } else if (this.substeps) report.substeps = this.substeps;
    this.time = t0 + dt;
    // Charge completed effort once, even if its action ended in a fall.
    // Ordinary gait retains its controller-rate proxy; passive motion is free.
    for (let i = 0; i < n; i++) {
      const b = bs[i], plan = plans[i];
      if (!plan.activeSteps) continue;
      // Keep a fully active tick's exact dt instead of summation roundoff.
      const activeTime = plan.hadPassive ? plan.activeTime : dt;
      const divisor = this.impactTiming === 'local-sweep' ? activeTime : plan.activeSteps;
      const lx = this.leanX[i] / divisor, ly = this.leanY[i] / divisor;
      const velocity = plan.hadPassive ? { x: plan.effortVx, y: plan.effortVy } : b.vel;
      spendEnergy(b, { x: plan.ax + lx / this.mass[i], y: plan.ay + ly / this.mass[i] }, Math.hypot(lx, ly) / Math.max(1, this.sp[i].pushForce), activeTime, plan.actionWork, velocity);
    }
    report.contacts = [...pairs.values()];
    this.pending = [];
    for (const j of this.joints) {
      if (j.kind === 'hands') {
        j.normalForce = (j.normalForce ?? 0) / dt; j.tangentForce = (j.tangentForce ?? 0) / dt;
        j.normalForceOnB = { x: (j.normalForceOnB?.x ?? 0) / dt, y: (j.normalForceOnB?.y ?? 0) / dt };
        j.tangentForceOnB = { x: (j.tangentForceOnB?.x ?? 0) / dt, y: (j.tangentForceOnB?.y ?? 0) / dt };
        if (this.handContact === 'patch') {
          j.forceOnB!.x /= dt; j.forceOnB!.y /= dt;
          j.momentOnA = (j.momentOnA ?? 0) / dt; j.momentOnB = (j.momentOnB ?? 0) / dt;
        }
      }
      else {
        j.force = (j.force ?? 0) / dt;
        j.normalForce = (j.normalForce ?? 0) / dt; j.tangentForce = (j.tangentForce ?? 0) / dt;
        j.normalForceOnB = { x: (j.normalForceOnB?.x ?? 0) / dt, y: (j.normalForceOnB?.y ?? 0) / dt };
        j.tangentForceOnB = { x: (j.tangentForceOnB?.x ?? 0) / dt, y: (j.tangentForceOnB?.y ?? 0) / dt };
      }
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
  /** Arm-budget units per unit of press force: arm force / press capacity
   * (exactly 1 without ARM_PRESS). */
  private pressUnits(i: number): number {
    const sp = this.sp[i];
    return sp.pressForce === sp.armForce ? 1 : sp.armForce / sp.pressForce;
  }

  private allocateArms(): void {
    this.active.fill(0);
    for (const jt of this.joints) {
      if (jt.kind==='hands') {
        const actor=this.indexOf(jt.actor??jt.a),holder=this.indexOf(jt.holder??jt.a);
        // A press is counted in press units: a full press uses the whole arm
        // budget, as a full grip does (ARM_PRESS; the ratio is 1 when off).
        const units=this.pressUnits(actor),press=units===1?Math.max(0,jt.push):Math.max(0,jt.push)*units;
        this.active[actor]+=Math.hypot(Math.max(press,actor===holder?jt.hold:0),Math.max(0,jt.steer));
        if(actor!==holder)this.active[holder]+=Math.max(0,jt.hold);
      }
      else if (!jt.broken) {
        const holder = this.indexOf(jt.a);
        if (jt.brace !== undefined) this.active[holder] += Math.min(this.gripCapacity(jt), this.armCap[holder]);
        else if (jt.pull! > 0) this.active[holder] += this.armCap[holder];
      }
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
    kind: 'hands'|'grasps'|'strikes', active=true, channel?: { net: number },
    angularA = 0, angularB = 0, armUnits = 1): number {
    const a=this.bodies[i],b=this.bodies[j];
    let linear=(b.vel.x-a.vel.x)*x+(b.vel.y-a.vel.y)*y;
    let quadratic=.5*(x*x+y*y)*(1/this.mass[i]+1/this.mass[j]);
    if (angularA || angularB) {
      linear += (a.spin ?? 0) * angularA + (b.spin ?? 0) * angularB;
      quadratic += .5 * (angularA * angularA / this.inertia[i] + angularB * angularB / this.inertia[j]);
    }
    const ledger = this.constraintWork === 'per-solve' ? channel : undefined;
    const previous = ledger?.net ?? 0;
    // armUnits converts this channel's work into arm-budget units (a press
    // counts in press units; 1 for every other channel).
    const budget=(active?Math.max(0,this.report.armWorkLimit[actor]-this.report.armWork[actor])/armUnits:0)
      + (ledger ? Math.max(0,-previous) : 0);
    const fraction=workFraction(linear,quadratic,budget);
    x*=fraction;y*=fraction;
    const work=linear*fraction+quadratic*fraction*fraction;
    a.vel.x-=x/this.mass[i];a.vel.y-=y/this.mass[i];
    b.vel.x+=x/this.mass[j];b.vel.y+=y/this.mass[j];
    if (angularA) a.spin = (a.spin ?? 0) + angularA * fraction / this.inertia[i];
    if (angularB) b.spin = (b.spin ?? 0) + angularB * fraction / this.inertia[j];
    this.report.work[kind]+=work;
    if (kind === 'grasps' && !active) this.report.passiveGraspWork += work;
    if (ledger) ledger.net = previous + work;
    if(active)this.report.armWork[actor]+=(ledger
      ? Math.max(0,ledger.net)-Math.max(0,previous) : Math.max(0,work))*armUnits;
    return fraction;
  }

  /** The attachment and velocity use the same reduced coordinate/Jacobian.
   * Body-only reach paired with foot-point velocity would be inconsistent. */
  private boundedGeometry(jt: GraspJoint): BoundedAttachment {
    const attachment = this.attachments.get(jt)!;
    const share = recoveryShare(jt), foot = jt.b.support!.foot!;
    const x = attachment.material?.x ?? share * foot.offset.x + attachment.reference.x;
    const y = attachment.material?.y ?? share * foot.offset.y + attachment.reference.y;
    const angle = attachment.material ? jt.b.facing : undefined;
    const limit = this.sp[this.indexOf(jt.b)].comHeight, cached = attachment.geometry;
    // Geometry is fixed through a force solve. Reuse its map/Jacobian while
    // impulses change velocities; actual coordinate/reference changes invalidate
    // the exact key. Body translation is added separately by graspPoint.
    if (cached && cached.x === x && cached.y === y && cached.angle === angle && cached.limit === limit) return cached.value;
    let value = boundedAttachment({ x, y }, limit);
    if (angle !== undefined) {
      const c = Math.cos(angle), s = Math.sin(angle), { xx, xy, yy } = value.derivative;
      value = { offset: { x: c * value.offset.x - s * value.offset.y, y: s * value.offset.x + c * value.offset.y },
        derivative: { xx: c*c*xx - 2*c*s*xy + s*s*yy, xy: c*s*(xx-yy) + (c*c-s*s)*xy,
          yy: s*s*xx + 2*c*s*xy + c*c*yy } };
    }
    attachment.geometry = { x, y, angle, limit, value };
    return value;
  }

  private graspPoint(jt: GraspJoint): Vec2 {
    const foot = jt.b.support!.foot, share = foot ? recoveryShare(jt) : 0;
    const attachment = foot ? this.attachments.get(jt) : undefined;
    const reference = attachment?.reference;
    if (attachment?.bounded) {
      const r = this.boundedGeometry(jt).offset;
      return { x: jt.b.pos.x + r.x, y: jt.b.pos.y + r.y };
    }
    if (attachment?.material) {
      const c = Math.cos(jt.b.facing), s = Math.sin(jt.b.facing), z = attachment.material;
      return { x: jt.b.pos.x + c*z.x - s*z.y, y: jt.b.pos.y + s*z.x + c*z.y };
    }
    return { x: jt.b.pos.x + share * (foot?.offset.x ?? 0) + (reference?.x ?? 0),
      y: jt.b.pos.y + share * (foot?.offset.y ?? 0) + (reference?.y ?? 0) };
  }

  /** Same derivative owns point velocity, generalized load and directional
   * mobility. The corrective coordinate stays fixed throughout each solve. */
  private graspJacobian(jt: GraspJoint): { xx: number; xy: number; yy: number } {
    const foot = jt.b.support!.foot, share = foot ? recoveryShare(jt) : 0;
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
    if (this.supportModel !== 'legacy' && this.handContact !== 'patch') return;
    if (!this.joints.length && !this.heldBodies.size) return;
    const byBody = new Map<Body, GraspJoint[]>();
    for (const jt of this.joints) {
      if (jt.kind !== 'grasp') continue;
      if (jt.legs <= 0) { this.attachments.delete(jt); continue; }
      if (jt.broken || jt.capacity <= 0) continue;
      const holds = byBody.get(jt.b);
      if (holds) holds.push(jt); else byBody.set(jt.b, [jt]);
    }
    for (const b of this.heldBodies) if (!byBody.has(b)) {
      if (this.supportModel === 'legacy') delete b.support!.foot;
      b.support!.feetLock = 0;
      this.heldBodies.delete(b);
    }
    for (const [b, holds] of byBody) {
      this.heldBodies.add(b);
      const foot = b.support!.foot ??= newVirtualFoot(b.pos);
      const reach = supportParams(b.profile).comHeight;
      const excursion = Math.hypot(foot.offset.x, foot.offset.y);
      this.report.maxHeldRecoveryExcursion = Math.max(this.report.maxHeldRecoveryExcursion, excursion);
      for (const jt of holds) {
        const share = recoveryShare(jt), old = this.attachments.get(jt);
        if (!old || old.foot !== foot) this.attachments.set(jt, { share,
          reference: this.supportModel === 'legacy' ? { x: -share * foot.offset.x, y: -share * foot.offset.y } : { x: 0, y: 0 }, foot,
          bounded: old?.material ? old.bounded : this.boundedAttachment, material: old?.material });
        else {
          if (old.share !== share) {
            old.reference.x += (old.share - share) * foot.offset.x;
            old.reference.y += (old.share - share) * foot.offset.y;
            old.share = share;
          }
          // An explicitly restored linear attachment converts once without
          // moving its acquired point. At/outside the finite map's domain,
          // retain the linear law and its ordinary reach validation.
          if (this.boundedAttachment && old.bounded === undefined && !old.material) {
            const z = inverseBoundedAttachment({ x: share * foot.offset.x + old.reference.x,
              y: share * foot.offset.y + old.reference.y }, reach);
            old.bounded = z !== null;
            if (z) old.reference = { x: z.x - share * foot.offset.x, y: z.y - share * foot.offset.y };
          }
        }
        const attachment = this.attachments.get(jt)!;
        if (this.handContact === 'patch' && !attachment.material) {
          // Acquire the currently represented point, not an invented ankle.
          // Yaw then transports this contact; it never rotates the world foot.
          const dx = share*foot.offset.x + attachment.reference.x;
          const dy = share*foot.offset.y + attachment.reference.y;
          const c = Math.cos(b.facing), s = Math.sin(b.facing);
          const local = { x: c*dx+s*dy, y: -s*dx+c*dy };
          attachment.material = local;
          attachment.geometry = undefined;
        }
        const point = this.graspPoint(jt);
        // Only actual held geometry can invalidate a grip, not how far the
        // common correction chart has accumulated under a small leg share.
        if (!this.attachments.get(jt)!.bounded && Math.hypot(point.x - b.pos.x, point.y - b.pos.y) > reach) {
          jt.broken = true; this.report.lowerHoldReleases++;
        }
      }
      if (holds.every(jt => jt.broken)) {
        if (this.supportModel === 'legacy') delete b.support!.foot;
        b.support!.feetLock = 0; this.heldBodies.delete(b);
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
    const foot = jt.b.support!.foot, share = foot ? recoveryShare(jt) : 0;
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
  private supportImpulse(jt: GraspJoint, x: number, y: number, h: number, active = false, channel?: { net: number }, angularA = 0, angularB = 0): number {
    const i = this.indexOf(jt.a), j = this.indexOf(jt.b), a = jt.a, b = jt.b;
    const foot = b.support!.foot!, share = recoveryShare(jt);
    let bodyLinear = (b.vel.x - a.vel.x) * x + (b.vel.y - a.vel.y) * y;
    let bodyQuadratic = .5 * (x * x + y * y) * (1 / this.mass[i] + 1 / this.mass[j]);
    if (angularA || angularB) {
      bodyLinear += (a.spin ?? 0)*angularA + (b.spin ?? 0)*angularB;
      bodyQuadratic += .5*(angularA*angularA/this.inertia[i] + angularB*angularB/this.inertia[j]);
    }
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
    if (angularA) a.spin = (a.spin ?? 0) + angularA*fraction/this.inertia[i];
    if (angularB) b.spin = (b.spin ?? 0) + angularB*fraction/this.inertia[j];
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

  /** Preserve sign when reducing a patch angle: adding then subtracting pi
   * loses different low bits in mirrored lean/turn requests. Center retains
   * its historical arithmetic. At an exact half turn, retain the input sign. */
  private facingDelta(from: number, to: number): number {
    if (this.handContact === 'center') return angleDiff(from, to);
    let delta = (to - from) % (2 * Math.PI);
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    return delta;
  }

  private plan(b: Body, i: number, intent: Intent, dt: number): Plan {
    const sup = b.support!;
    const plan = this.plans[i];
    plan.ax = 0; plan.ay = 0; plan.facing = b.facing; plan.cut = 1;
    plan.free = !!intent.free; plan.dive = null; plan.launch = 0;
    plan.activeTime = 0; plan.activeSteps = 0; plan.hadPassive = false;
    plan.actionWork = 0; plan.activeNow = false; plan.effortVx = 0; plan.effortVy = 0;
    if (sup.state !== 'up' || intent.free) return plan;
    if (intent.dive && Math.hypot(intent.dive.x, intent.dive.y) > 1e-9) {
      const l = Math.hypot(intent.dive.x, intent.dive.y);
      plan.dive = { x: intent.dive.x / l, y: intent.dive.y / l };
      plan.launch = Math.min(1, l);
      return plan;
    }
    const a = availability(sup, this.sp[i], this.fat[i]);
    updateSqueeze(b, intent, dt);
    const tr = turnRateOf(b);
    const facing = b.facing + clamp(this.facingDelta(b.facing, commandFacing(b, intent)), -tr * dt, tr * dt);
    // Pad level costs a little speed when he plays low.
    const low = 1 - 0.12 * Math.max(0, sup.posture - 0.3);
    const cmd = low < 1 ? { ...intent, effort: (intent.effort ?? 1) * low } : intent;
    const saved = b.facing;
    // A turn-rate ceiling is not an achieved pose. Contact and the shared
    // traction budget can prevent that turn; it cannot grant gait speed yet.
    if (this.handContact === 'center') b.facing = facing;
    const acc = locomotionAccel(b, cmd, dt, a);
    b.facing = saved;
    // The yaw motor needs the requested angle to plan its own braking. The
    // rate-clipped pose above is only the existing gait estimate; making it
    // a new stopping target each tick turns a smooth rotation into a chase.
    plan.ax = acc.x; plan.ay = acc.y;
    plan.facing = this.handContact === 'center' ? commandFacing(b, intent) : facing;
    plan.cut = intent.cutSkill ?? 1;
    return plan;
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
      this.impX[i] = 0; this.impY[i] = 0; this.tripX[i] = 0; this.tripY[i] = 0; this.thighX[i] = 0; this.thighY[i] = 0; this.liftImp[i] = 0;
      this.tipX[i] = 0; this.tipY[i] = 0; this.braceX[i] = 0; this.braceY[i] = 0;
      this.travelAdjustX[i] = 0; this.travelAdjustY[i] = 0; this.facing0[i] = bs[i].facing;
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
    // Hanging weight: a holder off his feet who still holds the runner's legs
    // rests on the ground at one end and on his arms at the other, so about
    // half his weight hangs on the hold. To swing that leg through a stride
    // the runner's hip must lift it: the share of his stride the weight binds
    // is its moment about his hip (the hold sits 0.55·legs of his COM height
    // below it) against his hip torque. A holder still on his feet carries
    // his own weight and binds nothing this way.
    this.strideHolds.fill(0);
    for (const jt of this.joints) {
      if (jt.kind !== 'grasp') continue;
      jt.strideForce = 0;
      if (jt.broken || jt.legs <= 0 || jt.a.support!.state === 'up') continue;
      const ia = this.indexOf(jt.a), ib = this.indexOf(jt.b);
      const lever = 0.55 * clamp(jt.legs, 0, 1) * this.comHeight[ib];
      // One hip budget: what bracing the hold's pull on his thighs used is
      // not there to swing the leg.
      const hip = HIP_TORQUE_PER_KG * this.mass[ib] * this.fat[ib] * Math.max(0, 1 - this.hipUsed[ib]);
      const bound = hip > 1e-9 ? clamp(HANG_SHARE * this.mass[ia] * G * lever / hip, 0, 1) : 1;
      jt.strideForce = bound;
      this.strideHolds[ib] = 1 - (1 - this.strideHolds[ib]) * (1 - bound);
    }
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
        let observed: ContactSnapshot | undefined;
        if (!p.delivered) {
          const dx = p.b.pos.x - p.a.pos.x, dy = p.b.pos.y - p.a.pos.y;
          const length = Math.hypot(dx, dy) || 1;
          observed = { time: this.time, intervalEnd: this.time + h,
            normal: { x: dx / length, y: dy / length },
            positionI: { ...p.a.pos }, positionJ: { ...p.b.pos },
            facingI: p.a.facing, facingJ: p.b.facing,
            velocityI: { ...p.a.vel }, velocityJ: { ...p.b.vel },
            supportI: p.a.support!.state, supportJ: p.b.support!.state,
            height: clamp(p.height ?? Math.min(this.padHeight[ia], this.padHeight[ib]), 0,
              Math.min(p.a.profile.heightYd, p.b.profile.heightYd)) };
        }
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
            p.delivered = { i: ia, j: ib, impulse: { x: 0, y: 0 }, work: 0, height: p.height,
              requestedAt: p.requestedAt, contactAnatomy: p.contactAnatomy,
              first: observed };
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
      if (jt.kind !== 'grasp' || jt.broken || jt.brace !== undefined || !(jt.pull! > 0)) continue;
      // Patch grips share the hands' frozen force frame. Applying a
      // reel here would change transport before that common frame is acquired.
      if (this.handContact === 'patch') continue;
      const i=this.indexOf(jt.a), j=this.indexOf(jt.b);
      const point=this.graspPoint(jt);
      const dx=point.x-jt.a.pos.x,dy=point.y-jt.a.pos.y,d=Math.hypot(dx,dy);
      const touch=CONTACT_SCALE*(jt.a.profile.radius+jt.b.profile.radius);
      if (d <= touch || d>jt.reach || jt.a.support!.state!=='up') continue;
      const nx=dx/d,ny=dy/d;
      const rv=this.graspVelocity(jt);
      const vn=rv.x*nx+rv.y*ny;
      const foot=jt.b.support!.foot, share=foot?recoveryShare(jt):0;
      const demandMobility = (1 / this.mass[i] + 1 / this.mass[j]) * this.tickDt
        + (this.attachments.get(jt)?.bounded ? this.attachmentMobility(jt,nx,ny) : share * share * (foot?.mobility ?? 0));
      // Preserve the production operation order: tiny rounding changes can
      // alter later closed-loop contacts even with the experiment disabled.
      const wanted=foot ? Math.max(0,vn+Math.min(ARM_SPEED,jt.pull!))/demandMobility
        : Math.max(0,vn+Math.min(ARM_SPEED,jt.pull!))/(1/this.mass[i]+1/this.mass[j])/this.tickDt;
      const impulse=Math.min(wanted,this.armCap[i]*this.armScale[i],this.gripCapacity(jt))*h;
      const height=jt.height??this.comHeight[j]*(1-.55*clamp(jt.legs,0,1));
      const observed = jt.firstApplied ?? this.jointSnapshot(jt, h, nx, ny, height);
      const fraction=share>0?this.supportImpulse(jt,-nx*impulse,-ny*impulse,h,true)
        :this.pairImpulse(i,j,-nx*impulse,-ny*impulse,i,'grasps');
      // Reeling is a bounded force across h, like hands and strikes. Center
      // its achieved body impulse after the shared force/work limits. A lower
      // attachment also moves support through supportImpulse above; its chart,
      // motor work and passive capture retain their own integration rules.
      const x = -nx * impulse * fraction, y = -ny * impulse * fraction;
      jt.normalForce = (jt.normalForce ?? 0) - impulse * fraction;
      jt.normalForceOnB!.x += x; jt.normalForceOnB!.y += y;
      if (impulse * fraction > 0) {
        jt.firstApplied ??= observed;
        jt.achievedContactHeight = observed.height;
      }
      this.travelAdjustX[i] += .5 * x / this.mass[i];
      this.travelAdjustY[i] += .5 * y / this.mass[i];
      this.travelAdjustX[j] -= .5 * x / this.mass[j];
      this.travelAdjustY[j] -= .5 * y / this.mass[j];
      this.reels.set(jt,impulse*fraction);
      report.armImpulse[i]+=impulse*fraction;
      // Active reel and passive tension act through the same hand position.
      // A leg grip cannot pull at shoulder height while its passive restraint
      // trips the foot below it.
      this.addLoad(i,j,nx,ny,-impulse*fraction,0,height,jt.legs>0);
    }

    // ---- 2. constraints
    let contacts: Contact[] = [];
    if (contact) {
      const soft = softness(CONTACT_HZ, CONTACT_ZETA, h);
      contacts = this.detect(ids, h, soft, report, swept);
      // Torso impacts occur at the interval start; hands act as finite forces
      // across it. Freeze the hand midpoint only after the achieved impact.
      // Interleaving them used a pre-impact hand point but post-impact travel,
      // leaving an unbalanced angular cross term even with correct row laws.
      if (this.handContact === 'patch') {
        const spin = ids.map(i => bs[i].spin ?? 0);
        for (let it = 0; it < ITERATIONS; it++) for (const c of contacts) this.solveContact(c, soft);
        // Translation carries a start impact for the whole remaining interval;
        // acquired yaw must have the same timing. Endpoint RELAX has none.
        for (let k = 0; k < ids.length; k++) bs[ids[k]].facing += h * ((bs[ids[k]].spin ?? 0) - spin[k]);
      }
      const rows = this.jointRows(h);
      // Freeze every finite-force point before delivering any patch reel.
      // This matters when one body participates in several different holds.
      if (this.handContact === 'patch') for (const r of rows) {
        if (r.joint.kind === 'grasp') this.reelPatchGrasp(r, h);
      }
      const handSoft = softness(HANDS_HZ, HANDS_ZETA, h);
      const graspSoft = softness(GRASP_HZ, GRASP_ZETA, h);
      for (let it = 0; it < ITERATIONS; it++) {
        if (this.handContact === 'center') for (const c of contacts) this.solveContact(c, soft);
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
        if (Math.hypot(r.ln, r.lt) > 0) jt.achievedContactHeight = clamp(
          height ?? Math.min(this.padHeight[r.i], this.padHeight[r.j]), 0,
          Math.min(bs[r.i].profile.heightYd, bs[r.j].profile.heightYd));
        if (Math.hypot(r.ln, r.lt) > 0) jt.firstApplied ??= r.observed;
        this.addLoad(r.i, r.j, r.nx, r.ny, r.ln, r.lt, height, jt.kind === 'grasp' && jt.legs > 0);
        // Hands and patch grips are bounded forces acting across h. Use one
        // timing rule for their attained impulse AND spin, including the reel.
        // Unbraced center-mode grasps retain the historical transport rule.
        const gripPatch = jt.kind === 'grasp' && this.handContact === 'patch';
        if (jt.kind === 'hands' || gripPatch || (jt.kind === 'grasp' && jt.brace !== undefined)) {
          const normal = r.ln - (gripPatch ? r.reel : 0);
          if (this.handContact === 'patch') {
            const yawTime = (this.handIntegration === 'centered' ? .5 : 1) * h;
            this.bodies[r.i].facing += yawTime * ((r.ni ?? 0) * normal - (r.ri ?? 0) * r.lt) / this.inertia[r.i];
            this.bodies[r.j].facing += yawTime * ((r.nj ?? 0) * normal - (r.rj ?? 0) * r.lt) / this.inertia[r.j];
          }
          if (this.handIntegration === 'centered') {
            const x = r.nx * normal - r.ny * r.lt;
            const y = r.ny * normal + r.nx * r.lt;
            this.travelAdjustX[r.i] += .5 * x / this.mass[r.i];
            this.travelAdjustY[r.i] += .5 * y / this.mass[r.i];
            this.travelAdjustX[r.j] -= .5 * x / this.mass[r.j];
            this.travelAdjustY[r.j] -= .5 * y / this.mass[r.j];
          }
        }
        if (jt.kind === 'hands') {
          // A press is counted in press units, as allocateArms budgets it.
          const ln = r.mode > 0 ? r.ln * this.pressUnits(r.actor) : r.ln;
          if(r.actor===r.steerActor) report.armImpulse[r.actor] += Math.hypot(ln,r.lt);
          else { report.armImpulse[r.actor]+=Math.abs(ln);report.armImpulse[r.steerActor]+=Math.abs(r.lt); }
          if (!r.handMembers) {
            jt.normalForce = (jt.normalForce ?? 0) + r.ln;
            jt.tangentForce = (jt.tangentForce ?? 0) + r.lt;
            jt.normalForceOnB!.x += r.nx * r.ln; jt.normalForceOnB!.y += r.ny * r.ln;
            jt.tangentForceOnB!.x -= r.ny * r.lt; jt.tangentForceOnB!.y += r.nx * r.lt;
          }
          for (const member of r.handMembers ?? []) {
            const owner = this.indexOf(member.actor ?? member.a);
            const holder = this.indexOf(member.holder ?? member.a);
            const cap = r.mode > 0 ? Math.max(0, member.push) * this.armScale[owner]
              : Math.max(0, member.hold) * this.armScale[holder];
            const normalLimit = r.mode > 0 ? r.pushLim : r.holdLim;
            const normalShare = normalLimit > 0 ? cap * h / normalLimit : 0;
            const tangentShare = r.steerLim > 0 ? Math.max(0, member.steer) * this.armScale[owner] * h / r.steerLim : 0;
            member.normalForce = (member.normalForce ?? 0) + r.ln * normalShare;
            member.tangentForce = (member.tangentForce ?? 0) + r.lt * tangentShare;
            const ln = r.ln * normalShare, lt = r.lt * tangentShare;
            if (Math.hypot(ln, lt) > 0) {
              member.firstApplied ??= r.observed;
              member.achievedContactHeight = r.observed.height;
            }
            member.normalForceOnB!.x += r.nx * ln; member.normalForceOnB!.y += r.ny * ln;
            member.tangentForceOnB!.x -= r.ny * lt; member.tangentForceOnB!.y += r.nx * lt;
            member.forceOnB!.x += r.nx * ln - r.ny * lt;
            member.forceOnB!.y += r.ny * ln + r.nx * lt;
            member.momentOnA = (member.momentOnA ?? 0) + (r.ni ?? 0) * ln - (r.ri ?? 0) * lt;
            member.momentOnB = (member.momentOnB ?? 0) + (r.nj ?? 0) * ln - (r.rj ?? 0) * lt;
          }
        } else {
          const used = Math.hypot(r.ln-r.reel, r.lt);
          const compression = jt.brace !== undefined && r.mode > 0;
          // Passive cloth/arm restraint keeps the existing structural grip
          // allowance; only muscular compression consumes the arm request.
          if (compression) report.armImpulse[r.i] += Math.abs(r.ln);
          const shearLimit = Math.sqrt(Math.max(0, r.limit * r.limit - r.ln * r.ln));
          const slipping = compression
            ? Math.abs(r.lt) > 1e-10 && Math.abs(r.lt) >= .98 * shearLimit
            : used >= .98 * r.limit && r.limit > 0;
          if (!r.members) {
            jt.force = (jt.force ?? 0) + used;
            jt.normalForce = (jt.normalForce ?? 0) + r.ln;
            jt.tangentForce = (jt.tangentForce ?? 0) + r.lt;
            jt.normalForceOnB!.x += r.nx * r.ln; jt.normalForceOnB!.y += r.ny * r.ln;
            jt.tangentForceOnB!.x -= r.ny * r.lt; jt.tangentForceOnB!.y += r.nx * r.lt;
            jt.slipping = slipping;
          }
          for (const member of r.members ?? []) {
            const cap = this.gripCapacity(member);
            const share = r.limit > 0 ? cap * h / r.limit : 0;
            member.force = (member.force ?? 0) + used * share;
            member.normalForce = (member.normalForce ?? 0) + r.ln * share;
            member.tangentForce = (member.tangentForce ?? 0) + r.lt * share;
            member.normalForceOnB!.x += r.nx * r.ln * share; member.normalForceOnB!.y += r.ny * r.ln * share;
            member.tangentForceOnB!.x -= r.ny * r.lt * share; member.tangentForceOnB!.y += r.nx * r.lt * share;
            if (used * share > 0) {
              member.firstApplied ??= r.observed;
              member.achievedContactHeight = r.observed.height;
            }
            member.slipping = slipping;
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
    // Transport the material grip by achieved yaw and the existing corrective
    // motor. Keep the averaged world support offset unrotated. That massless
    // motor uses full achieved u over h, rather than body impulse half-travel.
    if (this.handContact === 'patch') for (const jt of this.joints) {
      if (jt.kind !== 'grasp' || jt.broken) continue;
      const attachment = this.attachments.get(jt), z = attachment?.material;
      if (!attachment || !z) continue;
      const j = this.indexOf(jt.b), angle = (this.facing0[j] + jt.b.facing)*.5;
      const u = attachment.foot.achieved, c = Math.cos(angle), s = Math.sin(angle);
      z.x += attachment.share*(c*u.x+s*u.y)*h;
      z.y += attachment.share*(-s*u.x+c*u.y)*h;
    }
    // Relax: the soft contact has already moved overlapping torsos apart;
    // now take back the velocity that correction left behind. Bodies do not
    // bounce off each other, and pushing out an overlap adds no energy, so
    // a hit transfers the same momentum at any substep.
    if (contacts.length) {
      for (const c of contacts) c.touched = c.ln > 0;
      // Relaxation acts after position integration. Use the actual current
      // common point for these impulses, not the pre-travel lever arms.
      if (this.handContact === 'patch') for (const c of contacts) this.contactPatch(c);
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
          else pairs.set(key, { i: c.i, j: c.j, impulse: c.ln, closing: c.closing, first: c.observed });
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
      const ankleBrace = feltMoment > 1e-9 ? Math.min(1, ankleMoment / feltMoment) : 0;
      const braced = Math.max(leanBrace, ankleBrace);
      const tx = this.tipX[i] / h, ty = this.tipY[i] / h;
      this.tipX[i] -= oldTip.x * braced * h;
      this.tipY[i] -= oldTip.y * braced * h;
      // A committed lean balances moments in its attained plane. It cannot
      // also erase an independent transverse couple. Restore that component
      // beyond the common bounded ankle response; do not add another budget.
      // The cross-product form is exactly zero for collinear components,
      // preserving the old arithmetic there without an angular tolerance.
      const bx = this.braceX[i], by = this.braceY[i], brace2 = bx * bx + by * by;
      const transverse = bx * oldTip.y - by * oldTip.x;
      if (leanBrace > ankleBrace && brace2 > 0 && transverse !== 0) {
        const restore = (leanBrace - ankleBrace) * transverse / brace2 * h;
        this.tipX[i] -= by * restore;
        this.tipY[i] += bx * restore;
      }
      sup.feltTip = { x: oldTip.x + (tx - oldTip.x) * kf, y: oldTip.y + (ty - oldTip.y) * kf };
      sup.load = { x: lx, y: ly };
      sup.felt = { x: sup.felt.x + (lx - sup.felt.x) * kf, y: sup.felt.y + (ly - sup.felt.y) * kf };
      if (PAD_LEVERAGE) this.liftFelt[i] += (this.liftImp[i] / h - this.liftFelt[i]) * kf;
    }
    // Grasps that slipped slide out; past reach they are broken.
    if (contact) for (const j of this.joints) {
      if (j.kind !== 'grasp' || j.broken) continue;
      const point = this.graspPoint(j);
      const d = Math.hypot(point.x - j.a.pos.x, point.y - j.a.pos.y);
      const touch = CONTACT_SCALE * (j.a.profile.radius + j.b.profile.radius);
      // A secure grip reels in: the arms shorten toward a wrap at their own
      // rate; the tension that does it is bounded by the same grip budget.
      const before = j.hold ?? d;
      const held = j.slipping ? Math.max(j.hold ?? d, d) : Math.min(j.hold ?? d, Math.max(d, touch));
      if (j.brace !== undefined) {
        // Arms yield through actually achieved compression. Keeping their
        // original span would push a caught runner away while the holder
        // tries to close his wrap. This plastic rest change stores no spring
        // energy and cannot restore separation or create an impulse.
        j.brace = Math.min(j.brace, Math.max(d, touch));
        j.hold = Math.max(j.brace, held);
      } else j.hold = held;
      // Arms dragged along a running body slide down it, to the thighs and
      // ankles: a slipping hold becomes a hold on his legs.
      // They move down him by the distance they actually slipped: hold
      // height is com·(1 − 0.55·legs). Grip at its limit while the arms
      // close in does not move them.
      const slid = j.slipping ? Math.max(0, (j.hold ?? d) - before) : 0;
      if (slid > 0) j.legs = Math.min(1, j.legs + slid / (0.55 * this.comHeight[this.indexOf(j.b)]));
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
        const sup = bs[i].support!, interval = supportInterval(h), k = interval.gait;
        const acc = sup.accel ?? { x: 0, y: 0 }, tip = sup.tipAccel ?? { x: 0, y: 0 };
        sup.accel = { x: acc.x + ((bs[i].vel.x - this.v0x[i]) / h - acc.x) * k,
          y: acc.y + ((bs[i].vel.y - this.v0y[i]) / h - acc.y) * k };
        sup.tipAccel = { x: tip.x + (this.tipX[i] / h - tip.x) * k, y: tip.y + (this.tipY[i] / h - tip.y) * k };
        // Diagnostic source history is recent even while he is off his feet.
        // Preserve its existing memory instead of freezing an old trip until
        // the next unrelated fall after he gets up.
        if (sup.causes) {
          const decay = interval.decay;
          sup.causes.contact *= decay; sup.causes.legs *= decay; sup.causes.overspeed *= decay;
        }
      }
    }
    // Consume this interval's achieved recovery before retiring a hold that
    // just broke. Deleting its motor first would erase a transmitted load
    // from balance while retaining that same impulse in velocity and work.
    this.syncHeldSupport();
    for (const i of ids) if (plans[i].activeNow) {
      // Later passive sliding must not determine active sprint/work exposure.
      plans[i].effortVx = bs[i].vel.x; plans[i].effortVy = bs[i].vel.y;
    }
    this.time += h;
  }

  /** The feet: gait plan, lean into a felt load, one shared budget; or off-feet motion. */
  private feet(i: number, intent: Intent, plan: Plan, h: number, remaining: number, report: StepReport): void {
    const b = this.bodies[i];
    const sup = b.support!;
    const p = b.profile;
    const sp = this.sp[i];
    const m = this.mass[i];
    // Friction on the actual normal load: standing weight less any contact lift.
    const traction = PAD_LEVERAGE ? sp.traction * clamp(1 - this.liftFelt[i] / (m * G), 0, 2) : sp.traction;
    report.groundImpulseLimit[i] += traction * h;
    this.recovery[i] = 0;
    const spinBefore=b.spin??0;
    this.v0x[i] = b.vel.x; this.v0y[i] = b.vel.y;
    let fx = 0, fy = 0;
    let actionX = 0, actionY = 0;
    plan.activeNow = sup.state === 'up' && !plan.free;
    if (plan.activeNow) { plan.activeTime += h; plan.activeSteps++; }
    else plan.hadPassive = true;
    if (sup.state === 'up') {
      if (plan.free) {
        this.alpha[i] = 1; this.cut[i] = 1;
        b.facing += (b.spin ?? 0) * h;
      } else if (plan.dive) {
        // Finite launch force over the controller tick, independent of the
        // contact subdivision. He leaves his feet at the end of that plant.
        const launch = Math.min(traction, Math.min(1.5, Math.max(0, p.vmax - Math.hypot(b.vel.x, b.vel.y))) * plan.launch * m / this.tickDt);
        fx += plan.dive.x * launch; fy += plan.dive.y * launch;
        actionX = fx; actionY = fy;
        // Launch supplies translation, not a torque that arrests acquired spin.
        b.facing += (b.spin ?? 0) * h;
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
          const capT = traction * a;
          const lu = lx * ux + ly * uy;
          const disc = lu * lu - (lx * lx + ly * ly) + capT * capT;
          const f = Math.min(disc > 0 ? Math.max(0, -lu + Math.sqrt(disc)) : 0, m * need / h);
          lx += ux * f; ly += uy * f;
          actionX = ux * f; actionY = uy * f;
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
            const dir = directionalSpeedFactor(p, this.facingDelta(b.facing, Math.atan2(uy, ux)));
            const capacity = sp.pushForce * dir * clamp(1 - vp / p.vmax, 0, ECCENTRIC_GAIN) * fat * a * push;
            const mag = Math.min(capacity, L * (1 + PUSH_GROWTH), m * ex / h);
            tx = ux * mag; ty = uy * mag;
          }
        }
        let leanX = sup.lean.x, leanY = sup.lean.y;
        // A lean is his COM held ahead of his feet by the load. Whatever the
        // load no longer balances, beyond what his gait can accept as planned
        // acceleration, is a capture-point offset now: an overextension.
        // Release the existing lean, blend toward the request, then release
        // again. Preserve that order and every numerical update without
        // allocating a release closure and two excess closures per body.
        for (let phase = 0; phase < 2; phase++) {
          let iterations = 0, conv = unsupportedLean(b, plan, leanX, leanY, a, m);
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
            conv = unsupportedLean(b, plan, leanX, leanY, a, m); iterations++;
          }
          // Expose any unresolved local solve instead of silently claiming
          // that the iteration limit establishes convergence.
          report.maxLeanReleaseResidual = Math.max(report.maxLeanReleaseResidual, conv);
          report.maxLeanReleaseIterations = Math.max(report.maxLeanReleaseIterations, iterations);
          if (phase === 0) {
            // Transfer unsupported geometry before damping it away, exactly
            // as in the first release of the original two-pass technique.
            const rising = tx * tx + ty * ty >= leanX * leanX + leanY * leanY;
            const k = 1 - Math.exp(-h / (rising ? LEAN_RISE : LEAN_DECAY));
            leanX += (tx - leanX) * k; leanY += (ty - leanY) * k;
          }
        }
        sup.lean = { x: leanX, y: leanY };
        // One budget: locomotion and lean share traction and leg strength.
        // Leg drive is directional: full straight ahead, a shuffle's or a
        // backpedal's share sideways or backward. Traction caps all of it.
        const tfx = lx + leanX, tfy = ly + leanY;
        // Muscle force-velocity: legs pushing the way he already moves lose
        // force with speed (concentric); legs yielding against his motion
        // keep the eccentric credit, up to 1.2x isometric. Friction on his
        // actual normal load (pad lift or press included) bounds it once,
        // below. Without the law, a strength gap is a constant net force and
        // a carry keeps building.
        const tf = Math.hypot(tfx, tfy);
        const along = tf > 1e-9 ? directionalSpeedFactor(p, this.facingDelta(b.facing, Math.atan2(tfy, tfx))) : 1;
        const fv = tf > 1e-9 ? clamp(1 - (b.vel.x * tfx + b.vel.y * tfy) / (tf * p.vmax), 0, ECCENTRIC_GAIN) : 1;
        const strength = sp.pushForce * fv * along * a;
        const capacity = Math.min(Math.max(Math.hypot(lx, ly), strength), traction * a);
        // Availability already limits gait during recovery. Reserve actual
        // unused effort after ordinary translation and yaw, for every body.
        const cap = capacity;
        allocateGroundForce(allocation, lx, ly, leanX, leanY, cap);
        lx = allocation[0]; ly = allocation[1];
        const px = allocation[2], py = allocation[3];
        actionX *= allocation[4]; actionY *= allocation[4];
        fx += lx + px; fy += ly + py;
        // Bound stride: of his drive along his travel, the share his held legs
        // would deliver is lost while hanging weight keeps them from swinging
        // through. An internal limit on his own propulsion: nothing external
        // is added, and braking is untouched.
        const bound = this.strideHolds[i], v = Math.hypot(b.vel.x, b.vel.y);
        let removed = 0;
        if (bound > 0 && v > 1e-6) {
          const vx = b.vel.x / v, vy = b.vel.y / v, along = fx * vx + fy * vy;
          if (along > 0) { removed = along * bound; fx -= vx * removed; fy -= vy * removed; }
        }
        // Each hold keeps its share of the drive taken, for its causes.
        if (bound > 0) {
          let sum = 0;
          for (const jt of this.joints) if (jt.kind === 'grasp' && jt.b === b) sum += jt.strideForce ?? 0;
          for (const jt of this.joints) if (jt.kind === 'grasp' && jt.b === b)
            jt.strideForce = sum > 0 ? removed * (jt.strideForce ?? 0) / sum : 0;
        }
        this.braceX[i] = px; this.braceY[i] = py;
        const leanWeight = this.impactTiming === 'local-sweep' ? h : 1;
        this.leanX[i] += px * leanWeight; this.leanY[i] += py * leanWeight;
        // Turning pays from the same grip as translation: friction on the
        // actual normal load. A lifted body turns on less, a pressed one on more.
        const yaw: { impulse: number; work: number; peakTorque?: number } =
          turnBodyResponse(b, plan.facing, h, turnRateOf(b), a, Math.hypot(fx, fy), traction * a);
        // Strength limits drive+correction; traction also pays for yaw at
        // the physical support radius. Difference-of-squares keeps the
        // near-saturation subtraction well conditioned. Passive compliance
        // stays finite even when this active reserve is zero.
        // Correction uses profile strength, independent of the direction of
        // an arbitrarily small residual gait request. The existing gait law
        // can demand more than pushForce; that leaves zero corrective effort
        // rather than expanding strength to fund another simultaneous action.
        const total = sp.pushForce, force = Math.hypot(fx, fy);
        // A variable motor torque may reverse inside the interval. Its net
        // impulse cannot prove how much traction was left for recovery.
        const yawForce = yaw.peakTorque === undefined
          ? yaw.impulse / (h * baseRadiusAt(sp, sup.posture))
          : yaw.peakTorque / baseRadiusAt(sp, sup.posture);
        const groundDemand = Math.hypot(force, yawForce);
        const reserve = Math.sqrt(Math.max(0, Math.min((total - force) * (total + force),
          (traction - groundDemand) * (traction + groundDemand))));
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
    if (actionX !== 0 || actionY !== 0) {
      // Action power is linear during this constant ground-force piece.
      // Split its positive part at a reversal; contact/fall work is excluded.
      const p0 = (actionX * v0x + actionY * v0y) / m;
      const p1 = (actionX * b.vel.x + actionY * b.vel.y) / m;
      const positive = Math.max(p0, p1, 0);
      plan.actionWork += p0 * p1 < 0
        ? .5 * h * positive * positive / Math.abs(p1 - p0)
        : .5 * h * (Math.max(0, p0) + Math.max(0, p1));
    }
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
      // Getting upright does not supply an unbounded angular impulse. Keep
      // attained spin; ordinary ground friction and foot torque brake it.
      sup.posture = 0.45; sup.peak = 0; report.rises.push(i);
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
    const interval = supportInterval(h), kg = interval.gait;
    const acc = sup.accel ?? { x: 0, y: 0 };
    const ux = (b.vel.x - this.v0x[i]) / h, uy = (b.vel.y - this.v0y[i]) / h;
    const ax = acc.x + (ux - acc.x) * kg, ay = acc.y + (uy - acc.y) * kg;
    sup.accel = { x: ax, y: ay };
    const mean = interval.mean;
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
    let legX = this.tripX[i] / w0;
    let legY = this.tripY[i] / w0;
    // Hips brace a thigh hold's moment up to their extension torque over
    // this substep; the excess pitches him like any trip.
    const thigh = Math.hypot(this.thighX[i], this.thighY[i]);
    this.hipUsed[i] = 0;
    if (thigh > 0) {
      const c = this.comHeight[i], moment = thigh * sp.pitchRadiusSq * this.mass[i] / Math.max(c, 1e-6);
      const capacity = HIP_TORQUE_PER_KG * this.mass[i] * fat * h;
      this.hipUsed[i] = Math.min(1, moment / Math.max(capacity, 1e-12));
      const excess = Math.max(0, 1 - capacity / Math.max(moment, 1e-12));
      legX += this.thighX[i] * excess / w0; legY += this.thighY[i] * excess / w0;
    }
    dx += legX; dy += legY;
    // Remember what has been displacing him (decays over ~0.3 s).
    const decay = interval.decay;
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
    if (PAD_LEVERAGE) {
      // Compression only: a push from pads to pads. A pull has no such wedge.
      const dx = bs[j].pos.x - bs[i].pos.x, dy = bs[j].pos.y - bs[i].pos.y, d = Math.hypot(dx, dy);
      const press = d > 1e-6 ? (fx * dx + fy * dy) / d : 0;
      if (press > 0) {
        const rise = clamp((this.padHeight[j] - this.padHeight[i]) / Math.max(d, .3), -LEVERAGE_SLOPE, LEVERAGE_SLOPE);
        this.liftImp[j] += press * rise; this.liftImp[i] -= press * rise;
      }
    }
    const z = clamp(height ?? Math.min(this.padHeight[i], this.padHeight[j]),
      0, Math.min(bs[i].profile.heightYd, bs[j].profile.heightYd));
    const ci = this.comHeight[i], cj = this.comHeight[j];
    const fi = -(z - ci) * ci / this.sp[i].pitchRadiusSq / this.mass[i];
    const fj = (z - cj) * cj / this.sp[j].pitchRadiusSq / this.mass[j];
    this.tipX[i] += fx * fi; this.tipY[i] += fy * fi;
    if (legHold) {
      // A held foot cannot actively brace this moment: it pitches the body
      // over the base, in addition to restricting the recovery step.
      // A pull on the thighs acts on the hips, which brace its moment up to
      // their torque capacity (support update); only the excess pitches him.
      // A hold below the knee (about half the COM height) acts on the base
      // itself and trips him in full. The force still loads his COM and his
      // recovery step in full.
      const w = clamp((KNEE * cj + .1 - z) / .1, 0, 1);
      this.tripX[j] += fx * fj * w; this.tripY[j] += fy * fj * w;
      this.thighX[j] += fx * fj * (1 - w); this.thighY[j] += fy * fj * (1 - w);
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
        const row: Contact = { i, j, nx, ny, R, ri, rj, ni: 0, nj: 0,
          mn: 1 / (1 / ma + 1 / mb), mt: 1 / (1 / ma + 1 / mb + ri * ri / this.inertia[i] + rj * rj / this.inertia[j]),
          guard, bias: guard ? (s + GUARD_DEPTH) / h : Math.max(soft.biasRate * s, -MAX_PUSHOUT), ln: 0, lt: 0, closing: vn < 0 ? -vn : 0,
          observed: { time: this.time, intervalEnd: this.time + h, normal: { x: nx, y: ny },
            positionI: { ...a.pos }, positionJ: { ...b.pos },
            facingI: a.facing, facingJ: b.facing,
            velocityI: { ...a.vel }, velocityJ: { ...b.vel },
            supportI: a.support!.state, supportJ: b.support!.state,
            height: clamp(Math.min(this.padHeight[i], this.padHeight[j]), 0,
              Math.min(a.profile.heightYd, b.profile.heightYd)) } };
        if (this.handContact === 'patch') this.contactPatch(row);
        out.push(row);
      }
    }
    return out;
  }

  /** One point between the bodies, weighted by their torso radii. Nominal
   * surface radii alone describe two different points during overlap. The
   * frozen collision normal may also be oblique to current centers after a
   * sweep or travel; normal impulses then have real moments as well. */
  private contactPatch(c: Contact): void {
    const a = this.bodies[c.i], b = this.bodies[c.j];
    const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
    const share = a.profile.radius / (a.profile.radius + b.profile.radius);
    const normalArm = -dx * c.ny + dy * c.nx;
    const tangentArm = dx * c.nx + dy * c.ny;
    c.ni = share * normalArm; c.nj = (1 - share) * normalArm;
    c.ri = share * tangentArm; c.rj = (1 - share) * tangentArm;
    const inverseMass = 1 / this.mass[c.i] + 1 / this.mass[c.j];
    c.mn = 1 / (inverseMass + c.ni * c.ni / this.inertia[c.i] + c.nj * c.nj / this.inertia[c.j]);
    c.mt = 1 / (inverseMass + c.ri * c.ri / this.inertia[c.i] + c.rj * c.rj / this.inertia[c.j]);
  }

  private solveContact(c: Contact, soft: Softness, relax = false): void {
    const a = this.bodies[c.i], b = this.bodies[c.j];
    const ima = 1 / this.mass[c.i], imb = 1 / this.mass[c.j];
    const av = a.vel, bv = b.vel;
    let vn = (bv.x - av.x) * c.nx + (bv.y - av.y) * c.ny;
    if (this.handContact === 'patch') vn += (a.spin ?? 0) * c.ni + (b.spin ?? 0) * c.nj;
    const imp = relax || c.guard ? -c.mn * (vn + c.bias) : -c.mn * soft.massScale * (vn + c.bias) - soft.impulseScale * c.ln;
    const ln = Math.max(0, c.ln + imp);
    const dn = ln - c.ln;
    c.ln = ln;
    av.x -= c.nx * dn * ima; av.y -= c.ny * dn * ima;
    bv.x += c.nx * dn * imb; bv.y += c.ny * dn * imb;
    if (this.handContact === 'patch') {
      a.spin = (a.spin ?? 0) + c.ni * dn / this.inertia[c.i];
      b.spin = (b.spin ?? 0) + c.nj * dn / this.inertia[c.j];
    }
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
      // Sustained hands and patch grips act at their force midpoint. Freeze
      // the frame at the same centered transport used for achieved joint
      // travel, rather than applying a sideways force at two different COMs.
      // All rows read the pre-solve velocities; solver corrections cannot
      // manufacture another patch or rotate the frame during this interval.
      let dx = point.x - a.pos.x, dy = point.y - a.pos.y;
      let px = 0, py = 0; // Material offset from the body's force-midpoint center.
      const upperPatch = jt.kind === 'grasp' && jt.legs <= 0 && this.handContact === 'patch';
      const lowerPatch = jt.kind === 'grasp' && !!this.attachments.get(jt)?.material && this.handContact === 'patch';
      if ((jt.kind === 'hands' || upperPatch || lowerPatch) && this.handContact === 'patch' && this.handIntegration === 'centered') {
        // Ground, strikes and reels are finite forces over this interval.
        // Use their achieved mean travel, as position integration does,
        // rather than locating the patch with their full end velocity.
        dx += .5 * h * (b.vel.x - .5 * this.amx[j] * h + this.travelAdjustX[j]
          - a.vel.x + .5 * this.amx[i] * h - this.travelAdjustX[i]);
        dy += .5 * h * (b.vel.y - .5 * this.amy[j] * h + this.travelAdjustY[j]
          - a.vel.y + .5 * this.amy[i] * h - this.travelAdjustY[i]);
      }
      if (jt.kind === 'hands' && jt.contact) {
        if (this.handContact !== 'patch') throw new RangeError('Material hand contacts require the common patch solve');
        if (jt.contact.on !== 'a' && jt.contact.on !== 'b') throw new RangeError('Hand contact must name one of its bodies');
        const target = jt.contact.on === 'a' ? a : b;
        const local = jt.contact.local;
        if (!Number.isFinite(local.x) || !Number.isFinite(local.y)
          || Math.hypot(local.x, local.y) > target.profile.radius + 1e-10)
          throw new RangeError('Hand contact must be a finite point within the target torso');
        // The point remains on the body. Its force-midpoint orientation is a
        // second-order approximation; it is not teleported by the controller.
        const theta = target.facing - .5 * h * (target.spin ?? 0);
        px = Math.cos(theta) * local.x - Math.sin(theta) * local.y;
        py = Math.sin(theta) * local.x + Math.cos(theta) * local.y;
        const sign = jt.contact.on === 'b' ? 1 : -1;
        dx += sign * px; dy += sign * py;
      }
      const dist = Math.hypot(dx, dy);
      const nx = dist > 1e-8 ? dx / dist : 1, ny = dist > 1e-8 ? dy / dist : 0;
      const appliedHeight = jt.height ?? (jt.kind === 'grasp'
        ? this.comHeight[j] * (1 - .55 * clamp(jt.legs, 0, 1)) : Math.min(this.padHeight[i], this.padHeight[j]));
      const observed = jt.firstApplied ?? this.jointSnapshot(jt, h, nx, ny, appliedHeight);
      const row: JointRow = { joint: jt, observed, i, j, nx, ny, mn: 1 / (1 / this.mass[i] + 1 / this.mass[j]),
        mode: 0, c: 0, ln: 0, lt: 0, limit: 0, pushLim: 0, holdLim: 0, steerLim: 0,actor: i,steerActor: i,reel: 0 };
      if (jt.kind === 'hands' || upperPatch || lowerPatch) {
        // The effective patch lies between the bodies, weighted by their
        // torso radii. At touching distance these are the pad-surface arms;
        // extended hands use the same single reduced patch, not two joints.
        if (this.handContact === 'patch') {
          const radius = a.profile.radius + b.profile.radius;
          let rax = dx * a.profile.radius / radius, ray = dy * a.profile.radius / radius;
          let rbx = -dx * b.profile.radius / radius, rby = -dy * b.profile.radius / radius;
          if (jt.kind === 'hands' && jt.contact?.on === 'b') { rax = dx; ray = dy; rbx = px; rby = py; }
          if (jt.kind === 'hands' && jt.contact?.on === 'a') { rax = px; ray = py; rbx = -dx; rby = -dy; }
          if (lowerPatch) { rax = dx; ray = dy; rbx = point.x-b.pos.x; rby = point.y-b.pos.y; }
          row.ni = -(rax * ny - ray * nx);
          row.nj = rbx * ny - rby * nx;
          row.ri = rax * nx + ray * ny;
          row.rj = -(rbx * nx + rby * ny);
          row.mn = 1 / (1 / this.mass[i] + 1 / this.mass[j]
            + row.ni * row.ni / this.inertia[i] + row.nj * row.nj / this.inertia[j]);
          row.bodyInverseMass = 1 / row.mn;
          row.mt = 1 / (1 / this.mass[i] + 1 / this.mass[j]
            + row.ri * row.ri / this.inertia[i] + row.rj * row.rj / this.inertia[j]);
        }
      }
      if (jt.kind === 'hands') {
        row.actor=row.steerActor=this.indexOf(jt.actor??jt.a);
        const holder=this.indexOf(jt.holder??jt.a),scale=this.armScale[row.actor];
        row.pushLim = Math.max(0, jt.push) * h * scale;
        row.holdLim = Math.max(0, jt.hold) * h * this.armScale[holder];
        row.steerLim = Math.max(0, jt.steer) * h * scale;
        const c = dist - jt.extension;
        if (c < 0) { row.mode = 1; row.c = c; }
        else if (c > HANDS_SLACK) { row.mode = -1; row.c = c - HANDS_SLACK;row.actor=holder; }
        if (HAND_MOTOR) {
          // Arms move no faster than they can; a motor needs the hands on.
          if (jt.drive && row.steerLim > 0) row.drive = clamp(jt.drive, -ARM_SPEED, ARM_SPEED);
          if (jt.shove && jt.shove > 0 && c <= HANDS_SLACK && row.pushLim > 0) {
            row.shove = Math.min(jt.shove, ARM_SPEED);
            if (row.mode !== 1) { row.mode = 1; row.c = Math.min(0, c); row.actor = this.indexOf(jt.actor ?? jt.a); }
          }
        }
        if (this.handContact === 'patch') {
          // Splitting one connection into two half-cap hands must not double
          // its spring stiffness. Separate material points remain separate.
          const same = rows.find(r => {
            const old = r.joint;
            return old.kind === 'hands' && old.a === a && old.b === b
              && (old.actor ?? a) === (jt.actor ?? a) && (old.holder ?? a) === (jt.holder ?? a)
              && old.extension === jt.extension && old.height === jt.height
              && old.contact?.on === jt.contact?.on
              && old.contact?.local.x === jt.contact?.local.x && old.contact?.local.y === jt.contact?.local.y;
          });
          if (same) {
            same.pushLim += row.pushLim; same.holdLim += row.holdLim; same.steerLim += row.steerLim;
            same.handMembers!.push(jt); continue;
          }
          row.handMembers = [jt];
        }
      } else {
        // The arms hold where they are; a holder off his feet keeps most of
        // his grip (he hangs on).
        const hold = jt.hold ?? dist;
        jt.hold = hold;
        row.mode = -1;
        row.c = Math.max(0, dist - hold);
        row.limit = this.gripCapacity(jt)*h;
        if (jt.brace !== undefined && dist <= jt.brace) {
          row.mode = 1;
          row.c = dist - jt.brace;
          row.pushLim = Math.min(this.gripCapacity(jt), this.armCap[i]) * this.armScale[i] * h;
        }
        row.reel = this.reels.get(jt)??0;
        const foot = b.support!.foot;
        if (foot && !lowerPatch) row.mn = 1 / supportInverseMass(1 / this.mass[i] + 1 / this.mass[j], foot, recoveryShare(jt), h);
        if (foot && this.attachments.get(jt)?.bounded) {
          const inverseBodyMass = 1 / this.mass[i] + 1 / this.mass[j];
          row.mn = 1 / ((row.bodyInverseMass ?? inverseBodyMass) + this.attachmentMobility(jt,nx,ny) / h);
          row.mt = 1 / ((lowerPatch ? 1/row.mt! : inverseBodyMass) + this.attachmentMobility(jt,-ny,nx) / h);
        }
        if (foot && lowerPatch && !this.attachments.get(jt)?.bounded) {
          row.mn = 1 / (row.bodyInverseMass! + this.attachmentMobility(jt,nx,ny) / h);
          row.mt = 1 / (1/row.mt! + this.attachmentMobility(jt,-ny,nx) / h);
        }
        if (foot || upperPatch || jt.brace !== undefined) {
          // Duplicating the same physical attachment must not create another
          // spring, motor or grip capacity. Distinct locations stay distinct.
          const same = rows.find(r => {
            const old = r.joint;
            return old.kind === 'grasp' && old.a === jt.a && old.b === jt.b
              && old.legs === jt.legs && recoveryShare(old) === recoveryShare(jt) && old.height === jt.height && old.reach === jt.reach
              && old.brace === jt.brace
              && old.ground === jt.ground && old.hold === jt.hold && old.pull === jt.pull
              && Math.hypot(this.graspPoint(old).x - point.x, this.graspPoint(old).y - point.y) < 1e-10
              && (!this.boundedAttachment || this.sameAttachmentJacobian(old,jt));
          });
          if (same) {
            same.limit += row.limit; same.reel += row.reel; same.pushLim += row.pushLim;
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
      const vn = (b.vel.x - a.vel.x) * r.nx + (b.vel.y - a.vel.y) * r.ny
        + (r.ni ?? 0) * (a.spin ?? 0) + (r.nj ?? 0) * (b.spin ?? 0);
      const bias = r.mode > 0 ? Math.max(soft.biasRate * r.c, -MAX_PUSHOUT) : Math.min(soft.biasRate * r.c, MAX_PUSHOUT);
      // A shove asks the compressive arms for a separating speed, not just
      // for the bodies not to close inside the lockout.
      const error = r.mode > 0 && r.shove ? Math.min(vn + bias, vn - r.shove) : vn + bias;
      const imp = -r.mn * soft.massScale * error - soft.impulseScale * r.ln;
      const ln = r.mode > 0 ? clamp(r.ln + imp, 0, r.pushLim) : clamp(r.ln + imp, -r.holdLim, 0);
      const dn = ln - r.ln;
      const fraction=this.pairImpulse(r.i,r.j,r.nx*dn,r.ny*dn,r.actor,'hands',true,r.normalWork??={net:0},
        (r.ni ?? 0) * dn, (r.nj ?? 0) * dn, r.mode > 0 ? this.pressUnits(r.actor) : 1);
      r.ln+=dn*fraction;
    }
    if (r.steerLim > 0) this.solveTangent(r, a, b, r.steerLim);
  }

  /** Patch reel and passive grip share a frozen force point and one budget.
   * Deliver active work separately, but transport their total attained load
   * together. No second arm strength or motor is introduced. */
  private reelPatchGrasp(r: JointRow, h: number): void {
    const jt = r.joint as GraspJoint;
    if (jt.brace !== undefined || !(jt.pull! > 0) || jt.a.support!.state !== 'up') return;
    const point = this.graspPoint(jt);
    const distance = Math.hypot(point.x - jt.a.pos.x, point.y - jt.a.pos.y);
    if (distance <= CONTACT_SCALE * (jt.a.profile.radius + jt.b.profile.radius) || distance > jt.reach) return;
    const rv = this.graspVelocity(jt);
    const vn = rv.x*r.nx + rv.y*r.ny
      + (r.ni ?? 0) * (jt.a.spin ?? 0) + (r.nj ?? 0) * (jt.b.spin ?? 0);
    const coupled = !!jt.b.support!.foot && jt.legs > 0;
    const demand = (r.bodyInverseMass ?? 1/r.mn)*this.tickDt + (coupled ? this.attachmentMobility(jt,r.nx,r.ny) : 0);
    const wanted = Math.max(0, vn + Math.min(ARM_SPEED, jt.pull!)) / demand;
    // Arm allocation saw each numerical member. Recombine that allocation
    // once for the physical row, as we do its grip cap and compliance.
    const armCapacity = this.armCap[r.i] * this.armScale[r.i] * (r.members?.length ?? 1);
    const impulse = Math.min(wanted, armCapacity, r.limit / h) * h;
    const fraction = coupled ? this.supportImpulse(jt, -r.nx*impulse, -r.ny*impulse, h, true, undefined,
      -(r.ni ?? 0)*impulse, -(r.nj ?? 0)*impulse)
      : this.pairImpulse(r.i, r.j, -r.nx * impulse, -r.ny * impulse, r.i, 'grasps', true, undefined,
        -(r.ni ?? 0) * impulse, -(r.nj ?? 0) * impulse);
    r.reel = impulse * fraction;
    for (const member of r.members ?? [jt]) {
      const share = r.members ? r.limit > 0 ? this.gripCapacity(member) * h / r.limit : 0 : 1;
      member.normalForce = (member.normalForce ?? 0) - r.reel * share;
      member.normalForceOnB!.x -= r.nx * r.reel * share;
      member.normalForceOnB!.y -= r.ny * r.reel * share;
      if (r.reel * share > 0) {
        member.firstApplied ??= r.observed;
        member.achievedContactHeight = r.observed.height;
      }
    }
    this.report.armImpulse[r.i] += r.reel;
    this.addLoad(r.i, r.j, r.nx, r.ny, -r.reel, 0, jt.height ?? this.comHeight[r.j]*(1-.55*clamp(jt.legs,0,1)), jt.legs>0);
  }

  private jointSnapshot(jt: Joint, h: number, nx: number, ny: number, height: number): ContactSnapshot {
    const a = jt.a, b = jt.b;
    return { time: this.time, intervalEnd: this.time + h, normal: { x: nx, y: ny },
      positionI: { ...a.pos }, positionJ: { ...b.pos }, facingI: a.facing, facingJ: b.facing,
      velocityI: { ...a.vel }, velocityJ: { ...b.vel }, supportI: a.support!.state,
      supportJ: b.support!.state, height: clamp(height, 0, Math.min(a.profile.heightYd, b.profile.heightYd)) };
  }

  private solveGrasp(r: JointRow, soft: Softness, h: number): void {
    const a = this.bodies[r.i], b = this.bodies[r.j];
    const ima = 1 / this.mass[r.i], imb = 1 / this.mass[r.j];
    const jt = r.joint as GraspJoint, rv = this.graspVelocity(jt);
    const vn = rv.x * r.nx + rv.y * r.ny
      + (r.ni ?? 0) * (a.spin ?? 0) + (r.nj ?? 0) * (b.spin ?? 0);
    if (b.support!.foot && jt.legs > 0) {
      // Preserve the spring/damper's body-derived physical stiffness. Merely
      // replacing mass while retaining its Hz softness makes the grasp's
      // transmitted force vanish as h approaches zero.
      const ratio = 1 / (r.mn * (ima + imb));
      const a2 = (1 - soft.impulseScale) / soft.impulseScale * ratio;
      soft = { ...soft, massScale: a2 / (1 + a2), impulseScale: 1 / (1 + a2) };
    }
    // Ordinary grasps are tension-only. An explicitly acquired brace can
    // resist compression at finite arm force; it cannot exclude body impact.
    const imp = -r.mn * soft.massScale * (vn + soft.biasRate * r.c) - soft.impulseScale * r.ln;
    const compression = jt.brace !== undefined && r.mode > 0;
    let ln = compression ? Math.max(0, r.ln + imp) : Math.min(0, r.ln + imp);
    // Shared grip budget with the sliding (tangential) resistance.
    const lim = r.limit;
    const passiveNormal=Math.max(0,Math.sqrt(Math.max(0,lim*lim-r.lt*r.lt))-r.reel);
    ln=compression ? Math.min(ln,passiveNormal,r.pushLim) : Math.max(ln,-passiveNormal);
    const dn = ln - r.ln;
    const coupled = !!b.support!.foot && jt.legs > 0;
    const channel=r.normalWork??={net:0};
    const fraction=coupled?this.supportImpulse(jt,r.nx*dn,r.ny*dn,h,false,channel, (r.ni ?? 0)*dn, (r.nj ?? 0)*dn)
      :this.pairImpulse(r.i,r.j,r.nx*dn,r.ny*dn,r.actor,'grasps',false,channel,
        (r.ni ?? 0) * dn, (r.nj ?? 0) * dn);
    r.ln+=dn*fraction;
    const tangentLimit = Math.sqrt(Math.max(0, lim * lim - (r.ln-r.reel)**2));
    if (coupled) {
      const rv = this.graspVelocity(jt), tx = -r.ny, ty = r.nx;
      const vt = rv.x * tx + rv.y * ty - (r.ri ?? 0)*(a.spin ?? 0) - (r.rj ?? 0)*(b.spin ?? 0);
      const lt = clamp(r.lt - (r.mt ?? r.mn) * vt, -tangentLimit, tangentLimit), dt = lt - r.lt;
      r.lt += dt * this.supportImpulse(jt, tx * dt, ty * dt, h,false,r.tangentWork??={net:0}, -(r.ri ?? 0)*dt, -(r.rj ?? 0)*dt);
    } else this.solveTangent(r, a, b, tangentLimit);
  }

  /** Hands and holds couple the bodies' sideways motion directly; a grip
   * around a torso does not let him roll past like two touching pads. */
  private solveTangent(r: JointRow, a: Body, b: Body, lim: number): void {
    const ima = 1 / this.mass[r.i], imb = 1 / this.mass[r.j];
    const tx = -r.ny, ty = r.nx;
    const ri = r.ri ?? 0, rj = r.rj ?? 0;
    let vt = (b.vel.x - a.vel.x) * tx + (b.vel.y - a.vel.y) * ty;
    if (ri || rj) vt -= ri * (a.spin ?? 0) + rj * (b.spin ?? 0);
    // HAND_MOTOR: steering hands may drive toward a wanted tangential speed
    // (active arm work) rather than only braking slip (passive).
    const drive = r.joint.kind === 'hands' ? r.drive ?? 0 : 0;
    const lt = clamp(r.lt - (r.mt ?? r.mn) * (vt - drive), -lim, lim);
    const dt = lt - r.lt;
    const fraction=this.pairImpulse(r.i,r.j,tx*dt,ty*dt,drive ? r.steerActor : r.actor,r.joint.kind==='hands'?'hands':'grasps',!!drive,r.tangentWork??={net:0},
      -ri * dt, -rj * dt);
    r.lt+=dt*fraction;
  }
}
