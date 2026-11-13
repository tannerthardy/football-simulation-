/** A short tackle opportunity forecast through ordinary movement physics.
 * It holds the defender's last command and the observed runner's velocity.
 * It predicts positioning, not a successful grip or an unseen future cut.
 */
import { clamp } from '../core/vec.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

export interface TackleWindow {
  currentQuality: number;
  futureQuality: number;
  closest: number;
  closestAt: number;
}

/** Existing geometric wrap quality: torso contact versus extended fingertips. */
export function contactQuality(distance: number, body: number, arms: number): number {
  return clamp(1 - (distance - body - .25) / Math.max(.2, arms - body - .25), 0, 1);
}

/** Only free, upright movement is forecast. Contact/joint ownership remains
 * the caller's responsibility; a one-body preview cannot model those loads.
 */
export function previewTackleWindow(d: Agent, seen: Perceived,
  command: Intent | undefined, body: number, arms: number, now: number): TackleWindow | null {
  const s = d.body.support;
  if (!command || command.free || command.dive || command.lunge || d.isDown(now)
    || d.engagement || (s && (s.state !== 'up' || s.foot || s.strike
      || Math.hypot(s.lean.x, s.lean.y) > 1e-6
      || Math.hypot(s.load.x, s.load.y) > 1e-6))) return null;
  let closest = Math.hypot(seen.pos.x - d.pos.x, seen.pos.y - d.pos.y);
  const currentQuality = contactQuality(closest, body, arms);
  let closestAt = 0;
  // Six ordinary decision samples preserve the previous 0.3 s lookahead.
  // A useful hip passing between now and the next tick is not a reason to
  // skip this attempt: tackles can only be chosen at the decision samples.
  for (const p of previewFreeMovement(d.body, command, now, 6)) {
    // Loss of support is negative forecast evidence, not permission to fall
    // back to the ideal straight-line estimate. Only credit earlier upright
    // decision samples; if there are none, there is no benefit to waiting.
    if (p.support !== 'up') break;
    const distance = Math.hypot(seen.pos.x + seen.vel.x * p.t - p.pos.x,
      seen.pos.y + seen.vel.y * p.t - p.pos.y);
    if (distance < closest) { closest = distance; closestAt = p.t; }
  }
  return { currentQuality, futureQuality: contactQuality(closest, body, arms), closest, closestAt };
}
