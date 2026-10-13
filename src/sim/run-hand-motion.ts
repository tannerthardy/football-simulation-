import type { Vec2 } from '../core/vec.js';

/** Active redirect and feet share the chosen contact-surface goal.
 * The defender's velocity is acquired through the current hand contact;
 * the blocker knows his own command. Neither uses the runner's private path
 * or the defender's intended command. Zero drive retains passive steering.
 * A neutral foot goal still permits running the man past the surface. */
export function coherentRunHandDrive(drive: number, handTangent: Vec2, surfaceTangent: Vec2,
  defenderIsB: boolean, blockerCommand: Vec2, defenderVelocity: Vec2): number {
  const relativeFeet = (blockerCommand.x - defenderVelocity.x) * surfaceTangent.x
    + (blockerCommand.y - defenderVelocity.y) * surfaceTangent.y;
  const relativeHand = (defenderIsB ? -drive : drive)
    * (handTangent.x * surfaceTangent.x + handTangent.y * surfaceTangent.y);
  // Only numerical roundoff is ignored; there is no displacement allowance,
  // new force cap, strength bonus or winning-defender exception.
  return relativeFeet * relativeHand < -1e-9 ? 0 : drive;
}
