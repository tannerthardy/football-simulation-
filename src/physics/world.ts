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
import { hypot2, angleDiff, clamp, type Vec2 } from '../core/vec.js';
import { bodyRadius } from './bodyshape.js';
import { commandFacing, legDriveFactor, trunkPrice, fatigueFactor, followAccel, locomotionAccel, spendEnergy, shouldersOf, PLANT_SPEED, TRUNK_TWIST, turnRateOf, updateSqueeze, updateTrunk, type Body, type MoveCommand } from './kinematics.js';
import { advanceRecovery, availability, legDrive, baseRadiusAt, comHeightAt, fallTime, newSupport, omega0, padHeightAt, recoverySpeed, supportParams, type Support, type SupportParams } from './support.js';
import { ARM_SPEED, turnBodyResponse, workFraction } from './actuation.js';
import { newVirtualFoot, recoveryRamp, supportInverseMass, supportVelocity, supportWorkChange } from './virtual-foot.js';
import { boundedAttachment, inverseBoundedAttachment, type BoundedAttachment } from './bounded-attachment.js';
import { integrateFilteredFollow } from './filtered-follow.js';

export interface Intent extends MoveCommand {
  /** 0–1 willingness to lean into a felt load with leg drive beyond free movement. */
  push?: number;
  /** Target pad level, 0 upright … 1 as low as he can get. */
  posture?: number;
  /** How far his lean may grow past the felt load (fraction; default the
   * legs' ordinary PUSH_GROWTH). 0 is an anchor: he leans only as hard as the
   * load he feels, so nothing is left over when it is taken away. */
  growth?: number;
  /** The most lean he is willing to commit into a felt load (kg·yd/s²; default unbounded): a request the lean law
   * reads, like `growth`, not a cap on an outcome. ANCHOR_BASE sets it from what his base could recover from. */
  leanCap?: number;
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
  /** OPEN_HANDS: fingers on cloth. Without it the hands push and slide
   * only: no tension, steer bounded by friction on the push. */
  grip?: boolean;
  /** RUSH_HANDS: where the hand sits across the man's chest from where it fitted (yd, along the joint's tangent),
   * its sliding speed, and whether it has come off him (an event: the edge of the surface it pressed on was passed). */
  handOffset?: number;
  handVel?: number;
  off?: boolean;
  /** RUSH_HANDS: hands on the man (2 when unset). With one off: push, hold and the arm's hold are one hand's; steer
   * resisting him toward the vacated side (`offSide`, the joint tangent's sign) is ONE_HAND_SIDE of the remaining
   * hand's. The turning moment about the remaining hand is not modelled (the production contact has no off-centre
   * point). */
  handsOn?: number;
  offSide?: number;
  /** RUSH_HANDS: the last step's normal force (the press a club must overcome). A plain field, so a World stays
   * structured-cloneable (lab tools and replay clone it). */
  lastN?: number;
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
  /** 0–1: how closed the arms' wrap is (the lock of the grip's force law).
   * Omission is an open grip (0). */
  lock?: number;
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
  /** TRUNK_TWIST: where each man's chest pointed (shoulders = hips + trunk); equal to facing with no twist. Readers that mean
   * the front of the body (a hit from behind, a receiver's back to a defender) read these; the gait and wraps read facing. */
  chestI?: number;
  chestJ?: number;
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
  /** GRASP_ARM_MOMENT: grasp-row yaw impulse not passed to holders' torsos (their arms swing), kg·yd²/s; unrepresented. */
  armSwingYaw: number;
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
export const PUSH_GROWTH = 0.25;
/** Time constant of the sensed load, s. */
const FEEL = 0.04;
const LEAN_RISE = 0.04;
const LEAN_DECAY = 0.15;
/** LEAN_PITCH (experimental, off): a committed lean is his COM held ahead of
 * his feet (offset = lean / (m·w0²)). The ankles move the pressure centre
 * across his base at once, so a lean up to the base radius is immediate; past
 * it the COM itself must pitch over planted feet, which it can do no faster
 * than an unopposed fall: offset' <= w0·offset. A sustained push is still met
 * in full once he has leaned to it; a load that vanishes releases only the
 * lean he really had. */
const LEAN_PITCH = process.env.LEAN_PITCH !== '0';
/** GRASP_ARM_MOMENT (experimental, off): a holder's hands are at the end of his
 * arms, not welded to his torso. The yaw moment a grasp row passes into the
 * holder's torso is bounded by what his shoulders can hold: his arm force
 * (strength-derived, supportParams.armForce, with fatigue) across the chest
 * half-span (CHEST_HALF), per substep. The rest swings his arms, which the
 * reduced model does not represent: that unpassed angular impulse is reported
 * (StepReport.armSwingYaw), not applied to anyone. Linear transfer is
 * unchanged, and the runner's side of the row is unchanged. */
const GRASP_ARM_MOMENT = process.env.GRASP_ARM_MOMENT !== '0';
const POSTURE_RATE = 2.5;
/** SCRATCH (Phase 2 test, not for landing): HAND_FREE=1 makes each man's hand height a free input (world.handDz). */
const HAND_FREE = process.env.HAND_FREE === '1' || process.env.HAND_FREE === '2';
const HAND_DYN = process.env.HAND_FREE === '2', DZ_LOW = Number(process.env.DZ_LOW ?? -0.2), DZ_HIGH = Number(process.env.DZ_HIGH ?? 0.1);
/** POSTURE_HOLD (experimental, off; POSTURE_HOLD=1; docs/reviews/2026-11-24-blocking-phase1-design.md section 3, docs/reviews/2026-11-24-blocking-phase1-bench.md).
 * DORMANT UNTIL PHASE 2: it does nothing at the lifts the pad geometry gives (0.06-0.2 body weights against about 1 body weight his legs hold), and it is not
 * to be tuned to bind; the stand-up waits for an arm with a force behind it. Two pieces, for a man in a live hands joint:
 *  - A hold. The vertical load the opponent's pad line puts on him (liftFelt, positive = lifting him) is carried by his legs at the knee angle,
 *    `HOLD_K x leg drive x (LEG_ANGLE_FLOOR + (1 - LEG_ANGLE_FLOOR) x posture) x fatigue` (the isometric knee torque-angle shape: peak near 70 degrees of flexion,
 *    Pincivero et al. 2004; a set lineman's best push has hip and knee near 120 degrees, Martin and Beckham 2020; the floor is a stated choice). Past that, the unheld
 *    part, as a share of his weight, moves his pads at up to POSTURE_RATE per second (stood up if the opponent is below him, sunk if he presses down); the full rate
 *    at an unheld share of HOLD_FULL of his weight. The work, lift force times pad height change, is charged to the opponent's energy (the lifter). The pair's vertical
 *    load stays equal and opposite (liftImp), so nothing is created.
 *  - A mobility cost, a stated choice (there is no force cost to playing low: posture 1.0 is already near the strongest angle): the leg drive of an engaged man across
 *    his facing is scaled by `1 - MOBILITY_COST x posture x sin^2(angle off his facing)` (MOBILITY_COST 0.3, a choice; `MOBILITY_COST=0` removes it), and the gait's cut factor
 *    by `1 - MOBILITY_COST x posture`, so a low man pushing straight on pays nothing. Not visible in the staged pair (the hands joint moves the pair as one block);
 *    it can show only in the whole-game gate (the engaged lateral move at 2 s).
 * Removed 2026-11-24 (Integration's ruling): a leg-force factor by posture for engaged men only: a special case that was not approved. */
const POSTURE_HOLD_ENV = process.env.POSTURE_HOLD ?? '0';
const POSTURE_HOLD = POSTURE_HOLD_ENV !== '0' && POSTURE_HOLD_ENV !== '';
const LEG_ANGLE_FLOOR = 0.7, HOLD_K = 1, HOLD_FULL = 0.25, MOBILITY_COST = Number(process.env.MOBILITY_COST ?? 0.3);
const legAngle = (posture: number): number => LEG_ANGLE_FLOOR + (1 - LEG_ANGLE_FLOOR) * posture;
const DEFAULT_POSTURE = 0.2;
const FALL_TIP = 3;
const FALL_FRICTION = 0.25;
const DOWN_FRICTION = 0.75;
/** DOWN_RISE_PLANT (on since engine-84; DOWN_RISE_PLANT=0 restores; docs/reviews/2026-11-18-down-slide.md): a free body starts to rise from the ground when the speed he would STAND at is one he can plant
 * at, not only after he has slid to rest. A rising body keeps sliding under DOWN_FRICTION, so he is up at v - DOWN_FRICTION g x getUp (8 yd/s going down: 0.75 yd/s after 0.9 s); the
 * bound is PLANT_SPEED (kinematics.ts: below it he has planted and can square to a new heading). Off, he waits to be under 0.3 yd/s: a diver at 8 yd/s slid 0.96 s before a rise whose own
 * friction would have stopped him in 0.9 s. Friction, the 0.3 s minimum in `down` and the get-up time are unchanged. Free bodies only: not the ball carrier (World.ballCarrier), not held
 * (a hold on his legs or a joint) and not carrying anyone's weight (HANG_LOAD); his spin must have settled (the footprint's edge speed under 0.3 yd/s, as the slide test). */
const DOWN_RISE_PLANT = process.env.DOWN_RISE_PLANT !== '0';
const FOLLOW_MARGIN = 1.1;
/** Experimental (HOLD_SUBSTEPS=n, off): minimum substeps while a grasp is live. */
const HOLD_SUBSTEPS = Number(process.env.HOLD_SUBSTEPS ?? 0);
/** Experimental active hand motor (HAND_MOTOR=1): HandJoint.drive and .shove. */
/** HAND_MOMENT (experimental, off; HAND_MOMENT=1): the press through the hands is bounded by the moment it puts on the pusher's own trunk. A force F through the
 * hands at reach L, along a line sin(theta) off his facing, loads his shoulders with F * L * sin(theta); the shoulders' hold is armForce * CHEST_HALF (the cap
 * GRASP_ARM_MOMENT already puts on a grasp's yaw), so the push cannot exceed armForce * fatigue * CHEST_HALF / (L * sin(theta)). Square in front of his chest
 * (theta near 0) it does not bind; locked out to the side at arm's length it does, which today draws on no base: a tackle running 4 yd/s holds 550 to 710 N on a
 * rusher driving at him. No new constant (CHEST_HALF and armForce are the model's). Push only; steer and hold are as built.
 * docs/reviews/2026-11-16-contact-law.md. */
const HAND_MOMENT = process.env.HAND_MOMENT === '1';
/** HAND_MOMENT: the shoulders' hold as a percentage of the borrowed armForce * CHEST_HALF (100 = as borrowed). A stated choice, 150, until a source for the chest's
 * sustained moment turns up: the lowest of the three levels read (100, 150, 200) at which a pusher square to his man (within about 10 degrees of his facing) is not bound
 * (docs/reviews/2026-11-16-hand-moment.md, "Capacity levels"); not fitted to an outcome. */
const HAND_MOMENT_CAP = (Number(process.env.HAND_MOMENT_CAP ?? 150) || 150) / 100;
const HAND_MOTOR = process.env.HAND_MOTOR === '1';
/** OPEN_HANDS (experimental, off; OPEN_HANDS=1 turns it on): two hand
 * states. Fingers on cloth (`HandJoint.grip`) keep the joint's push, hold and
 * steer limits: a grip inside the frame is ordinary, legal blocking. Open
 * hands push and slide; they do not pull or drag: no tension, and the
 * tangential (steering) force is bounded by friction on the compression they
 * carry, |T| <= HAND_MU * max(0, N). Who grips is the controller's
 * (engagement.ts `gripFor`): inside the frame, yes; once the man has left it,
 * the blocker lets go or hangs on.
 * Off, steering was bounded only by the arms (armForce x (0.15 + 0.55 control)
 * in engagement.ts), with or without anything pressing: behind an edge
 * rusher's hip 250-600 N dragged along his path with no compression under it,
 * and about 40% of run-rep and 30% of pass-rep steering force exceeded mu*N
 * (open-hands-share.mts; docs/reviews/2026-11-12-tackle-set.md). */
export const OPEN_HANDS = process.env.OPEN_HANDS !== '0';
/** Friction of an open hand on a jersey: 0.42, dynamic, natural dry skin on a
 * cotton-polyester fabric at about 15 N (Gerhardt et al. 2008, J R Soc
 * Interface 5:1317, PMC2607440; normally moist skin 0.53-0.61, wet fabric
 * 0.91). No glove-on-jersey measurement was found. A sourced constant, not
 * a setting: sensitivity reads edit it, they do not tune it. */
export const HAND_MU = 0.42;
/** RUSH_HANDS (experimental, off; RUSH_HANDS=1 turns it on): a blocker's hand is a one-degree-of-freedom body on
 * the hands joint, so an arm can be struck without shoving the torso behind it. A force on the hand (`handForce`,
 * delivered over its own contact time across however many substeps that spans) is resisted by the arm's lateral
 * hold: his steer capacity times the lever of his extension (bent arm / actual extension, so the hold falls smoothly
 * as he reaches), plus friction on the World's measured press (HAND_MU x N), plus a grip's hold under OPEN_HANDS.
 * The excess moves only the arm (ARM_MASS of his body: Winter's segment tables, upper arm 2.8%, forearm 1.6%,
 * hand 0.6%); the resisted part reaches his body through the shoulder; the striker pays the full reaction; the
 * arm's momentum returns to his body as it stops or comes off. The hand's hold, and the joint's limits, fall as it
 * nears the edge of what it presses on (the man's torso half-width: his collision radius; vertical is not
 * modelled), and past the edge it is off: no push, hold or steer until he re-fits (engagement.ts). With no force
 * on the hand it stays at 0 and every joint force is today's. */
export const RUSH_HANDS = process.env.RUSH_HANDS === '1';
export const ARM_MASS = 0.05;
/** RUSH_HANDS: with one hand off, the share of the remaining hand's steer left to resist the man toward the vacated
 * side (his body has to turn on the remaining hand to stop him there: most of it is lost). */
export const ONE_HAND_SIDE = 0.25;
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
/** Diagnostic scale (TURF_MU_SCALE, identity 1; not a law): multiplies the
 * turf traction cap, and the traction-capped leg drive, of a body held in a
 * hands joint (an engaged block). It measures how much of the engaged push
 * contest the unsourced TURF_MU = 1.1 carries
 * (docs/reviews/push-contest-traction.md). Never a promotion candidate. */
const TURF_MU_SCALE = Number(process.env.TURF_MU_SCALE ?? 1);
/** Steepest line of action credited, rise over run (about 30 degrees). */
const LEVERAGE_SLOPE = .6;
/** Knee height as a fraction of COM height (knee ~0.28, COM ~0.55 of stature). */
const KNEE = 0.5;
/** Peak hip-extension torque per kg of body mass, kg·yd²/s² per kg
 * (about 3.5 N·m/kg in sprinting and strength athletes; 1 N·m = 1.196). */
const HIP_TORQUE_PER_KG = 3.5 * 1.196;
/** Experimental (HIP_STRENGTH=1, off): hip torque scales with the player's
 * functional strength like his leg drive does (power = mass·(0.55 + 0.75·
 * strength), physical.ts), normalised to a mid-strength player (0.925), so
 * a strong runner's hips swing a held leg and brace a pull harder than a
 * weak one's of the same mass. Off, hip torque is mass alone. */
const HIP_STRENGTH = process.env.HIP_STRENGTH !== '0';
const HIP_REF_POWER_PER_KG = 0.55 + 0.75 * 0.5;
/** Share of a grounded holder's weight his arms carry on a leg hold: a body
 * resting on the ground at one end and held at the other carries half its
 * weight at each end. */
const HANG_SHARE = 0.5;
/** Experimental (HANG_AIRBORNE=1, off): a holder off his feet and not yet
 * landed (the World's 'falling' state) who still holds has all of his weight
 * on the hold, none on the turf; on landing ('down') half rests on the ground
 * (HANG_SHARE) as before. A grip broken mid-fall loads nothing from that tick.
 * Off, a falling holder hangs HANG_SHARE like a grounded one, so a rear leg
 * wrap by a diving chaser leaves the runner's stride free through the fall
 * (hang-bench.mts: legs 0.8, moment 225 against hip torque 368; whole weight
 * 450). docs/reviews/2026-11-12-wrap-at-speed.md (ii). */
const HANG_AIRBORNE = process.env.HANG_AIRBORNE === '1';
/** The share of a holder's weight hanging on his hold, by his support state. */
/** Experimental (HANG_GRIP=1, off; read with HANG_AIRBORNE): the hanging
 * weight goes through the hold. A hold carries a hanging holder's weight only
 * up to its grip capacity (gripCapacity, off-feet factor included); the
 * moment it passes to the runner's legs is that carried load times the lever.
 * Overloaded, his hands slide down the legs (the hold's leg share grows, a
 * lower hold) at HANG_SLIDE times the overloaded fraction, carrying their
 * capacity as they slide. At the ankles the foot arrests the closed share of
 * the wrap (capacity + lock x the hanging weight): a closed wrap holds there
 * with the longest lever on the stride (the shoestring); an open grip slips off
 * over the foot (a torn grip). The runner still tears any hold horizontally
 * by the grip's own slip. Attempt 1 tore every overloaded hold at the ankles
 * and broke 24% of tackles (off 6-7%). Off, the hanging weight binds the
 * stride whatever the grip, so a loose one-arm grab hangs as well as a locked
 * wrap (three-arm read: unlocked holds bound the stride in the fall 8-10 of
 * 10-11, locked 3-4 of 16-18). */
const HANG_GRIP = process.env.HANG_GRIP === '1';
/** Estimated (HANG_GRIP): how fast overloaded hands slide down a leg, yd/s
 * at full overload. Not fitted. */
const HANG_SLIDE = 1.5;
const hangShare = (state: string | undefined): number => state === 'up' ? 0 : HANG_AIRBORNE && state === 'falling' ? 1 : HANG_SHARE;
/** HANG_LOAD (experimental, off; HANG_LOAD=1 turns it on; docs/reviews/2026-11-17-hang-load.md): the hanging weight is one weight, carried once. The share of a
 * holder's weight his hold carries (hangShare, whatever its value) comes off his own turf normal force (his friction capacity, fr * G * m, is cut by it) and goes
 * onto the carrier: it adds to the normal load on his feet (liftImp, so his traction grows with it) and, hung at the torso's edge on the holder's side, it is an
 * off-centre load: its moment about his base, W r / (m H) as an equivalent horizontal acceleration at his centre of mass, displaces his capture point like any other
 * unfollowed load (tipX / tipY). Every unbroken grasp counts, upper-body holds included, once per holder and carrier. A falling man tied to a runner is dragged,
 * not toppling free, so FALL_TIP's forward drive (a free body's tip) does not apply to him. His horizontal inertia stays in the joint's two-body solve; the carrier's
 * own acceleration law does not take it a second time. FALL_FRICTION, DOWN_FRICTION and FALL_TIP are unchanged (unsourced). */
const HANG_LOAD = process.env.HANG_LOAD !== '0';
/** Experimental (HELD_SWING=1, off): a leg hold resists the leg's swing by
 * its grip whether or not the holder is on his feet, and the strides it binds
 * leave the runner's base behind his body (see the stride holds and
 * updateSupport). */
const HELD_SWING = process.env.HELD_SWING !== '0';
/** Experimental (SWING_STRIP=1, off; needs HELD_SWING): a swing is all or
 * nothing. The runner's hip either brings the held leg through the hands
 * (their moment about his hip below his hip torque: the leg swings and the
 * hands are pulled down it by the existing slip) or it does not (the stride
 * is bound in full). Hip flexion in early swing about equals extension in
 * late swing at sprint speed (Schache et al. 2011: 4.3 and 4.2 N·m/kg at
 * 8.95 m/s), so the one hip torque serves. Off, a weaker hold binds the
 * share total/hip of every stride. */
const SWING_STRIP = process.env.SWING_STRIP !== '0';
/** Experimental (SWING_FLEXION=1, off; with HELD_SWING): the swing has its own
 * hip action. Bracing the trunk against a hold's pull uses hip extension
 * (hipUsed, HIP_BRACE); bringing a held leg through uses hip flexion, a
 * separate torque of about the same size (Schache et al. 2011: 4.3 flexion,
 * 4.2 extension N·m/kg at 8.95 m/s). Off, the swing is compared with what
 * the brace leaves, and a hold pulling at capacity binds the stride in the
 * first substep (84-89% of game holds at 0.05 s). */
const SWING_FLEXION = process.env.SWING_FLEXION !== '0';
/** Experimental (LEGS_HELD=1, off; with HELD_SWING): a bound swing binds the
 * legs actually held. Each holder holds 1 + lock legs (an open hand one leg,
 * a closed wrap both), capped at two. One leg held: that leg's strides are
 * lost (half his drive along his path) but the free leg keeps stepping, so
 * his base is not left behind. Both legs: the stride is bound in full and
 * the base falls behind him, as without the flag. */
const LEGS_HELD = process.env.LEGS_HELD !== '0';
/** Experimental (HIP_BRACE=1, off): one hip budget for holds. A grasp on the
 * upper body (no leg share) is braced by the runner's hips like a thigh hold:
 * the moment of its transmitted force about his centre of mass (zero at that
 * height, growing with the grip's height above it, e.g. a shoulder or jersey
 * grip through GraspJoint.height) uses hip-extension torque up to its
 * capacity, and only the excess pitches him. The share of hip torque spent
 * bracing any hold, thigh or upper, then comes off his leg drive: the torque
 * that holds his trunk up against the pull is the torque that drives him.
 * Off, an upper grasp pitches him only through the point-mass tip and bracing
 * costs no drive. docs/reviews/effective-mass.md (unfinished holds). */
const HIP_BRACE = process.env.HIP_BRACE !== '0';
/** Default since run-ref-9 (HANDS_CHEST=0 restores): a block's hands push chest to chest. In
 * the centre-mode hands row the push acted along the line between the two
 * centres, so a fit landed off-centre pushed the man sideways as well as back
 * and the pair twisted apart (docs/reviews/effective-mass.md, step 2 attempt
 * two). Two hands spread on a chest push along that chest's normal while they
 * stay within its flat span. Each torso's shoulder line is a segment of
 * half-length CHEST_HALF across his facing; the row acts between the closest
 * points of the two segments, as for two capsules. Off, centre to centre. */
const HANDS_CHEST = process.env.HANDS_CHEST !== '0';
/** Experimental (GRASP_PATCH=1, off): in centre mode a tackler's grasp follows
 * the World's common-patch grasp law: its rows act at the grip point with lever
 * arms in the force-midpoint frame, and his arm pull (the reel) is applied at
 * that point inside the same frame, sharing the grip's budget. A held pair then
 * turns under the grip and can swing around instead of being held centre to
 * centre (replayed locked contacts: slip at +0.3 s 0.15 -> 1.83 yd/s, runner at
 * +0.5 s 1.32 -> 2.39, NFL 2.38). Every grasp without a material attachment;
 * hands and torso contacts stay on the centre law (HANDS_CHEST).
 * docs/reviews/effective-mass.md, step 2 (b). */
const GRASP_PATCH = process.env.GRASP_PATCH !== '0';
/** Flat half-span of a torso's front, yd: shoulder half-width with pads (0.27)
 * less chest half-depth (0.15); anthropometric estimate, as the capsule of
 * scripts/diag/effective-mass/shape.py. */
const CHEST_HALF = 0.27 - 0.15;
/** CHEST_SHOULDERS (experimental, off; CHEST_SHOULDERS=1, needs TRUNK_TWIST=1; lives with ENGAGE_TRUNK): a torso's chest
 * segment (the hands' chest points, HANDS_LEVER's and PAIR_HANDS' lever arms, TORSO_CAPSULE's shoulder line) lies across
 * where his chest points, his shoulders (hips plus the trunk twist), not across his hips. With no twist the two are the
 * same number, so an untwisted body is unchanged. Off, the segment lies across the hips (the gait heading) whatever the
 * trunk does: a blocker whose shoulders are on the man and hips on his set met the man with his hip line (Tools' and
 * Integration's review, 2026-11-14: on claude/trunk-stage1 shouldersOf reached only the report fields). */
export const CHEST_SHOULDERS = process.env.CHEST_SHOULDERS !== '0';
if (CHEST_SHOULDERS && !TRUNK_TWIST) throw new Error('CHEST_SHOULDERS=1 requires TRUNK_TWIST=1');
/** The heading the chest segment lies across (CHEST_SHOULDERS: the shoulders; off: the facing). */
const chestHeading = (b: Body): number => CHEST_SHOULDERS ? shouldersOf(b) : b.facing;
/** The chest segment's half-vector (CHEST_HALF long, across the chest heading); exported for its law test. */
export function chestHalf(b: Body): Vec2 { const f = chestHeading(b); return { x: -Math.sin(f) * CHEST_HALF, y: Math.cos(f) * CHEST_HALF }; }
/** Experimental (TORSO_CAPSULE=1, off): a torso is wider than it is deep. For
 * the pairs the owner names (World.capsulePair; PlaySim: the ball carrier and
 * a defender), the torso contact is between two capsules across each man's
 * facing (the shoulder line): half-width the body's radius, half-depth that
 * times TORSO_DEPTH. Contact is at the segments' closest points; the normal is
 * the direction between them (the shoulder's surface normal, not the line of
 * centres), and the row acts at the surface point with lever arms, so an
 * off-centre hit turns the bodies and leaves the closing as slip. Off, every
 * torso normal passes through both centres. docs/reviews/2026-11-10-torso-shape-plan.md. */
const TORSO_CAPSULE = process.env.TORSO_CAPSULE === '1';
/** Half-depth over half-width of a padded torso (0.15 / 0.27 yd: the same
 * anthropometric estimate as CHEST_HALF). */
const TORSO_DEPTH = 0.15 / 0.27;

/** TORSO_CAPSULE: closest points of the two shoulder-line segments and the row
 * geometry they give (normal from a to b, gap, and each body's arm to its
 * surface contact point). */
function capsuleGeom(a: Body, b: Body): { nx: number; ny: number; s: number; R: number; rax: number; ray: number; rbx: number; rby: number } {
  const da = a.profile.radius * TORSO_DEPTH, db = b.profile.radius * TORSO_DEPTH;
  const la = a.profile.radius - da, lb = b.profile.radius - db;
  const fa = chestHeading(a), fb = chestHeading(b);
  const ux = -Math.sin(fa), uy = Math.cos(fa), vx = -Math.sin(fb), vy = Math.cos(fb);
  const rx = b.pos.x - a.pos.x, ry = b.pos.y - a.pos.y;
  // Closest points of a.pos + sa·u (|sa| <= la) and b.pos + tb·v (|tb| <= lb).
  const uv = ux * vx + uy * vy, ur = ux * rx + uy * ry, vr = vx * rx + vy * ry, den = 1 - uv * uv;
  let sa = den > 1e-9 ? clamp((ur - uv * vr) / den, -la, la) : 0;
  let tb = clamp(uv * sa - vr, -lb, lb);
  sa = clamp(uv * tb + ur, -la, la);
  tb = clamp(uv * sa - vr, -lb, lb);
  const pax = a.pos.x + ux * sa, pay = a.pos.y + uy * sa, pbx = b.pos.x + vx * tb, pby = b.pos.y + vy * tb;
  let dx = pbx - pax, dy = pby - pay; let dist = hypot2(dx, dy);
  if (dist < 1e-8) { dx = rx; dy = ry; dist = hypot2(dx, dy) || 1; }
  const nx = dx / dist, ny = dy / dist, R = CONTACT_SCALE * (da + db);
  return { nx, ny, s: dist - R, R, rax: pax + nx * da - a.pos.x, ray: pay + ny * da - a.pos.y, rbx: pbx - nx * db - b.pos.x, rby: pby - ny * db - b.pos.y };
}
/** Experimental (CONTACT_LAYER=1, off): a compliant torso layer before the stiff core
 * (docs/reviews/effective-mass.md, step 1). Each torso carries a soft layer (pads,
 * tissue and arms yielding) of depth LAYER_DEPTH and stiffness LAYER_K; a pair's
 * layers act in series. Inside the layers the contact is that spring with damping
 * that grows with compression (Hunt-Crossley, LAYER_HC), so there is no damping
 * spike at first touch; beyond them the existing 9 Hz core takes over, continuous in
 * force. Off, every contact uses the single 9 Hz critically damped row. */
const CONTACT_LAYER = process.env.CONTACT_LAYER === '1';
/** Soft layer depth per torso, yd (about 6 cm of pad foam and tissue; estimate). */
const LAYER_DEPTH = 0.065;
/** Soft layer stiffness per torso, kg/s^2 (= N/m; about 100 kN/m; estimate, provisional). */
const LAYER_K = 1.0e5;
/** Hunt-Crossley damping, s/yd (0.3 s/m, a soft-tissue order of magnitude). */
const LAYER_HC = 0.3 * 0.9144;
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
  /** CONTACT_LAYER: this row's own softness (depth-dependent law). */
  soft?: Softness;
  /** TORSO_CAPSULE: the row's geometry is the capsules', with lever arms. */
  capsule?: boolean;
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
  /** RUSH_HANDS: one hand off, the vacated side's tangent sign (0 for none): steer resisting motion that way is cut. */
  steerSide?: number;
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
  if (leanX === 0 && leanY === 0) return 0;
  const mag = hypot2(leanX, leanY);
  if (mag <= 1e-6) return 0;
  const hx = leanX / mag, hy = leanY / mag;
  const balanced = Math.max(0, -(b.support!.felt.x * hx + b.support!.felt.y * hy));
  const unsupported = mag - balanced * (1 + PUSH_GROWTH);
  if (unsupported <= 0) return 0;
  const env = followAccel(b, { x: hx * 1e3, y: hy * 1e3 }, plan.cut, capacity);
  const absorb = Math.max(0, hypot2(env.x, env.y) - Math.max(0, plan.ax * hx + plan.ay * hy)) * mass;
  return Math.min(mag, Math.max(0, unsupported - absorb));
}

/** Gait gets the budget first; lean fills what is left; the attained net is
 * then rechecked. Writes [gait x, gait y, lean x, lean y, gait scale] to out.
 * Opposing gait and lean can leave a positive lean share after gait alone is
 * clipped to the cap, so the net is scaled back to the cap: no ground force
 * beyond traction, even at zero traction. Exported for the law test. */
/** HANDS_CHEST: the vector from a's shoulder line to b's at their closest
 * points (segments of half-length CHEST_HALF across each man's facing). */
function chestPoints(a: Body, b: Body): Vec2 {
  const { x: ux, y: uy } = chestHalf(a);
  const { x: vx, y: vy } = chestHalf(b);
  // Segments p(s) = a + s u, q(t) = b + t v, s, t in [-1, 1].
  const rx = a.pos.x - b.pos.x, ry = a.pos.y - b.pos.y;
  const uu = ux * ux + uy * uy, vv = vx * vx + vy * vy, uv = ux * vx + uy * vy;
  const ur = ux * rx + uy * ry, vr = vx * rx + vy * ry;
  const den = uu * vv - uv * uv;
  let sa = den > 1e-12 ? clamp((uv * vr - ur * vv) / den, -1, 1) : 0;
  let tb = clamp((uv * sa + vr) / vv, -1, 1);
  sa = clamp((uv * tb - ur) / uu, -1, 1);
  tb = clamp((uv * sa + vr) / vv, -1, 1);
  return { x: b.pos.x + tb * vx - (a.pos.x + sa * ux), y: b.pos.y + tb * vy - (a.pos.y + sa * uy) };
}

export function allocateGroundForce(out: Float64Array, lx: number, ly: number,
  leanX: number, leanY: number, cap: number): Float64Array {
  let px = leanX, py = leanY, r = 1;
  const tfx = lx + leanX, tfy = ly + leanY;
  if (tfx * tfx + tfy * tfy > cap * cap) {
    const qa = px * px + py * py, qb = lx * px + ly * py, qc = lx * lx + ly * ly - cap * cap;
    const scale = qa > 1e-12 ? clamp((-qb + Math.sqrt(Math.max(0, qb * qb - qa * qc))) / qa, 0, 1) : 0;
    px *= scale; py *= scale;
    if (qc > 0) {
      r = cap / Math.max(1e-9, hypot2(lx, ly));
      lx *= r; ly *= r;
    }
    // Recheck the attained net after clipping gait separately from lean.
    const attained = hypot2(lx + px, ly + py);
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
  /** TORSO_CAPSULE: the body pairs whose torso contact uses the capsule (set by the owner). */
  capsulePair: ((a: Body, b: Body) => boolean) | null = null;
  /** The ball carrier's body (owner-supplied: PlaySim), for the rules that treat him apart (DOWN_RISE_PLANT). */
  ballCarrier: (() => Body | null) | null = null;
  /** World clock, seconds (the owner may set it to keep a shared clock). */
  time = 0;
  /** Fixed substep count for convergence studies; adaptive when unset. */
  substeps?: number;
  private readonly index = new Map<Body, number>();
  /** Technique impulses queued for the next step: equal and opposite between two bodies. */
  private handForces: Array<{ jt: HandJoint; from: Body; fx: number; fy: number; t0: number; t1: number }> = [];
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
  /** LEGS_HELD: the share of his stride that leaves the base behind (both legs held). */
  private readonly baseHolds: Float64Array;
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
  /** HANG_LOAD: the share of body i's weight his hold carries this substep (0 when he is up or holds no one). */
  private readonly hangCarried: Float64Array;
  /** HANG_LOAD: the mass hanging on body i's holds (kg), as carried by his legs. */
  private readonly hangMass: Float64Array;
  private readonly liftFelt: Float64Array;
  /** SCRATCH: each man's hand height above the opponent's pads, yd (HAND_FREE). */
  handDz!: Float64Array;
  private readonly v0x: Float64Array;
  private readonly v0y: Float64Array;
  private readonly facing0: Float64Array;
  private readonly amx: Float64Array;
  private readonly amy: Float64Array;
  private readonly alpha: Float64Array;
  /** GRASP_ARM_MOMENT: yaw impulse passed into each holder this substep, and that substep's time stamp. */
  private readonly armYaw: Float64Array;
  private readonly armYawTime: Float64Array;
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
    this.fat = f(); this.impX = f(); this.impY = f(); this.tripX = f(); this.tripY = f(); this.strideHolds = f(); this.baseHolds = f(); this.hipUsed = f(); this.thighX = f(); this.thighY = f();
    this.travelVx = f(); this.travelVy = f();
    this.travelAdjustX = f(); this.travelAdjustY = f();
    this.tipX = f(); this.tipY = f(); this.braceX = f(); this.braceY = f();
    this.handDz = f();
    this.comHeight = f(); this.padHeight = f(); this.liftImp = f(); this.liftFelt = f(); this.hangCarried = f(); this.hangMass = f();
    this.v0x = f(); this.v0y = f(); this.facing0 = f(); this.amx = f(); this.amy = f(); this.alpha = f(); this.cut = f(); this.armYaw = f(); this.armYawTime = f().fill(NaN);
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
  /** RUSH_HANDS: a force (kg*yd/s^2, world frame) on joint `jt`'s hand from body `from`, acting between world
   * times t0 and t1 (its contact time). Only the component along the joint's tangent moves the hand; the rest is an
   * ordinary push between the bodies. */
  handForce(jt: HandJoint, from: Body, f: Vec2, t0: number, t1: number): void {
    if (!RUSH_HANDS || !(t1 > t0) || !Number.isFinite(f.x + f.y)) return;
    this.handForces.push({ jt, from, fx: f.x, fy: f.y, t0, t1 });
  }

  /** RUSH_HANDS: the arm's lateral hold at the hand (force), from its extension, the measured press and a grip. */
  handHold(jt: HandJoint): number {
    const owner = jt.a, target = jt.b;
    const arm = Math.max(0.3, (owner.profile.reach - 0.25) / 0.85), bent = 0.25 * arm;
    const ext = Math.max(bent, jt.extension - owner.profile.radius - target.profile.radius);
    const press = Math.max(0, jt.lastN ?? 0);
    const grip = OPEN_HANDS ? (jt.grip ? Math.max(0, jt.hold) : 0) : Math.max(0, jt.hold);
    return (Math.max(0, jt.steer) * bent / ext + HAND_MU * press + grip) * this.handEdge(jt) * ((jt.handsOn ?? 2) === 1 ? 0.5 : 1);
  }

  /** RUSH_HANDS: 1 with the hand where it fitted, falling to 0 at the edge of the man's torso. */
  handEdge(jt: HandJoint): number {
    const u = (jt.handOffset ?? 0) / Math.max(1e-6, jt.b.profile.radius);
    return Math.max(0, 1 - u * u);
  }

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
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, d = hypot2(dx, dy);
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
      maxLeanReleaseResidual: 0, maxLeanReleaseIterations: 0, armSwingYaw: 0, leanRelease: bs.map(reportVector),
      supportMotorWork: reportZeros(n), supportMotorWorkLimit: reportZeros(n), passiveGraspWork: 0,
      maxHeldRecoveryExcursion: 0, lowerHoldReleases: 0,
      impactSplits: 0, impactSplitLimitHits: 0, maxSupportIntegrationError: 0, supportIntegrationFailures: 0 };
    this.report = report; this.tickDt = dt;
    // TRUNK_TWIST: the shoulders follow the look each body asked for, within the range, before the gait is planned.
    if (TRUNK_TWIST) for (let i = 0; i < n; i++) updateTrunk(bs[i], intents[i]?.look, dt);
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
      if (l && sup.state === 'up' && hypot2(l.x, l.y) > 1e-6) sup.strike = { x: l.x, y: l.y };
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
    if (pairs.size) pairs.clear();
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
      spendEnergy(b, { x: plan.ax + lx / this.mass[i], y: plan.ay + ly / this.mass[i] }, hypot2(lx, ly) / Math.max(1, this.sp[i].pushForce), activeTime, plan.actionWork, velocity);
    }
    report.contacts = [...pairs.values()];
    this.pending = [];
    if (RUSH_HANDS) this.handForces = this.handForces.filter(f => f.t1 > this.time + 1e-12 && this.joints.includes(f.jt));
    for (const j of this.joints) {
      if (j.kind === 'hands') {
        j.normalForce = (j.normalForce ?? 0) / dt; j.tangentForce = (j.tangentForce ?? 0) / dt;
        if (RUSH_HANDS) j.lastN = j.normalForce;
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
    return a.support!.state==='up' && hypot2(a.pos.x-b.pos.x,a.pos.y-b.pos.y)<=a.profile.reach+b.profile.radius;
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
        this.active[actor]+=hypot2(Math.max(press,actor===holder?jt.hold:0),Math.max(0,jt.steer));
        if(actor!==holder)this.active[holder]+=Math.max(0,jt.hold);
      }
      else if (!jt.broken) {
        const holder = this.indexOf(jt.a);
        if (jt.brace !== undefined) this.active[holder] += Math.min(this.gripCapacity(jt), this.armCap[holder]);
        else if (jt.pull! > 0) this.active[holder] += this.armCap[holder];
      }
    }
    for (const p of this.pending) if(this.canStrike(p.a,p.b)) this.active[this.indexOf(p.a)]+=hypot2(p.x,p.y)/this.tickDt;
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
  /** RUSH_HANDS: one substep of every struck or sliding hand (see RUSH_HANDS). Momentum is conserved: the striker
   * pays the force; the arm takes the excess over the hold; the blocker's body takes the resisted part, and the
   * arm's momentum when it stops or comes off. */
  private stepHands(h: number): void {
    const t0 = this.time, t1 = this.time + h;
    for (const jt of this.joints) {
      if (jt.kind !== 'hands' || jt.off) continue;
      const forces = this.handForces.filter(f => f.jt === jt && f.t1 > t0 && f.t0 < t1);
      if (!forces.length && !jt.handVel) continue;
      const ia = this.indexOf(jt.a), ib = this.indexOf(jt.b);
      if (ia < 0 || ib < 0) continue;
      const dx = jt.b.pos.x - jt.a.pos.x, dy = jt.b.pos.y - jt.a.pos.y, d = hypot2(dx, dy) || 1;
      const nx = dx / d, ny = dy / d, tx = -ny, ty = nx;
      const mArm = ARM_MASS * this.mass[ia];
      let ft = 0;
      for (const f of forces) {
        const share = (Math.min(f.t1, t1) - Math.max(f.t0, t0)) / h;
        const fn = (f.fx * nx + f.fy * ny) * share, fT = (f.fx * tx + f.fy * ty) * share;
        ft += fT;
        // The normal part is an ordinary push between the striker and the hand's owner.
        const is = this.indexOf(f.from);
        if (is >= 0 && is !== ia && fn) this.pairImpulse(is, ia, nx * fn * h, ny * fn * h, is, 'strikes');
        // The striker's reaction to the tangential part (his arm pushes the blocker's arm).
        if (is >= 0 && fT) { this.bodies[is].vel.x -= tx * fT * h / this.mass[is]; this.bodies[is].vel.y -= ty * fT * h / this.mass[is]; }
      }
      const H = this.handHold(jt);
      let v = jt.handVel ?? 0, resisted: number;
      if (Math.abs(v) < 1e-9) resisted = Math.abs(ft) <= H ? ft : Math.sign(ft) * H;
      else resisted = Math.sign(v) * H;
      let v1 = v + (ft - resisted) * h / mArm;
      if (Math.abs(v) >= 1e-9 && Math.sign(v1) !== Math.sign(v) && Math.abs(ft) <= H) { resisted = ft + v * mArm / h; v1 = 0; }
      // The blocker's body takes the resisted part through his shoulder.
      this.bodies[ia].vel.x += tx * resisted * h / this.mass[ia]; this.bodies[ia].vel.y += ty * resisted * h / this.mass[ia];
      jt.handOffset = (jt.handOffset ?? 0) + 0.5 * (v + v1) * h;
      jt.handVel = v1;
      if (Math.abs(jt.handOffset) >= jt.b.profile.radius) {
        // Off the edge: the arm swings with him; its momentum goes to his body. One hand at a time: the struck hand
        // was on the side the club drove it from (opposite its slide), and the other is still where it fitted.
        this.bodies[ia].vel.x += tx * mArm * v1 / this.mass[ia]; this.bodies[ia].vel.y += ty * mArm * v1 / this.mass[ia];
        const on = (jt.handsOn ?? 2) - 1;
        if (on <= 0) { jt.handsOn = 0; jt.off = true; jt.handVel = 0; }
        else { jt.handsOn = on; jt.offSide = -Math.sign(jt.handOffset); jt.handOffset = 0; jt.handVel = 0; }
      }
    }
  }

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

  /** GRASP_PATCH: a centre-mode grasp that follows the common-patch grasp law. */
  private gripPatched(jt: Joint): boolean {
    return GRASP_PATCH && this.handContact === 'center' && jt.kind === 'grasp' && !this.attachments.get(jt)?.material;
  }

  /** Height of a grasp's load on the runner: the grip's own height when the
   * technique set it (tackle.ts HOLD_FINISH: shoulder line to waist for upper
   * grips); else interpolated from his COM down his legs by leg share. */
  private graspHeight(jt: GraspJoint, j: number): number {
    if (jt.height !== undefined) return jt.height;
    return this.comHeight[j] * (1 - .55 * clamp(jt.legs, 0, 1));
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
      const excursion = hypot2(foot.offset.x, foot.offset.y);
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
        if (!this.attachments.get(jt)!.bounded && hypot2(point.x - b.pos.x, point.y - b.pos.y) > reach) {
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
  /** GRASP_ARM_MOMENT: the part of a grasp row's yaw impulse on the holder
   * (body index i) his shoulders can pass this substep; the rest is reported. */
  private armMoment(i: number, angular: number, h: number): number {
    if (!GRASP_ARM_MOMENT || !angular) return angular;
    if (this.armYawTime[i] !== this.time) { this.armYawTime[i] = this.time; this.armYaw[i] = 0; }
    const cap = this.sp[i].armForce * this.fat[i] * CHEST_HALF * h;
    const passed = clamp(this.armYaw[i] + angular, -cap, cap) - this.armYaw[i];
    this.armYaw[i] += passed;
    this.report.armSwingYaw += Math.abs(angular - passed);
    return passed;
  }

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

  /** POSTURE_HOLD's mobility cost on the gait's change of direction: `1 - MOBILITY_COST x posture` for a man in a live hands joint (1 off), so a low man
   * is slower to re-place his feet across the contact (first step and quickness). */
  private lowCut(i: number): number {
    if (!POSTURE_HOLD || MOBILITY_COST === 0) return 1;
    const b = this.bodies[i];
    return this.joints.some(j => j.kind === 'hands' && !j.off && (j.a === b || j.b === b)) ? 1 - MOBILITY_COST * clamp(b.support!.posture, 0, 1) : 1;
  }

  /** POSTURE_HOLD's mobility cost: 1 off, else `1 - MOBILITY_COST x posture x sin^2(angle off his facing)` for an engaged man's leg drive along `angle`. */
  private lowAcross(engaged: boolean, posture: number, facing: number, angle: number): number {
    if (!POSTURE_HOLD || !engaged || MOBILITY_COST === 0) return 1;
    const s = Math.sin(this.facingDelta(facing, angle));
    return 1 - MOBILITY_COST * clamp(posture, 0, 1) * s * s;
  }

  /** The index of the other body in the first live hands joint on body `i` (POSTURE_HOLD's lifter), -1 if none. */
  private handsPartner(i: number): number {
    const b = this.bodies[i];
    for (const j of this.joints) if (j.kind === 'hands' && !j.off && (j.a === b || j.b === b)) return this.indexOf(j.a === b ? j.b : j.a);
    return -1;
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
    const e = hypot2(sup.xi.x, sup.xi.y), rb = baseRadiusAt(sp, sup.posture);
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
    if (intent.dive && hypot2(intent.dive.x, intent.dive.y) > 1e-9) {
      const l = hypot2(intent.dive.x, intent.dive.y);
      plan.dive = { x: intent.dive.x / l, y: intent.dive.y / l };
      plan.launch = Math.min(1, l);
      return plan;
    }
    const a = availability(sup, this.sp[i], this.fat[i]) * this.carry(i);
    updateSqueeze(b, intent, dt);
    const tr = turnRateOf(b);
    const requestedFacing = commandFacing(b, intent);
    const facing = b.facing + clamp(this.facingDelta(b.facing, requestedFacing), -tr * dt, tr * dt);
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
    plan.facing = this.handContact === 'center' ? requestedFacing : facing;
    plan.cut = (intent.cutSkill ?? 1) * this.lowCut(i);
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
      const dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=hypot2(dx,dy);
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
    if (this.reels.size) this.reels.clear();
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
      const d = hypot2(point.x - jt.a.pos.x, point.y - jt.a.pos.y);
      if (this.gripCapacity(jt) <= 0 || d > reach || (jt.hold ?? d) > reach) jt.broken = true;
    }
    if (HANG_LOAD) this.hangLoad(ids, h);
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
    if (LEGS_HELD) this.baseHolds.fill(0);
    if (HELD_SWING) this.heldSwing(h);
    else for (const jt of this.joints) {
      if (jt.kind !== 'grasp') continue;
      jt.strideForce = 0;
      if (jt.broken || jt.legs <= 0 || jt.a.support!.state === 'up') continue;
      const ia = this.indexOf(jt.a), ib = this.indexOf(jt.b);
      const lever = 0.55 * clamp(jt.legs, 0, 1) * this.comHeight[ib];
      // One hip budget: what bracing the hold's pull on his thighs used is
      // not there to swing the leg.
      const hip = this.hipTorque(ib) * Math.max(0, 1 - this.hipUsed[ib]);
      const bound = hip > 1e-9 ? clamp(hangShare(jt.a.support!.state) * this.mass[ia] * G * lever / hip, 0, 1) : 1;
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
          const length = hypot2(dx, dy) || 1;
          observed = { time: this.time, intervalEnd: this.time + h,
            normal: { x: dx / length, y: dy / length },
            positionI: { ...p.a.pos }, positionJ: { ...p.b.pos },
            facingI: p.a.facing, facingJ: p.b.facing, chestI: shouldersOf(p.a), chestJ: shouldersOf(p.b),
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
        if (delivered > 0 && hypot2(x, y) > 0) {
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
        report.armImpulse[ia] += hypot2(x,y)*delivered;
        this.addLoad(ia, ib, 1, 0, x*delivered, y*delivered, p.height);
      }
    }
    if (RUSH_HANDS) this.stepHands(h);
    // Active reeling is distinct from passive grip. Arms apply a finite
    // force; the passive joint never invents work to shorten its landmark.
    if (contact) for (const jt of this.joints) {
      if (jt.kind !== 'grasp' || jt.broken || jt.brace !== undefined || !(jt.pull! > 0)) continue;
      // Patch grips share the hands' frozen force frame. Applying a
      // reel here would change transport before that common frame is acquired.
      if (this.handContact === 'patch' || this.gripPatched(jt)) continue;
      const i=this.indexOf(jt.a), j=this.indexOf(jt.b);
      const point=this.graspPoint(jt);
      const dx=point.x-jt.a.pos.x,dy=point.y-jt.a.pos.y,d=hypot2(dx,dy);
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
      const height=this.graspHeight(jt,j);
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
      this.addLoad(i,j,nx,ny,-impulse*fraction,0,height,jt.legs>0 || HIP_BRACE);
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
      if (this.handContact === 'patch' || GRASP_PATCH) for (const r of rows) {
        if (r.joint.kind === 'grasp' && (this.handContact === 'patch' || this.gripPatched(r.joint))) this.reelPatchGrasp(r, h);
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
        const height = jt.kind === 'grasp' ? this.graspHeight(jt, r.j) : jt.height;
        if (hypot2(r.ln, r.lt) > 0) jt.achievedContactHeight = clamp(
          height ?? Math.min(this.padHeight[r.i], this.padHeight[r.j]), 0,
          Math.min(bs[r.i].profile.heightYd, bs[r.j].profile.heightYd));
        if (hypot2(r.ln, r.lt) > 0) jt.firstApplied ??= r.observed;
        this.addLoad(r.i, r.j, r.nx, r.ny, r.ln, r.lt, height, jt.kind === 'grasp' && (jt.legs > 0 || HIP_BRACE));
        // Every joint here delivers a bounded force across h, including a
        // passive grasp. Center its achieved travel; torso impacts retain
        // their separate interval-start timing. Center-mode reels were
        // already centered above, while patch reels share this frozen row.
        const gripPatch = jt.kind === 'grasp' && (this.handContact === 'patch' || this.gripPatched(jt));
        const normal = r.ln - (gripPatch ? r.reel : 0);
        if (this.handContact === 'patch' || this.gripPatched(jt)) {
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
        if (jt.kind === 'hands') {
          // A press is counted in press units, as allocateArms budgets it.
          const ln = r.mode > 0 ? r.ln * this.pressUnits(r.actor) : r.ln;
          if(r.actor===r.steerActor) report.armImpulse[r.actor] += hypot2(ln,r.lt);
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
            if (hypot2(ln, lt) > 0) {
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
          const used = hypot2(r.ln-r.reel, r.lt);
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
        const desired = hypot2(foot.desired.x, foot.desired.y);
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
      const j = this.indexOf(jt.b);
      // The separate unheld-body pass must not transport an island's grip
      // again using its previous corrective velocity.
      if (!ids.includes(j)) continue;
      const angle = (this.facing0[j] + jt.b.facing)*.5;
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
      if (this.handContact === 'patch') for (const c of contacts) if (!c.capsule) this.contactPatch(c);
      for (let it = 0; it < RELAX_ITERATIONS; it++) {
        for (const c of contacts) {
          // A pair the correction left apart may still close that gap within
          // a substep (speculative), never more.
          const a = bs[c.i], b = bs[c.j];
          let gap: number;
          if (c.capsule) { const g = capsuleGeom(a, b); if (it === 0) this.capsuleArms(c, g); gap = g.s; }
          else gap = hypot2(b.pos.x - a.pos.x, b.pos.y - a.pos.y) - c.R;
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
      const feltMoment = hypot2(oldTip.x, oldTip.y) * this.mass[i] * this.sp[i].pitchRadiusSq / hc;
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
      const d = hypot2(point.x - j.a.pos.x, point.y - j.a.pos.y);
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
    const muScale = TURF_MU_SCALE !== 1 && this.joints.some(j => j.kind === 'hands' && (j.a === b || j.b === b)) ? TURF_MU_SCALE : 1;
    const traction = muScale * (PAD_LEVERAGE ? sp.traction * clamp(1 - this.liftFelt[i] / (m * G), 0, 2) : sp.traction);
    const engagedHands = POSTURE_HOLD && this.joints.some(j => j.kind === 'hands' && !j.off && (j.a === b || j.b === b));
    const pushForce = (muScale === 1 ? sp.pushForce : Math.min(legDrive(p), sp.traction * muScale))
      * (HIP_BRACE ? 1 - this.hipUsed[i] : 1);
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
        const launch = Math.min(traction, Math.min(1.5, Math.max(0, p.vmax - hypot2(b.vel.x, b.vel.y))) * plan.launch * m / this.tickDt);
        fx += plan.dive.x * launch; fy += plan.dive.y * launch;
        actionX = fx; actionY = fy;
        // Launch supplies translation, not a torque that arrests acquired spin.
        b.facing += (b.spin ?? 0) * h;
        if (remaining<=h+1e-9) { this.startFall(sup, plan.dive, 'dive', report, i); plan.dive=null;plan.free=true; }
        this.alpha[i] = 0; this.cut[i] = 1;
      } else {
        const fat = this.fat[i];
        let a = availability(sup, sp, fat) * this.carry(i);
        this.alpha[i] = a;
        this.cut[i] = plan.cut;
        // Pad level moves at a finite rate. Contact geometry affects support,
        // rather than granting a power bonus or standing him up by a heuristic.
        const target = clamp(intent.posture ?? DEFAULT_POSTURE, 0, 1) - 0.2 * (1 - b.energy);
        const postureBefore = sup.posture;
        sup.posture = clamp(sup.posture + clamp(target - sup.posture, -POSTURE_RATE * h, POSTURE_RATE * h), 0, 1);
        if (POSTURE_HOLD && engagedHands) {
          // The unheld part of the vertical load moves his pads: lifted past what his legs hold, he is stood up; pressed down past it, he is sunk.
          const V = this.liftFelt[i], H = HOLD_K * legDrive(p) * legAngle(sup.posture) * fat;
          const excess = Math.abs(V) - H;
          if (excess > 0) {
            const share = clamp(excess / (HOLD_FULL * m * G), 0, 1), dp = -Math.sign(V) * POSTURE_RATE * share * h;
            const before = sup.posture;
            sup.posture = clamp(sup.posture + dp, 0, 1);
            const moved = sup.posture - before;
            // Work against the load: force x pad height change (positive when he rises against a lift), charged to the lifter's energy, per his mass.
            const dH = padHeightAt(sp, before) - padHeightAt(sp, sup.posture);
            const work = Math.abs(V) * Math.max(0, V > 0 ? dH : -dH) * 0.5;
            if (work > 0 && moved !== 0) { const j = this.handsPartner(i); if (j >= 0) this.plans[j].actionWork += work / this.mass[j]; }
          }
          void postureBefore;
        }
        // Locomotion: the tick's planned force, while he is still on his feet.
        let lx = plan.ax * m, ly = plan.ay * m;
        // A strike: the legs drive the body on beyond the gait, as hard as
        // traction allows, until the extra velocity is delivered.
        const st = sup.strike;
        if (st) {
          const need = hypot2(st.x, st.y);
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
        const L = hypot2(sup.felt.x, sup.felt.y);
        if (push > 0 && L > 1e-6) {
          const ux = -sup.felt.x / L, uy = -sup.felt.y / L;
          const ex = (intent.vel.x - (b.vel.x + plan.ax * h)) * ux + (intent.vel.y - (b.vel.y + plan.ay * h)) * uy;
          if (ex > 0) {
            const vp = b.vel.x * ux + b.vel.y * uy;
            // Legs drive hardest straight ahead; sideways or backward far less.
            const dir = legDriveFactor(p, this.facingDelta(b.facing, Math.atan2(uy, ux))) * trunkPrice(b) * this.lowAcross(engagedHands, sup.posture, b.facing, Math.atan2(uy, ux));
            const capacity = sp.pushForce * dir * clamp(1 - vp / p.vmax, 0, ECCENTRIC_GAIN) * fat * a * push;
            const mag = Math.min(capacity, L * (1 + clamp(intent.growth ?? PUSH_GROWTH, 0, PUSH_GROWTH)), m * ex / h, intent.leanCap ?? Infinity);
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
            const mag = hypot2(leanX, leanY), hx = leanX / mag, hy = leanY / mag;
            const dx = hx * conv / (m * w0 * w0), dy = hy * conv / (m * w0 * w0);
            sup.xi = { x: sup.xi.x + dx, y: sup.xi.y + dy };
            report.leanRelease[i].x += dx; report.leanRelease[i].y += dy;
            leanX -= hx * conv; leanY -= hy * conv;
            // Transferred geometry changes what the same feet can absorb.
            a = availability(sup, sp, fat) * this.carry(i); this.alpha[i] = a;
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
            const before = LEAN_PITCH ? hypot2(leanX, leanY) : 0;
            leanX += (tx - leanX) * k; leanY += (ty - leanY) * k;
            if (LEAN_PITCH) {
              const after = hypot2(leanX, leanY), stiff = m * w0 * w0;
              const most = stiff * Math.max(baseRadiusAt(sp, sup.posture), before / stiff * Math.exp(w0 * h));
              if (after > most && after > before) {
                const keep = Math.max(before, most) / after;
                leanX *= keep; leanY *= keep;
              }
            }
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
        const tf = hypot2(tfx, tfy);
        const along = tf > 1e-9 ? legDriveFactor(p, this.facingDelta(b.facing, Math.atan2(tfy, tfx))) * trunkPrice(b) * this.lowAcross(engagedHands, sup.posture, b.facing, Math.atan2(tfy, tfx)) : 1;
        const fv = tf > 1e-9 ? clamp(1 - (b.vel.x * tfx + b.vel.y * tfy) / (tf * p.vmax), 0, ECCENTRIC_GAIN) : 1;
        const strength = pushForce * fv * along * a;
        const capacity = Math.min(Math.max(hypot2(lx, ly), strength), traction * a);
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
        const bound = this.strideHolds[i], v = hypot2(b.vel.x, b.vel.y);
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
          turnBodyResponse(b, plan.facing, h, turnRateOf(b), a, hypot2(fx, fy), traction * a);
        // Strength limits drive+correction; traction also pays for yaw at
        // the physical support radius. Difference-of-squares keeps the
        // near-saturation subtraction well conditioned. Passive compliance
        // stays finite even when this active reserve is zero.
        // Correction uses profile strength, independent of the direction of
        // an arbitrarily small residual gait request. The existing gait law
        // can demand more than pushForce; that leaves zero corrective effort
        // rather than expanding strength to fund another simultaneous action.
        const total = pushForce, force = hypot2(fx, fy);
        // A variable motor torque may reverse inside the interval. Its net
        // impulse cannot prove how much traction was left for recovery.
        const yawForce = yaw.peakTorque === undefined
          ? yaw.impulse / (h * baseRadiusAt(sp, sup.posture))
          : yaw.peakTorque / baseRadiusAt(sp, sup.posture);
        const groundDemand = hypot2(force, yawForce);
        const reserve = Math.sqrt(Math.max(0, Math.min((total - force) * (total + force),
          (traction - groundDemand) * (traction + groundDemand))));
        this.recovery[i] = this.prepareRecovery(i, h, reserve);
      }
    } else {
      this.alpha[i] = 0; this.cut[i] = 1;
      this.passive(b, sup, sp, report, i);
      const fr = sup.state === 'falling' ? FALL_FRICTION : DOWN_FRICTION;
      const carried = HANG_LOAD ? this.hangCarried[i] : 0;
      if (sup.state === 'falling' && carried <= 0) { fx += sup.fall.x * FALL_TIP * m; fy += sup.fall.y * FALL_TIP * m; }
      // Translation and yaw share one passive ground-friction allowance.
      // The mean lever of a uniformly loaded circular footprint is 2r/3;
      // this geometry proxy is not a measured prone-athlete contact patch.
      const vx = b.vel.x + fx / m * h, vy = b.vel.y + fy / m * h;
      const spin = b.spin ?? 0, lever = 2 * p.radius / 3;
      const wantedX = -m * vx / h, wantedY = -m * vy / h;
      const wantedTorque = -this.inertia[i] * spin / h;
      const demand = Math.hypot(wantedX, wantedY, wantedTorque / lever);
      const capacity = fr * G * m * (1 - carried);
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
    } else if (sup.state === 'down' && t - sup.since >= 0.3 && (hypot2(b.vel.x, b.vel.y) < 0.3 || this.risesSliding(b, sp, i))) {
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

  /** DOWN_RISE_PLANT: may this downed body start to rise while he is still sliding? */
  private risesSliding(b: Body, sp: SupportParams, i: number): boolean {
    if (!DOWN_RISE_PLANT || this.ballCarrier?.() === b || this.heldBodies.has(b) || b.support!.feetLock > 0 || (HANG_LOAD && this.hangCarried[i] > 0)) return false;
    if (Math.abs(b.spin ?? 0) * 2 * b.profile.radius / 3 >= 0.3) return false;
    return hypot2(b.vel.x, b.vel.y) - DOWN_FRICTION * G * sp.getUp <= PLANT_SPEED;
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

  /** HANG_LOAD: the share of a carrier's leg force left for his own motion while his legs also hold up what hangs on him: m / (m + carried mass).
   * Force-limited terms scale by it (the sprint curve's drive, the brake and the cut: calibrated accelerations, force over mass; the recovery step); friction-limited
   * ones (traction, the ground-impulse limit) rise with the added normal load instead. */
  private carry(i: number): number {
    return HANG_LOAD && this.hangMass[i] > 0 ? this.mass[i] / (this.mass[i] + this.hangMass[i]) : 1;
  }

  /** HANG_LOAD: move each hanging holder's carried weight from his turf load to the carrier's feet and balance. */
  private hangLoad(ids: number[], h: number): void {
    for (const i of ids) { this.hangCarried[i] = 0; this.hangMass[i] = 0; }
    const seen = new Set<number>();
    for (const jt of this.joints) {
      if (jt.kind !== 'grasp' || jt.broken) continue;
      const ia = this.indexOf(jt.a), ib = this.indexOf(jt.b);
      const share = hangShare(jt.a.support!.state);
      if (share <= 0 || seen.has(ia * 4096 + ib)) continue;
      seen.add(ia * 4096 + ib);
      this.hangCarried[ia] = Math.min(1, this.hangCarried[ia] + share);
      const W = share * this.mass[ia] * G;
      this.hangMass[ib] += share * this.mass[ia];
      this.liftImp[ib] -= W * h;
      const dx = jt.a.pos.x - jt.b.pos.x, dy = jt.a.pos.y - jt.b.pos.y, d = hypot2(dx, dy);
      const c = this.comHeight[ib];
      if (d > 1e-6 && c > 1e-6) {
        const aeq = W * jt.b.profile.radius / (this.mass[ib] * c);
        this.tipX[ib] += aeq * dx / d * h; this.tipY[ib] += aeq * dy / d * h;
      }
    }
  }

  /** HELD_SWING: arms around his legs resist the leg swinging through them,
   * up to the grip they hold on the legs, whether the holder is on his feet
   * or hanging his weight on them (the larger of the two). One holder has one
   * pair of arms: his largest hold on a runner counts, however many joint
   * copies represent it. Different holders' moments about the runner's hip
   * add, against one hip budget. */
  /** Peak hip torque available to body i now (before holds use it). */
  private hipTorque(i: number): number {
    const k = HIP_STRENGTH ? this.bodies[i].profile.power / (this.mass[i] * HIP_REF_POWER_PER_KG) : 1;
    return HIP_TORQUE_PER_KG * this.mass[i] * this.fat[i] * k;
  }

  private heldSwing(h = 0): void {
    const moments = new Map<number, Map<number, { m: number; hang: number; grip: number; joints: GraspJoint[]; lock: number }>>();
    for (const jt of this.joints) {
      if (jt.kind !== 'grasp') continue;
      jt.strideForce = 0;
      if (jt.broken || jt.legs <= 0) continue;
      const ia = this.indexOf(jt.a), ib = this.indexOf(jt.b);
      const lever = 0.55 * clamp(jt.legs, 0, 1) * this.comHeight[ib];
      let hangForce = hangShare(jt.a.support!.state) * this.mass[ia] * G;
      if (HANG_GRIP && hangForce > 0) {
        // HANG_GRIP: what the hold cannot carry slides his hands down the legs.
        const cap = this.gripCapacity(jt);
        if (hangForce > cap) {
          if (jt.legs >= 1) {
            // At the ankles the foot arrests the closed share of the wrap: arms
            // locked round the leg carry the rest of the weight by geometry
            // (lock: how closed the wrap is, the same lock by which LEGS_HELD
            // counts 1 + lock legs held). An open grip (lock 0) slips off over
            // the foot; a closed one holds there (the shoestring), until the
            // runner tears it horizontally as any hold (the grip's own slip).
            const carried = cap + clamp(jt.lock ?? 0, 0, 1) * hangForce;
            if (hangForce > carried) { jt.broken = true; continue; }
          } else {
            const over = (hangForce - cap) / hangForce;
            jt.legs = Math.min(1, jt.legs + HANG_SLIDE * over * h / (0.55 * this.comHeight[ib]));
            hangForce = cap;
          }
        }
      }
      const hang = hangForce * lever;
      // Copies of one hold share his grip (gripCapacity), so their grip
      // moments add up to one hold's; his hanging weight hangs once.
      const grip = this.gripCapacity(jt) * clamp(jt.legs, 0, 1) * lever;
      const byHolder = moments.get(ib) ?? moments.set(ib, new Map()).get(ib)!;
      const cur = byHolder.get(ia);
      const lock = clamp(jt.lock ?? 0, 0, 1);
      if (!cur) byHolder.set(ia, { m: 0, hang, grip, joints: [jt], lock });
      else { cur.hang = Math.max(cur.hang, hang); cur.grip += grip; cur.joints.push(jt); cur.lock = Math.max(cur.lock, lock); }
    }
    for (const [ib, byHolder] of moments) {
      const hip = this.hipTorque(ib) * (SWING_FLEXION ? 1 : Math.max(0, 1 - this.hipUsed[ib]));
      let total = 0, legs = 0;
      for (const h of byHolder.values()) { h.m = Math.max(h.hang, h.grip); total += h.m; legs += 1 + h.lock; }
      let bound = hip > 1e-9 ? (SWING_STRIP ? (total >= hip ? 1 : 0) : clamp(total / hip, 0, 1)) : 1;
      if (LEGS_HELD) {
        const held = Math.min(2, legs);
        this.baseHolds[ib] = bound * Math.max(0, held - 1);
        bound *= held / 2;
      }
      this.strideHolds[ib] = bound;
      // Each holder's share of the bound, split over his copies, for the
      // drive accounting below.
      for (const h of byHolder.values()) for (const jt of h.joints)
        jt.strideForce = total > 0 ? bound * h.m / total / h.joints.length : 0;
    }
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
    const thigh = hypot2(this.thighX[i], this.thighY[i]);
    this.hipUsed[i] = 0;
    if (thigh > 0) {
      const c = this.comHeight[i], moment = thigh * sp.pitchRadiusSq * this.mass[i] / Math.max(c, 1e-6);
      const capacity = this.hipTorque(i) * h;
      this.hipUsed[i] = Math.min(1, moment / Math.max(capacity, 1e-12));
      const excess = Math.max(0, 1 - capacity / Math.max(moment, 1e-12));
      legX += this.thighX[i] * excess / w0; legY += this.thighY[i] * excess / w0;
    }
    // HELD_SWING: the strides his held legs cannot bring through are steps
    // his base does not take. While he keeps travelling, the base falls
    // behind him by that share of his travel, and balance decides the rest.
    const baseBound = LEGS_HELD ? this.baseHolds[i] : this.strideHolds[i];
    if (HELD_SWING && baseBound > 0) {
      legX += baseBound * b.vel.x * h; legY += baseBound * b.vel.y * h;
    }
    dx += legX; dy += legY;
    // Remember what has been displacing him (decays over ~0.3 s).
    const decay = interval.decay;
    causes.contact = causes.contact * decay + hypot2(mx - f.x + tmx, my - f.y + tmy) * h / w0;
    causes.legs = causes.legs * decay + hypot2(legX, legY);
    causes.overspeed *= decay;
    // Carried faster than his legs can run.
    const speed = hypot2(b.vel.x, b.vel.y);
    const vcap = b.profile.vmax * fat * 1.05;
    if (speed > vcap) {
      dx += b.vel.x / speed * (speed - vcap) * h; dy += b.vel.y / speed * (speed - vcap) * h;
      causes.overspeed += (speed - vcap) * h;
    }
    // What displaced him arrived through the substep: on average it has half
    // the substep to grow or be recovered.
    let xx = sup.xi.x + 0.5 * dx, xy = sup.xi.y + 0.5 * dy;
    let e = hypot2(xx, xy);
    const rb = baseRadiusAt(sp, sup.posture);
    const rec = recoverySpeed(sp, 0, fat) * this.carry(i);
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
      if (foot) causes.legs += hypot2(deficit.x, deficit.y) * h;
      sup.out = hypot2(xx, xy) > rb ? outsideBefore + h : 0;
    }
    xx += 0.5 * dx; xy += 0.5 * dy;
    e = hypot2(xx, xy);
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
      const dx = bs[j].pos.x - bs[i].pos.x, dy = bs[j].pos.y - bs[i].pos.y, d = hypot2(dx, dy);
      const press = d > 1e-6 ? (fx * dx + fy * dy) / d : 0;
      if (press > 0) {
        if (HAND_FREE) {
          // SCRATCH (Phase 2 test): each man's hand is a contact point on the other at a height of his choosing (handDz above the other's pads); each arm runs from the
          // pusher's shoulder (his pad height) to that point; both arms carry the contact force; the vertical parts add on the receiver (his own arm's reaction included).
          const dzI = HAND_DYN ? (this.padHeight[i] < this.padHeight[j] ? DZ_LOW : DZ_HIGH) : this.handDz[i], dzJ = HAND_DYN ? (this.padHeight[j] < this.padHeight[i] ? DZ_LOW : DZ_HIGH) : this.handDz[j];
          const zJ = this.padHeight[j] + dzI, zI = this.padHeight[i] + dzJ, dd = Math.max(d, .3);
          const riseI = clamp((zJ - this.padHeight[i]) / dd, -LEVERAGE_SLOPE, LEVERAGE_SLOPE), riseJ = clamp((zI - this.padHeight[j]) / dd, -LEVERAGE_SLOPE, LEVERAGE_SLOPE);
          const net = riseI - riseJ;
          this.liftImp[j] += press * net; this.liftImp[i] -= press * net;
        } else {
          const rise = clamp((this.padHeight[j] - this.padHeight[i]) / Math.max(d, .3), -LEVERAGE_SLOPE, LEVERAGE_SLOPE);
          this.liftImp[j] += press * rise; this.liftImp[i] -= press * rise;
        }
      }
    }
    const z = clamp(height ?? Math.min(this.padHeight[i], this.padHeight[j]),
      0, Math.min(bs[i].profile.heightYd, bs[j].profile.heightYd));
    const ci = this.comHeight[i], cj = this.comHeight[j];
    const dzI2 = HAND_DYN ? (this.padHeight[i] < this.padHeight[j] ? DZ_LOW : DZ_HIGH) : this.handDz[i], dzJ2 = HAND_DYN ? (this.padHeight[j] < this.padHeight[i] ? DZ_LOW : DZ_HIGH) : this.handDz[j];
    const zJt = HAND_FREE ? clamp(this.padHeight[j] + dzI2, 0, bs[j].profile.heightYd) : z, zIt = HAND_FREE ? clamp(this.padHeight[i] + dzJ2, 0, bs[i].profile.heightYd) : z;
    const fi = -(zIt - ci) * ci / this.sp[i].pitchRadiusSq / this.mass[i];
    const fj = (zJt - cj) * cj / this.sp[j].pitchRadiusSq / this.mass[j];
    this.tipX[i] += fx * fi; this.tipY[i] += fy * fi;
    if (legHold) {
      // A held foot cannot actively brace this moment: it pitches the body
      // over the base, in addition to restricting the recovery step.
      // A pull on the thighs acts on the hips, which brace its moment up to
      // their torque capacity (support update); only the excess pitches him.
      // A hold below the knee (about half the COM height) acts on the base
      // itself and trips him in full. The force still loads his COM and his
      // recovery step in full.
      const w = clamp((KNEE * cj + .1 - zJt) / .1, 0, 1);
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
        if (TORSO_CAPSULE && this.capsulePair?.(a, b)) {
          const g = capsuleGeom(a, b);
          if (g.s > Math.max(0, -(rvx * g.nx + rvy * g.ny)) * h) continue;
          if (-g.s > report.maxPenetration) report.maxPenetration = -g.s;
          const row = this.capsuleRow(i, j, a, b, g, h, soft);
          if (CONTACT_LAYER) this.layerContact(row, g.s, h);
          out.push(row);
          continue;
        }
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
          const cl = hypot2(cx, cy) || 1;
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
            facingI: a.facing, facingJ: b.facing, chestI: shouldersOf(a), chestJ: shouldersOf(b),
            velocityI: { ...a.vel }, velocityJ: { ...b.vel },
            supportI: a.support!.state, supportJ: b.support!.state,
            height: clamp(Math.min(this.padHeight[i], this.padHeight[j]), 0,
              Math.min(a.profile.heightYd, b.profile.heightYd)) } };
        if (CONTACT_LAYER && !guard) this.layerContact(row, s, h);
        if (this.handContact === 'patch') this.contactPatch(row);
        out.push(row);
      }
    }
    return out;
  }

  /** TORSO_CAPSULE: a contact row from capsule geometry, acting at the surface point. */
  private capsuleRow(i: number, j: number, a: Body, b: Body, g: ReturnType<typeof capsuleGeom>, h: number, soft: Softness): Contact {
    const vn = (b.vel.x - a.vel.x) * g.nx + (b.vel.y - a.vel.y) * g.ny;
    const row: Contact = { i, j, nx: g.nx, ny: g.ny, R: g.R, ri: 0, rj: 0, ni: 0, nj: 0, mn: 0, mt: 0, capsule: true,
      guard: false, bias: Math.max(soft.biasRate * g.s, -MAX_PUSHOUT), ln: 0, lt: 0, closing: vn < 0 ? -vn : 0,
      observed: { time: this.time, intervalEnd: this.time + h, normal: { x: g.nx, y: g.ny },
        positionI: { ...a.pos }, positionJ: { ...b.pos }, facingI: a.facing, facingJ: b.facing, chestI: shouldersOf(a), chestJ: shouldersOf(b),
        velocityI: { ...a.vel }, velocityJ: { ...b.vel }, supportI: a.support!.state, supportJ: b.support!.state,
        height: clamp(Math.min(this.padHeight[i], this.padHeight[j]), 0, Math.min(a.profile.heightYd, b.profile.heightYd)) } };
    this.capsuleArms(row, g);
    return row;
  }

  /** TORSO_CAPSULE: the row's arms and effective masses for geometry g (sign
   * conventions as contactPatch: a takes −n, b takes +n). */
  private capsuleArms(c: Contact, g: ReturnType<typeof capsuleGeom>): void {
    c.nx = g.nx; c.ny = g.ny; c.R = g.R;
    c.ni = -g.rax * g.ny + g.ray * g.nx; c.nj = g.rbx * g.ny - g.rby * g.nx;
    c.ri = g.rax * g.nx + g.ray * g.ny; c.rj = -(g.rbx * g.nx + g.rby * g.ny);
    const inverseMass = 1 / this.mass[c.i] + 1 / this.mass[c.j];
    c.mn = 1 / (inverseMass + c.ni * c.ni / this.inertia[c.i] + c.nj * c.nj / this.inertia[c.j]);
    c.mt = 1 / (inverseMass + c.ri * c.ri / this.inertia[c.i] + c.rj * c.rj / this.inertia[c.j]);
  }

  /** CONTACT_LAYER: the row's spring and damping from its compression p = -s.
   * Inside the pair's soft layers (series stiffness, summed depth) the force is
   * k_layer p plus Hunt-Crossley damping 1.5 HC k p v, zero at first touch; past
   * them the 9 Hz core adds on, continuous in force at the boundary. Expressed as
   * a soft constraint: frequency from k over the pair's reduced mass, damping
   * ratio from the HC coefficient, capped at critical. */
  private layerContact(c: Contact, s: number, h: number): void {
    const p = Math.max(0, -s), depth = 2 * LAYER_DEPTH, kLayer = LAYER_K / 2;
    const omegaCore = 2 * Math.PI * CONTACT_HZ, kCore = c.mn * omegaCore * omegaCore;
    const core = p > depth && kCore > kLayer;
    const k = core ? kCore : kLayer, omega = Math.sqrt(k / c.mn);
    const zeta = Math.min(CONTACT_ZETA, 0.75 * LAYER_HC * omega * p);
    const soft = softness(omega / (2 * Math.PI), zeta, h);
    // Core rows act on a shifted gap so the force at the layer boundary matches.
    const gap = core ? s + depth * (1 - kLayer / kCore) : s;
    c.soft = soft;
    c.bias = Math.max(soft.biasRate * gap, -MAX_PUSHOUT);
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
    if (this.handContact === 'patch' || c.capsule) vn += (a.spin ?? 0) * c.ni + (b.spin ?? 0) * c.nj;
    const sf = c.soft && !relax ? c.soft : soft;
    let imp = relax || c.guard ? -c.mn * (vn + c.bias) : -c.mn * sf.massScale * (vn + c.bias) - sf.impulseScale * c.ln;
    // CONTACT_LAYER: the relax takes back the separating velocity the soft solve
    // left behind and never arrests closing; the layer law alone does that.
    if (relax && c.soft && imp > 0) imp = 0;
    const ln = Math.max(0, c.ln + imp);
    const dn = ln - c.ln;
    c.ln = ln;
    av.x -= c.nx * dn * ima; av.y -= c.ny * dn * ima;
    bv.x += c.nx * dn * imb; bv.y += c.ny * dn * imb;
    if (this.handContact === 'patch' || c.capsule) {
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
      if (HANDS_CHEST && jt.kind === 'hands' && this.handContact === 'center' && !jt.contact) {
        const c = chestPoints(a, b); dx = c.x; dy = c.y;
      }
      let px = 0, py = 0; // Material offset from the body's force-midpoint center.
      const upperPatch = jt.kind === 'grasp' && (jt.legs <= 0 && this.handContact === 'patch' || this.gripPatched(jt));
      const lowerPatch = jt.kind === 'grasp' && !!this.attachments.get(jt)?.material && this.handContact === 'patch';
      if (((jt.kind === 'hands' || lowerPatch) && this.handContact === 'patch' || upperPatch) && this.handIntegration === 'centered') {
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
          || hypot2(local.x, local.y) > target.profile.radius + 1e-10)
          throw new RangeError('Hand contact must be a finite point within the target torso');
        // The point remains on the body. Its force-midpoint orientation is a
        // second-order approximation; it is not teleported by the controller.
        const theta = target.facing - .5 * h * (target.spin ?? 0);
        px = Math.cos(theta) * local.x - Math.sin(theta) * local.y;
        py = Math.sin(theta) * local.x + Math.cos(theta) * local.y;
        const sign = jt.contact.on === 'b' ? 1 : -1;
        dx += sign * px; dy += sign * py;
      }
      const dist = hypot2(dx, dy);
      const nx = dist > 1e-8 ? dx / dist : 1, ny = dist > 1e-8 ? dy / dist : 0;
      const appliedHeight = jt.kind === 'grasp' ? this.graspHeight(jt, j) : jt.height ?? Math.min(this.padHeight[i], this.padHeight[j]);
      const observed = jt.firstApplied ?? this.jointSnapshot(jt, h, nx, ny, appliedHeight);
      const row: JointRow = { joint: jt, observed, i, j, nx, ny, mn: 1 / (1 / this.mass[i] + 1 / this.mass[j]),
        mode: 0, c: 0, ln: 0, lt: 0, limit: 0, pushLim: 0, holdLim: 0, steerLim: 0,actor: i,steerActor: i,reel: 0 };
      if (jt.kind === 'hands' || upperPatch || lowerPatch) {
        // The effective patch lies between the bodies, weighted by their
        // torso radii. At touching distance these are the pad-surface arms;
        // extended hands use the same single reduced patch, not two joints.
        if (this.handContact === 'patch' || upperPatch) {
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
        row.holdLim = OPEN_HANDS && !jt.grip ? 0 : Math.max(0, jt.hold) * h * this.armScale[holder];
        row.steerLim = Math.max(0, jt.steer) * h * scale;
        if (RUSH_HANDS && (jt.off || jt.handOffset || (jt.handsOn ?? 2) < 2)) {
          const e = (jt.off ? 0 : this.handEdge(jt)) * ((jt.handsOn ?? 2) === 1 ? 0.5 : 1);
          row.pushLim *= e; row.holdLim *= e; row.steerLim *= e;
          row.steerSide = (jt.handsOn ?? 2) === 1 ? jt.offSide ?? 0 : 0;
        }
        if (HAND_MOMENT && row.pushLim > 0) {
          const k = row.actor, o = k === i ? j : i, pk = this.bodies[k]!, po = this.bodies[o]!;
          const ex = po.pos.x - pk.pos.x, ey = po.pos.y - pk.pos.y;
          const reach = Math.max(.05, hypot2(ex, ey) - po.profile.radius), sinT = Math.abs(Math.sin(Math.atan2(ey, ex) - pk.facing));
          if (sinT > 1e-3) row.pushLim = Math.min(row.pushLim, this.sp[k].armForce * this.fat[k] * CHEST_HALF * HAND_MOMENT_CAP / (reach * sinT) * h * scale);
        }
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
              && hypot2(this.graspPoint(old).x - point.x, this.graspPoint(old).y - point.y) < 1e-10
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
    // OPEN_HANDS: an open hand's steer is friction on the push it carries.
    const slipLim = OPEN_HANDS && !(r.joint as HandJoint).grip ? Math.min(r.steerLim, HAND_MU * Math.max(0, r.ln)) : r.steerLim;
    if (slipLim > 0) this.solveTangent(r, a, b, slipLim, 0, r.steerSide ?? 0);
  }

  /** Patch reel and passive grip share a frozen force point and one budget.
   * Deliver active work separately, but transport their total attained load
   * together. No second arm strength or motor is introduced. */
  private reelPatchGrasp(r: JointRow, h: number): void {
    const jt = r.joint as GraspJoint;
    if (jt.brace !== undefined || !(jt.pull! > 0) || jt.a.support!.state !== 'up') return;
    const point = this.graspPoint(jt);
    const distance = hypot2(point.x - jt.a.pos.x, point.y - jt.a.pos.y);
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
    const reelA = this.armMoment(r.i, -(r.ni ?? 0) * impulse, h);
    const fraction = coupled ? this.supportImpulse(jt, -r.nx*impulse, -r.ny*impulse, h, true, undefined,
      reelA, -(r.nj ?? 0)*impulse)
      : this.pairImpulse(r.i, r.j, -r.nx * impulse, -r.ny * impulse, r.i, 'grasps', true, undefined,
        reelA, -(r.nj ?? 0) * impulse);
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
    this.addLoad(r.i, r.j, r.nx, r.ny, -r.reel, 0, this.graspHeight(jt, r.j), jt.legs>0 || HIP_BRACE);
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
    const normalA = this.armMoment(r.i, (r.ni ?? 0) * dn, h);
    const fraction=coupled?this.supportImpulse(jt,r.nx*dn,r.ny*dn,h,false,channel, normalA, (r.nj ?? 0)*dn)
      :this.pairImpulse(r.i,r.j,r.nx*dn,r.ny*dn,r.actor,'grasps',false,channel,
        normalA, (r.nj ?? 0) * dn);
    r.ln+=dn*fraction;
    const tangentLimit = Math.sqrt(Math.max(0, lim * lim - (r.ln-r.reel)**2));
    if (coupled) {
      const rv = this.graspVelocity(jt), tx = -r.ny, ty = r.nx;
      const vt = rv.x * tx + rv.y * ty - (r.ri ?? 0)*(a.spin ?? 0) - (r.rj ?? 0)*(b.spin ?? 0);
      const lt = clamp(r.lt - (r.mt ?? r.mn) * vt, -tangentLimit, tangentLimit), dt = lt - r.lt;
      r.lt += dt * this.supportImpulse(jt, tx * dt, ty * dt, h,false,r.tangentWork??={net:0}, this.armMoment(r.i, -(r.ri ?? 0)*dt, h), -(r.rj ?? 0)*dt);
    } else this.solveTangent(r, a, b, tangentLimit, h);
  }

  /** Hands and holds couple the bodies' sideways motion directly; a grip
   * around a torso does not let him roll past like two touching pads. */
  private solveTangent(r: JointRow, a: Body, b: Body, lim: number, h = 0, side = 0): void {
    const ima = 1 / this.mass[r.i], imb = 1 / this.mass[r.j];
    const tx = -r.ny, ty = r.nx;
    const ri = r.ri ?? 0, rj = r.rj ?? 0;
    let vt = (b.vel.x - a.vel.x) * tx + (b.vel.y - a.vel.y) * ty;
    if (ri || rj) vt -= ri * (a.spin ?? 0) + rj * (b.spin ?? 0);
    // HAND_MOTOR: steering hands may drive toward a wanted tangential speed
    // (active arm work) rather than only braking slip (passive).
    const drive = r.joint.kind === 'hands' ? r.drive ?? 0 : 0;
    // RUSH_HANDS: with one hand off, the impulse resisting the man toward the vacated side (side > 0: he moves +t, the
    // resisting impulse is negative) is ONE_HAND_SIDE of the remaining hand's.
    const lo = side > 0 ? -ONE_HAND_SIDE * lim : -lim, hi = side < 0 ? ONE_HAND_SIDE * lim : lim;
    const lt = clamp(r.lt - (r.mt ?? r.mn) * (vt - drive), lo, hi);
    const dt = lt - r.lt;
    const angA = r.joint.kind === 'grasp' && h > 0 ? this.armMoment(r.i, -ri * dt, h) : -ri * dt;
    const fraction=this.pairImpulse(r.i,r.j,tx*dt,ty*dt,drive ? r.steerActor : r.actor,r.joint.kind==='hands'?'hands':'grasps',!!drive,r.tangentWork??={net:0},
      angA, -rj * dt);
    r.lt+=dt*fraction;
  }
}
