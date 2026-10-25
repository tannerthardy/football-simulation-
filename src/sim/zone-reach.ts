/** Solo stretch-zone technique. Surface acquisition and displacement are
 * separate intentions; neither supplies a contact force or a successful seal.
 */
import { clamp, type Vec2 } from '../core/vec.js';
import { fatigueFactor, locomotionAccel } from '../physics/kinematics.js';
import { availability, supportParams } from '../physics/support.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import { observedBlockLeverage } from './run-block-fit.js';

export interface ZoneReachChoice {
  phase: 'reach' | 'runoff' | 'seal';
  drive: Vec2;
  /** Desired lateral surface in the stable vertical contact frame. */
  sealTarget: number;
  aim: Vec2;
  horizon: number;
  neededTravel: number;
  availableTravel: number;
}
export interface ZoneReachRead extends ZoneReachChoice {
  target: number;
  side: number;
  t: number;
  nextRead: number;
  seen: Perceived;
}

/** The consumed hip picture can be wrong. The short free lateral estimate
 * uses existing locomotion/support/traction limits, ignores traffic and hand
 * loads, and is a football read aid rather than a contact reachability proof.
 * Only World can establish the body position and transmit the actual load.
 */
export function readZoneReach(a: Agent, seen: Perceived, side: number,
  stretchDrive: Vec2, contact: number, bodyContact: number): ZoneReachChoice {
  const lateral = (a.pos.y - seen.pos.y) * side;
  const longitudinal = a.pos.x - seen.pos.x;
  const horizon = clamp(Math.max(0, -longitudinal - bodyContact)
    / Math.max(.5, a.vel.x - seen.vel.x), .1, .4);
  const params = supportParams(a.profile);
  const capacity = a.body.support
    ? availability(a.body.support, params, fatigueFactor(a.body.energy)) : 1;
  // An outward-step estimate using the current envelope. It gives all free
  // effort to lateral closure, but holds initial facing/acceleration rather
  // than certifying future gait, yaw, traffic or contact feasibility.
  const accel = locomotionAccel(a.body, { vel: { x: 0, y: side * a.profile.vmax } }, .05, capacity);
  const magnitude = Math.hypot(accel.x, accel.y);
  const traction = Math.min(1, params.traction * capacity
    / Math.max(1e-9, magnitude * a.profile.massKg));
  const availableTravel = Math.max(0, a.vel.y * side * horizon
    + .5 * accel.y * side * traction * horizon * horizon);
  const neededTravel = Math.max(0, -lateral + .45 * bodyContact + seen.vel.y * side * horizon);
  const outside = lateral >= .45 * bodyContact && longitudinal >= -bodyContact
    && longitudinal <= .35 * bodyContact
    && Math.hypot(longitudinal, a.pos.y - seen.pos.y) <= contact
    && Math.abs(observedBlockLeverage(a, seen, { x: 1, y: 0 })) < 1.1
    && (!a.body.support || a.body.support.state === 'up');
  // Outside position takes precedence: our contact can itself make D widen.
  // No phase is permanent; a later picture can reveal a lost fit.
  const phase = outside ? 'seal'
    : seen.vel.y * side > 0 && lateral < .45 * bodyContact && neededTravel > availableTravel
      ? 'runoff' : 'reach';
  const surface = phase === 'runoff' ? -side : side;
  return { phase, drive: phase === 'runoff' ? { ...stretchDrive } : { x: 1, y: 0 },
    sealTarget: surface * .3,
    aim: { x: seen.pos.x - .3, y: seen.pos.y + surface * .6 },
    horizon, neededTravel, availableTravel };
}
