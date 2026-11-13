/** Coarse QB body-direction evidence; this is not access to his private read. */
import { clamp, type Vec2 } from '../../core/vec.js';
import type { Perceived } from '../perception.js';

export interface QBDirectionCue {
  pos: Vec2;
  direction: Vec2;
  confidence: number;
}

/**
 * Use the defender's already delayed QB picture. A wide shoulder-glance sector
 * is a temporary body-orientation proxy, not an articulated head/eye model.
 * The 135-degree acquisition and 35-degree read cone are model assumptions.
 */
export function inferQBDirection(observerPos: Vec2, observerFacing: number, qb: Perceived): QBDirectionCue | null {
  if (qb.pose === 'down' || !Number.isFinite(qb.facing)) return null;
  const dx = qb.pos.x - observerPos.x, dy = qb.pos.y - observerPos.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return null;
  const visible = (Math.cos(observerFacing) * dx + Math.sin(observerFacing) * dy) / distance;
  if (visible <= Math.cos(3 * Math.PI / 4)) return null;
  return { pos: qb.pos, direction: { x: Math.cos(qb.facing), y: Math.sin(qb.facing) }, confidence: 1 };
}

/** Nearby bearings remain ambiguous; only consumed route pictures are inputs. */
export function qbCueAffinity(cue: QBDirectionCue | null, receiverPos: Vec2): number {
  if (!cue) return 0;
  const dx = receiverPos.x - cue.pos.x, dy = receiverPos.y - cue.pos.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return 0;
  const alignment = (cue.direction.x * dx + cue.direction.y * dy) / distance;
  const edge = Math.cos(35 * Math.PI / 180);
  return cue.confidence * clamp((alignment - edge) / (1 - edge), 0, 1);
}

