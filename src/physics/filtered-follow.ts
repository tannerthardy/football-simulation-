import type { Vec2 } from '../core/vec.js';
import { driveAccel, fatigueFactor, followAccel, type Body } from './kinematics.js';

export interface FilteredFollowIntegral {
  /** Integral of the acceleration followed by the feet, in yd/s. */
  integral: Vec2;
  /** Summed Simpson estimate in yd/s, not a rigorous bound. Null means the
   * evaluation cap left part of the interval without an error estimate. */
  errorEstimate: number | null;
  /** False if the numerical subdivision limit prevented the requested accuracy. */
  converged: boolean;
  /** Number of calls to followAccel; bounded by 4096 plus interval endpoints. */
  evaluations: number;
}

/** Integrate followAccel for a(t)=target+(initial-target)exp(-t/tau).
 * Velocity, energy, profile, cut skill and capacity are frozen for this call.
 * Split at tangential sign and envelope crossings before bounded quadrature;
 * this does not resolve moving-body dynamics or the timing of impulses.
 * tolerance is an absolute integral error target, not a physical parameter.
 */
export function integrateFilteredFollow(body: Body, initial: Vec2, target: Vec2,
  tau: number, dt: number, cutSkill = 1, capacity = 1, tolerance = 1e-9): FilteredFollowIntegral {
  if (!(tau > 0) || !(dt >= 0) || !(tolerance > 0) ||
    ![tau, dt, tolerance, initial.x, initial.y, target.x, target.y].every(Number.isFinite)) {
    throw new RangeError('Expected finite filter inputs, positive tau/tolerance and nonnegative dt');
  }
  if (dt === 0) return { integral: { x: 0, y: 0 }, errorEstimate: 0, converged: true, evaluations: 0 };
  const dx = initial.x - target.x, dy = initial.y - target.y;
  const speed = Math.hypot(body.vel.x, body.vel.y), fat = fatigueFactor(body.energy), p = body.profile;
  const tx = speed < 0.35 ? 1 : body.vel.x / speed;
  const ty = speed < 0.35 ? 0 : body.vel.y / speed;
  const ut = target.x * tx + target.y * ty, un = -target.x * ty + target.y * tx;
  const vt = dx * tx + dy * ty, vn = -dx * ty + dy * tx;
  const times = [0, dt];
  // Resolve the initial filter layer even when dt is many time constants;
  // endpoint/midpoint sampling alone can otherwise miss that layer.
  for (let t = tau; t < dt; t *= 2) times.push(t);
  const addRoot = (q: number) => {
    if (q > 0 && q < 1) {
      const time = -tau * Math.log(q);
      if (time > 0 && time < dt) times.push(time);
    }
  };
  if (speed >= 0.35 && vt !== 0) addRoot(-ut / vt);
  const isotropic = Math.max(driveAccel(p, speed, p.vmax * fat) * fat, p.brake * 0.5) * capacity;
  const lateral = p.lateral * cutSkill * (1 - 0.2 * Math.min(1, Math.max(0, speed / p.vmax))) * (0.85 + 0.15 * fat) * capacity;
  for (const forward of [true, false]) {
    const tangential = speed < 0.35 ? isotropic :
      (forward ? Math.max(driveAccel(p, speed, p.vmax * fat) * fat, 0.01) : p.brake * (0.85 + 0.15 * fat)) * capacity;
    const at = Math.max(tangential, 1e-9), an = Math.max(speed < 0.35 ? isotropic : lateral, 1e-9);
    const a = (vt / at) ** 2 + (vn / an) ** 2;
    const b = 2 * (ut * vt / (at * at) + un * vn / (an * an));
    const c = (ut / at) ** 2 + (un / an) ** 2 - 1;
    const discriminant = b * b - 4 * a * c;
    if (a > 0 && discriminant >= 0) {
      // Stable quadratic roots even when one crossing is near zero.
      const z = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(discriminant));
      if (z !== 0) { addRoot(z / a); addRoot(c / z); }
      else addRoot(-b / (2 * a));
    }
    if (speed < 0.35) break;
  }
  times.sort((a, b) => a - b);
  let evaluations = 0;
  const value = (t: number): Vec2 => {
    evaluations++;
    const q = Math.exp(-t / tau);
    return followAccel(body, { x: target.x + dx * q, y: target.y + dy * q }, cutSkill, capacity);
  };
  const simpson = (a: number, b: number, fa: Vec2, fm: Vec2, fb: Vec2): Vec2 => ({
    x: (b - a) * (fa.x + 4 * fm.x + fb.x) / 6,
    y: (b - a) * (fa.y + 4 * fm.y + fb.y) / 6,
  });
  let errorEstimate: number | null = 0, converged = true;
  const integrate = (a: number, b: number, fa: Vec2, fm: Vec2, fb: Vec2, whole: Vec2, budget: number, depth: number): Vec2 => {
    if (evaluations >= 4096) {
      converged = false;
      errorEstimate = null;
      return whole;
    }
    const mid = (a + b) / 2, fl = value((a + mid) / 2), fr = value((mid + b) / 2);
    const left = simpson(a, mid, fa, fl, fm), right = simpson(mid, b, fm, fr, fb);
    const ex = (left.x + right.x - whole.x) / 15, ey = (left.y + right.y - whole.y) / 15;
    const error = Math.hypot(ex, ey);
    if (error <= budget || depth === 0) {
      if (errorEstimate !== null) errorEstimate += error;
      if (error > budget) converged = false;
      return { x: left.x + right.x + ex, y: left.y + right.y + ey };
    }
    const l = integrate(a, mid, fa, fl, fm, left, budget / 2, depth - 1);
    const r = integrate(mid, b, fm, fr, fb, right, budget / 2, depth - 1);
    return { x: l.x + r.x, y: l.y + r.y };
  };
  const integral = { x: 0, y: 0 };
  for (let i = 1; i < times.length; i++) {
    const a = times[i - 1], b = times[i];
    if (a === b) continue;
    const fa = value(a), fm = value((a + b) / 2), fb = value(b);
    const part = integrate(a, b, fa, fm, fb, simpson(a, b, fa, fm, fb), tolerance * (b - a) / dt, 16);
    integral.x += part.x; integral.y += part.y;
  }
  return { integral, errorEstimate, converged, evaluations };
}
