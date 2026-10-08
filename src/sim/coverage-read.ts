/** Short forecasts from visible movement and torso orientation, never routes.
 * A hip turn is evidence, not a commitment: predictions remain bounded by
 * the receiver's cutting/braking limits and are rebuilt on each observation.
 */
import { angleDiff, clamp } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Perceived } from './perception.js';

export class RouteObservation {
  private previous: { t: number; speed: number } | null = null;

  read(cue: Perceived, t: number, profile: PhysicalProfile, horizon: number, confidence: number): Perceived {
    const speed = Math.hypot(cue.vel.x, cue.vel.y);
    const previous = this.previous;
    this.previous = { t, speed };
    if (speed < 0.5) return cue;
    const dt = previous ? t - previous.t : 0;
    // Braking is a visible plant cue. Don't invent a burst from noisy speed
    // differences, or extrapolate a stop into a reversal.
    const decel = previous && dt > 0 && dt <= 0.3 ? clamp((speed - previous.speed) / dt, -profile.brake, 0) : 0;
    const h = clamp(horizon, 0, 0.25) * clamp(confidence, 0, 1);
    const heading = Math.atan2(cue.vel.y, cue.vel.x);
    const hipTurn = angleDiff(heading, cue.facing);
    // A receiver turning to face the QB may be presenting for a catch. His
    // torso pointing backwards is not permission to predict a reverse route.
    const turn = Math.abs(hipTurn) < Math.PI / 2 ? clamp(hipTurn, -profile.lateral * h / speed, profile.lateral * h / speed) : 0;
    const predictedSpeed = Math.max(0, speed + decel * h);
    const vel = { x: Math.cos(heading + turn) * predictedSpeed, y: Math.sin(heading + turn) * predictedSpeed };
    return { ...cue, vel, pos: { x: cue.pos.x + (vel.x - cue.vel.x) * h * 0.5, y: cue.pos.y + (vel.y - cue.vel.y) * h * 0.5 } };
  }
}
