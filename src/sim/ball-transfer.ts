/** A handoff reaches the receiver's torso; a distant toss is a ball flight. */
import type { Agent } from './agent.js';

export function handoffReach(from: Agent, to: Agent): number {
  return from.profile.reach + to.profile.radius;
}

/** GUN_SNAP (experimental, off): a shotgun or pistol snap flies from the ball to
 * the QB and he has it secured only after SNAP_SECURE more. Measured on raw
 * 2022 tracking (BDB 2025, week 1; the football's own track): the ball reaches a
 * gun QB 0.4 s later than an under-center QB over a 4.6 yd snap (an effective
 * 11.5 yd/s; the same ball-at-QB rule on both, so its own lag cancels), and gun
 * handoffs come 1.2 s after the snap event (0.1 s of which is the event's own
 * lag), so 0.6 s after the ball is secured (QB_EXTEND: seat it, eyes to the
 * read, extend into the pocket). Under center the exchange is immediate. */
export const GUN_SNAP = process.env.GUN_SNAP !== '0';
export const SNAP_SPEED = 11.5, SNAP_SECURE = .1, QB_EXTEND = .6;
/** When the snap is secured in the QB's hands (s after the snap), from where he stands. */
export function snapSecured(qbPos: { x: number; y: number }, ballSpot: { x: number; y: number }): number {
  const d = Math.hypot(qbPos.x - ballSpot.x, qbPos.y - ballSpot.y);
  return d < 2 ? 0 : d / SNAP_SPEED + SNAP_SECURE;
}
