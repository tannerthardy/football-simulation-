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
import type { Support } from './support.js';
import { supportParams } from './support.js';
import { turnBody } from './actuation.js';

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
  /** Shoulder-turn posture, entered/exited over time; separate from gaze/facing. */
  squeeze?: number;
  squeezeHeading?: number;
  /** Yaw rate, rad/s (physics world; contact torque can spin a body). */
  spin?: number;
  /** Body-owned balance state (physics/support.ts), created by the world. */
  support?: Support;
}

export interface MoveCommand {
  /** Desired velocity, yd/s (will be clamped to what the body can do). */
  vel: Vec2;
  /** Desired facing; defaults to direction of travel. */
  facing?: number;
  /** 0–1 fraction of max effort (top speed scaling). */
  effort?: number;
  /** Use available propulsion toward the requested speed, without the ordinary
   * moderate-speed easing. Drive/cutting/traction limits still apply; this
   * requests an action, not more capacity or a guaranteed acceleration. */
  propulsion?: 'full';
  /** Multiplier on cutting ability from technique (route running, elusiveness). */
  cutSkill?: number;
  /** 0–1 demand to turn shoulders through a narrow opening. */
  squeeze?: number;
}

/** 1 − 0.14·deficit^1.4, tabulated: it is evaluated many times per tick. */
const FATIGUE_STEPS = 4096;
const FATIGUE = Float64Array.from({ length: FATIGUE_STEPS + 1 }, (_, k) => 1 - 0.14 * Math.pow(k / FATIGUE_STEPS, 1.4));

/** Fatigue multiplier on speed/acceleration. */
export function fatigueFactor(energy: number): number {
  const deficit = 1 - (energy < 0 ? 0 : energy > 1 ? 1 : energy);
  if (deficit <= 0) return 1;
  const x = deficit * FATIGUE_STEPS;
  const k = Math.floor(x);
  if (k >= FATIGUE_STEPS) return FATIGUE[FATIGUE_STEPS];
  return FATIGUE[k] + (FATIGUE[k + 1] - FATIGUE[k]) * (x - k);
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
  return body.profile.vmax * fatigueFactor(body.energy) * enduranceFactor(body) * (1 - 0.08 * (body.squeeze ?? 0)) * directionalSpeedFactor(body.profile, rel) * effort;
}

/** Long sprints fade: after ~3.5 s near top speed, up to 10% slower. */
export function enduranceFactor(body: Body): number {
  return 1 - 0.1 * clamp(((body.sprintLoad ?? 0) - 3.5) / 5, 0, 1);
}

/** Experimental (GAIT_STEP=seconds, off by default): time over which a player
 * levels off at a wanted speed below his top speed. */
const GAIT_STEP = Number(process.env.GAIT_STEP ?? 0);

/** The lag a controller should expect when it asks for a speed below his
 * top speed: the sprint time constant, or the leveling time under GAIT_STEP. */
export function gaitLag(profile: PhysicalProfile): number {
  return GAIT_STEP || profile.tau;
}

/** Propulsive acceleration available at speed `speed` toward a cap `cap`. */
export function driveAccel(profile: PhysicalProfile, speed: number, cap: number): number {
  return Math.max(0, (cap - speed) / profile.tau);
}

/** Shoulder-turn posture toward the command's squeeze demand, at a finite rate. */
export function updateSqueeze(body: Body, cmd: MoveCommand, dt: number): void {
  const p = body.profile;
  const desiredSqueeze = clamp(cmd.squeeze ?? 0, 0, 1);
  body.squeeze = clamp((body.squeeze ?? 0) + clamp(desiredSqueeze - (body.squeeze ?? 0), -3 * dt, 4 * dt), 0, 1);
  if (Math.hypot(cmd.vel.x, cmd.vel.y) > 0.4) {
    const h = angleOf(cmd.vel);
    const previous = body.squeezeHeading ?? h;
    body.squeezeHeading = previous + clamp(angleDiff(previous, h), -p.turnRate * dt, p.turnRate * dt);
  }
}

/** Facing a command asks for: explicit, else direction of travel. */
export function commandFacing(body: Body, cmd: MoveCommand): number {
  const speed = len(body.vel);
  return cmd.facing ?? (len(cmd.vel) > 0.4 ? angleOf(cmd.vel) : speed > 0.6 ? angleOf(body.vel) : body.facing);
}

/** Maximum yaw rate at the current speed. */
export function turnRateOf(body: Body): number {
  return body.profile.turnRate * (len(body.vel) > 6 ? 0.75 : 1);
}

/**
 * Free-movement acceleration toward a command over `dt`, within the body's
 * calibrated envelope at its current facing: propulsion from the sprint
 * model, braking, lateral (cutting) limits and the friction ellipse.
 * `capacity` (0–1) scales the envelope when the feet are busy recovering
 * balance. This is the gait's planned acceleration; contact loads are not
 * included.
 */
export function locomotionAccel(body: Body, cmd: MoveCommand, dt: number, capacity = 1): Vec2 {
  const p = body.profile;
  const squeeze = body.squeeze ?? 0;
  // A narrower profile costs burst/cutting control; it is not free agility.
  const effort = clamp(cmd.effort ?? 1, 0, 1) * (1 - 0.08 * squeeze);
  const cutSkill = (cmd.cutSkill ?? 1) * (1 - 0.12 * squeeze);
  const speed = len(body.vel);
  const fullDrive = cmd.propulsion === 'full';

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
    const amax = Math.max(driveAccel(p, speed, GAIT_STEP || fullDrive ? p.vmax * fat : Math.max(cap, 0.5)) * fat, p.brake * 0.5) * capacity;
    ax = dvx / (GAIT_STEP ? Math.max(dt, GAIT_STEP) : dt);
    ay = dvy / (GAIT_STEP ? Math.max(dt, GAIT_STEP) : dt);
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
    // The envelope is what the legs can produce at this speed: propulsion
    // on the sprint (force-velocity) curve or braking, and cutting, which
    // is harder at high speed. Head straight for the wanted velocity, as
    // hard as the envelope allows in that direction.
    const At = (at >= 0 ? Math.max(driveAccel(p, speed, p.vmax * fat) * fat, 0.01) : p.brake * (0.85 + 0.15 * fat)) * capacity;
    const An = p.lateral * cutSkill * (1 - 0.2 * clamp(speed / p.vmax, 0, 1)) * (0.85 + 0.15 * fat) * capacity;
    const k = (at / Math.max(At, 1e-9)) ** 2 + (an / Math.max(An, 1e-9)) ** 2;
    if (k > 1) {
      const s = 1 / Math.sqrt(k);
      at *= s;
      an *= s;
    }
    // Speeding up follows the sprint curve toward the wanted speed: a
    // player who wants three-quarter speed pushes with about three-quarter
    // effort. The share of the envelope that leaves free goes to the cut.
    // GAIT_STEP (experimental, off by default): he pushes as hard as the
    // force-velocity curve allows and levels off over about two steps,
    // instead of approaching every wanted speed on the sprint time constant.
    // A requested short clearance step can use the same propulsion as a
    // sprint while retaining a lower speed target and its braking geometry.
    const ease = fullDrive ? driveAccel(p, speed, p.vmax * fat) * fat * capacity : GAIT_STEP
      ? Math.min(driveAccel(p, speed, p.vmax * fat) * fat, Math.max(0, cap - speed) / GAIT_STEP) * capacity
      : driveAccel(p, speed, Math.max(cap, speed)) * fat * capacity;
    if (at > ease) {
      at = ease;
      const room = An * Math.sqrt(Math.max(0, 1 - (at / Math.max(At, 1e-9)) ** 2));
      const want = (dvx * nx + dvy * ny) / dt;
      an = clamp(want, -room, room);
    }
    ax = at * tx + an * nx;
    ay = at * ty + an * ny;
  }
  return { x: ax, y: ay };
}

/**
 * The part of an actual acceleration the feet can follow under control: the
 * largest free-movement envelope at the current speed (full drive, braking,
 * lateral ellipse). The remainder displaces the body's support.
 */
export function followAccel(body: Body, a: Vec2, cutSkill = 1, capacity = 1): Vec2 {
  const p = body.profile;
  const speed = len(body.vel);
  const fat = fatigueFactor(body.energy);
  const amag = Math.hypot(a.x, a.y);
  if (amag < 1e-12) return { x: 0, y: 0 };
  if (speed < 0.35) {
    const amax = Math.max(driveAccel(p, speed, p.vmax * fat) * fat, p.brake * 0.5) * capacity;
    return amag > amax ? { x: a.x * amax / amag, y: a.y * amax / amag } : { x: a.x, y: a.y };
  }
  const tx = body.vel.x / speed, ty = body.vel.y / speed;
  const at = a.x * tx + a.y * ty, an = -a.x * ty + a.y * tx;
  const At = (at >= 0 ? Math.max(driveAccel(p, speed, p.vmax * fat) * fat, 0.01) : p.brake * (0.85 + 0.15 * fat)) * capacity;
  const An = p.lateral * cutSkill * (1 - 0.2 * clamp(speed / p.vmax, 0, 1)) * (0.85 + 0.15 * fat) * capacity;
  const k = (at / Math.max(At, 1e-9)) ** 2 + (an / Math.max(An, 1e-9)) ** 2;
  if (k <= 1) return { x: a.x, y: a.y };
  const s = 1 / Math.sqrt(k);
  return { x: (at * tx - an * ty) * s, y: (at * ty + an * tx) * s };
}

/** Metabolic proxy: base, planned work, speed, and isometric pushing.
 * additionalWork is delivered positive action work per kg (yd²/s²), already
 * integrated over the active interval; it must be charged only once. velocity
 * may be the last active velocity when later passive motion ends the tick. */
export function spendEnergy(body: Body, accel: Vec2, isometric: number, dt: number, additionalWork = 0, velocity = body.vel): void {
  const p = body.profile;
  const nspeed = Math.hypot(velocity.x, velocity.y);
  const frac = nspeed / p.vmax;
  body.sprintLoad = Math.max(0, (body.sprintLoad ?? 0) + (frac > 0.85 ? dt : frac < 0.7 ? -0.5 * dt : 0));
  const work = Math.max(0, accel.x * velocity.x + accel.y * velocity.y) / (p.vmax * (p.vmax / p.tau));
  const speedCost = (nspeed / p.vmax) ** 2;
  const cost = (0.0045 + 0.03 * work + 0.012 * speedCost + 0.03 * clamp(isometric, 0, 1.5)) * dt;
  body.energy = clamp(body.energy - (cost + 0.03 * additionalWork / (p.vmax * (p.vmax / p.tau))), 0, 1);
}

export function stepBody(body: Body, cmd: MoveCommand, dt: number): void {
  updateSqueeze(body, cmd, dt);
  // --- facing ---
  const turnRate = turnRateOf(body);
  const df = angleDiff(body.facing, commandFacing(body, cmd));
  const target = body.facing + clamp(df, -turnRate * dt, turnRate * dt);
  const beforeFacing = body.facing;
  body.facing = target;
  const a = locomotionAccel(body, cmd, dt);
  body.facing = beforeFacing;
  const traction = supportParams(body.profile).traction;
  const force = Math.hypot(a.x,a.y) * body.profile.massKg;
  if (force > traction) { a.x *= traction / force; a.y *= traction / force; }
  turnBody(body,target,dt,dt,turnRate,1,Math.min(force,traction));
  const nvx = body.vel.x + a.x * dt;
  const nvy = body.vel.y + a.y * dt;
  body.pos = { x: body.pos.x + 0.5 * (body.vel.x + nvx) * dt, y: body.pos.y + 0.5 * (body.vel.y + nvy) * dt };
  body.vel = { x: nvx, y: nvy };

  // --- energy: mechanical work + speed cost ---
  spendEnergy(body, a, 0, dt);
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

/** Approach a moving contact point with bounded relative closing speed.
 * Match motion across the bearing, and budget the remaining closure using
 * this body's existing acceleration envelope. This is a steering estimate;
 * the world still supplies the actual forces and can fail to execute it.
 * `throughSpeed` is the controller's requested relative speed at contact.
 */
export function movingArrivalVelocity(body: Body, target: Vec2, targetVelocity: Vec2,
  maxSpeed: number, radius: number, throughSpeed: number, cutSkill=1, capacity=1): Vec2 {
  const dx=target.x-body.pos.x,dy=target.y-body.pos.y,d=Math.hypot(dx,dy);
  if(d<1e-9){
    const speed=Math.hypot(targetVelocity.x,targetVelocity.y),scale=Math.min(1,maxSpeed/Math.max(1e-9,speed));
    return {x:targetVelocity.x*scale,y:targetVelocity.y*scale};
  }
  const ux=dx/d,uy=dy/d,nx=-uy,ny=ux;
  const brake=followAccel(body,{x:-ux*1e3,y:-uy*1e3},cutSkill,capacity);
  const available=Math.max(0,-brake.x*ux-brake.y*uy);
  const close=Math.sqrt(throughSpeed*throughSpeed+2*available*Math.max(0,d-radius));
  const across=clamp(targetVelocity.x*nx+targetVelocity.y*ny,-maxSpeed,maxSpeed);
  const cap=Math.sqrt(Math.max(0,maxSpeed*maxSpeed-across*across));
  const toward=clamp(targetVelocity.x*ux+targetVelocity.y*uy+close,-cap,cap);
  return {x:ux*toward+nx*across,y:uy*toward+ny*across};
}

/** Speed that can round a waypoint within the controller's capture radius.
 * The tangent arc has R = radius / tan(turn/2); centripetal demand is v²/R.
 * This plans braking; it never changes the body's velocity or force limits. */
export function cornerSpeed(body: Body, corner: Vec2, next: Vec2, radius: number): number {
  const ix = corner.x-body.pos.x, iy = corner.y-body.pos.y;
  const ox = next.x-corner.x, oy = next.y-corner.y;
  const inLen = Math.hypot(ix,iy), outLen = Math.hypot(ox,oy);
  if (inLen < 1e-6 || outLen < 1e-6) return 0;
  const cosine = clamp((ix*ox+iy*oy)/(inLen*outLen),-1,1);
  if (cosine > 1-1e-6) return body.profile.vmax;
  const tanHalf = Math.sqrt((1-cosine)/Math.max(1e-9,1+cosine));
  const arcRadius = Math.min(radius, inLen, outLen) / tanHalf;
  const lateral = body.profile.lateral * 0.8; // the existing high-speed envelope
  return Math.min(body.profile.vmax, Math.sqrt(lateral * arcRadius));
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

/** Free-movement demand for a contact controller, without advancing the
 * original body. Contact can combine this demand with bracing in one budget.
 */
export function movementDemand(body: Body, command: MoveCommand, dt: number): { impulse: Vec2; facing: number; energy: number } {
  const candidate: Body = { ...body, pos: { ...body.pos }, vel: { ...body.vel } };
  stepBody(candidate, command, dt);
  return { impulse: { x: (candidate.vel.x - body.vel.x) * body.profile.massKg,
    y: (candidate.vel.y - body.vel.y) * body.profile.massKg }, facing: candidate.facing, energy: candidate.energy };
}
