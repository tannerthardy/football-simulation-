/** A free departure begins with the body that actually leaves the contact,
 * not an instantaneous turn onto a clear line. Neighbors use acquired coast
 * only until the next ordinary read. This cannot certify future contact wins. */
import type { Vec2 } from '../core/vec.js';
import type { Body } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import type { Intent } from '../physics/world.js';

export interface DeparturePicture { pos: Vec2; vel: Vec2; radius: number }

export function checkJoinedDeparture(body: Body, command: Intent,
  peers: readonly DeparturePicture[], now: number, horizon: number,
  handContact: 'center' | 'patch'): { clear: boolean; minimumMargin: number } {
  const path = previewFreeMovement(body, command, now, Math.max(1, Math.ceil(horizon / .05)), handContact);
  let minimumMargin = Infinity;
  for (const peer of peers) {
    let x = body.pos.x-peer.pos.x, y = body.pos.y-peer.pos.y;
    // Existing touching/overlap is not invented separation. A free exit may
    // move out of it, but may not rely on deepening it to clear the surface.
    const bound = Math.min(body.profile.radius+peer.radius, Math.hypot(x,y));
    for (const sample of path) {
      const nx = sample.pos.x-peer.pos.x-peer.vel.x*sample.t;
      const ny = sample.pos.y-peer.pos.y-peer.vel.y*sample.t;
      const dx = nx-x, dy = ny-y;
      const u = Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
      minimumMargin = Math.min(minimumMargin,Math.hypot(x+u*dx,y+u*dy)-bound);
      x=nx; y=ny;
    }
  }
  return { clear: path.every(sample=>sample.support==='up') && minimumMargin>=-1e-9, minimumMargin };
}
