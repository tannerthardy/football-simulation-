/** Bounded footwork requests for difficult run-block fits.
 * The same movement envelope supplies arrival/braking; the real World still
 * owns whether the player can execute it, collide, stay up or establish hands.
 */
import { FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { fatigueFactor, movingArrivalVelocity } from '../physics/kinematics.js';
import { availability, supportParams } from '../physics/support.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

export function observedBlockLeverage(a: Agent, seen: Perceived, drive: Vec2): number {
  const x = a.pos.x - seen.pos.x, y = a.pos.y - seen.pos.y;
  return Math.atan2(x * -drive.y + y * drive.x, -x * drive.x - y * drive.y) / (Math.PI / 2);
}

export function chooseRunBlockFit(a: Agent, seen: Perceived, drive: Vec2,
  nominalAim: Vec2, placementError: number, contact: number, bodyContact: number,
  original: Intent, now: number, settle = false, through = 0): Intent {
  const axis = { x: -drive.x, y: -drive.y }, lat = { x: -axis.y, y: axis.x };
  const nominal = { x: nominalAim.x - seen.pos.x, y: nominalAim.y - seen.pos.y };
  const lost = Math.abs(observedBlockLeverage(a, seen, drive)) >= 1.1;
  if (!settle && !lost && nominal.x * axis.x + nominal.y * axis.y > 0) return original;
  const relative = { x: a.pos.x - seen.pos.x, y: a.pos.y - seen.pos.y };
  const distance = Math.hypot(relative.x, relative.y);
  if (distance > contact + (a.profile.vmax + Math.hypot(seen.vel.x, seen.vel.y)) * .4
    || a.isDown(now) || a.body.support?.state !== 'up') return original;

  const sep = bodyContact + .15;
  const lateral = clamp(nominal.x * lat.x + nominal.y * lat.y, -.45 * sep, .45 * sep);
  let offset = { x: axis.x * sep + lat.x * lateral, y: axis.y * sep + lat.y * lateral };
  const ex = offset.x - relative.x, ey = offset.y - relative.y;
  const along = clamp(-(relative.x * ex + relative.y * ey) / Math.max(1e-12, ex * ex + ey * ey), 0, 1);
  // A fit on the far shoulder needs feet around the body, not a shortcut
  // through its center. Request one short arc waypoint and reread movement
  // next tick. This is navigation geometry, not a contact/win forecast.
  if (Math.hypot(relative.x + along * ex, relative.y + along * ey) < bodyContact) {
    const cross = relative.x * offset.y - relative.y * offset.x;
    if (Math.abs(cross) < 1e-9 || distance < 1e-9)
      return { vel: { ...seen.vel }, posture: .7 };
    const angle = Math.sign(cross) * Math.min(.35, Math.acos(clamp(
      (relative.x * offset.x + relative.y * offset.y) / (distance * Math.hypot(offset.x, offset.y)), -1, 1)));
    const radius = Math.max(sep, (distance + sep) / 2);
    offset = { x: (relative.x * Math.cos(angle) - relative.y * Math.sin(angle)) * radius / distance,
      y: (relative.x * Math.sin(angle) + relative.y * Math.cos(angle)) * radius / distance };
  }
  // Apply the same ordinary execution error after choosing the nominal foot
  // landmark. Never project the player's error into a magically perfect fit.
  const goal = { x: seen.pos.x + offset.x,
    y: clamp(seen.pos.y + offset.y + placementError, .5, FIELD_WIDTH - .5) };
  const capacity = a.body.support
    ? availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
  return { vel: movingArrivalVelocity(a.body, goal, seen.vel, a.profile.vmax, .1, through, 1, capacity),
    posture: .7, facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x) };
}

/** A linebacker fit is an arrival on a moving body, not a downhill sprint
 * through its old center. Share shoulder clearance, torso navigation and
 * physical braking with first-level fits. Lower only when nearing the strike;
 * a long climb still runs with its ordinary posture. */
export function secondLevelBlockApproach(a: Agent, seen: Perceived, drive: Vec2,
  nominalAim: Vec2, placementError: number, contact: number, bodyContact: number,
  original: Intent, now: number): Intent {
  // Gather the approach without stopping the feet before the strike. This
  // carries the existing run-contact 2.4 yd/s drive request into the approach;
  // it changes neither force capacity nor the actual contact/reach checks.
  const command = chooseRunBlockFit(a, seen, drive, nominalAim, placementError,
    contact, bodyContact, original, now, true, 2.4);
  const near = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) <= contact + bodyContact;
  return { ...command, posture: near ? .7 : original.posture };
}
