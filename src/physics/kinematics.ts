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
import { hypot2, angleDiff, angleOf, clamp, dot, len, type Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Support } from './support.js';
import { supportParams } from './support.js';
import { turnBodyResponse } from './actuation.js';

export interface Body {
  pos: Vec2;
  vel: Vec2;
  /** Facing angle, radians (0 = +x, downfield for the offense). */
  facing: number;
  /** 0–1 fast energy pool: what hard work spends now and the next tens of
   * seconds of rest refill (phosphocreatine-like). Every fatigue reader
   * takes this. Between plays it refills only up to the game's slow
   * reserve (game.ts), so it carries both pools. */
  energy: number;
  profile: PhysicalProfile;
  /** Seconds of recent near-max sprinting (speed endurance). */
  sprintLoad?: number;
  /** Shoulder-turn posture, entered/exited over time; separate from gaze/facing. */
  squeeze?: number;
  squeezeHeading?: number;
  /** Yaw rate, rad/s (physics world; contact torque can spin a body). */
  spin?: number;
  /** TRUNK_TWIST: shoulders minus hips, radians, within ±TRUNK_RANGE. `facing` stays the hips (the gait heading the
   * speed cap, the turn motor and the base read); the shoulders are `facing + trunk`. Absent or 0 = shoulders on the hips. */
  trunk?: number;
  /** DIR_START: his first step is planned before the start (see `DIR_START`), so that one start is loaded for its direction and pays no direction penalty. Set by the play at the snap cue,
   * cleared when the start ends or the assignment changes; absent or false = a reaction. */
  loaded?: boolean;
  /** Body-owned balance state (physics/support.ts), created by the world. */
  support?: Support;
}

export interface MoveCommand {
  /** Desired velocity, yd/s (will be clamped to what the body can do). */
  vel: Vec2;
  /** Desired facing; defaults to direction of travel. */
  facing?: number;
  /** TRUNK_TWIST: where he wants his shoulders to point (absolute heading, radians) while his hips stay on the gait.
   * The trunk follows it within TRUNK_RANGE of the hips at TRUNK_RATE; undefined lets the trunk return to the hips. A
   * look at the ball or the QB from a body running another way asks for this; a technique that turns the hips
   * (coverage open / square / turn-and-run, a blocker's hips) keeps asking for `facing`. */
  look?: number;
  /** 0–1 fraction of max effort (top speed scaling). */
  effort?: number;
  /** Multiplier on cutting ability from technique (route running, elusiveness). */
  cutSkill?: number;
  /** 0–1 demand to turn shoulders through a narrow opening. */
  squeeze?: number;
  /** 0–1 share of his start force he chooses to push with when speeding up (default 1: a full start). The body's
   * capacity is unchanged; braking and cutting are not scaled. Used by a receiver getting off the line under
   * control (LINE_START). */
  drive?: number;
}

/** Output lost at an empty fast pool, and how sharply the loss grows with
 * the deficit. A partly drained pool still supports a near-full burst; the
 * loss grows as it runs low (repeated max efforts: Gaitanos 1993; recovery
 * tracks phosphocreatine, Mendez-Villanueva 2012). */
export const FATIGUE_MAX_LOSS = 0.3;
export const FATIGUE_SHAPE = 2.5;
/** 1 − FATIGUE_MAX_LOSS·deficit^FATIGUE_SHAPE, tabulated: it is evaluated many times per tick. */
const FATIGUE_STEPS = 4096;
const FATIGUE = Float64Array.from({ length: FATIGUE_STEPS + 1 }, (_, k) => 1 - FATIGUE_MAX_LOSS * Math.pow(k / FATIGUE_STEPS, FATIGUE_SHAPE));

/** TRUNK_TWIST (experimental, off; TRUNK_TWIST=1; open-run cap, docs/reviews/2026-11-14-open-run-cap.md): the shoulders
 * twist off the hips within TRUNK_RANGE. T = 55° is a stated choice, not a fit to film: the NFL envelope (BDB 2025
 * weeks 1-3, flipped player-plays removed) puts the twist at 52-58° for WR at 98-128° of shoulder angle off the path,
 * and trunk rotation is about 35-45° a side standing, the rest being the pelvis turning a little off the path, which
 * the hips' lead already allows. Sensitivity 45 / 65 via TRUNK_RANGE_DEG. The rate, 360°/s, is a stated choice of the
 * order trunk rotation takes in a quick look over the shoulder (several hundred °/s); only transients depend on it. */
export const TRUNK_TWIST = process.env.TRUNK_TWIST !== '0';
export const TRUNK_RANGE = (Number(process.env.TRUNK_RANGE_DEG ?? 55) * Math.PI) / 180;
export const TRUNK_RATE = (Number(process.env.TRUNK_RATE_DEG ?? 360) * Math.PI) / 180;

/** The hips: the gait heading (the speed cap, the turn motor, the base and the anchor read this). */
export function hipsOf(body: Body): number { return body.facing; }
/** The shoulders: where his chest points (hand fit, a catch's alignment to the ball, his front in a hit). With no
 * twist (TRUNK_TWIST off, or nothing asked) these are the hips, bit for bit. */
export function shouldersOf(body: Body): number { return body.trunk ? body.facing + body.trunk : body.facing; }

/** One controller tick of the trunk: toward the look he asked for within the range, at the rate; back to the hips
 * when he asks for none. The hips do not move. Called by the World each tick and by stepBody. */
export function updateTrunk(body: Body, look: number | undefined, dt: number): void {
  const current = body.trunk ?? 0;
  if (look === undefined && current === 0) return;
  const want = look === undefined ? 0 : clamp(angleDiff(body.facing, look), -TRUNK_RANGE, TRUNK_RANGE);
  const step = TRUNK_RATE * dt;
  const next = current + clamp(want - current, -step, step);
  body.trunk = Math.abs(next) < 1e-9 ? 0 : next;
}

/** Fatigue multiplier on speed/acceleration. */
export function fatigueFactor(energy: number): number {
  const deficit = 1 - (energy < 0 ? 0 : energy > 1 ? 1 : energy);
  if (deficit <= 0) return 1;
  const x = deficit * FATIGUE_STEPS;
  const k = Math.floor(x);
  if (k >= FATIGUE_STEPS) return FATIGUE[FATIGUE_STEPS];
  return FATIGUE[k] + (FATIGUE[k + 1] - FATIGUE[k]) * (x - k);
}

/** The lateral (cutting) acceleration the legs can give at `speed` before the drive takes its share (the friction ellipse's
 * lateral half, shared by `locomotionAccel`, `followAccel` and the route follower's corner plan): harder to cut at high speed,
 * and a tired body gives a little less. */
export function lateralEnvelope(body: Body, speed: number, cutSkill = 1, capacity = 1): number {
  const p = body.profile;
  return p.lateral * cutSkill * (1 - 0.2 * clamp(speed / p.vmax, 0, 1)) * (0.85 + 0.15 * fatigueFactor(body.energy)) * capacity;
}

/** DIR_CAP (experimental, off; DIR_CAP=1; docs/reviews/2026-11-15-dir-cap.md): the speed cap by the angle of the hips off the line of travel is MONOTONE, and the
 * trunk's twist is priced once, in the same cap.
 *
 * Why: BDB 2025 weeks 1-9, 322 zone-coverage DBs, ball held, top-decile speed over each man's own p98 by the angle of his shoulders off his travel (15 deg
 * bins, nfl_dir_capacity.py): 1.00 to 30 deg, 0.91 at 52, 0.81 at 82, 0.75 at 97, 0.65 at 127, 0.625 at 135 deg and beyond, relative to forward. The legacy curve
 * has side-on (90 deg) as the slowest point, 0.60, below the square backpedal at 0.68; the NFL curve has the backpedal slowest and side-on in between.
 * This curve is a straight line from full speed at DIR_FULL (20 deg) to the backpedal's share at DIR_BACK (130 deg), flat beyond. `shuffle` is no longer
 * read by this cap (it is still the pace of a square lateral shuffle where a controller reads it directly).
 *
 * The trunk: a body whose hips run down the line of travel while his shoulders look 22 / 45 / 55 deg off pays about 4 / 8 / 10 percent in the NFL
 * (twist_price.py: -0.26, -0.54 and -1.11 yd/s at 15-30, 30-60 and 60+ deg against a 6.5 yd/s cruise; and the shoulder curve above up to 55 deg). TRUNK_PRICE is
 * 0.0018 per degree of trunk twist, linear, no term for the line or the wobble (the cut found none). Where it comes from, plainly: it is a STATED CHOICE
 * (Coverage's: 10 percent at the 55 deg limit), checked against an observational NFL curve, NOT a fitted constant. The curve carries the confound that a
 * receiver looking back may be throttling by choice, so it is an upper bound on the capacity cost. The likely mechanism is the arm drive (running
 * propulsion uses counter-rotation of the shoulders against the hips, which a trunk held twisted off the line of the pelvis cannot do with the stride), but I
 * have not verified a gait source that puts a number on it, so the number is not derived from one. Hips are
 * charged by the curve above and the trunk by this term; the NFL shoulder curve cannot split them (`o` is the shoulders), so the pair is checked
 * against it only where the trunk is the whole of the angle (hips on the path), and in the sim's own shoulder bins. */
export const DIR_CAP = process.env.DIR_CAP !== '0';
const DIR_FULL = (20 * Math.PI) / 180, DIR_BACK = (130 * Math.PI) / 180;
/** Fraction of the cap lost per radian of trunk twist (0.0018 per degree). */
export const TRUNK_PRICE = 0.0018 * (180 / Math.PI);
/** The trunk's share of the speed cap (1 with no twist, or DIR_CAP off). */
export function trunkPrice(body: Body): number { return DIR_CAP && body.trunk ? 1 - TRUNK_PRICE * Math.abs(body.trunk) : 1; }

/**
 * Speed cap multiplier from the angle between facing and travel direction:
 * 1 running forward, `shuffle` sideways, `backpedal` straight back.
 */
export function directionalSpeedFactor(profile: PhysicalProfile, relAngle: number): number {
  return DIR_CAP ? speedCapFactor(profile, relAngle) : legDriveFactor(profile, relAngle);
}
/** DIR_CAP's top-speed curve: monotone (see DIR_CAP). */
function speedCapFactor(profile: PhysicalProfile, relAngle: number): number {
  const a = Math.abs(relAngle);
  {
    // Monotone: full speed within DIR_FULL of the line of travel, then a straight fall to the backpedal's share at DIR_BACK, flat beyond.
    if (a <= DIR_FULL) return 1;
    if (a >= DIR_BACK) return profile.backpedal;
    return 1 - (1 - profile.backpedal) * (a - DIR_FULL) / (DIR_BACK - DIR_FULL);
  }
}
/** The legs' directional DRIVE (force) share, unchanged by DIR_CAP: full ahead, `shuffle` sideways, `backpedal` straight back. world.ts's push and leg-drive
 * laws read this, since DIR_CAP's curve is a measure of top-speed capacity and not of the force the legs give a hand fight or a push (which moved the
 * pass rush's engagement dither over its budget when the curve was applied there too). */
export function legDriveFactor(profile: PhysicalProfile, relAngle: number): number {
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
  return body.profile.vmax * fatigueFactor(body.energy) * enduranceFactor(body) * (1 - 0.08 * (body.squeeze ?? 0)) * directionalSpeedFactor(body.profile, rel) * trunkPrice(body) * effort;
}

/** Long sprints fade: after ~3.5 s near top speed, up to 10% slower. */
export function enduranceFactor(body: Body): number {
  return 1 - 0.1 * clamp(((body.sprintLoad ?? 0) - 3.5) / 5, 0, 1);
}

/** Experimental (GAIT_STEP=seconds, off by default): time over which a player
 * levels off at a wanted speed below his top speed. */
const GAIT_STEP = Number(process.env.GAIT_STEP ?? 0);

/** The lag a controller should expect when it asks for `wanted` speed: the
 * legs start at full force whatever he wants and level off at his wanted
 * speed, so the approach time constant is tau scaled by wanted / top speed
 * (the full sprint time constant for a full request, or with no wanted
 * speed given). Under GAIT_STEP, the leveling time. */
export function gaitLag(profile: PhysicalProfile, wanted = profile.vmax): number {
  return GAIT_STEP || profile.tau * clamp(wanted / profile.vmax, 0, 1);
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
  if (hypot2(cmd.vel.x, cmd.vel.y) > 0.4) {
    const h = angleOf(cmd.vel);
    const previous = body.squeezeHeading ?? h;
    body.squeezeHeading = previous + clamp(angleDiff(previous, h), -p.turnRate * dt, p.turnRate * dt);
  }
}

/** Facing a command asks for: explicit, else direction of travel (bounded by
 * his actual path while he carries speed). */
export function commandFacing(body: Body, cmd: MoveCommand): number {
  if (cmd.facing !== undefined) return cmd.facing;
  const speed = len(body.vel);
  if (len(cmd.vel) <= 0.4) return speed > 0.6 ? angleOf(body.vel) : body.facing;
  const wanted = angleOf(cmd.vel);
  if (speed <= PLANT_SPEED) return wanted;
  // Carrying speed, the hips lead the path he is actually on, not the one he
  // has just asked for: momentum must come off (a plant) before he can face
  // a new direction (BDB2025 week 1: defenders at 4+ yd/s keep body
  // orientation within 60 deg of travel 72-91% of the time; the SS "on ice").
  const travel = angleOf(body.vel);
  return travel + clamp(angleDiff(travel, wanted), -FACING_LEAD, FACING_LEAD);
}

/** Below this speed (yd/s) he has planted and can square to a new heading. */
export const PLANT_SPEED = 2.5;
/** How far ahead of his actual path his hips can lead while carrying speed. */
const FACING_LEAD = Math.PI / 3;

/** DIR_START (on since engine-89; DIR_START=0 restores; docs/reviews/2026-11-18-start-from-rest.md): the start from rest depends on the angle between the push and the pelvis, and costs the legs when
 * the start is not planned: the direction penalty is the cost of pushing off in a direction the body was not loaded for. A first step planned before the start (the assignment he holds at the snap
 * cue: every offensive player, and a rusher, blitzer or zone defender: PlaySim.loadPlannedStarts) is loaded for it and pays nothing; one start only, every later movement is a reaction for everyone.
 * The start from rest depends on the angle between the push and the pelvis. The start force
 * (the `lift` in locomotionAccel: the low-speed end of the legs' force-velocity curve) is scaled by 1 - (1 - L) sin^2 of the angle between the way he pushes and his hips' facing: 1 pushing
 * the way the pelvis points, L pushing across it, 1 again straight behind (the backpedal is priced by its speed cap and the controllers' asks, which already match the NFL's). As he opens
 * his hips to his travel the angle falls and the start force returns to full, so a man who turns and runs starts like a forward start (NFL: starts that have turned to within 45 degrees of
 * their travel by +0.4 s are as fast as forward starts, 1.43 / 2.33 / 3.75 against 1.45 / 2.37 / 3.73 yd/s at 0.2 / 0.4 / 0.8 s).
 * L is MEASURED, one parameter, not tuned on any outcome: the NFL lateral / forward start speed ratio at 0.2 s, 0.67 in both matched peak-speed bands 3.5-4.5 and 4.5-5.5 yd/s (BDB 2025
 * weeks 1-9, 26,748 defender starts under 1 yd/s, scripts/diag/body/start_accel.py; 0.70 at 0.4 s). DIR_START_PCT is that ratio in percent (identity: 100). */
export const DIR_START = process.env.DIR_START !== '0';
const DIR_START_L = Number(process.env.DIR_START_PCT ?? 67) / 100;
export function dirStartFactor(angle: number): number { const s = Math.sin(angle); return 1 - (1 - DIR_START_L) * s * s; }

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
  const narrow = 1 - 0.08 * squeeze;
  const effort = clamp(cmd.effort ?? 1, 0, 1) * narrow;
  const drive = clamp(cmd.drive ?? 1, 0.05, 1);
  const cutSkill = (cmd.cutSkill ?? 1) * (1 - 0.12 * squeeze);
  const speed = len(body.vel);

  // --- desired velocity clamped by directional cap ---
  const dv0 = cmd.vel;
  const dmag = len(dv0);
  const fat = fatigueFactor(body.energy);
  let desired = dv0;
  // His wanted speed, and the full speed his legs allow in that direction.
  let wanted = 0, full = 0;
  // The force of a full start: legs push off in any direction from the body's
  // own curve (vmax / tau). Facing limits the speed he can hold that way.
  const start = p.vmax * fat * enduranceFactor(body);
  if (dmag > 1e-6) {
    const heading = angleOf(dv0);
    full = start * directionalSpeedFactor(p, angleDiff(body.facing, heading)) * trunkPrice(body);
    const cap = full * effort;
    if (dmag > cap) desired = { x: (dv0.x / dmag) * cap, y: (dv0.y / dmag) * cap };
    wanted = Math.min(dmag, cap);
  }
  // Starting is the low-speed end of the legs' force-velocity curve: at rest
  // they push with the force of a full start whatever speed he wants, and
  // that force falls to zero at his wanted speed instead of at top speed.
  // On the sprint curve's terms this scales the propulsion toward a wanted
  // speed by start / wanted. Only a request whose cap is the full forward
  // speed (moving the way he faces) keeps the sprint curve unchanged; a full
  // request capped by facing (sideways, backward) also starts with the full
  // force and levels off at its lower cap.
  // A lineman who wants 2.4 yd/s fires off as hard as one who wants top
  // speed and levels off sooner (gaitLag). Mass and leg force enter through
  // the body's own curve (vmax / tau), not a shared constant. The start force
  // does not depend on his facing: tracked NFL pullers reach 0.5 yd/s
  // sideways at 0.1 s with their shoulders opened 10 degrees by 0.3 s. Facing
  // limits only the speed at which that force runs out (full, above). A
  // shoulder squeeze still costs burst: it narrows the start force.
  // DIR_START: the start force depends on where the legs push relative to the pelvis (see DIR_START).
  const startDir = DIR_START && !body.loaded && dmag > 1e-6 ? dirStartFactor(angleDiff(body.facing, angleOf(dv0))) : 1;
  const lift = (w: number) => { const f = start * narrow * startDir; return w > 0 && w < f ? f / w : 1; };

  const dvx = desired.x - body.vel.x;
  const dvy = desired.y - body.vel.y;
  let ax: number;
  let ay: number;

  if (speed < 0.35) {
    // Near standstill: isotropic, limited by initial drive.
    const cap = len(desired);
    const amax = Math.max((GAIT_STEP ? driveAccel(p, speed, p.vmax * fat) * fat
      : driveAccel(p, speed, Math.max(cap, 0.5)) * fat * lift(Math.max(wanted, 0.5))) * drive, p.brake * 0.5 * drive) * capacity;
    ax = dvx / (GAIT_STEP ? Math.max(dt, GAIT_STEP) : dt);
    ay = dvy / (GAIT_STEP ? Math.max(dt, GAIT_STEP) : dt);
    const a = hypot2(ax, ay);
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
    const At = (at >= 0 ? Math.max(driveAccel(p, speed, p.vmax * fat) * fat * drive, 0.01) : p.brake * (0.85 + 0.15 * fat)) * capacity;
    const An = lateralEnvelope(body, speed, cutSkill, capacity);
    const k = (at / Math.max(At, 1e-9)) ** 2 + (an / Math.max(An, 1e-9)) ** 2;
    if (k > 1) {
      const s = 1 / Math.sqrt(k);
      at *= s;
      an *= s;
    }
    // Speeding up toward the wanted speed starts at full force and falls
    // linearly to zero there (lift, above). It never exceeds the
    // force-velocity envelope At. The share of the envelope that leaves free
    // goes to the cut. GAIT_STEP (experimental, off by default): the full
    // force-velocity curve, leveling off over a fixed time instead.
    const ease = GAIT_STEP
      ? Math.min(driveAccel(p, speed, p.vmax * fat) * fat, Math.max(0, cap - speed) / GAIT_STEP) * capacity
      : driveAccel(p, speed, Math.max(cap, speed)) * fat * lift(wanted) * capacity * drive;
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
  const amag = hypot2(a.x, a.y);
  if (amag < 1e-12) return { x: 0, y: 0 };
  const p = body.profile;
  const speed = len(body.vel);
  const fat = fatigueFactor(body.energy);
  if (speed < 0.35) {
    const amax = Math.max(driveAccel(p, speed, p.vmax * fat) * fat, p.brake * 0.5) * capacity;
    return amag > amax ? { x: a.x * amax / amag, y: a.y * amax / amag } : { x: a.x, y: a.y };
  }
  const tx = body.vel.x / speed, ty = body.vel.y / speed;
  const at = a.x * tx + a.y * ty, an = -a.x * ty + a.y * tx;
  const At = (at >= 0 ? Math.max(driveAccel(p, speed, p.vmax * fat) * fat, 0.01) : p.brake * (0.85 + 0.15 * fat)) * capacity;
  const An = lateralEnvelope(body, speed, cutSkill, capacity);
  const k = (at / Math.max(At, 1e-9)) ** 2 + (an / Math.max(An, 1e-9)) ** 2;
  if (k <= 1) return { x: a.x, y: a.y };
  const s = 1 / Math.sqrt(k);
  return { x: (at * tx - an * ty) * s, y: (at * ty + an * tx) * s };
}

/** Fast-pool cost of the intensity terms (work, speed, isometric pushing),
 * relative to the proxy's base rate: a max-effort rep spends a large part of
 * the fast pool, as a 5–6 s all-out effort spends much of the muscle's
 * phosphocreatine. */
export const FAST_DRAIN = 3;
/** Metabolic proxy: base, planned work, speed, and isometric pushing.
 * additionalWork is delivered positive action work per kg (yd²/s²), already
 * integrated over the active interval; it must be charged only once. velocity
 * may be the last active velocity when later passive motion ends the tick.
 * The charge comes out of the fast pool. */
export function spendEnergy(body: Body, accel: Vec2, isometric: number, dt: number, additionalWork = 0, velocity = body.vel): void {
  const p = body.profile;
  const nspeed = hypot2(velocity.x, velocity.y);
  const frac = nspeed / p.vmax;
  body.sprintLoad = Math.max(0, (body.sprintLoad ?? 0) + (frac > 0.85 ? dt : frac < 0.7 ? -0.5 * dt : 0));
  const work = Math.max(0, accel.x * velocity.x + accel.y * velocity.y) / (p.vmax * (p.vmax / p.tau));
  const speedCost = (nspeed / p.vmax) ** 2;
  const intensity = (0.03 * work + 0.012 * speedCost + 0.03 * clamp(isometric, 0, 1.5)) * dt + 0.03 * additionalWork / (p.vmax * (p.vmax / p.tau));
  const cost = 0.0045 * dt + FAST_DRAIN * intensity;
  body.energy = clamp(body.energy - cost, 0, 1);
}

export function stepBody(body: Body, cmd: MoveCommand, dt: number): void {
  updateSqueeze(body, cmd, dt);
  if (TRUNK_TWIST) updateTrunk(body, cmd.look, dt);
  // --- facing ---
  const turnRate = turnRateOf(body);
  const df = angleDiff(body.facing, commandFacing(body, cmd));
  const target = body.facing + clamp(df, -turnRate * dt, turnRate * dt);
  const beforeFacing = body.facing;
  body.facing = target;
  const a = locomotionAccel(body, cmd, dt);
  body.facing = beforeFacing;
  const traction = supportParams(body.profile).traction;
  const force = hypot2(a.x,a.y) * body.profile.massKg;
  if (force > traction) { a.x *= traction / force; a.y *= traction / force; }
  // Preview the same bounded motor used by World, toward the actual requested
  // facing. `target` above remains the existing gait estimate for this step.
  turnBodyResponse(body,commandFacing(body,cmd),dt,turnRate,1,Math.min(force,traction));
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
export function arriveVelocity(body: Body, target: Vec2, maxSpeed: number, throughSpeed = 0, decel?: number): Vec2 {
  const dx = target.x - body.pos.x;
  const dy = target.y - body.pos.y;
  const d = hypot2(dx, dy);
  if (d < 1e-3) return { x: 0, y: 0 };
  // `decel`: the deceleration he plans to approach on (default: 0.8 of his braking).
  const brake = decel ?? body.profile.brake * 0.8;
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
  const dx=target.x-body.pos.x,dy=target.y-body.pos.y,d=hypot2(dx,dy);
  if(d<1e-9){
    const speed=hypot2(targetVelocity.x,targetVelocity.y),scale=Math.min(1,maxSpeed/Math.max(1e-9,speed));
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
  const inLen = hypot2(ix,iy), outLen = hypot2(ox,oy);
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
  const d = hypot2(dx, dy);
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
