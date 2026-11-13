import type { Vec2 } from '../core/vec.js';
import { locomotionAccel, type Body } from '../physics/kinematics.js';
import { supportParams } from '../physics/support.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Perceived } from './perception.js';

const ORDINARY_TICK = .05;

/** Advance one acquired teammate picture toward an announced velocity target.
 * Perception has already extrapolated its position at the observed velocity;
 * only the additional acceleration displacement belongs here. The gait
 * request is held at the ordinary controller interval, independently of age. This is a free,
 * fresh-body estimate, not knowledge of the teammate's current support or load.
 * Longer/unknown pictures retain their ordinary constant-velocity prediction.
 */
export function predictCalledMotion(seen: Perceived, called: Vec2 | null | undefined, profile: PhysicalProfile): Perceived {
  const age = seen.age;
  if (!called || age === undefined || !Number.isFinite(age) || age <= 0 || age > ORDINARY_TICK + 1e-9
    || seen.pose !== 'up' || !Number.isFinite(seen.facing)
    || ![seen.pos.x, seen.pos.y, seen.vel.x, seen.vel.y, called.x, called.y].every(Number.isFinite)
    || (seen.vel.x === called.x && seen.vel.y === called.y)) return seen;
  const body: Body = { pos: { ...seen.pos }, vel: { ...seen.vel }, facing: seen.facing!, energy: 1, profile };
  const acceleration = locomotionAccel(body, { vel: called, facing: seen.facing }, ORDINARY_TICK);
  const magnitude = Math.hypot(acceleration.x, acceleration.y);
  const limit = supportParams(profile).traction / profile.massKg;
  const scale = magnitude > limit ? limit / magnitude : 1;
  const ax = acceleration.x * scale, ay = acceleration.y * scale;
  return { ...seen,
    pos: { x: seen.pos.x + .5 * ax * age * age, y: seen.pos.y + .5 * ay * age * age },
    vel: { x: seen.vel.x + ax * age, y: seen.vel.y + ay * age } };
}

/** LINE_STEP: the velocity a teammate on an announced step (the zone track)
 * will have `horizon` seconds on, accelerating toward his call under his own
 * traction-bounded acceleration. A fresh-body estimate from the shared call,
 * used only to budget headway against him; the World resolves real contact. */
export function calledVelocityAhead(seen: Perceived, called: Vec2 | null | undefined, profile: PhysicalProfile, horizon: number): Vec2 | null {
  if (!called || seen.pose !== 'up' || !Number.isFinite(seen.facing)
    || ![seen.vel.x, seen.vel.y, called.x, called.y, horizon].every(Number.isFinite)) return null;
  const body: Body = { pos: { ...seen.pos }, vel: { ...seen.vel }, facing: seen.facing!, energy: 1, profile };
  const a = locomotionAccel(body, { vel: called, facing: seen.facing }, ORDINARY_TICK);
  const limit = Math.min(Math.hypot(a.x, a.y), supportParams(profile).traction / profile.massKg) * horizon;
  const dx = called.x - seen.vel.x, dy = called.y - seen.vel.y, d = Math.hypot(dx, dy);
  const k = d > limit ? limit / d : 1;
  return { x: seen.vel.x + dx * k, y: seen.vel.y + dy * k };
}
