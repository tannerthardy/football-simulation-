/** Short forecasts from visible movement and torso orientation, never routes.
 * A hip turn is evidence, not a commitment: predictions remain bounded by
 * the receiver's cutting/braking limits and are rebuilt on each observation.
 */
import { angleDiff, clamp } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Perceived } from './perception.js';

export class RouteObservation {
  private previous: { t: number; speed: number } | null = null;

  read(cue: Perceived, t: number, profile: Pick<PhysicalProfile, 'brake' | 'lateral'>, horizon: number, confidence: number): Perceived {
    const speed = Math.hypot(cue.vel.x, cue.vel.y);
    const previous = this.previous;
    this.previous = { t, speed };
    if (speed < 0.5) return cue;
    const dt = previous ? t - previous.t : 0;
    // Braking is a visible plant cue. Don't invent a burst from noisy speed
    // differences, or extrapolate a stop into a reversal.
    const decel = previous && dt > 0 && dt <= 0.3 ? clamp((speed - previous.speed) / dt, -profile.brake, 0) : 0;
    const trust = clamp(confidence, 0, 1);
    const h = clamp(horizon, 0, 0.25) * trust;
    // The buffer dead-reckons a stale image at constant velocity. Once a
    // plant is visible, that predicts a receiver continuing past his stop.
    // Correct that existing extrapolation with the *observed* deceleration;
    // neither a called break nor a future acceleration is available here.
    const age = clamp(cue.age ?? 0, 0, 0.4) * trust;
    const heading = Math.atan2(cue.vel.y, cue.vel.x);
    const hipTurn = angleDiff(heading, cue.facing);
    // A receiver turning to face the QB may be presenting for a catch. His
    // torso pointing backwards is not permission to predict a reverse route.
    const turn = Math.abs(hipTurn) < Math.PI / 2 ? clamp(hipTurn, -profile.lateral * h / speed, profile.lateral * h / speed) : 0;
    const predictedSpeed = Math.max(0, speed + decel * (age + h));
    const vel = { x: Math.cos(heading + turn) * predictedSpeed, y: Math.sin(heading + turn) * predictedSpeed };
    const stopAge = decel < 0 ? Math.min(age, speed / -decel) : age;
    const correction = speed * stopAge + decel * stopAge * stopAge * 0.5 - speed * age;
    return { ...cue, vel, pos: { x: cue.pos.x + Math.cos(heading) * correction + (vel.x - cue.vel.x) * h * 0.5,
      y: cue.pos.y + Math.sin(heading) * correction + (vel.y - cue.vel.y) * h * 0.5 } };
  }
}
