/** Visible contact is evidence of blocking; merely waiting at the line is not. */
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';

export function showsBlock(a: Agent, sim: PlaySim, r: Agent, cue: Perceived = sim.see(a, r),
  contactTargets: readonly Agent[] = sim.defense): boolean {
  if (cue.pos.x - sim.los > 2) return false;
  return observedBlocking(a, sim, r, cue, contactTargets);
}

/** Current acquired pads/contact evidence, independent of shallow admission.
 * A marker already executing support can keep recognizing his blocker after
 * he crosses that admission boundary. This alone does not admit a deep route
 * to blocking in recognition or match-release classification.
 */
export function observedBlocking(a: Agent, sim: PlaySim, r: Agent, cue: Perceived,
  contactTargets: readonly Agent[] = sim.defense): boolean {
  // Pads and hand-contact geometry are observable. Never inspect the route,
  // offensive call or engagement bookkeeping to infer intent.
  // A lead/climbing blocker can approach faster than an engaged lineman.
  // Speed alone does not erase his low pads or visible contact; otherwise
  // his marker alternates between run fit and coverage as he accelerates.
  if (cue.stance === 'low' && cue.vel.x > 0.4) return true;
  return contactTargets.some(d => {
    const other = d === a ? { pos: a.pos } : sim.see(a, d);
    const dx = other.pos.x - cue.pos.x, dy = other.pos.y - cue.pos.y;
    const distance = Math.hypot(dx, dy);
    const reach = r.profile.radius + d.profile.radius + r.player.measurables.armIn / 36 * 0.55;
    return distance < reach && distance > 0.05 && (Math.cos(cue.facing) * dx + Math.sin(cue.facing) * dy) / distance > 0.65;
  });
}
