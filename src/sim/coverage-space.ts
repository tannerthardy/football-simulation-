import { END_LINE_X, FIELD_WIDTH } from '../core/field.js';
import type { MoveCommand } from '../physics/kinematics.js';
import type { Agent } from './agent.js';

/** Field awareness changes a coverage command, not physical position or
 * velocity. External momentum can carry a DB out; he then brakes/recovers. */
export function containCoverage(a: Agent, command: MoveCommand): MoveCommand {
  const margin = a.profile.radius + 0.5;
  // Reserve traction for a simultaneous hip turn / lateral correction.
  const brake = 0.5 * Math.min(a.profile.brake, a.profile.lateral);
  const bounded = (position: number, velocity: number, requested: number, lo: number, hi: number): number => {
    if (position > hi) return Math.min(requested, -Math.min(a.profile.vmax, 0.5 + 2 * (position - hi)));
    if (position < lo) return Math.max(requested, Math.min(a.profile.vmax, 0.5 + 2 * (lo - position)));
    if (requested > 0) {
      const distance = Math.max(0, hi - position);
      if (velocity > 0 && velocity * velocity / (2 * brake) >= distance) return 0;
      return Math.min(requested, Math.sqrt(2 * brake * distance));
    }
    if (requested < 0) {
      const distance = Math.max(0, position - lo);
      if (velocity < 0 && velocity * velocity / (2 * brake) >= distance) return 0;
      return Math.max(requested, -Math.sqrt(2 * brake * distance));
    }
    return requested;
  };
  return { ...command, vel: {
    x: bounded(a.pos.x, a.vel.x, command.vel.x, margin, END_LINE_X - margin),
    y: bounded(a.pos.y, a.vel.y, command.vel.y, margin, FIELD_WIDTH - margin),
  } };
}
