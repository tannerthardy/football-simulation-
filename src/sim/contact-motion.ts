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
