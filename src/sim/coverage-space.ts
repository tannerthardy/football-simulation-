import { END_LINE_X, FIELD_WIDTH } from '../core/field.js';
import type { MoveCommand } from '../physics/kinematics.js';
import type { Agent } from './agent.js';

/** PURSUIT_FIELD (experimental, off): a coverage player pursuing a ball
 * carrier he has seen is no longer a coverage player. Containment exists so a
 * drop or carry stays in the field; it zeroes his velocity toward the sideline
 * whenever he could not stop before it on half his lateral traction, which at
 * pursuit speed is 5-8 yd from the line. Applied to a pursuit that is an on-off
 * re-aim (47-56% of first and second rally defenders' > 20 deg request changes,
 * 4+ yd short zone catches, scripts/diag/pass-operators/rally4.mts). A pursuer
 * runs to the sideline with the carrier; the boundary is the carrier's, and
 * the body's own traction and the out-of-bounds rule still apply. On: a
 * command marked as a seen-carrier pursuit keeps its request (pursueIfLive's
 * chase of an observed holder, and CATCH_CARRY's drive on the catcher). */
export const PURSUIT_FIELD = process.env.PURSUIT_FIELD !== '0';
const carrierPursuit = Symbol('pursuit of a seen ball carrier');

/** Mark a request as the pursuit of a ball carrier this player has seen
 * (only with PURSUIT_FIELD on: off, the command is returned untouched). */
export function asCarrierPursuit<T extends MoveCommand>(command: T): T {
  return PURSUIT_FIELD ? { ...command, [carrierPursuit]: true } : command;
}

export function isCarrierPursuit(command: MoveCommand): boolean {
  return (command as { [carrierPursuit]?: true })[carrierPursuit] === true;
}

/** Field awareness changes a coverage command, not physical position or
 * velocity. External momentum can carry a DB out; he then brakes/recovers. */
export function containCoverage(a: Agent, command: MoveCommand): MoveCommand {
  if (PURSUIT_FIELD && isCarrierPursuit(command)) return command;
  const margin = a.profile.radius + 0.5;
  // Reserve traction for a simultaneous hip turn / lateral correction.
  const brake = 0.5 * Math.min(a.profile.brake, a.profile.lateral);
  const bounded = (position: number, velocity: number, requested: number, lo: number, hi: number): number => {
    if (position > hi) return Math.min(requested, -Math.min(a.profile.vmax, 0.5 + 2 * (position - hi)));
    if (position < lo) return Math.max(requested, Math.min(a.profile.vmax, 0.5 + 2 * (lo - position)));
    if (requested > 0) {
      const distance = Math.max(0, hi - position);
      // The stopping-speed cap alone: continuous in his room, never a step on his own speed (commit rule).
      return Math.min(requested, Math.sqrt(2 * brake * distance));
    }
    if (requested < 0) {
      const distance = Math.max(0, position - lo);
      return Math.max(requested, -Math.sqrt(2 * brake * distance));
    }
    return requested;
  };
  return { ...command, vel: {
    x: bounded(a.pos.x, a.vel.x, command.vel.x, margin, END_LINE_X - margin),
    y: bounded(a.pos.y, a.vel.y, command.vel.y, margin, FIELD_WIDTH - margin),
  } };
}
