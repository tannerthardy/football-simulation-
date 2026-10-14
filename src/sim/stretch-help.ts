/** One installed outside-zone variant: reach/check the near hip, collect an
 * inward slant, or climb when the covered player's apparent surface is moving
 * away. A completed double is not a prerequisite. This is a fallible acquired
 * read, not a certificate of the covered player's hidden hands or control. */
import type { Vec2 } from '../core/vec.js';
import type { Body } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import type { Intent } from '../physics/world.js';
import type { Perceived } from './perception.js';
import { TEAMMATE_INFORMATION_LIMITS, type TeammatePicture } from './teammate-information.js';

export interface StretchHelpPicture {
  pos: Vec2;
  radius: number;
  homeY: number;
  playSide: number;
  /** Installed helper side of the covered teammate, not his current body. */
  side: number;
  owner: TeammatePicture;
  ownerRadius: number;
  ownerReach: number;
  down: Pick<Perceived, 'pos' | 'vel'>;
  defenderRadius: number;
  horizon: number;
  up?: number;
}

export function stretchHelpOpportunity(p: StretchHelpPicture): boolean {
  const owner = p.owner;
  if ((owner.source !== 'observed' && owner.source !== 'remembered')
    || owner.age > TEAMMATE_INFORMATION_LIMITS.prediction + 1e-9) return false;
  // Own attained approach, not a third-step clock. A stationary or inward
  // near-hip picture cannot establish that the helper's gap is clearing.
  if (p.playSide * (p.pos.y - p.homeY) <= 1e-9 || p.side * p.down.vel.y >= -1e-9
    || p.side * (p.pos.y - p.down.pos.y) <= p.radius + p.defenderRadius) return false;
  if ((p.up ?? 1) * (owner.pos.x - p.down.pos.x) > p.ownerRadius) return false;
  // The covered teammate must still appear close enough to account for that
  // surface. Called tempo is not achieved contact; no remote hand state is read.
  for (const t of [0, p.horizon]) {
    const dx = p.down.pos.x + p.down.vel.x * t - owner.pos.x - owner.vel.x * t;
    const dy = p.down.pos.y + p.down.vel.y * t - owner.pos.y - owner.vel.y * t;
    if (Math.hypot(dx, dy) > p.ownerReach) return false;
  }
  return true;
}

/** Validate the departing player's achieved first actions, including residual
 * momentum. Acquired bodies coast only until the next read; none supplies its
 * next request or hidden constraint. The native play still owns later traffic. */
export function clearStretchDeparture(body: Body, command: Intent,
  peers: readonly { pos: Vec2; vel: Vec2; radius: number }[], now: number,
  horizon: number, handContact: 'center' | 'patch'): boolean {
  const path = previewFreeMovement(body, command, now, Math.ceil(horizon / .05), handContact);
  if (path.some(sample => sample.support !== 'up')) return false;
  return peers.every(peer => {
    const touch = .9 * (body.profile.radius + peer.radius);
    let x = body.pos.x - peer.pos.x, y = body.pos.y - peer.pos.y;
    if (Math.hypot(x, y) < touch) return false;
    for (const sample of path) {
      const nx = sample.pos.x - peer.pos.x - peer.vel.x * sample.t;
      const ny = sample.pos.y - peer.pos.y - peer.vel.y * sample.t;
      const dx = nx - x, dy = ny - y;
      const u = Math.max(0, Math.min(1, -(x * dx + y * dy) / Math.max(1e-12, dx * dx + dy * dy)));
      if (Math.hypot(x + u * dx, y + u * dy) < touch) return false;
      x = nx; y = ny;
    }
    return true;
  });
}
