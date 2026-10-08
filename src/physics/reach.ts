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

/**
 * Earliest interception of a target moving along a predicted path.
 * `path(t)` gives the target's position at time t from now. Returns the time
 * and point where the pursuer can first arrive no later than the target.
 */
export function interceptPoint(
  m: Mover,
  path: (t: number) => Vec2,
  opts: { horizon?: number; step?: number; radius?: number } = {},
): { t: number; point: Vec2 } {
  const horizon = opts.horizon ?? 4;
  const step = opts.step ?? 0.1;
  const radius = opts.radius ?? 0.5;
  let best = { t: horizon, point: path(horizon), slack: Infinity };
  for (let t = 0; t <= horizon + 1e-9; t += step) {
    const pt = path(t);
    const tt = timeToReach(m, pt, radius);
    if (tt <= t) return { t, point: pt };
    const slack = tt - t;
    if (slack < best.slack) best = { t, point: pt, slack };
  }
  return { t: best.t, point: best.point };
}
