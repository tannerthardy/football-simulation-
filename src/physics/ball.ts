/**
 * Football flight: 3-D projectile with quadratic drag relative to the wind.
 * Drag constant k = ½ρC_dA/m converted to yards: a spiral (C_d ≈ 0.10,
 * nose-on area 0.0227 m², 0.42 kg) gives k ≈ 0.0030 /yd.
 */
import { G } from '../core/units.js';
import type { Vec2, Vec3 } from '../core/vec.js';

export const DRAG_SPIRAL = 0.003027;
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
