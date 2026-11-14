/**
 * Body-owned support: where a player's base is relative to his momentum.
 *
 * A compact linear-inverted-pendulum ("capture point") model. An athlete
 * keeps his capture point — where he would have to plant to stop — inside
 * the region his gait controls. `xi` is the deviation of the capture point
 * from that controlled region, in yards:
 *
 *  - Accelerations his feet can follow (the calibrated free-movement
 *    envelope) are planned and leave xi unchanged. The excess of an impact,
 *    a load he was leaning on that disappears, or being carried faster than
 *    his legs can step displaces it: Δxi = Δv_excess / ω0, ω0 = √(g / h_COM).
 *  - Inside the base (ankle/hip strategy) a deviation decays. Beyond it,
 *    gravity makes it diverge at ω0·(|xi| − base) while stepping pulls it
 *    back at the recovery stepping speed. Past base + step/ω0 divergence wins
 *    and he falls; the fall and getting up take physical time.
 *  - A lower posture (pad level) lowers the COM. A larger ω0 turns the same
 *    impulse into a smaller deviation. Leg wraps slow or stop the stepping.
 *
 * The state belongs to the body, not to a block or a tackle. It survives a
 * blocker taking a new man, a rusher shedding into a tackle and a carrier
 * spinning out of one grasp into another.
 */
import { G } from '../core/units.js';
import { hypot2, clamp, type Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { VirtualFoot } from './virtual-foot.js';

export type SupportStateKind = 'up' | 'falling' | 'down' | 'rising';

export interface Support {
  /** Explicit nominal-gait/corrective support state; not an articulated foot. */
  foot?: VirtualFoot;
  /** Capture-point deviation from the controlled base, yd. */
  xi: Vec2;
  state: SupportStateKind;
  /** World time the current state began. */
  since: number;
  /** Pad level, 0 upright … 1 as low as his flexibility allows. */
  posture: number;
  /** Committed lean: ground force beyond free movement, pushing into a load (kg·yd/s²). */
  lean: Vec2;
  /** Constraint force received last substep (kg·yd/s²). */
  load: Vec2;
  /** The load as the body senses it (filtered over ~40 ms): what a lean can push against. */
  felt: Vec2;
  /** 0–1 restriction of his stepping by a hold on the legs (set each substep). */
  feetLock: number;
  /** Interval-mean translational velocity of whatever holds his feet. */
  feetVel: Vec2;
  /** Unit direction of a fall in progress. */
  fall: Vec2;
  /** Contact-height angular acceleration as the body feels it, yd/s².
   * This is a reduced pitch/roll capture-point contribution, not 3D rotation. */
  tipAccel?: Vec2;
  /** Filtered contact moment expressed as equivalent capture-point acceleration. */
  feltTip?: Vec2;
  /** Largest deviation fraction of the fall threshold reached (diagnostic). */
  peak: number;
  /** The feet's planned yaw rate last substep (contact spin is the difference). */
  yaw?: number;
  /** Seconds the deviation has been beyond the base (stepping reacts after a latency). */
  out: number;
  /** Why the current fall started (diagnostic). */
  cause?: 'contact' | 'dive' | 'overspeed' | 'legs';
  /** Body acceleration as the gait feels it (filtered), yd/s². */
  accel?: Vec2;
  /** Velocity a strike or lunge still has to add, yd/s. */
  strike?: Vec2;
  /** Recent sources of deviation, decaying sums (diagnostic). */
  causes?: { contact: number; legs: number; overspeed: number };
}

export interface SupportParams {
  /** Upright centre-of-mass height, yd. */
  comHeight: number;
  /** Ankle/hip-strategy support radius in an athletic stance, yd. */
  baseRadius: number;
  /** Recovery stepping speed, yd/s. */
  stepSpeed: number;
  /** 0–1: how low he can get. */
  bend: number;
  /** Seconds to rise once stopped on the ground. */
  getUp: number;
  /** Yaw moment of inertia, kg·yd². */
  yawInertia: number;
  /** Pitch/roll radius of gyration squared, yd² (stature-based assumption). */
  pitchRadiusSq: number;
  /** Turf traction limit on horizontal ground force, kg·yd/s². */
  traction: number;
  /** Leg drive at zero speed (strength, traction-capped), kg·yd/s². */
  pushForce: number;
  /** Arm push/hold capacity, kg·yd/s². */
  armForce: number;
  /** Two-arm press (pushing through the hands) capacity, kg·yd/s². */
  pressForce: number;
}

/** ARM_PRESS (G5, default on; ARM_PRESS=0 turns it off): pushing through the
 * hands is a press, the chest and triceps a bench press measures, not the
 * grip and pull the arm-force mapping stands for. Its capacity is the
 * player's own bench max (combine reps, Epley), about 1.3 body weights for
 * an NFL tackle, where the arm-force mapping gave 0.86. Holding, steering,
 * grasps and tackles keep the arm-force capacity. Off: a press is capped at
 * the arm force, so a rusher's leg drive folds a blocker's arms. */
const ARM_PRESS = process.env.ARM_PRESS !== '0';
/** Experimental (LEG_ALLOMETRY=1, off): leg drive scales with body mass^0.69 at
 * a fixed rating rather than linearly, normalised so a 110 kg player keeps
 * today's force. Vertical push-off force across NFL combine athletes, fitted
 * within position groups, scales as mass^0.69 (0.67-0.71;
 * scripts/mechanics/leg_force_allometry.py, data/reviews/mechanics/leg-force-allometry.json).
 * Traction stays proportional to mass; arm and press strength are unchanged. */
const LEG_ALLOMETRY = process.env.LEG_ALLOMETRY !== '0';
const LEG_MASS_EXPONENT = 0.69, LEG_REF_MASS_KG = 110;
/** Leg drive at zero speed before the traction cap, kg·yd/s². */
export function legDrive(p: PhysicalProfile): number {
  return p.power * G * (LEG_ALLOMETRY ? (p.massKg / LEG_REF_MASS_KG) ** (LEG_MASS_EXPONENT - 1) : 1);
}

/** Cleat-turf traction coefficient for a sustained push (model assumption). */
export const TURF_MU = 1.1;

/** Derived on demand (cheap), so a scenario that edits a profile sees the change. */
export function supportParams(p: PhysicalProfile): SupportParams {
  const balance = p.balance ?? 0.5;
  const traction = TURF_MU * p.massKg * G;
  return {
    comHeight: 0.55 * p.heightYd,
    // Wider, heavier bases resist more before a step is needed.
    baseRadius: 0.11 + 0.05 * balance + 0.04 * clamp((p.massKg - 90) / 60, 0, 1),
    stepSpeed: p.stepSpeed ?? 3.2,
    bend: p.bend ?? 0.5,
    getUp: p.getUp ?? 0.9,
    yawInertia: p.massKg * (0.5 * p.radius) ** 2,
    pitchRadiusSq: (0.3 * p.heightYd) ** 2,
    traction,
    pushForce: Math.min(legDrive(p), traction),
    armForce: 0.75 * p.power * G,
    pressForce: ARM_PRESS && p.press !== undefined ? Math.max(p.press * G, 0.75 * p.power * G) : 0.75 * p.power * G,
  };
}

export function newSupport(posture = 0.2): Support {
  return { xi: { x: 0, y: 0 }, state: 'up', since: -Infinity, posture, lean: { x: 0, y: 0 }, load: { x: 0, y: 0 }, felt: { x: 0, y: 0 },
    feetLock: 0, feetVel: { x: 0, y: 0 }, fall: { x: 0, y: 0 }, peak: 0, out: 0 };
}

/** COM height at a posture: low pad level drops it by up to a quarter for a flexible athlete. */
export function comHeightAt(s: SupportParams, posture: number): number {
  return s.comHeight * (1 - 0.25 * clamp(posture, 0, 1) * (0.4 + 0.6 * s.bend));
}

/** Upper-torso contact height. Distinct from COM: a crouch lowers the pads
 * more than the COM. This anthropometric proxy still needs contact data;
 * it does not add vertical forces or claim that the lower player always wins. */
export function padHeightAt(s: SupportParams, posture: number): number {
  return s.comHeight * (0.67 / 0.55) * (1 - 0.4 * clamp(posture, 0, 1) * (0.4 + 0.6 * s.bend));
}

/** Pendulum rate ω0 = √(g/h), 1/s. */
export function omega0(s: SupportParams, posture: number): number {
  return Math.sqrt(G / comHeightAt(s, posture));
}

/** Support radius: a low, wide stance is a bigger base than a running stride. */
export function baseRadiusAt(s: SupportParams, posture: number): number {
  return s.baseRadius * (0.75 + 0.5 * clamp(posture, 0, 1));
}

/** Recovery stepping speed with legs held and fatigue. */
export function recoverySpeed(s: SupportParams, feetLock: number, fatigue: number): number {
  return s.stepSpeed * (1 - clamp(feetLock, 0, 1)) * fatigue;
}

/** Analytic radial recovery, with a constant solved corrective velocity
 * perturbation over the interval. Negative loadVelocity means a grip resists
 * placement. Recompute the base crossing from achieved recovery. The weight
 * integrates a transverse perturbation with the same frozen phase schedule.
 * No extra gait phases, foot masses or strength constants are introduced. */
export function advanceRecovery(e: number, rb: number, w: number, speed: number,
  outsideFor: number, latency: number, h: number, loadVelocity = 0): { next: number; weight: number } {
  const inside = (time: number) => {
    const weight = -Math.expm1(-w * time) / w;
    return { next: rb * Math.exp(-w * time) - loadVelocity * weight, weight };
  };
  if (e <= rb) {
    const weight = -Math.expm1(-w * h) / w;
    return { next: e * Math.exp(-w * h) - loadVelocity * weight, weight };
  }
  const ramp = Math.min(h, Math.max(0, latency - outsideFor));
  const deviation = (time: number) => {
    const growth = Math.expm1(w * time);
    return (e - rb) * (1 + growth) - speed / latency *
      (outsideFor * growth / w + (growth - w * time) / (w * w)) - loadVelocity * growth / w;
  };
  const atRamp = deviation(ramp), rest = h - ramp, eq = (speed + loadVelocity) / w;
  let crossing: number | undefined;
  if (atRamp <= 0) {
    let lo = 0, hi = ramp;
    for (let k = 0; k < 36; k++) {
      const mid = (lo + hi) * .5;
      if (deviation(mid) > 0) lo = mid; else hi = mid;
    }
    crossing = hi;
  } else {
    const end = eq + (atRamp - eq) * Math.exp(w * rest);
    if (end <= 0) crossing = ramp + Math.log1p(atRamp / (eq - atRamp)) / w;
    else return { next: rb + end, weight: Math.expm1(w * h) / w };
  }
  const after = inside(h - crossing);
  return { next: after.next,
    weight: Math.exp(-w * (h - crossing)) * Math.expm1(w * crossing) / w + after.weight };
}

/**
 * BASE_ORIENT (experimental, off; BASE_ORIENT=1): the base and the recovery step depend on direction.
 *
 * The base is an ellipse of the same area as today's circle (baseRadiusAt), described by a shape tensor P (symmetric,
 * det 1; the radius in direction u is baseRadiusAt / sqrt(u^T P^-1 u)). Two shapes are blended:
 * - set: wide across his facing (SET_ASPECT across : along);
 * - stride: long along his velocity (STRIDE_ASPECT along : across).
 * The weight on the stride shape rises smoothly with his speed (smoothstep of speed / (STRIDE_SPEED x vmax)). A tensor
 * has no sign, so a velocity that reverses (a backpedal, a man being driven, a cut through a stop) does not flip it;
 * at no speed the stride weight is zero, and through a cut it rotates with his velocity. A backpedalling DB is long
 * along his path, a shuffling blocker long across his facing, a man being driven long along the drive.
 *
 * The effective base is oriented as a whole: the recovery step's reach in direction u scales with the base's extent that
 * way (world.ts orient), so the point of no return is base(u) + step(u) / w0. Movement's directional factor (shuffle,
 * backpedal) is not used: it describes running speed, not a recovery step, and would make a set stance fall first
 * sideways, against the stagger evidence.
 *
 * The aspects and the blend speed are choices. The evidence is only for the direction dependence: in a staggered stance,
 * pushes across the feet need a recovery step far more often than pushes along them (van Mierlo et al. 2023), and
 * stability is the extrapolated COM's distance from the base's edge, not its distance from a centre (Hof 2005).
 */
export const BASE_ORIENT = process.env.BASE_ORIENT === '1';
/** Set stance: across his facing : along it (a choice). */
export const SET_ASPECT = 1.3;
/** Running stride: along his velocity : across it (a choice). */
export const STRIDE_ASPECT = 1.5;
/** The stride shape is fully his at this share of his top speed (a choice). */
export const STRIDE_SPEED = 0.5;

/** The ellipse's shape tensor P (xx, xy, yy; det 1) for a body facing `facing` and moving at `vel`. */
export function baseShape(facing: number, vel: Vec2, vmax: number, out: Float64Array, o: number): void {
  const add = (ang: number, along: number, across: number, w: number) => {
    const c = Math.cos(ang), sn = Math.sin(ang), a2 = along * along, b2 = across * across;
    out[o] += w * (a2 * c * c + b2 * sn * sn); out[o + 1] += w * (a2 - b2) * c * sn; out[o + 2] += w * (a2 * sn * sn + b2 * c * c);
  };
  out[o] = 0; out[o + 1] = 0; out[o + 2] = 0;
  const sp = hypot2(vel.x, vel.y), x = clamp(sp / Math.max(1e-6, STRIDE_SPEED * vmax), 0, 1), w = x * x * (3 - 2 * x);
  if (w < 1) add(facing, 1 / Math.sqrt(SET_ASPECT), Math.sqrt(SET_ASPECT), 1 - w);
  if (w > 0) add(Math.atan2(vel.y, vel.x), Math.sqrt(STRIDE_ASPECT), 1 / Math.sqrt(STRIDE_ASPECT), w);
  const det = Math.sqrt(Math.max(1e-12, out[o] * out[o + 2] - out[o + 1] * out[o + 1]));
  out[o] /= det; out[o + 1] /= det; out[o + 2] /= det;
}

/** The base's radius in direction (ux, uy) as a share of baseRadiusAt, for shape P at offset o. */
export function shapeRadius(P: Float64Array, o: number, ux: number, uy: number): number {
  // P^-1 = [yy, -xy; -xy, xx] (det 1).
  const q = P[o + 2] * ux * ux - 2 * P[o + 1] * ux * uy + P[o] * uy * uy;
  return 1 / Math.sqrt(Math.max(1e-9, q));
}

/** BASE_ORIENT: multipliers on the base radius and the recovery step for the current direction (absent: today's). */
export interface OrientScale { base: number; step: number }

/** Deviation beyond which gravity outruns stepping: the point of no return. */
export function criticalDeviation(s: SupportParams, posture: number, feetLock: number, fatigue: number, scale?: OrientScale): number {
  if (scale) return baseRadiusAt(s, posture) * scale.base + recoverySpeed(s, feetLock, fatigue) * scale.step / omega0(s, posture);
  return baseRadiusAt(s, posture) + recoverySpeed(s, feetLock, fatigue) / omega0(s, posture);
}

/**
 * Fraction of his ground force and footwork available for the intended
 * movement. Recovering steps use the feet; a player near the point of no
 * return can do little else. A player off his feet has nothing.
 */
export function availability(sup: Support, s: SupportParams, fatigue: number, scale?: OrientScale): number {
  if (sup.state !== 'up') return 0;
  const e = hypot2(sup.xi.x, sup.xi.y);
  const rb = scale ? baseRadiusAt(s, sup.posture) * scale.base : baseRadiusAt(s, sup.posture);
  if (e <= rb) return 1;
  const crit = criticalDeviation(s, sup.posture, sup.foot ? 0 : sup.feetLock, fatigue, scale);
  if (crit <= rb + 1e-9) return 0.1;
  return clamp(1 - ((e - rb) / (crit - rb)) ** 1.5, 0.1, 1);
}

/** Fraction of the fall threshold a deviation has reached (0 balanced, 1 falling). */
export function deviationFraction(sup: Support, s: SupportParams, fatigue: number): number {
  if (sup.state !== 'up') return 1;
  const e = hypot2(sup.xi.x, sup.xi.y);
  const crit = criticalDeviation(s, sup.posture, sup.foot ? 0 : sup.feetLock, fatigue);
  return clamp(e / Math.max(1e-6, crit), 0, 1);
}

/** Duration of an inverted-pendulum fall from the point of no return, s. */
export function fallTime(s: SupportParams, posture: number): number {
  return 0.4 * Math.sqrt(comHeightAt(s, posture) / 1.05);
}
