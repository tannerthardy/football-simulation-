/**
 * Athlete movement integrator.
 *
 * The brain requests a desired velocity and facing; this module applies the
 * body's physical limits:
 *   • propulsion a_drive(v) = (V − v)/τ (from the sprint model),
 *   • braking deceleration,
 *   • lateral (centripetal) acceleration — the ability to cut,
 *   • a friction ellipse coupling tangential and normal acceleration,
 *   • facing rotation rate, and speed caps when moving sideways/backwards
 *     relative to facing (shuffle, backpedal),
 *   • fatigue.
 */
import { angleDiff, angleOf, clamp, dot, len, type Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';

export interface Body {
  pos: Vec2;
  vel: Vec2;
  /** Facing angle, radians (0 = +x, downfield for the offense). */
  facing: number;
  /** 0–1 energy reservoir. */
  energy: number;
  profile: PhysicalProfile;
  /** Seconds of recent near-max sprinting (speed endurance). */
  sprintLoad?: number;
}

export interface MoveCommand {
  /** Desired velocity, yd/s (will be clamped to what the body can do). */
  vel: Vec2;
  /** Desired facing; defaults to direction of travel. */
  facing?: number;
  /** 0–1 fraction of max effort (top speed scaling). */
  effort?: number;
  /** Multiplier on cutting ability from technique (route running, elusiveness). */
  cutSkill?: number;
}

/** Fatigue multiplier on speed/acceleration. */
export function fatigueFactor(energy: number): number {
  const deficit = 1 - clamp(energy, 0, 1);
  return 1 - 0.14 * Math.pow(deficit, 1.4);
}

/**
 * Speed cap multiplier from the angle between facing and travel direction:
 * 1 running forward, `shuffle` sideways, `backpedal` straight back.
 */
export function directionalSpeedFactor(profile: PhysicalProfile, relAngle: number): number {
  const a = Math.abs(relAngle);
  const half = Math.PI / 2;
  if (a <= half) {
    const t = a / half;
    return 1 - (1 - profile.shuffle) * t * t;
  }
  const t = (a - half) / half;
  return profile.shuffle + (profile.backpedal - profile.shuffle) * t;
}

/** Effective top speed of a body moving in direction `heading`. */
export function effectiveVmax(body: Body, heading: number, effort = 1): number {
  const rel = angleDiff(body.facing, heading);
  return body.profile.vmax * fatigueFactor(body.energy) * enduranceFactor(body) * directionalSpeedFactor(body.profile, rel) * effort;
}

/** Long sprints fade: after ~3.5 s near top speed, up to 10% slower. */
export function enduranceFactor(body: Body): number {
  return 1 - 0.1 * clamp(((body.sprintLoad ?? 0) - 3.5) / 5, 0, 1);
}

/** Propulsive acceleration available at speed `speed` toward a cap `cap`. */
export function driveAccel(profile: PhysicalProfile, speed: number, cap: number): number {
  return Math.max(0, (cap - speed) / profile.tau);
}

export function stepBody(body: Body, cmd: MoveCommand, dt: number): void {
  const p = body.profile;
  const effort = clamp(cmd.effort ?? 1, 0, 1);
  const cutSkill = cmd.cutSkill ?? 1;

  // --- facing ---
  const speed = len(body.vel);
  const desiredFacing = cmd.facing ?? (len(cmd.vel) > 0.4 ? angleOf(cmd.vel) : speed > 0.6 ? angleOf(body.vel) : body.facing);
  const turnRate = p.turnRate * (speed > 6 ? 0.75 : 1);
  const df = angleDiff(body.facing, desiredFacing);
  body.facing += clamp(df, -turnRate * dt, turnRate * dt);

  // --- desired velocity clamped by directional cap ---
  const dv0 = cmd.vel;
  const dmag = len(dv0);
  const fat = fatigueFactor(body.energy);
  let desired = dv0;
  if (dmag > 1e-6) {
    const heading = angleOf(dv0);
    const cap = p.vmax * fat * enduranceFactor(body) * directionalSpeedFactor(p, angleDiff(body.facing, heading)) * effort;
    if (dmag > cap) desired = { x: (dv0.x / dmag) * cap, y: (dv0.y / dmag) * cap };
  }

  const dvx = desired.x - body.vel.x;
  const dvy = desired.y - body.vel.y;
  let ax: number;
  let ay: number;

  if (speed < 0.35) {
    // Near standstill: isotropic, limited by initial drive.
    const cap = len(desired);
    const amax = Math.max(driveAccel(p, speed, Math.max(cap, 0.5)) * fat, p.brake * 0.5);
    ax = dvx / dt;
    ay = dvy / dt;
    const a = Math.hypot(ax, ay);
    if (a > amax) {
      ax *= amax / a;
      ay *= amax / a;
    }
  } else {
    const tx = body.vel.x / speed;
    const ty = body.vel.y / speed;
    const nx = -ty;
    const ny = tx;
    let at = (dvx * tx + dvy * ty) / dt;
    let an = (dvx * nx + dvy * ny) / dt;
    const cap = len(desired);
    const At = at >= 0 ? Math.max(driveAccel(p, speed, Math.max(cap, speed)) * fat, 0.01) : p.brake * (0.85 + 0.15 * fat);
    // Cutting is harder at high speed.
    const An = p.lateral * cutSkill * (1 - 0.2 * clamp(speed / p.vmax, 0, 1)) * (0.85 + 0.15 * fat);
    const k = (at / At) ** 2 + (an / An) ** 2;
    if (k > 1) {
      const s = 1 / Math.sqrt(k);
      at *= s;
      an *= s;
    }
    ax = at * tx + an * nx;
    ay = at * ty + an * ny;
  }

  const nvx = body.vel.x + ax * dt;
  const nvy = body.vel.y + ay * dt;
  body.pos = { x: body.pos.x + 0.5 * (body.vel.x + nvx) * dt, y: body.pos.y + 0.5 * (body.vel.y + nvy) * dt };
  body.vel = { x: nvx, y: nvy };

  // --- energy: mechanical work + speed cost ---
  const nspeed = Math.hypot(nvx, nvy);
  const frac = nspeed / p.vmax;
  body.sprintLoad = Math.max(0, (body.sprintLoad ?? 0) + (frac > 0.85 ? dt : frac < 0.7 ? -0.5 * dt : 0));
  const work = Math.max(0, ax * nvx + ay * nvy) / (p.vmax * (p.vmax / p.tau));
  const speedCost = (nspeed / p.vmax) ** 2;
  body.energy = clamp(body.energy - (0.0045 + 0.03 * work + 0.012 * speedCost) * dt, 0, 1);
}

/** Apply an external displacement velocity (e.g. engagement push) with damping. */
export function pushBody(body: Body, push: Vec2, dt: number): void {
  body.pos = { x: body.pos.x + push.x * dt, y: body.pos.y + push.y * dt };
  body.vel = { x: body.vel.x * 0.6 + push.x * 0.4, y: body.vel.y * 0.6 + push.y * 0.4 };
}

/**
 * Steering helper: desired velocity to arrive at `target` passing through it at
 * `throughSpeed` (0 = stop there), never exceeding `maxSpeed`.
 */
export function arriveVelocity(body: Body, target: Vec2, maxSpeed: number, throughSpeed = 0): Vec2 {
  const dx = target.x - body.pos.x;
  const dy = target.y - body.pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-3) return { x: 0, y: 0 };
  const brake = body.profile.brake * 0.8;
  const allowed = Math.sqrt(throughSpeed * throughSpeed + 2 * brake * Math.max(0, d - 0.15));
  const s = Math.min(maxSpeed, allowed);
  return { x: (dx / d) * s, y: (dy / d) * s };
}

export function seekVelocity(body: Body, target: Vec2, speed: number): Vec2 {
  const dx = target.x - body.pos.x;
  const dy = target.y - body.pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-3) return { x: 0, y: 0 };
  return { x: (dx / d) * speed, y: (dy / d) * speed };
}

export const speedOf = (b: Body): number => len(b.vel);
export const velAlong = (b: Body, dir: Vec2): number => dot(b.vel, dir);
