import type { PhysicalProfile } from '../players/physical.js';

/** Reduced horizontal contact geometry. Body.pos is the actor's center;
 * the target is its circular body surface, so center-to-hand reach includes
 * the target radius exactly once and never the holder's radius. Facing and
 * lower/upper hold height do not supply a separate horizontal body segment.
 * A dive translates the existing Body through World; it grants no extra span.
 * The same bound applies to retained tackle grasps, upright or off feet. */
export function tackleReach(holder: Pick<PhysicalProfile, 'reach'>,
  target: Pick<PhysicalProfile, 'radius'>, armShare = 1): number {
  return holder.reach * armShare + target.radius;
}
