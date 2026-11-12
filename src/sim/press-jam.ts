/** PRESS_JAM (experimental, off; PRESS_JAM=1 turns it on): a pressing corner's punch at the line.
 *
 * Without it the corner mirrors the release from about 2.3 yd and never closes into hand reach (about 1.2 yd), so the
 * jam joint almost never forms. With it, once he has seen the receiver release he may step into him and extend both
 * hands at the near shoulder. Whether he punches is his choice: from the receiver's first step as he sees it he waits a
 * beat for him to commit (longer with press skill), then punches only while, from what he has seen, the body will be
 * within one step plus a full arm when the hands arrive. A release going wide of that he mirrors instead, and a corner
 * who never sees it in range never punches. The punch lands only if the
 * hand reaches the body (the existing hands joint in the receiver's release, with the full arm while punching).
 * A miss costs him: his weight went forward with his hands toward a body that left, and the world turns that lean
 * into lost balance through the same lunge commitment a missed tackle uses. */
import type { Agent } from './agent.js';

export const PRESS_JAM = process.env.PRESS_JAM === '1';
/** One step: how far his feet carry the punch before the hands land. */
export const PUNCH_STEP = 0.7;
/** How long a thrown punch is in the air before it has missed (arm extension plus the step). */
export const PUNCH_TIME = 0.3;

export interface Punch { at: number; until: number; dir: { x: number; y: number }; result: 'thrown' | 'landed' | 'missed' }
/** The punch each corner threw this play (one per corner per play). */
export const punches = new WeakMap<Agent, Punch>();

/** His hand reach while a punch is in the air: the whole arm, not the bent-arm 0.7 of a standing jam. */
export function punching(d: Agent, t: number): Punch | null {
  const p = punches.get(d);
  return p && p.result === 'thrown' && t <= p.until ? p : null;
}
