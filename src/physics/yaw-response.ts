/** Constant-target critically damped yaw with bounded acceleration and rate.
 * error = target angle - body angle. The caller owns physical limits and the
 * shortest-angle choice. Exact segments compose across solver subdivisions;
 * boundary root finding locates events, not additional physical timesteps.
 */
export interface YawEvent { at: number; from: string; to: string; }
export interface YawResult {
  error: number; spin: number; angleDelta: number;
  maxAcceleration: number; events: YawEvent[];
}

type Mode = 'free' | 'acceleration' | 'rate' | 'overspeed';

export function integrateYaw(error: number, spin: number, h: number,
  tau: number, alpha: number, rate: number): YawResult {
  if (!Number.isFinite(error) || !Number.isFinite(spin) || !Number.isFinite(h)
    || !Number.isFinite(tau) || !Number.isFinite(alpha) || !Number.isFinite(rate)
    || h < 0 || tau <= 0 || alpha < 0 || rate < 0) throw new RangeError('Invalid yaw flow');
  if (h === 0) return { error, spin, angleDelta: 0, maxAcceleration: 0, events: [] };
  if (alpha === 0) return { error: error - spin * h, spin,
    angleDelta: spin * h, maxAcceleration: 0, events: [] };
  const initialAcceleration = (error - 2 * tau * spin) / (tau * tau);
  const roundRate = 32 * Number.EPSILON * Math.max(1, rate, Math.abs(spin));
  const roundA = 32 * Number.EPSILON * Math.max(1, alpha, Math.abs(initialAcceleration));

  // Most short motor intervals remain entirely inside the acceleration and
  // rate bounds. Certify the extrema of that exact critical flow once rather
  // than constructing boundary searches for a segment with no boundary event.
  // Saturated, externally overspeed and boundary cases retain the event solver.
  if (Math.abs(initialAcceleration) < alpha - roundA && Math.abs(spin) < rate - roundRate) {
    const B = error / tau - spin, A = error - 2 * tau * spin;
    const decay = Math.exp(-h / tau);
    const endError = (error + B * h) * decay;
    const endSpin = (spin + B * h / tau) * decay;
    const endAcceleration = (A - B * h) * decay / (tau * tau);
    const accelerationStationary = B !== 0 ? tau + A / B : Infinity;
    const spinStationary = B !== 0 ? A / B : Infinity;
    let peakAcceleration = Math.max(Math.abs(initialAcceleration), Math.abs(endAcceleration));
    let peakSpin = Math.max(Math.abs(spin), Math.abs(endSpin));
    if (accelerationStationary > 0 && accelerationStationary < h) {
      peakAcceleration = Math.max(peakAcceleration, Math.abs(
        (A - B * accelerationStationary) * Math.exp(-accelerationStationary / tau) / (tau * tau)));
    }
    if (spinStationary > 0 && spinStationary < h) {
      peakSpin = Math.max(peakSpin, Math.abs(
        (spin + B * spinStationary / tau) * Math.exp(-spinStationary / tau)));
    }
    if (peakAcceleration < alpha && peakSpin < rate) {
      return { error: endError, spin: endSpin, angleDelta: error - endError,
        maxAcceleration: peakAcceleration, events: [] };
    }
  }

  return integrateYawEvents(error, spin, h, tau, alpha, rate, roundRate, roundA);
}

/** Boundary crossings are uncommon at the physics interval. Keep their
 * captured mutable state and root-search closures off the no-event hot path.
 * The event arithmetic and limits are unchanged. */
function integrateYawEvents(error: number, spin: number, h: number,
  tau: number, alpha: number, rate: number, roundRate: number, roundA: number): YawResult {
  const initialError = error, events: YawEvent[] = [];
  let elapsed = 0, maxAcceleration = 0;
  let phase = yawMode(error, spin, tau, alpha, rate, roundRate, roundA);
  if (phase === 'overspeed') events.push({ at: 0, from: 'incoming', to: phase });
  for (let transitions = 0; elapsed < h; transitions++) {
    if (transitions >= 64) throw new Error('Yaw transition solve did not finish');
    const remaining = h - elapsed;
    let duration = remaining, next: Mode | null = null;
    if (phase === 'free') {
      const e0 = error, w0 = spin, B = e0 / tau - w0, A = e0 - 2 * tau * w0;
      const flow = (t: number) => {
        const decay = Math.exp(-t / tau);
        return { error: (e0 + B * t) * decay,
          spin: (w0 + B * t / tau) * decay,
          acceleration: (A - B * t) * decay / (tau * tau) };
      };
      const accelStationary = B !== 0 ? tau + A / B : Infinity;
      const spinStationary = B !== 0 ? A / B : Infinity;
      const ta = exit(t => flow(t).acceleration, alpha, accelStationary, remaining, roundA);
      const tr = exit(t => flow(t).spin, rate, spinStationary, remaining, roundRate);
      if (tr <= remaining && tr <= ta) { duration = tr; next = 'rate'; }
      else if (ta <= remaining) { duration = ta; next = 'acceleration'; }
      const end = flow(duration);
      const peak = Math.max(Math.abs((e0 - 2 * tau * w0) / (tau * tau)), Math.abs(end.acceleration),
        accelStationary > 0 && accelStationary < duration ? Math.abs(flow(accelStationary).acceleration) : 0);
      maxAcceleration = Math.max(maxAcceleration, Math.min(alpha, peak));
      error = end.error; spin = end.spin;
      // Exact known rate crossing, canonicalized only within roundoff.
      if (next === 'rate' && Math.abs(Math.abs(spin) - rate) <= roundRate)
        spin = Math.sign(spin) * rate;
    } else if (phase === 'rate') {
      // No outward drive at the cap. The error continues changing while the
      // body coasts, until the critical servo requests inward acceleration.
      const release = spin !== 0 ? (error - 2 * tau * spin) / spin : Infinity;
      if (release >= 0 && release <= remaining) { duration = release; next = 'free'; }
      error -= spin * duration;
    } else {
      const sign = phase === 'overspeed' ? -Math.sign(spin) : Math.sign((error - 2 * tau * spin) / (tau * tau));
      const acceleration = sign * alpha;
      if (phase === 'overspeed') {
        const reach = Math.max(0, (Math.abs(spin) - rate) / alpha);
        if (reach <= remaining) { duration = reach; next = 'free'; }
      } else {
        // The positive root where saturated demand re-enters the free flow.
        const C = Math.max(0, sign * (error - 2 * tau * spin) - alpha * tau * tau);
        const V = sign * spin + 2 * tau * alpha;
        const root = Math.sqrt(V * V + 2 * alpha * C);
        const release = V >= 0 ? (V + root > 0 ? 2 * C / (V + root) : 0) : (-V + root) / alpha;
        const reach = (rate - sign * spin) / alpha;
        if (reach >= 0 && reach <= remaining && reach <= release) { duration = reach; next = 'rate'; }
        else if (release <= remaining) { duration = release; next = 'free'; }
      }
      const previousSpin = spin;
      error -= previousSpin * duration + .5 * acceleration * duration * duration;
      spin += acceleration * duration;
      if (duration > 0) maxAcceleration = Math.max(maxAcceleration, alpha);
      if ((next === 'rate' || phase === 'overspeed' && next === 'free')
        && Math.abs(Math.abs(spin) - rate) <= roundRate) spin = Math.sign(spin) * rate;
    }
    elapsed += duration;
    if (next === null || elapsed >= h) break;
    const previous = phase;
    phase = next === 'free' ? yawMode(error, spin, tau, alpha, rate, roundRate, roundA) : next;
    // A known saturation release enters the inward free lobe even if its
    // boundary value carries a final ulp outside the acceleration limit.
    if (next === 'free' && previous === 'acceleration') phase = 'free';
    events.push({ at: elapsed, from: previous, to: phase });
  }
  return { error, spin, angleDelta: initialError - error, maxAcceleration, events };
}

function yawMode(error: number, spin: number, tau: number, alpha: number,
  rate: number, roundRate: number, roundA: number): Mode {
  // Exception for externally acquired excess spin: physically brake toward
  // the existing rate limit at finite alpha; never project initial spin.
  if (Math.abs(spin) > rate + roundRate) return 'overspeed';
  const a = (error - 2 * tau * spin) / (tau * tau), sign = Math.sign(spin);
  if (rate === 0 || (Math.abs(spin) >= rate - roundRate && sign * a > roundA)) return 'rate';
  const derivative = (-spin - 2 * tau * a) / (tau * tau);
  if (Math.abs(a) > alpha + roundA
    || (Math.abs(a) >= alpha - roundA && a * derivative > 0)) return 'acceleration';
  return 'free';
}

/** Earliest outward crossing of +/-limit, using exact flow on monotonic
 * lobes. Bisection locates a boundary; it is not a time-stepping integrator. */
function exit(fn: (t: number) => number, limit: number, stationary: number,
  duration: number, tolerance: number): number {
  const times = [0, ...(stationary > 0 && stationary < duration ? [stationary] : []), duration];
  for (let k = 1; k < times.length; k++) {
    const end = fn(times[k]);
    if (Math.abs(end) <= limit + tolerance) continue;
    const sign = Math.sign(end);
    let lo = times[k - 1], hi = times[k];
    if (sign * fn(lo) >= limit) return lo;
    for (let iteration = 0; iteration < 64; iteration++) {
      const mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      if (sign * fn(mid) > limit) hi = mid; else lo = mid;
    }
    return hi;
  }
  return Infinity;
}
