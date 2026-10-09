/** Common motor limits; no football role or technique bonuses.
 * Units: kg, yd, s. Arm speed reuses the solver's former 3 yd/s correction
 * ceiling as an explicit, unvalidated shortening-speed bound, not NFL data.
 * Muscle-work budgets concern planar mechanics, not metabolic fatigue.
 */
import { angleDiff, clamp } from '../core/vec.js';
import type { Body } from './kinematics.js';
import { baseRadiusAt, supportParams } from './support.js';

export const ARM_SPEED = 3;
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
