/** Reconstructed phase-only experiment. No production imports this module.
 * Integrate the existing radial law with frozen inputs, locate base crossings,
 * and carry the outside clock from the actual outward crossing. This retains
 * free recovery plus the force-induced deficit; it is NOT achieved-support.
 */
export interface RecoveryInput {
  e: number; rb: number; w: number; speed: number;
  outsideFor: number; latency: number; h: number; loadVelocity: number;
}
export interface RecoveryPhase {
  next: number; weight: number; outsideFor: number;
  events: Array<{ t: number; kind: 'exit-base' | 'enter-base' | 'latency' }>;
}

export function advanceRecoveryPhase(a: RecoveryInput): RecoveryPhase {
  const { rb, w, speed, latency, h, loadVelocity: load } = a;
  let e = a.e, time = 0, out = e > rb ? a.outsideFor : 0, weight = 0;
  let outside = e > rb;
  const events: RecoveryPhase['events'] = [];
  for (let segment = 0; segment < 12 && time < h; segment++) {
    const left = h - time;
    if (!outside) {
      const eq = -load / w;
      const end = eq + (e - eq) * Math.exp(-w * left);
      let duration = left;
      if (eq > rb && end > rb) {
        duration = Math.log((eq - e) / (eq - rb)) / w;
      }
      const decay = Math.exp(-w * duration);
      weight = weight * decay - Math.expm1(-w * duration) / w;
      e = eq + (e - eq) * decay;
      time += duration; out = 0;
      if (duration < left) {
        e = rb; outside = true;
        events.push({ t: time, kind: 'exit-base' });
      }
    } else {
      const ramp = out < latency;
      const duration = Math.min(left, ramp ? latency - out : left);
      const slope = ramp ? speed / latency : 0;
      const initial = e - rb, command = (ramp ? speed * out / latency : speed) + load;
      const coefficient = initial - command / w - slope / (w * w);
      const displacement = (t: number) => initial + coefficient * Math.expm1(w * t) + slope * t / w;
      let used = duration;
      if (displacement(duration) < 0) {
        let lo = 0, hi = duration;
        for (let k = 0; k < 52; k++) {
          const mid = (lo + hi) / 2;
          if (displacement(mid) > 0) lo = mid; else hi = mid;
        }
        used = hi;
      }
      weight = weight * Math.exp(w * used) + Math.expm1(w * used) / w;
      e = rb + displacement(used); time += used; out += used;
      if (used < duration) {
        // Opposing one-sided vector fields have no unique classical crossing.
        // Expose that model gap rather than choosing a hidden stick timer.
        if (-w * rb - load > 0) throw new Error('Recovery law chatters at the base');
        e = rb; outside = false; out = 0;
        events.push({ t: time, kind: 'enter-base' });
      } else if (ramp && duration < left) {
        out = latency;
        events.push({ t: time, kind: 'latency' });
      }
    }
  }
  if (time < h - 1e-14) throw new Error('Recovery phase integration did not complete');
  return { next: e, weight, outsideFor: outside ? out : 0, events };
}
