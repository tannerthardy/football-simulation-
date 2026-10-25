/** Translational contact between free bodies or already coupled groups.
 * Internal block/grasp geometry belongs to its own constraint. An outside
 * bump shifts that constraint together, with impulse shared by total mass.
 * This deliberately omits rigid-body torque and full articulated anatomy.
 */
import type { Vec2 } from '../core/vec.js';
import { clamp } from '../core/vec.js';
import type { Body } from './kinematics.js';

export interface ContactGroup {
  readonly bodies: readonly Body[];
  readonly mass: number;
}

export function contactGroup(bodies: readonly Body[]): ContactGroup {
  return { bodies, mass: bodies.reduce((sum, b) => sum + b.profile.massKg, 0) };
}

/** Actual common motion, including impulses received since the last solve. */
export function groupVelocity(group: ContactGroup): Vec2 {
  let x = 0, y = 0;
  for (const b of group.bodies) {
    x += b.vel.x * b.profile.massKg;
    y += b.vel.y * b.profile.massKg;
  }
  return { x: x / group.mass, y: y / group.mass };
}

/** Explicit impulse, in kg yd/s. Returns kinetic work in kg yd²/s².
 * Equal velocity increments preserve the group's internal relative motion.
 */
export function applyGroupImpulse(group: ContactGroup, impulse: Vec2): number {
  const before = groupVelocity(group);
  for (const b of group.bodies) b.vel = {
    x: b.vel.x + impulse.x / group.mass,
    y: b.vel.y + impulse.y / group.mass,
  };
  return before.x * impulse.x + before.y * impulse.y
    + (impulse.x ** 2 + impulse.y ** 2) / (2 * group.mass);
}

/** Passive friction/grasp coupling, bounded by an impulse budget. */
export function coupleGroupMotion(a: ContactGroup, b: ContactGroup, fraction: number, maxImpulse = Infinity): number {
  const va = groupVelocity(a), vb = groupVelocity(b);
  const vx = vb.x - va.x, vy = vb.y - va.y;
  const speed = Math.hypot(vx, vy);
  if (speed < 1e-12) return 0;
  const reducedMass = 1 / (1 / a.mass + 1 / b.mass);
  const amount = Math.min(clamp(fraction, 0, 1) * reducedMass * speed, Math.max(0, maxImpulse));
  const impulse = { x: vx / speed * amount, y: vy / speed * amount };
  applyGroupImpulse(a, impulse); applyGroupImpulse(b, { x: -impulse.x, y: -impulse.y });
  return amount;
}

/** Compact grasp edge. It resists motion; it never reels two bodies together
 * by moving their positions or invents passive work to tighten a wrap.
 */
export interface GraspLink {
  a: Body;
  b: Body;
  maxDistance: number;
  /** kg yd/s²; total normal/tangent impulse shares this limit. */
  forceCapacity: number;
  /** Relative-motion damping rate, per second. */
  dampingRate: number;
  /** Full-wrap goal, still subject to the same finite load limit. */
  locked: boolean;
}

/** Advance a contact graph with passive velocity impulses and finite reach.
 * Four local physics steps do not update perception or technique choices.
 * External foot impulses must be applied explicitly before this function.
 */
export function advanceGrasps(bodies: readonly Body[], links: readonly GraspLink[], dt: number): Set<GraspLink> {
  const slipped = new Set<GraspLink>();
  const step = dt / 4;
  const groups = new Map(bodies.map(b => [b, contactGroup([b])]));
  for (let sub = 0; sub < 4; sub++) {
    const ordered = sub % 2 ? [...links].reverse() : links;
    const remaining = new Map<GraspLink, number>();
    for (const link of ordered) {
      if (slipped.has(link)) continue;
      if (Math.hypot(link.b.pos.x - link.a.pos.x, link.b.pos.y - link.a.pos.y) > link.maxDistance + 1e-6) {
        slipped.add(link); continue;
      }
      const budget = Math.max(0, link.forceCapacity) * step;
      const fraction = link.locked ? 1 : -Math.expm1(-Math.max(0, link.dampingRate) * step);
      const used = coupleGroupMotion(groups.get(link.a)!, groups.get(link.b)!, fraction, budget);
      remaining.set(link, budget - used);
    }
    // Neighboring links share a carrier; a later impulse can disturb an
    // earlier reach constraint. Recheck locally, with no new load budget.
    for (let pass = 0; pass < 4; pass++) {
      for (const link of ordered) {
        if (slipped.has(link)) continue;
        const x = link.b.pos.x - link.a.pos.x + (link.b.vel.x - link.a.vel.x) * step;
        const y = link.b.pos.y - link.a.pos.y + (link.b.vel.y - link.a.vel.y) * step;
        const length = Math.hypot(x, y);
        if (length <= link.maxDistance + 1e-8) continue;
        const nx = x / length, ny = y / length;
        const reducedMass = 1 / (1 / link.a.profile.massKg + 1 / link.b.profile.massKg);
        const needed = reducedMass * (length - link.maxDistance) / step;
        const outward = (link.b.vel.x - link.a.vel.x) * nx + (link.b.vel.y - link.a.vel.y) * ny;
        // Only remove separating energy. Pre-existing overextension slips;
        // it cannot request active pull-in through a passive constraint.
        const amount = Math.max(0, Math.min(needed, remaining.get(link) ?? 0, reducedMass * Math.max(0, outward)));
        applyGroupImpulse(groups.get(link.a)!, { x: nx * amount, y: ny * amount });
        applyGroupImpulse(groups.get(link.b)!, { x: -nx * amount, y: -ny * amount });
        remaining.set(link, (remaining.get(link) ?? 0) - amount);
      }
    }
    for (const link of ordered) {
      if (slipped.has(link)) continue;
      const x = link.b.pos.x - link.a.pos.x + (link.b.vel.x - link.a.vel.x) * step;
      const y = link.b.pos.y - link.a.pos.y + (link.b.vel.y - link.a.vel.y) * step;
      if (Math.hypot(x, y) > link.maxDistance + 1e-6) slipped.add(link);
    }
    for (const body of bodies) body.pos = { x: body.pos.x + body.vel.x * step, y: body.pos.y + body.vel.y * step };
  }
  return slipped;
}

/** Advance a two-body constraint about its center of mass. Limited internal
 * foot/hand repositioning changes separation, never translates the pair.
 * Semi-implicit positions and velocities agree; the next solver consumes
 * these actual velocities, including any intervening outside collision.
 */
export function advanceContactPair(b: Body, d: Body, velocity: Vec2, relativeGoal: Vec2, relativeSpeed: number, dt: number): void {
  const mass = b.profile.massKg + d.profile.massKg;
  const shareB = d.profile.massKg / mass, shareD = 1 - shareB;
  const relative = { x: b.pos.x - d.pos.x, y: b.pos.y - d.pos.y };
  const dx = relativeGoal.x - relative.x, dy = relativeGoal.y - relative.y;
  const distance = Math.hypot(dx, dy);
  const fraction = distance > relativeSpeed * dt ? relativeSpeed * dt / distance : 1;
  const cx = dx * fraction, cy = dy * fraction;
  const center = {
    x: (b.pos.x * b.profile.massKg + d.pos.x * d.profile.massKg) / mass + velocity.x * dt,
    y: (b.pos.y * b.profile.massKg + d.pos.y * d.profile.massKg) / mass + velocity.y * dt,
  };
  relative.x += cx; relative.y += cy;
  b.pos = { x: center.x + shareB * relative.x, y: center.y + shareB * relative.y };
  d.pos = { x: center.x - shareD * relative.x, y: center.y - shareD * relative.y };
  b.vel = { x: velocity.x + shareB * cx / dt, y: velocity.y + shareB * cy / dt };
  d.vel = { x: velocity.x - shareD * cx / dt, y: velocity.y - shareD * cy / dt };
}

/** Resolve one overlap along a unit normal from a to b. Positional repair
 * conserves the combined center of mass. A compliant bump removes half the
 * groups' closing speed (the previous free-body response), without adding
 * kinetic energy or changing internal relative velocities.
 */
export function resolveGroupContact(a: ContactGroup, b: ContactGroup, normal: Vec2, overlap: number): void {
  const shareA = b.mass / (a.mass + b.mass), shareB = 1 - shareA;
  for (const body of a.bodies) body.pos = {
    x: body.pos.x - normal.x * overlap * shareA,
    y: body.pos.y - normal.y * overlap * shareA,
  };
  for (const body of b.bodies) body.pos = {
    x: body.pos.x + normal.x * overlap * shareB,
    y: body.pos.y + normal.y * overlap * shareB,
  };
  const va = groupVelocity(a), vb = groupVelocity(b);
  const closing = (vb.x - va.x) * normal.x + (vb.y - va.y) * normal.y;
  if (closing >= 0) return;
  const impulse = -0.5 * closing / (1 / a.mass + 1 / b.mass);
  for (const body of a.bodies) body.vel = {
    x: body.vel.x - normal.x * impulse / a.mass,
    y: body.vel.y - normal.y * impulse / a.mass,
  };
  for (const body of b.bodies) body.vel = {
    x: body.vel.x + normal.x * impulse / b.mass,
    y: body.vel.y + normal.y * impulse / b.mass,
  };
}
