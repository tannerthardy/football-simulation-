/** Planning with one's own body: the speed to request so the body, whose
 * speed approaches the request with time constant `tau` (kinematics'
 * driveAccel), covers `distance` along a line in `time` from current speed
 * `v0`. A short, early distance needs a large request (an explosive start);
 * a steady chase returns the chase speed. Unbounded: the caller and World
 * apply the body's limits.
 */
export function requestToCover(tau: number, distance: number, time: number, v0: number): number {
  const lag = tau * (1 - Math.exp(-time / tau));
  return (distance - v0 * lag) / Math.max(1e-3, time - lag);
}

/** The speed to request so the body's speed reaches `target` within `time`
 * from `v0` under the same lag law: matching a moving cue without lagging it. */
export function requestForSpeed(tau: number, target: number, time: number, v0: number): number {
  const decay = Math.exp(-time / tau);
  return (target - v0 * decay) / Math.max(1e-3, 1 - decay);
}
