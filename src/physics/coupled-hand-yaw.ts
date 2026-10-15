/** One passive tangent row and two legacy ground motors, at a frozen force
 * frame. Ground impulse G=clamp(demand+arm*H, +/-limit) accounts for the
 * hand's attained turning impulse within the same interval. No new force
 * capacity, spring, gain or World advancement is introduced. */
import { clamp } from '../core/vec.js';

export interface CoupledYawMotor {
  spin: number;
  inertia: number;
  arm: number;
  demand: number;
  limit: number;
}

export function coupleHandYaw(a: CoupledYawMotor, b: CoupledYawMotor,
  comSlip: number, translationMobility: number, handLimit: number): { tangent: number; groundA: number; groundB: number } {
  const ground = (m: CoupledYawMotor, h: number) => clamp(m.demand + m.arm * h, -m.limit, m.limit);
  const slip = (h: number) => comSlip + translationMobility * h
    - a.arm * (a.spin + (ground(a, h) - a.arm * h) / a.inertia)
    - b.arm * (b.spin + (ground(b, h) - b.arm * h) / b.inertia);
  let tangent: number;
  const left = slip(-handLimit), right = slip(handLimit);
  if (left >= 0) tangent = -handLimit;
  else if (right <= 0) tangent = handLimit;
  else {
    // At most four ground-cap breakpoints. Between them slip is linear,
    // strictly increasing through the bodies' translational mobility.
    const cuts = [-handLimit, handLimit];
    for (const m of [a, b]) if (m.arm > 0) for (const sign of [-1, 1]) {
      const h = (sign * m.limit - m.demand) / m.arm;
      if (h > -handLimit && h < handLimit) cuts.push(h);
    }
    cuts.sort((x, y) => x - y);
    tangent = 0;
    for (let k = 1; k < cuts.length; k++) {
      const lo = cuts[k - 1], hi = cuts[k], vl = slip(lo), vh = slip(hi);
      if (vl <= 0 && vh >= 0) {
        tangent = clamp(lo - vl * (hi - lo) / (vh - vl), lo, hi);
        break;
      }
    }
  }
  return { tangent, groundA: ground(a, tangent), groundB: ground(b, tangent) };
}
