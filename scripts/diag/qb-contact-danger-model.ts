/** Offline geometry diagnostic only. Never installed by a QB controller.
 * Uses the already-consumed rusher picture and the QB's own motion.
 * Blocking information and perception acquisition are deliberately separate.
 */
import type { Vec2 } from '../../src/core/vec.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
import { interceptPoint, timeToReach } from '../../src/physics/reach.js';
import type { Perceived } from '../../src/sim/perception.js';

export interface KnownMover { picture: Perceived; profile: PhysicalProfile; speedScale?: number }
export interface OwnQuarterback { pos: Vec2; vel: Vec2; radius: number }
const HORIZON = 4;

/** First entry into a contact footprint along acquired relative motion.
 * A lateral pass that misses the footprint is not an imminent collision.
 * age is metadata: Perceived.pos has already been projected to the present.
 */
export function sweptContact(q: OwnQuarterback, r: KnownMover, radius: number): number {
  const x = r.picture.pos.x - q.pos.x, y = r.picture.pos.y - q.pos.y;
  const vx = r.picture.vel.x - q.vel.x, vy = r.picture.vel.y - q.vel.y;
  const C = x * x + y * y - radius * radius, dot = x * vx + y * vy;
  if (C <= 0) return dot <= 0 ? 0 : Infinity;
  const A = vx * vx + vy * vy;
  if (A < 1e-9 || dot >= 0) return Infinity;
  const disc = dot * dot - A * C;
  if (disc < 0) return Infinity;
  const t = (-dot - Math.sqrt(disc)) / A;
  return t >= 0 && t <= HORIZON ? t : Infinity;
}

export function forecastContact(q: OwnQuarterback, r: KnownMover) {
  // Full arm reach is an outer bound on possible hand contact, not a promise
  // of acquisition, a loaded grip, or a fall. No capability is changed.
  const radius = q.radius + r.profile.radius + r.profile.reach;
  const moving = sweptContact(q, r, radius);
  let redirect = Infinity;
  if (r.picture.pose !== 'down' && r.picture.pose !== 'rising') {
    const mover = { pos: r.picture.pos, vel: r.picture.vel, profile: r.profile, speedScale: r.speedScale ?? 1 };
    const path = (t: number) => ({ x: q.pos.x + q.vel.x * t, y: q.pos.y + q.vel.y * t });
    const meet = interceptPoint(mover, path, { horizon: HORIZON, step: .05, radius });
    // interceptPoint also returns its best failed sample. Do not call that
    // an attained interception or impose the horizon as an arrival time.
    if (timeToReach(mover, meet.point, radius) <= meet.t + 1e-9) redirect = meet.t;
  }
  return { time: Math.min(moving, redirect), moving, redirect, radius,
    distance: Math.hypot(r.picture.pos.x - q.pos.x, r.picture.pos.y - q.pos.y) };
}

/** Geometry-only arm keeps the original held penalty and acquisition. */
export function geometryWithOriginalHold(q: OwnQuarterback, r: KnownMover, held: number) {
  const f = forecastContact(q, r);
  return { ...f, time: f.time + held };
}
