/**
 * KEY_REACT (on since run-ref-4, 2026-11-09; `KEY_REACT=0` restores the old read): a lineman's read of the man in front of him.
 * The key is one man an arm's length straight ahead, watched from the stance
 * on purpose, so the lineman reacts to the first movement of his feet and
 * hands rather than waiting for the body's speed to build (the sim has no feet
 * to watch; a step that has begun moving the body stands in for them). His
 * sight of it is a primed visual reaction, faster than an ordinary read but
 * never under the ~0.1 s a body needs to see and start to answer. Better
 * recognition still reads it sooner. The step he saw before contact is the
 * step he plays once engaged with the same man; contact does not erase it.
 */
import type { Agent } from './agent.js';

export const KEY_REACT = process.env.KEY_REACT !== '0';
const KEY_DELAY = 0.5, KEY_FLOOR = 0.1, KEY_REACT_SCALE = 0.35;
/** Body speed at which a key's step shows (yd/s): KEY_REACT's first movement, or a step under way. */
export const KEY_STEP_SEEN = 0.15, STEP_SEEN = 0.3;

/** Sight delay scale on the key (multiplies reaction time). */
export function keyScale(a: Agent): number {
  return KEY_REACT ? Math.max(KEY_FLOOR / a.profile.reactionTime, KEY_REACT_SCALE) : KEY_DELAY;
}
