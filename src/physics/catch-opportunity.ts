import { clamp, type Vec2, type Vec3 } from '../core/vec.js';

export interface CatchEnvelope {
  reach: number;
  low: number;
  top: number;
}

export interface CatchOpportunity {
  /** Common normalized time in the body and ball endpoint interval. */
  s: number;
  dh: number;
  z: number;
}

/** Closest simultaneous horizontal approach while the ball is at legal height.
 * Both endpoint pairs must describe the SAME interval. Motion and ball height
 * are linear between endpoints; capacities and eligibility belong to callers.
 * This selects closest opportunity, not first entry into the reach envelope.
 * Equal-distance ties select the start of the legal height interval. */
export function closestCatchOpportunity(body0: Readonly<Vec2>, body1: Readonly<Vec2>,
  ball0: Readonly<Vec3>, ball1: Readonly<Vec3>, envelope: Readonly<CatchEnvelope>): CatchOpportunity | null {
  const { reach, low, top } = envelope;
  if (reach < 0 || top < low || !Number.isFinite(reach + low + top
    + body0.x + body0.y + body1.x + body1.y + ball0.x + ball0.y + ball0.z + ball1.x + ball1.y + ball1.z)) return null;

  let lo = 0, hi = 1;
  const dz = ball1.z - ball0.z;
  if (dz === 0) {
    if (ball0.z < low || ball0.z > top) return null;
  } else {
    const a = (low - ball0.z) / dz, b = (top - ball0.z) / dz;
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
    if (lo > hi) return null;
  }

  const rx = ball0.x - body0.x, ry = ball0.y - body0.y;
  const dx = (ball1.x - ball0.x) - (body1.x - body0.x);
  const dy = (ball1.y - ball0.y) - (body1.y - body0.y);
  const d2 = dx * dx + dy * dy;
  const s = d2 > 0 ? clamp(-(rx * dx + ry * dy) / d2, lo, hi) : lo;
  const dh = Math.hypot(rx + dx * s, ry + dy * s);
  return dh <= reach ? { s, dh, z: ball0.z + dz * s } : null;
}
