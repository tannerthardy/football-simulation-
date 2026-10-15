/** An intermediate exit is a point to travel through, not a moving man to
 * station-keep on. Test the requested first beat with the body's actual
 * momentum and support; acquired neighbors coast only until the next read. */
import type { Vec2 } from '../core/vec.js';
import { arriveVelocity, type Body, type MoveCommand } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';

export interface DeparturePeer { pos: Vec2; vel: Vec2; radius: number }

export function stretchDepartureStep(body: Body, goal: Vec2, facing: number,
  peers: readonly DeparturePeer[], now: number, horizon: number,
  handContact: 'center' | 'patch'): MoveCommand | null {
  const command = { vel: arriveVelocity(body, goal, body.profile.vmax, 1), facing };
  const path = previewFreeMovement(body, command, now, Math.max(1, Math.ceil(horizon / .05)), handContact);
  if (path.some(sample => sample.support !== 'up')) return null;
  for (const peer of peers) {
    let x = body.pos.x - peer.pos.x, y = body.pos.y - peer.pos.y;
    // A real double can begin touching or slightly overlapping. Do not
    // invent separation, but reject a first beat that deepens that overlap.
    const clearance = Math.min(body.profile.radius + peer.radius, Math.hypot(x, y));
    for (const sample of path) {
      const nx = sample.pos.x - peer.pos.x - peer.vel.x * sample.t;
      const ny = sample.pos.y - peer.pos.y - peer.vel.y * sample.t;
      const dx = nx - x, dy = ny - y;
      const u = Math.max(0, Math.min(1, -(x * dx + y * dy) / Math.max(1e-12, dx * dx + dy * dy)));
      if (Math.hypot(x + u * dx, y + u * dy) < clearance - 1e-9) return null;
      x = nx; y = ny;
    }
  }
  return command;
}
