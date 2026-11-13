/** Effective torso footprint. Arms/tackle reach remain separate. */
import { clamp, type Vec2 } from '../core/vec.js';
import type { Body } from './kinematics.js';

/** Support of a shoulder-turned ellipse along a collision normal. */
export function bodyRadius(body: Body, nx: number, ny: number): number {
  const squeeze = clamp(body.squeeze ?? 0, 0, 1);
  if (!squeeze) return body.profile.radius;
  const h = body.squeezeHeading ?? body.facing;
  const along = nx * Math.cos(h) + ny * Math.sin(h);
  const across = -nx * Math.sin(h) + ny * Math.cos(h);
  const length = body.profile.radius * (1 + 0.12 * squeeze);
  const width = body.profile.radius * (1 - 0.32 * squeeze);
  return Math.hypot(length * along, width * across);
}

export interface GapBody { pos: Vec2; radius: number }

/** Detect a physically passable narrow opening ahead, bounded on both sides. */
export function squeezeForGap(pos: Vec2, heading: number, radius: number, bodies: GapBody[]): number {
  const hx = Math.cos(heading);
  const hy = Math.sin(heading);
  const left: Array<{ along: number; clear: number }> = [];
  const right: Array<{ along: number; clear: number }> = [];
  for (const body of bodies) {
    const dx = body.pos.x - pos.x;
    const dy = body.pos.y - pos.y;
    const along = dx * hx + dy * hy;
    const across = -dx * hy + dy * hx;
    if (along < -0.25 || along > 2.2 || Math.abs(across) > 1.4) continue;
    (across > 0 ? left : right).push({ along, clear: Math.abs(across) - body.radius });
  }
  let demand = 0;
  for (const l of left) for (const r of right) {
    if (Math.abs(l.along - r.along) > 0.9) continue;
    const clear = Math.min(l.clear, r.clear);
    // Don't use posture to run through a body or an opening narrower than hips.
    if (clear < radius * 0.68 || clear > radius + 0.10) continue;
    demand = Math.max(demand, clamp((radius + 0.08 - clear) / (radius * 0.32), 0, 1));
  }
  return demand;
}
