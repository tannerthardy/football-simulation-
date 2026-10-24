/**
 * Time-to-reach estimates. Used for pursuit angles, throw-window evaluation,
 * ball-carrier lane evaluation and zone defenders breaking on the ball.
 */
import type { Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';

/**
 * Time to cover distance D starting at speed u0 under the sprint model:
 * d(t) = V t − (V − u0) τ (1 − e^(−t/τ)). Newton from an upper bound
 * (d is convex in t, so iterates decrease monotonically onto the root).
 */
export function sprintTime(distance: number, u0: number, vmax: number, tau: number): number {
  if (distance <= 0) return 0;
  const u = Math.min(Math.max(u0, 0), vmax);
  let t = distance / vmax + tau;
  for (let i = 0; i < 8; i++) {
    const e = Math.exp(-t / tau);
    const d = vmax * t - (vmax - u) * tau * (1 - e) - distance;
    const v = vmax - (vmax - u) * e;
    const step = d / Math.max(v, 0.1);
    t -= step;
    if (Math.abs(step) < 1e-4) break;
  }
  return Math.max(0, t);
}

export interface Mover {
  pos: Vec2;
  vel: Vec2;
  profile: PhysicalProfile;
  /** Optional speed multiplier (fatigue, effort). */
  speedScale?: number;
}

/**
 * Estimated time for `m` to reach `target` (arrive within `radius`).
 * Accounts for current velocity: velocity toward the target is a head start;
 * velocity away from it or sideways must first be killed.
 */
export function timeToReach(m: Mover, target: Vec2, radius = 0): number {
  const dx = target.x - m.pos.x;
  const dy = target.y - m.pos.y;
  const D = Math.hypot(dx, dy) - radius;
  if (D <= 0) return 0;
  const ux = dx / (D + radius);
  const uy = dy / (D + radius);
  const vpar = m.vel.x * ux + m.vel.y * uy;
  const vperpX = m.vel.x - vpar * ux;
  const vperpY = m.vel.y - vpar * uy;
  const vperp = Math.hypot(vperpX, vperpY);
  const p = m.profile;
  const vmax = p.vmax * (m.speedScale ?? 1);

  // Redirect penalty: lateral velocity bleeds off while accelerating toward the
  // target, so only part of it costs time.
  let penalty = (0.5 * vperp) / p.lateral;
  let extra = 0;
  let u0 = vpar;
  if (vpar < 0) {
    penalty += -vpar / p.brake;
    extra = (vpar * vpar) / (2 * p.brake);
    u0 = 0;
  }
  return penalty + sprintTime(D + extra, u0, vmax, p.tau);
}

export const REACH_ESTIMATE_ASSUMPTIONS = {
  model: 'sprint-with-approximate-redirect',
  targetPath: 'caller-supplied; information source is not validated by this estimator',
  speed: 'profile.vmax * speedScale; exponential sprint with profile.tau',
  redirect: 'half transverse-speed/lateral penalty; away braking time plus overshoot distance',
  omitted: 'requested effort, body facing/yaw, support/load, contacts, obstacles and subsequent target changes',
} as const;

export interface InterceptEstimate {
  status: 'estimated-feasible' | 'fallback-no-estimated-feasible-candidate';
  horizon: number;
  step: number;
  radius: number;
  /** Seconds from now, for this sampled point, not a World movement preview. */
  arrivalTime: number | null;
  /** Target sample time minus estimated arrival time; positive means estimated spare time. */
  slack: number | null;
  physicalGuarantee: false;
  assumptions: typeof REACH_ESTIMATE_ASSUMPTIONS;
}

export interface InterceptSample { t: number; point: Vec2; arrivalTime: number; slack: number; estimatedFeasible: boolean }
export interface InterceptPrediction { t: number; point: Vec2; estimate: InterceptEstimate; samples?: InterceptSample[] }

/** First sampled point passing timeToReach's approximate test, or the sampled
 * point with least estimated lateness. Neither branch guarantees physical
 * arrival. `path(t)` is the caller's forecast at seconds from now.
 */
export function interceptPoint(
  m: Mover,
  path: (t: number) => Vec2,
  opts: { horizon?: number; step?: number; radius?: number; recordSamples?: boolean } = {},
): InterceptPrediction {
  const horizon = opts.horizon ?? 4;
  const step = opts.step ?? 0.1;
  const radius = opts.radius ?? 0.5;
  const samples: InterceptSample[] | undefined = opts.recordSamples ? [] : undefined;
  let best = { t: horizon, point: path(horizon), slack: Infinity, arrivalTime: null as number | null };
  const result = (t: number, point: Vec2, arrivalTime: number | null,
    status: InterceptEstimate['status']): InterceptPrediction => ({ t, point,
    estimate: { status, horizon, step, radius, arrivalTime, slack: arrivalTime === null ? null : t - arrivalTime,
      physicalGuarantee: false, assumptions: REACH_ESTIMATE_ASSUMPTIONS }, ...(samples ? { samples } : {}) });
  for (let t = 0; t <= horizon + 1e-9; t += step) {
    const pt = path(t);
    const tt = timeToReach(m, pt, radius);
    samples?.push({ t, point: { ...pt }, arrivalTime: tt, slack: t - tt, estimatedFeasible: tt <= t });
    if (tt <= t) return result(t, pt, tt, 'estimated-feasible');
    const slack = tt - t;
    if (slack < best.slack) best = { t, point: pt, slack, arrivalTime: tt };
  }
  return result(best.t, best.point, best.arrivalTime, 'fallback-no-estimated-feasible-candidate');
}
