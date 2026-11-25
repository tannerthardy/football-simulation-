/** Where a defender expects a receiver to be `dt` seconds after the catch, from what he sees (Defense, 2026-11-23; for
 * Coverage's FLIGHT_BREAK goal). A defender who will arrive after the ball should break on that spot, not on the catch
 * spot the carrier will have left. One continuous intercept, not a drive to a point followed by a redirect.
 *
 * Why (docs/reviews/2026-11-23-pursuit-build-addendum.md; Integration's (c)): the first defenders beaten by an old angle
 * or overrun are, at the catch, 5.4 yd away and need a 38 deg turn and a 6 yd/s velocity change (>= 0.87 s at their
 * braking) to reach their pursuit line. They are beaten at +0.9 s. Those who stop him are 2.6 yd away and turn 12 deg.
 *
 * The forecast, from his own picture:
 *  - the receiver's route momentum carries through the catch (his seen velocity);
 *  - he turns upfield;
 *  - he turns away from the defender's side when the defender is level or ahead of him and to one side.
 * Expected heading after the catch: the seen route direction plus the upfield direction, minus a lateral component
 * toward the defender, normalised.
 *
 * Stated choices (not fitted):
 *  - equal weights on route and upfield (a catch-and-turn; the NFL catch speed is held, so the route momentum is real);
 *  - the away-from-defender component scaled by how lateral the defender is to him (0 when the defender is straight
 *    upfield or behind).
 * Speed along the heading: from his seen speed toward a believed post-catch run of 5.8 yd/s with a 2.4 s time constant
 * (CARRIER_ACCEL's BELIEF, from the NFL catch-speed rows). The uncertainty in which way he turns is what the seat's
 * leverage shade answers: take one side away, with help or the sideline on the other. That shade is the caller's. */
import type { Vec2 } from '../core/vec.js';

const BELIEF = { vmax: 5.8, tau: 2.4 };
/** The forecast covers his first move only (s; stated choice). Attempt 1 (uncapped) led every late defender by his whole
 * lateness: p50 3.3 s, a goal 8.7 yd upfield of the catch where the carrier actually was 4.2 yd (the next defenders tackle
 * or slow him), a 6.9 yd miss; first-defender failures rose 53 -> 87 on the staged set. A defender later than this aims
 * at where the first move takes him, and pursuit forecasts the rest from what it then sees. */
const FIRST_MOVE = 1.0;

/** Displacement (yd) of the receiver `dt` s after the catch, as a defender at `defPos` judges it.
 * `upfield` is +1/-1 along x (the offense's attack direction). */
export function postCatchLead(seenVel: Vec2, catchSpot: Vec2, defPos: Vec2, upfield: number, dt: number): Vec2 {
  if (dt <= 0) return { x: 0, y: 0 };
  dt = Math.min(dt, FIRST_MOVE);
  const sp = Math.hypot(seenVel.x, seenVel.y);
  const rx = sp > 1e-6 ? seenVel.x / sp : 0, ry = sp > 1e-6 ? seenVel.y / sp : 0;
  // Away from the defender, by how lateral he is to the catch spot (0 straight up- or downfield of it).
  const ox = defPos.x - catchSpot.x, oy = defPos.y - catchSpot.y, od = Math.hypot(ox, oy) || 1;
  const lateral = Math.abs(oy) / od, away = oy > 0 ? -1 : 1;
  let hx = rx + upfield, hy = ry + away * lateral;
  const hl = Math.hypot(hx, hy) || 1; hx /= hl; hy /= hl;
  const { vmax, tau } = BELIEF;
  const d = sp >= vmax ? sp * dt : vmax * dt - (vmax - sp) * tau * (1 - Math.exp(-dt / tau));
  return { x: hx * d, y: hy * d };
}
