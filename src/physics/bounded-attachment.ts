import type { Vec2 } from '../core/vec.js';

/** Symmetric derivative of the body-relative material point with respect to z. */
export interface AttachmentDerivative { xx: number; xy: number; yy: number }
export interface BoundedAttachment { offset: Vec2; derivative: AttachmentDerivative }

/** r(z) = L tanh(|z|/L) z/|z|. This maps a correction coordinate, not a force. */
export function boundedAttachment(z: Vec2, limit: number): BoundedAttachment {
  if (!(limit > 0) || !Number.isFinite(limit) || !Number.isFinite(z.x) || !Number.isFinite(z.y)) {
    throw new RangeError('Bounded attachment requires finite coordinates and a positive finite limit');
  }
  const largest = Math.max(Math.abs(z.x), Math.abs(z.y));
  if (largest === 0) return { offset: { x: 0, y: 0 }, derivative: { xx: 1, xy: 0, yy: 1 } };
  // Normalizing first also handles finite components whose Euclidean norm overflows.
  const sx = z.x / largest, sy = z.y / largest, length = Math.hypot(sx, sy);
  const ux = sx / length, uy = sy / length, rho = (largest / limit) * length;
  let tangential: number, radial: number, offset: Vec2;
  if (rho < 1e-4) {
    const rho2 = rho * rho, rho4 = rho2 * rho2;
    tangential = 1 - rho2 / 3 + 2 * rho4 / 15;
    radial = 1 - rho2 + 2 * rho4 / 3;
    offset = { x: z.x * tangential, y: z.y * tangential };
  } else {
    const t = Math.tanh(rho), e = Math.exp(-2 * rho);
    tangential = (limit / largest) * (t / length);
    radial = 4 * e / ((1 + e) * (1 + e));
    offset = { x: limit * t * ux, y: limit * t * uy };
  }
  // Radial and tangential projectors avoid cancelling a small radial eigenvalue.
  return { offset, derivative: {
    xx: radial * ux * ux + tangential * uy * uy,
    xy: (radial - tangential) * ux * uy,
    yy: radial * uy * uy + tangential * ux * ux,
  } };
}

/** Inverse acquisition map. Reject an invalid/outside point rather than clamping it. */
export function inverseBoundedAttachment(offset: Vec2, limit: number): Vec2 | null {
  if (!(limit > 0) || !Number.isFinite(limit) || !Number.isFinite(offset.x) || !Number.isFinite(offset.y)) return null;
  const radius = Math.hypot(offset.x, offset.y);
  if (!(radius < limit)) return null;
  if (radius === 0) return { x: 0, y: 0 };
  const ratio = radius / limit;
  if (ratio < 1e-4) {
    const ratio2 = ratio * ratio, factor = 1 + ratio2 / 3 + ratio2 * ratio2 / 5;
    return { x: offset.x * factor, y: offset.y * factor };
  }
  // Using the actual positive gap retains strict-inside points if ratio rounds to 1.
  const magnitude = (limit * 0.5) * (Math.log1p(ratio) - Math.log((limit - radius) / limit));
  const z = { x: magnitude * (offset.x / radius), y: magnitude * (offset.y / radius) };
  return Number.isFinite(z.x) && Number.isFinite(z.y) ? z : null;
}
