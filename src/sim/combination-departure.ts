/** Joined work may end only when its actual first action can leave the near
 * bodies. This is a short own-body forecast, not a promised backer intercept. */
import type { Vec2 } from '../core/vec.js';
import type { Body } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import type { Intent } from '../physics/world.js';

export function clearCombinationDeparture(body: Body, command: Intent,
  peers: readonly { pos: Vec2; vel: Vec2; radius: number }[], now: number,
  horizon: number, handContact: 'center' | 'patch'): boolean {
  const path = previewFreeMovement(body, command, now, Math.ceil(horizon / .05), handContact);
  if (path.some(sample => sample.support !== 'up')) return false;
  return peers.every(peer => {
    const initial = Math.hypot(body.pos.x-peer.pos.x, body.pos.y-peer.pos.y);
    // World's torso-touch bound. A joined body may already touch: permit
    // separation from that attained state, never a deeper predicted overlap.
    const floor = Math.min(.9*(body.profile.radius+peer.radius), initial);
    let x=body.pos.x-peer.pos.x, y=body.pos.y-peer.pos.y;
    for (const sample of path) {
      const nx=sample.pos.x-peer.pos.x-peer.vel.x*sample.t;
      const ny=sample.pos.y-peer.pos.y-peer.vel.y*sample.t;
      const dx=nx-x, dy=ny-y;
      const u=Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
      if (Math.hypot(x+u*dx,y+u*dy)<floor-1e-9) return false;
      x=nx;y=ny;
    }
    return true;
  });
}
