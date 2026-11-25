/** Common motor limits; no football role or technique bonuses.
 * Units: kg, yd, s. Arm speed reuses the solver's former 3 yd/s correction
 * ceiling as an explicit, unvalidated shortening-speed bound, not NFL data.
 * Muscle-work budgets concern planar mechanics, not metabolic fatigue.
 */
import { angleDiff, clamp } from '../core/vec.js';
import type { Body } from './kinematics.js';
import { baseRadiusAt, supportParams } from './support.js';
import { integrateYaw } from './yaw-response.js';

export const ARM_SPEED = 3;

/** HAND_TRAVEL (default on; `=0` restores ARM_SPEED, bit for bit): how fast an UNLOADED hand travels: the press and its fit to the man, the hand's offset
 * on a torso, the re-fit after the hand comes off (src/sim/engagement.ts). The RUSH_HANDS club and counter durations stay on ARM_SPEED: their force is armForce for as long as the hand is on the arm, so a faster hand would shorten the contact and cut the impulse. ARM_SPEED stays the contact solver's
 * LOADED ceiling (the work an arm can do, `world.ts` `armWorkLimit`, a grasp's pull-in, the hand motor), unsourced: arm power is not touched.
 *
 * 5 yd/s is a STATED CHOICE inside the sourced punch bracket, not a sourced raise time. The bracket (docs/reviews/2026-11-25-arm-speed.md): Olympic boxers' hand
 * velocity 9.14 (SD 2.06) m/s at the punch (Walilko, Viano, Bir 2005, Br J Sports Med 39:710); amateur boxers' lead hook 11.95 +- 1.84 m/s peak fist velocity
 * (Stanley et al. 2018, Int J Perform Anal Sport 18:835); a karate reverse punch about 8 m/s in under 400 ms (ISBS 2008, a search snippet). A smooth reach's
 * peak is about 1.9 times its mean, so those peaks are a mean of about 4.5-6 yd/s over the movement. No time or speed for an unloaded overhead raise or a chest reach
 * with nothing to hit is sourced (Gordon, Ghilardi and Ghez 1994: peak velocity scales with the distance; values not retrieved). The old 3 yd/s was the solver's former
 * correction ceiling, "unvalidated, not NFL data": 30% of the boxers' mean. */
const HAND_TRAVEL_SPEED = 5;
export const HAND_TRAVEL = process.env.HAND_TRAVEL !== '0' ? HAND_TRAVEL_SPEED : ARM_SPEED;
export const YAW_RESPONSE = .05;

/** Fraction of an impulse that fits a remaining positive work budget.
 * W(s) = s v_rel·J + s² |J|²/(2 m_reduced). A zero budget permits removing
 * closing energy but cannot pull resting bodies together.
 */
export function workFraction(linear: number, quadratic: number, budget: number): number {
  if (linear + quadratic <= budget + 1e-12) return 1;
  if (quadratic < 1e-18) return linear > 0 ? clamp(budget / linear, 0, 1) : 1;
  return clamp((-linear + Math.sqrt(Math.max(0, linear * linear + 4 * quadratic * Math.max(0, budget)))) / (2 * quadratic), 0, 1);
}

/** Ground yaw shares traction with translation at the support radius.
 * Inertia and ground torque bound angular acceleration. */
export function turnBody(b: Body, target: number, remaining: number, dt: number,
  turnRate: number, available: number, force: number): { impulse: number; work: number } {
  const sp = supportParams(b.profile);
  const radius = baseRadiusAt(sp, b.support?.posture ?? (.2-.2*(1-b.energy)));
  const traction = sp.traction * available;
  const torque = Math.sqrt(Math.max(0, traction * traction - force * force)) * radius;
  const acceleration = Math.min(turnRate / YAW_RESPONSE * (.3 + .7 * available), torque / sp.yawInertia);
  const targetSpin = clamp(angleDiff(b.facing, target) / Math.max(dt, remaining), -turnRate, turnRate);
  const before = b.spin ?? 0;
  const after = before + clamp(targetSpin - before, -acceleration * dt, acceleration * dt);
  b.spin = after;
  b.facing += .5 * (before + after) * dt;
  return { impulse: sp.yawInertia * (after - before), work: .5 * sp.yawInertia * (after * after - before * before) };
}

/** Fixed-response angular motor for the common-point model. The same angle,
 * spin and load request the same torque at every phase of a controller tick.
 * Critical damping uses the existing response time, not new strength or gain
 * ratings. Exact bounded flow avoids smearing a reached limit across dt.
 * `tractionLimit` is the grip the feet actually have (friction on the actual
 * normal load, times availability); without it, standing grip is assumed.
 * Turning shares that one budget with the linear ground force. */
export function turnBodyResponse(b: Body, target: number, dt: number,
  turnRate: number, available: number, force: number, tractionLimit?: number): { impulse: number; work: number; peakTorque: number } {
  const sp = supportParams(b.profile);
  const radius = baseRadiusAt(sp, b.support?.posture ?? (.2-.2*(1-b.energy)));
  const traction = tractionLimit ?? sp.traction * available;
  const torque = Math.sqrt(Math.max(0, traction * traction - force * force)) * radius;
  const acceleration = Math.min(turnRate / YAW_RESPONSE * (.3 + .7 * available), torque / sp.yawInertia);
  const before = b.spin ?? 0;
  const result = integrateYaw(angleDiff(b.facing, target), before, dt, YAW_RESPONSE, acceleration, turnRate);
  b.spin = result.spin;
  b.facing += result.angleDelta;
  return { impulse: sp.yawInertia * (result.spin - before),
    work: .5 * sp.yawInertia * (result.spin * result.spin - before * before),
    peakTorque: sp.yawInertia * result.maxAcceleration };
}
