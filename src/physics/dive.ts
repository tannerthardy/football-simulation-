/** DIVE_STANCE (experimental, off; DIVE_STANCE=1 turns it on): the dive's push-off is a stance phase, not one tick's plant.
 *
 * Off, `plan.dive` (world.ts) applies the legs' traction-limited force for the one controller tick he is dived on and he leaves his feet at its end:
 * about 0.05 s of force at most TURF_MU * G, a speed gain of at most TURF_MU * G * 0.05 = 0.59 yd/s whatever his speed, then the fall.
 *
 * On, he is planted for a stance of DIVE_STANCE_S and the legs push along the dive line for all of it, by the same law that drives his stride:
 * the leg force at zero speed (`pushForce`: his leg strength, traction-capped), falling to nothing as his speed along the push reaches his top
 * speed (PHY-1, the force-velocity curve world.ts and kinematics.ts use for every start and sprint), scaled by the share of the launch he asked for.
 * The horizontal impulse is that force over the stance; he leaves his feet at its end. Nothing is added to his strength, and the traction is the
 * same friction on his own weight (no vertical impulse is credited, which a real push-off has: a stated conservative choice, see below).
 *
 * What it says, with the model's own legs: from a walk (1 yd/s) the push-off gives 1.0-1.2 yd/s; at a run (5 yd/s, about 55% of top speed)
 * 0.5-0.6 yd/s; near top speed almost nothing (a runner's legs have no push left to give a lunge). The 0.59 yd/s of the one-tick plant was about
 * right for a runner and about half what a man who is nearly stopped can do. A lunge is not a way to move faster than the legs can, and the model
 * says so; what it buys is the body's reach and the loss of the feet, which `startFall` and the grasp's extended reach carry.
 *
 * Stated choices (nothing here is fitted to an outcome):
 *  - DIVE_STANCE_S = 0.12 s is a stated choice (range 0.10-0.15 s), confidence low. It is not taken from a measurement: no source read for this change gives the
 *    ground-contact time of a push-off to leave the feet, so none is cited. It is chosen between a sprint stride's contact and a short plant; the gain is close to linear in it.
 *  - The horizontal force law is the sprint stride's: no jump-style loading (a real push-off loads the foot to two or three body weights and so can
 *    use more friction), and no elastic return. Both would add to the impulse; they are left out so the lunge does not get strength the stride does not.
 *  - The leg is the same leg: the force-velocity factor uses his speed along the dive line, so a diver already at top speed along it gets none. */
import { clamp } from '../core/vec.js';
import { G } from '../core/units.js';
import type { PhysicalProfile } from '../players/physical.js';
import { legDrive, TURF_MU } from './support.js';

export const DIVE_STANCE = process.env.DIVE_STANCE === '1';
/** Seconds planted before he leaves his feet (stated choice, see above). */
export const DIVE_STANCE_S = 0.12;

/** The horizontal force (kg*yd/s^2) the legs give along the dive line at speed `vAlong` along it, for the share `launch` (0-1) of the push asked for. */
export function divePushForce(p: PhysicalProfile, vAlong: number, launch: number, fatigue = 1): number {
  const traction = TURF_MU * p.massKg * G;
  const leg = Math.min(legDrive(p), traction);
  return leg * clamp(launch, 0, 1) * clamp(1 - vAlong / (p.vmax * fatigue), 0, 1);
}

/** The speed change a dive's push-off gives along the line, yd/s: what a tackler's controller may expect before it launches (tackle.ts `lungeReaches`).
 * `dt` is the controller tick the legacy one-plant push-off lasts; with DIVE_STANCE the stance is DIVE_STANCE_S whatever the tick. */
export function diveSpeedGain(p: PhysicalProfile, speed: number, vAlong: number, launch = 1, dt = 0.05): number {
  if (!DIVE_STANCE) return Math.min(1.5, Math.max(0, p.vmax - speed), TURF_MU * G * dt) * launch;
  // The force falls as he gains speed over the stance; integrate it with the same law in small steps (the World's substeps do the same).
  let v = vAlong, t = 0;
  const h = 0.01;
  while (t < DIVE_STANCE_S - 1e-9) {
    const s = Math.min(h, DIVE_STANCE_S - t);
    v += divePushForce(p, v, launch) / p.massKg * s; t += s;
  }
  return v - vAlong;
}
