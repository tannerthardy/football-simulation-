/** A bounded marginal cost in the carrier's yard-based choice utility.
 * This expresses preference, not an injury probability or a tackle outcome.
 * Size matters through momentum share; position labels never imply courage.
 */
import { clamp } from '../core/vec.js';

export function contactCost(carrierMass: number, defenderMass: number, relativeSpeed: number, toughness: number, ballSecurity: number): number {
  const impulseShare = defenderMass / Math.max(1, carrierMass + defenderMass);
  const severity = clamp(impulseShare * relativeSpeed * relativeSpeed / 60, 0, 1.5);
  return severity * (0.5 + 1.6 * (1 - clamp(toughness, 0, 1)) + 0.8 * (1 - clamp(ballSecurity, 0, 1)));
}
