import type { Vec2 } from '../core/vec.js';

/** Protect the acquired seal side, rather than a fixed distance from the man.
 * Feet may close contact while hands run a defender farther to the closed
 * side. Only accelerating him toward the declared protected side is rejected.
 * The target belongs to the blocker's installed/acquired contact surface;
 * no private runner path or defender command is consulted. */
export function coherentRunHandDrive(drive: number, handTangent: Vec2, surfaceTangent: Vec2,
  defenderIsB: boolean, desiredBlockerOffset: number): number {
  const relativeHand = (defenderIsB ? -drive : drive)
    * (handTangent.x * surfaceTangent.x + handTangent.y * surfaceTangent.y);
  // Only numerical roundoff is ignored; there is no displacement allowance,
  // new force cap, strength bonus or winning-defender exception.
  return Math.sign(desiredBlockerOffset) * relativeHand < -1e-9 ? 0 : drive;
}
