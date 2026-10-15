/** A moving half-man fit shared by approach and loaded stretch work.
 * This supplies feet, not a new hand frame or a prediction of contact success.
 * Every input is an own body, installed landmark, or acquired opponent cue. */
import { clamp, type Vec2 } from '../core/vec.js';
import { fatigueFactor, gaitLag, movingArrivalVelocity, type Body } from '../physics/kinematics.js';
import { availability, supportParams } from '../physics/support.js';
import type { Perceived } from './perception.js';
import { requestToCover } from './motion-plan.js';

export interface StretchFootOptions {
  side: number;
  /** Each member keeps his installed half; a helper does not chase the owner's. */
  half: number;
  bodyContact: number;
  tempo: number;
  placementError?: number;
}

export interface StretchFootPlan {
  vel: Vec2;
  facing: number;
  phase: 'stretch' | 'collect' | 'recover';
  aim: Vec2;
  remaining: number;
}

export function planStretchFeet(body: Body, seen: Pick<Perceived, 'pos' | 'vel'>,
  options: StretchFootOptions): StretchFootPlan {
  const { side, half, bodyContact, tempo } = options;
  const closing = Math.max(1, body.vel.x - seen.vel.x + 1.5);
  const meet = clamp(Math.max(0, seen.pos.x - body.pos.x - bodyContact) / closing, .15, .6);
  const remaining = (seen.pos.y + seen.vel.y * meet + half - body.pos.y) * side;
  const relative = { x: body.pos.x - seen.pos.x, y: body.pos.y - seen.pos.y };
  const distance = Math.hypot(relative.x, relative.y);
  const clearance = bodyContact + .15;
  // The half-man landmark lies on the contact circle. Adding a lateral
  // offset to the full normal radius would withdraw from working contact.
  // Extra clearance belongs only to the obstructed recovery arc below.
  let offset = { x: -Math.sqrt(Math.max(0, bodyContact * bodyContact - half * half)), y: half };
  let phase: StretchFootPlan['phase'] = remaining > 0 ? 'stretch' : 'collect';
  const ex = offset.x - relative.x, ey = offset.y - relative.y;
  const along = clamp(-(relative.x * ex + relative.y * ey) / Math.max(1e-12, ex * ex + ey * ey), 0, 1);
  if (Math.hypot(relative.x + along * ex, relative.y + along * ey) < Math.min(bodyContact, distance) - 1e-9) {
    // The acquired body obstructs a direct fit. Use the same short .35rad
    // recovery arc as ordinary run fits, retaining the separate combo half.
    phase = 'recover';
    const length = Math.hypot(offset.x, offset.y);
    const angle = Math.sign(relative.x * offset.y - relative.y * offset.x)
      * Math.min(.35, Math.acos(clamp((relative.x * offset.x + relative.y * offset.y)
        / Math.max(1e-12, distance * length), -1, 1)));
    if (distance > 1e-9 && Math.abs(angle) > 1e-9) {
      const radius = Math.max(clearance, distance);
      offset = { x: (relative.x * Math.cos(angle) - relative.y * Math.sin(angle)) * radius / distance,
        y: (relative.x * Math.sin(angle) + relative.y * Math.cos(angle)) * radius / distance };
    } else offset = { ...relative };
  }
  const aim = { x: seen.pos.x + offset.x,
    y: seen.pos.y + offset.y + (options.placementError ?? 0) };
  const capacity = body.support
    ? availability(body.support, supportParams(body.profile), fatigueFactor(body.energy)) : 1;
  const velocity = movingArrivalVelocity(body, aim, seen.vel, body.profile.vmax, .1, 0, 1, capacity);
  // The offense initiates the stretch. It need not wait for an anchored DL
  // to move first. Once this acquired half passes inside, the moving fit
  // collects/brakes with its existing momentum instead of imposing a floor.
  if (phase === 'stretch') {
    const needed = requestToCover(gaitLag(body.profile), Math.max(0, remaining), meet, body.vel.y * side);
    velocity.y = side * Math.min(body.profile.vmax, Math.max(velocity.y * side, tempo, needed));
  }
  velocity.x = clamp(velocity.x, -1, 2.5);
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed > body.profile.vmax) {
    velocity.x *= body.profile.vmax / speed; velocity.y *= body.profile.vmax / speed;
  }
  return { vel: velocity, facing: Math.atan2(seen.pos.y - body.pos.y, seen.pos.x - body.pos.x),
    phase, aim, remaining };
}

/** Apply existing contact request limits in the acquired frame. Continuous
 * projection works for diagonal surfaces; it never rotates loaded hands,
 * divides by a small tangent component or adds the drive's lateral part twice. */
export function projectStretchFeet(velocity: Vec2, axis: Vec2,
  maxNormal: number, maxTangent: number): Vec2 {
  const tangent = { x: -axis.y, y: axis.x };
  const normal = clamp(-velocity.x * axis.x - velocity.y * axis.y, -1, maxNormal);
  const lateral = clamp(velocity.x * tangent.x + velocity.y * tangent.y, -maxTangent, maxTangent);
  return { x: -axis.x * normal + tangent.x * lateral,
    y: -axis.y * normal + tangent.y * lateral };
}
