/** Visible contact is evidence of blocking; merely waiting at the line is not. */
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';

export function showsBlock(a: Agent, sim: PlaySim, r: Agent, cue: Perceived = sim.see(a, r)): boolean {
  if (cue.pos.x - sim.los > 2 || Math.hypot(cue.vel.x, cue.vel.y) > 3) return false;
  // Pads and hand-contact geometry are observable. Never inspect the route,
  // offensive call or engagement bookkeeping to infer intent.
  if (cue.stance === 'low' && cue.vel.x > 0.4) return true;
  return sim.defense.some(d => {
    const other = d === a ? { pos: a.pos } : sim.see(a, d);
    const dx = other.pos.x - cue.pos.x, dy = other.pos.y - cue.pos.y;
    const distance = Math.hypot(dx, dy);
    const reach = r.profile.radius + d.profile.radius + r.player.measurables.armIn / 36 * 0.55;
    return distance < reach && distance > 0.05 && (Math.cos(cue.facing) * dx + Math.sin(cue.facing) * dy) / distance > 0.65;
  });
}
