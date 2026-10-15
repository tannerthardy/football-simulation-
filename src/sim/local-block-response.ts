/** A free first-level defender answers his acquired block key before deciding
 * run or pass. The installation says which shoulder protects his gap; this
 * read neither identifies the offensive call nor chooses a ball carrier. */
import { FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { fatigueFactor, movingArrivalVelocity } from '../physics/kinematics.js';
import { availability, supportParams } from '../physics/support.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

export interface InstalledBlockKey {
  /** Copied public alignment, not the opponent's current position or job. */
  home: Vec2;
  radius: number;
  /** Public installed gap landmark, not an offensive run direction. */
  gapY: number;
  /** Direction this defender attacks, normally -x. */
  attackDirection: number;
}

export interface LocalBlockResponse {
  kind: 'reach' | 'squeeze';
  aim: Vec2;
  command: Intent;
}

/** No remote body, intentions, possession, call, memory or RNG is consulted.
 * A low lateral departure can be a run or a play-action fake. High/still keys
 * leave the installed rush alone. World owns attainment and subsequent load. */
export function readLocalBlock(a: Agent, seen: Perceived, key: InstalledBlockKey,
  now: number): LocalBlockResponse | null {
  const support = a.body.support;
  if (a.engagement || a.isDown(now) || !support || support.state !== 'up'
    || support.foot || support.strike || Math.hypot(support.lean.x, support.lean.y) > 1e-6
    || Math.hypot(support.load.x, support.load.y) > 1e-6
    || seen.pose !== 'up' || seen.stance !== 'low') return null;
  const gapSide = Math.sign(key.gapY - key.home.y);
  if (!gapSide) return null;
  const departure = seen.pos.y - key.home.y;
  if (Math.abs(seen.vel.y) <= Math.abs(seen.vel.x) || departure * seen.vel.y <= 0) return null;
  const sep = a.profile.radius + key.radius;
  // This key must still be a nearby first-level block threat. A departed
  // puller/climber does not drag a free lineman around the formation.
  const reach = sep + a.profile.reach;
  if (Math.abs(seen.pos.x - key.home.x) > reach
    || Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) > reach) return null;
  // Same bounded gap-side contact envelope as runContactRead's interior
  // installation. The actual offset comes from the called gap relative to
  // the known key, not a new universal outside shoulder.
  const shoulder = clamp(key.gapY - key.home.y, -sep * .65, sep * .65);
  const aim = { x: seen.pos.x - key.attackDirection * sep,
    y: clamp(seen.pos.y + shoulder, .5, FIELD_WIDTH - .5) };
  const capacity = availability(support, supportParams(a.profile), fatigueFactor(a.body.energy));
  const command: Intent = {
    vel: movingArrivalVelocity(a.body, aim, seen.vel, a.profile.vmax * a.speedScale, .1, 0, 1, capacity),
    facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x),
    posture: .7,
  };
  return { kind: seen.vel.y * gapSide > 0 ? 'reach' : 'squeeze', aim, command };
}
