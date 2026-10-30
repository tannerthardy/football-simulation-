/** Minimal 2-D / 3-D vector math. Vectors are plain objects; ops allocate. */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const ZERO2: Readonly<Vec2> = Object.freeze({ x: 0, y: 0 });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const addScaled = (a: Vec2, b: Vec2, k: number): Vec2 => ({ x: a.x + b.x * k, y: a.y + b.y * k });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;

/** Two-component hypot without the general built-in's temporary argument
 * array. Use the same scaled sum as pinned Node 22: for two terms the first
 * Kahan compensation is zero and the second is unused. Keep argument order,
 * overflow/underflow protection and infinity-before-NaN handling.
 */
export function hypot2(x: number, y: number): number {
  const a = Math.abs(x), b = Math.abs(y);
  if (a === 0) return b;
  if (b === 0) return a;
  if (a === Infinity || b === Infinity) return Infinity;
  const scale = a > b ? a : b, u = a / scale, v = b / scale;
  return Math.sqrt(u * u + v * v) * scale;
}
export const len = (a: Vec2): number => hypot2(a.x, a.y);
export const len2 = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const dist = (a: Vec2, b: Vec2): number => hypot2(a.x - b.x, a.y - b.y);
export const dist2 = (a: Vec2, b: Vec2): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const fromAngle = (theta: number, mag = 1): Vec2 => ({ x: Math.cos(theta) * mag, y: Math.sin(theta) * mag });
export const angleOf = (a: Vec2): number => Math.atan2(a.y, a.x);
export const copy = (a: Vec2): Vec2 => ({ x: a.x, y: a.y });

export function norm(a: Vec2): Vec2 {
  const l = hypot2(a.x, a.y);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

export function clampLen(a: Vec2, max: number): Vec2 {
  const l = hypot2(a.x, a.y);
  return l > max && l > 1e-9 ? { x: (a.x / l) * max, y: (a.y / l) * max } : a;
}

export function rotate(a: Vec2, theta: number): Vec2 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

/** Wrap an angle to (-π, π]. */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}

/** Signed smallest difference b − a, in (-π, π]. */
export const angleDiff = (a: number, b: number): number => wrapAngle(b - a);

/** Closest point on segment ab to p, with the segment parameter t ∈ [0,1]. */
export function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number } {
  const ab = sub(b, a);
  const l2 = len2(ab);
  if (l2 < 1e-12) return { point: copy(a), t: 0 };
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return { point: addScaled(a, ab, t), t };
}

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const add3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale3 = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const len3 = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const xy = (a: Vec3): Vec2 => ({ x: a.x, y: a.y });

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerpNum = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const logistic = (x: number): number => 1 / (1 + Math.exp(-x));
