/**
 * Time-to-reach estimates. Used for pursuit angles, throw-window evaluation,
 * ball-carrier lane evaluation and zone defenders breaking on the ball.
 */
import type { Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import { gaitLag } from './kinematics.js';

/** The same two controls as runThrough's speed fraction and MoveCommand.effort.
 * A wanted speed and the motor's effort ceiling are separate limits, not two
 * factors to multiply together. They never change the physical profile. */
export interface SprintRequest { speed: number; effort: number }

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
  /** Frozen speed multiplier. Legacy callers may bundle effort here; when
   * supplying a SprintRequest it must exclude that request's separate effort. */
  speedScale?: number;
}

/** Forward, aligned, unloaded scalar response. In the ordinary gait the
 * approach to a submaximal wanted speed starts at full force and levels off
 * at it: an exponential approach with time constant tau * wanted / full.
 * Under GAIT_STEP, it is capped both by the full-profile drive curve and by
 * the requested speed's leveling time. Braking above the wanted speed
 * retains momentum. This does not solve the lateral/facing/support problem. */
export function requestedSprintTime(distance: number, u0: number, wanted: number,
  full: number, tau: number, lag: number, brake: number): number {
  if (distance <= 0) return 0;
  const u = Math.max(0, u0);
  if (u > wanted) {
    const slowing = (u * u - wanted * wanted) / (2 * brake);
    if (distance <= slowing) return 2 * distance / (u + Math.sqrt(Math.max(0, u * u - 2 * brake * distance)));
    return (u - wanted) / brake + (wanted > 0 ? (distance - slowing) / wanted : Infinity);
  }
  if (wanted <= 0) return Infinity;
  // Full effort is still limited by the athlete's sprint curve even if a
  // short leveling time would request a more abrupt acceleration.
  if (wanted >= full) return sprintTime(distance, u, wanted, Math.max(tau, lag));
  if (lag >= tau) return sprintTime(distance, u, wanted, tau * wanted / full);
  const crossover = (tau * wanted - lag * full) / (tau - lag);
  if (u >= crossover) return sprintTime(distance, u, wanted, lag);
  const turnAt = tau * Math.log((full - u) / (full - crossover));
  const firstDistance = full * turnAt - tau * (crossover - u);
  if (distance <= firstDistance) return sprintTime(distance, u, full, tau);
  return turnAt + sprintTime(distance - firstDistance, crossover, wanted, lag);
}

/** Approximate redirect as before; evaluate forward travel under the actual
 * request. Effort limits wanted speed/easing, not braking or lateral capacity.
 * Frozen speedScale remains an approximation to fatigue/endurance/squeeze;
 * changing posture/support, facing, contacts and routes are not forecast. */
export function timeToReachRequested(m: Mover, target: Vec2, radius: number, request: SprintRequest): number {
  const dx = target.x - m.pos.x, dy = target.y - m.pos.y;
  const range = Math.hypot(dx, dy), distance = range - radius;
  if (distance <= 0) return 0;
  const ux = dx / (distance + radius), uy = dy / (distance + radius);
  const parallel = m.vel.x * ux + m.vel.y * uy;
  const transverse = Math.hypot(m.vel.x - parallel * ux, m.vel.y - parallel * uy);
  const p = m.profile;
  const full = p.vmax * (m.speedScale ?? 1);
  const wanted = Math.min(p.vmax * Math.max(0, request.speed), full * Math.max(0, Math.min(1, request.effort)));
  const penalty = .5 * transverse / p.lateral + (parallel < 0 ? -parallel / p.brake : 0);
  const overshoot = parallel < 0 ? parallel * parallel / (2 * p.brake) : 0;
  return penalty + requestedSprintTime(distance + overshoot, Math.max(0, parallel), wanted, full,
    p.tau, gaitLag(p), p.brake);
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

export const REQUEST_REACH_ASSUMPTIONS = {
  model: 'requested-sprint-with-approximate-redirect',
  targetPath: REACH_ESTIMATE_ASSUMPTIONS.targetPath,
  speed: 'min(profile.vmax * requested speed, profile.vmax * speedScale * effort); frozen scale',
  propulsion: 'submaximal wanted-speed easing; GAIT_STEP also bounded by full-profile drive; overspeed brakes toward budget',
  requestScope: 'held scalar sprint budget; reassessed by normal cadence; bias/shade, gather/navigation and contact overrides are not evaluated',
  redirect: REACH_ESTIMATE_ASSUMPTIONS.redirect,
  omitted: 'body facing/yaw, support/load, near-stop drive floor, posture and evolving fatigue, contacts, obstacles and subsequent target changes',
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
  assumptions: typeof REACH_ESTIMATE_ASSUMPTIONS | typeof REQUEST_REACH_ASSUMPTIONS;
  request?: SprintRequest & { requestedSpeed: number; wantedSpeedCeiling: number; levelingTime: number };
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
  opts: { horizon?: number; step?: number; radius?: number; recordSamples?: boolean; request?: SprintRequest } = {},
): InterceptPrediction {
  const horizon = opts.horizon ?? 4;
  const step = opts.step ?? 0.1;
  const radius = opts.radius ?? 0.5;
  const samples: InterceptSample[] | undefined = opts.recordSamples ? [] : undefined;
  const request = opts.request && { speed: opts.request.speed, effort: opts.request.effort };
  let best = { t: horizon, point: path(horizon), slack: Infinity, arrivalTime: null as number | null };
  const result = (t: number, point: Vec2, arrivalTime: number | null,
    status: InterceptEstimate['status']): InterceptPrediction => ({ t, point,
    estimate: { status, horizon, step, radius, arrivalTime, slack: arrivalTime === null ? null : t - arrivalTime,
      physicalGuarantee: false, assumptions: request ? REQUEST_REACH_ASSUMPTIONS : REACH_ESTIMATE_ASSUMPTIONS,
      ...(request ? { request: { ...request, requestedSpeed: m.profile.vmax * Math.max(0, request.speed),
        wantedSpeedCeiling: Math.min(m.profile.vmax * Math.max(0, request.speed),
          m.profile.vmax * (m.speedScale ?? 1) * Math.max(0, Math.min(1, request.effort))),
        levelingTime: gaitLag(m.profile) } } : {}) }, ...(samples ? { samples } : {}) });
  for (let t = 0; t <= horizon + 1e-9; t += step) {
    const pt = path(t);
    const tt = request ? timeToReachRequested(m, pt, radius, request) : timeToReach(m, pt, radius);
    samples?.push({ t, point: { ...pt }, arrivalTime: tt, slack: t - tt, estimatedFeasible: tt <= t });
    if (tt <= t) return result(t, pt, tt, 'estimated-feasible');
    const slack = tt - t;
    if (slack < best.slack) best = { t, point: pt, slack, arrivalTime: tt };
  }
  return result(best.t, best.point, best.arrivalTime, 'fallback-no-estimated-feasible-candidate');
}
