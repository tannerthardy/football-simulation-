/** Controlled contact-height probes. No play calling or outcome calibration.
 * A reachable, bounded hand-force pulse isolates angular support from translation;
 * it is an active stimulus, not a claim that passive contact supplies energy. */
import type { Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Body } from '../physics/kinematics.js';
import { comHeightAt, newSupport, supportParams } from '../physics/support.js';
import { World, type Intent } from '../physics/world.js';

function body(mass: number, pos: Vec2, facing = 0, posture = 0.2): Body {
  const profile: PhysicalProfile = { massKg: mass, radius: 0.3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
    brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
  return { pos, vel: { x: 0, y: 0 }, facing, energy: 1, profile, support: newSupport(posture) };
}

export function heightPulse({ offset, substeps = 12, angle = 0, side = 1 }:
  { offset: number; substeps?: number; angle?: number; side?: number }) {
  const direction = { x: Math.cos(angle), y: side * Math.sin(angle) };
  const a = body(100, { x: -direction.x, y: -direction.y }), b = body(100, { x: 0, y: 0 });
  const world = new World([a, b], { substeps });
  const height = comHeightAt(supportParams(b.profile), b.support!.posture) + offset;
  world.strike(a, b, { x: 40 * direction.x, y: 40 * direction.y }, height);
  const passive: Intent = { vel: { x: 0, y: 0 }, free: true };
  let momentumError = 0;
  for (let k = 0; k < 4; k++) {
    const before = { x: (a.vel.x + b.vel.x) * 100, y: (a.vel.y + b.vel.y) * 100 };
    const r = world.step([passive, passive], 0.05);
    const gx = r.groundImpulse[0].x + r.groundImpulse[1].x, gy = r.groundImpulse[0].y + r.groundImpulse[1].y;
    momentumError = Math.max(momentumError, Math.hypot((a.vel.x + b.vel.x) * 100 - before.x - gx,
      (a.vel.y + b.vel.y) * 100 - before.y - gy));
  }
  const along = (v: Vec2) => v.x * direction.x + v.y * direction.y;
  const across = (v: Vec2) => -v.x * direction.y + v.y * direction.x;
  return { offset, height, substeps, angle, side, velocity: along(b.vel), lateralVelocity: across(b.vel),
    deviation: along(b.support!.xi), lateralDeviation: across(b.support!.xi),
    tipAcceleration: along(b.support!.tipAccel ?? { x: 0, y: 0 }), momentumError, state: b.support!.state };
}

/** Equal-strength opponents in a sustained hand fight. Test that settled
 * supported moments are braced rather than accumulating an endless tip. */
export function steadyHands(posture: number, substeps = 12) {
  const a = body(130, { x: 0, y: 0 }, 0, posture), b = body(130, { x: 0.85, y: 0 }, Math.PI, posture);
  const world = new World([a, b], { substeps });
  world.joints.push({ kind: 'hands', a, b, extension: 0.85, push: 1500, hold: 300, steer: 0 });
  let falls = 0, momentumError = 0;
  for (let k = 0; k < 100; k++) {
    const px = (a.vel.x + b.vel.x) * 130;
    const r = world.step([{ vel: { x: 3, y: 0 }, posture, push: 1 }, { vel: { x: -3, y: 0 }, posture, push: 1 }], 0.05);
    falls += r.falls.length;
    momentumError = Math.max(momentumError, Math.abs((a.vel.x + b.vel.x) * 130 - px - r.groundImpulse[0].x - r.groundImpulse[1].x));
  }
  return { posture, substeps, duration: 5, falls, momentumError, peak: a.support!.peak,
    separation: b.pos.x - a.pos.x, endDeviation: Math.hypot(a.support!.xi.x, a.support!.xi.y) };
}
