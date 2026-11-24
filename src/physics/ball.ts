/**
 * Football flight: 3-D projectile with quadratic drag relative to the wind.
 * Drag constant k = ½ρC_dA/m converted to yards: k = 0.0306·C_d /yd for the rulebook ball (end-on area 0.0226–0.0232 m², mass 0.397–0.425 kg, rho 1.2 kg/m³).
 *
 * BALL_DRAG (default since engine-96, BALL_DRAG=0 restores; was experimental, off; BALL_DRAG=1): the spiral's k is the NFL ball's measured in-flight deceleration.
 * Off (BALL_DRAG=0), k = 0.003027 /yd (C_d 0.099), the figure the engine was built with: a recalled spiral value, not measured on a thrown NFL ball.
 * On, k = 0.0050 /yd (interval 0.0045–0.0057; C_d about 0.16, 0.15–0.19), from BDB 2025 weeks 1–9 ball tracking: the horizontal speed of each 0.1 s interval of a pass
 * (pass_forward to pass_arrived), the first two intervals (the release frames, noisy) and the last 0.6 s dropped, k = -d ln(speed)/d(distance) by least squares within each
 * pass, pooled by air-distance band (20–35 yd 0.0057 (0.0050–0.0065), 35+ yd 0.0047 (0.0043–0.0051); tables and operator in
 * docs/reviews/2026-11-24-ball-drag-reconciliation.md and scripts/diag/ball/drag_fit.py). It is a measured physical quantity of the ball (a path-averaged C_d·A),
 * not fitted to a completion, drop or interception rate. The literature does not fix it: end-on wind-tunnel C_d disagree (Watts and Moore, Am. J. Phys. 71:791–793,
 * 2003: 0.05–0.06 on a smooth foam ball, about one-third of Rae and Streit's) and angle of attack raises a real ball's drag (Price, Moss and Gay, Am. J. Phys.
 * 88:704–710, doi 10.1119/10.0001388, on how the axis follows the path). No attitude law is modelled: the one k is the average over the throw's flight.
 *
 * The flight time is the QB's chosen quantity (QB_DRIVE's fitted T(d)) and solveLaunch re-derives the release for it, so hang time and apex by distance do not move; what
 * moves is the release speed (higher, to make up the decay) and the speed the ball arrives with (lower). What the tracking shows and the model does not: the NFL ball's
 * decay roughly doubles 0.3–0.6 s before arrival, the same for completions and incompletions. It could be tracker smoothing near the catch, or the ball's nose-over at the
 * end of the arc; it is not modelled, and it is why the last 0.6 s are left out of k. The catch roll's 24 yd/s step is not what the NFL ball avoids on short throws
 * (it carries over 24 yd/s on 30–41% of throws under 20 yd 0.6–0.8 s before arrival); that belongs to the catch rebuild, not to drag.
 */
import { G } from '../core/units.js';
import type { Vec2, Vec3 } from '../core/vec.js';

export const BALL_DRAG = process.env.BALL_DRAG !== '0';
export const DRAG_SPIRAL = BALL_DRAG ? 0.005 : 0.003027;
/** End-over-end kicks present more area. */
export const DRAG_KICK = 0.0042;
/** Wobbly/tumbling ball (deflections, fumbles). */
export const DRAG_TUMBLE = 0.006;

export interface BallFlight {
  pos: Vec3;
  vel: Vec3;
  drag: number;
}

const SUBSTEP = 0.01;

export function stepFlight(b: BallFlight, dt: number, wind: Vec2 = { x: 0, y: 0 }): void {
  let remaining = dt;
  while (remaining > 1e-9) {
    const h = Math.min(SUBSTEP, remaining);
    const rx = b.vel.x - wind.x;
    const ry = b.vel.y - wind.y;
    const rz = b.vel.z;
    const sp = Math.hypot(rx, ry, rz);
    const ax = -b.drag * sp * rx;
    const ay = -b.drag * sp * ry;
    const az = -G - b.drag * sp * rz;
    // Semi-implicit Euler (velocity first) is plenty at 10 ms.
    b.vel = { x: b.vel.x + ax * h, y: b.vel.y + ay * h, z: b.vel.z + az * h };
    b.pos = { x: b.pos.x + b.vel.x * h, y: b.pos.y + b.vel.y * h, z: b.pos.z + b.vel.z * h };
    remaining -= h;
  }
}

/** Simulate a flight for `t` seconds and return the final position. */
export function simulateTo(from: Vec3, v0: Vec3, t: number, drag: number, wind?: Vec2): Vec3 {
  const b: BallFlight = { pos: { ...from }, vel: { ...v0 }, drag };
  stepFlight(b, t, wind);
  return b.pos;
}

/** Drag-free launch velocity that reaches `to` from `from` in time T. */
export function dragFreeLaunch(from: Vec3, to: Vec3, T: number): Vec3 {
  return {
    x: (to.x - from.x) / T,
    y: (to.y - from.y) / T,
    z: (to.z - from.z) / T + 0.5 * G * T,
  };
}

/**
 * Launch velocity that hits `to` after flight time T under drag and wind
 * (shooting method: simulate, measure miss, correct).
 */
export function solveLaunch(from: Vec3, to: Vec3, T: number, drag = DRAG_SPIRAL, wind?: Vec2): Vec3 {
  let v = dragFreeLaunch(from, to, T);
  for (let i = 0; i < 8; i++) {
    const land = simulateTo(from, v, T, drag, wind);
    const mx = to.x - land.x;
    const my = to.y - land.y;
    const mz = to.z - land.z;
    if (Math.hypot(mx, my, mz) < 0.03) break;
    // Drag stretches the effective correction; 1.15/T converges in 3–5 steps.
    const k = 1.15 / T;
    v = { x: v.x + mx * k, y: v.y + my * k, z: v.z + mz * k };
  }
  return v;
}

/** Drag-free launch speed for a given flight time (fast estimate). */
export function launchSpeedFor(from: Vec3, to: Vec3, T: number): number {
  const v = dragFreeLaunch(from, to, T);
  // Drag roughly adds 1.5% per 10 yd of range at typical pass speeds.
  const range = Math.hypot(to.x - from.x, to.y - from.y);
  return Math.hypot(v.x, v.y, v.z) * (1 + 0.0015 * range);
}

/**
 * Shortest flight time whose required launch speed is within `vmax`.
 * Required speed decreases with T until the 45°-ish optimum, so bisect on
 * [small, optimum]. Returns the optimum (lob) time if out of range.
 */
export function minFlightTime(from: Vec3, to: Vec3, vmax: number): number {
  const range = Math.hypot(to.x - from.x, to.y - from.y);
  const tOpt = Math.sqrt((2 * Math.max(range, 1)) / G) * 1.02;
  if (launchSpeedFor(from, to, tOpt) > vmax) return tOpt;
  let lo = 0.05;
  let hi = tOpt;
  for (let i = 0; i < 30; i++) {
    const mid = 0.5 * (lo + hi);
    if (launchSpeedFor(from, to, mid) > vmax) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** Can the ball reach `to` at all with launch speed `vmax`? */
export function inRange(from: Vec3, to: Vec3, vmax: number): boolean {
  const range = Math.hypot(to.x - from.x, to.y - from.y);
  const tOpt = Math.sqrt((2 * Math.max(range, 1)) / G) * 1.02;
  return launchSpeedFor(from, to, tOpt) <= vmax;
}

/** Ball position along a drag-free arc at time t (for fast look-ahead checks). */
export function arcPoint(from: Vec3, v0: Vec3, t: number): Vec3 {
  return { x: from.x + v0.x * t, y: from.y + v0.y * t, z: from.z + v0.z * t - 0.5 * G * t * t };
}

/** Max release speed (yd/s) from a QB's throw power rating. 50–62 mph. */
export function qbArmSpeed(throwPower: number): number {
  return 22.5 + (Math.max(1, Math.min(99, throwPower)) / 99) * 8.6;
}
