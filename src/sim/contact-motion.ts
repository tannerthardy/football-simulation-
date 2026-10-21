import type { Vec2 } from '../core/vec.js';

/** Compose displacement and shoulder work in the acquired contact frame.
 * `lateral` is the whole requested speed along the unit surface tangent,
 * including the opponent's motion, not an addition to the drive's tangent.
 * Keep the drive's normal component without normalizing it or dividing by
 * an angle: a nearly tangential drive earns no extra normal movement.
 * This requests feet only; the World still supplies all forces and work. */
export function contactMotion(drive: Vec2, tangent: Vec2, forward: number, lateral: number): Vec2 {
  const driveLateral = forward * (drive.x * tangent.x + drive.y * tangent.y);
  return {
    x: drive.x * forward + tangent.x * (lateral - driveLateral),
    y: drive.y * forward + tangent.y * (lateral - driveLateral),
  };
}

/** Distance to torso clearance along the emitted movement component, holding
 * its perpendicular offset fixed. Radial distance is not normal travel, and
 * a radial gradient needlessly attenuates a valid oblique approach. Keep the
 * current side of the defender: a connection goal cannot run through him.
 * Resolving a unit axis here does not amplify the emitted drive component. */
export function connectionGap(delta: Vec2, separation: number, direction: Vec2): number {
  const length = Math.hypot(direction.x, direction.y);
  if (length < 1e-9) return 0;
  const normal = (delta.x * direction.x + delta.y * direction.y) / length;
  const lateral = (delta.x * direction.y - delta.y * direction.x) / length;
  const contactDepth = Math.sqrt(Math.max(0, separation * separation - lateral * lateral));
  return normal - Math.sign(normal) * contactDepth;
}
