/**
 * Teammates see and feel each other. A player does not plan to close on a
 * teammate faster than he could absorb the contact over a short horizon:
 * linemen working side by side stay hip to hip instead of crashing into
 * each other, a back follows his puller without running him over, and a
 * second tackler joins a pile instead of spearing his own man.
 *
 * This shapes intents only. Bodies still collide physically when pushed
 * together or when a player is already moving too fast to stop.
 */
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';

/** Time a player gives himself to close the gap to a teammate, s. */
const CLOSE_HORIZON = 0.3;
/** Gap at which a teammate starts to shape movement, yd. */
const AWARE_GAP = 1.2;
/** Touch distance as a fraction of the torso radii (matches the world). */
const TOUCH = 0.9;

export function spaceTeammates(agents: readonly Agent[], intents: Intent[]): void {
  const n = agents.length;
  for (let i = 0; i < n; i++) {
    const a = agents[i];
    const ia = intents[i];
    if (!ia || ia.free || ia.dive || a.body.support?.state !== 'up') continue;
    let vx = ia.vel.x, vy = ia.vel.y;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const b = agents[j];
      if (b.team !== a.team) continue;
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      const touch = TOUCH * (a.profile.radius + b.profile.radius);
      const gap = d - touch;
      if (gap > AWARE_GAP || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d;
      // Closing he plans, relative to where the teammate is going now.
      const closing = (vx - b.vel.x) * nx + (vy - b.vel.y) * ny;
      // Each takes half the adjustment: they both see it.
      const allowed = Math.max(0, gap) / CLOSE_HORIZON;
      if (closing > allowed) {
        const cut = (closing - allowed) * 0.5;
        vx -= nx * cut; vy -= ny * cut;
      }
    }
    if (vx !== ia.vel.x || vy !== ia.vel.y) intents[i] = { ...ia, vel: { x: vx, y: vy } };
  }
}
