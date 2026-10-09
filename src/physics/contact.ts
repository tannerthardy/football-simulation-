/** Translational contact between free bodies or already coupled groups.
 * Internal block/grasp geometry belongs to its own constraint. An outside
 * bump shifts that constraint together, with impulse shared by total mass.
 * This deliberately omits rigid-body torque and full articulated anatomy.
 */
import type { Vec2 } from '../core/vec.js';
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
