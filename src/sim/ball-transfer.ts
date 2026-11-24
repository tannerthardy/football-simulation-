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
/** SNAP_FLIGHT (experimental, off; SNAP_FLIGHT=1): the gun snap's flight measured directly on the football's own track, in place of GUN_SNAP's 11.5 yd/s.
 * GUN_SNAP's speed came from "the gun QB gets the ball 0.4 s later than an under-center QB over a 4.6 yd snap", which assumed the under-center exchange is
 * instant; it is not, so the difference understated the flight. Measured (BDB 2025 weeks 1-3, tracking incl. the football, 2,585 shotgun and pistol non-play-action
 * dropbacks with the ball at least 2.5 yd from the QB at the snap frame; scripts/diag/snap/snap_flight.py, docs/reviews/2026-11-24-snap-flight.md): the ball starts moving at the snap event (lag p25/50/75 0.0/0.0/0.1 s) and takes 0.6/0.7/0.8 s to come within 0.75 yd of the QB
 * over a median 4.58 yd (p25-p75 4.17-4.88): (4.58 - 0.75) / 0.70 = 5.5 yd/s over the part flown to within a hand. The same SNAP_SECURE (0.1 s to seat it) follows.
 * What is measured and what is a choice: the 0.70 s (p50, p25-p75 0.6-0.8) is the flight from the snap event to the ball within 0.75 yd of the QB, over 4.58 yd: measured, and
 * it gives 5.5 yd/s over the 3.83 yd to that point. The 0.1 s SNAP_SECURE (seating it) on top is GUN_SNAP's existing choice, not measured (so 0.80 s total at 4.6 yd is
 * 0.70 first touch + 0.10 seat). Readers (gun only, d >= 2 yd): the QB's drop clock (called-drop.ts plannedSnapAt: +0.30 s) and the called pocket schedule; the gun handoff
 * (assign.ts) is held at the measured 1.1 s by gunHandoffReady, so the gun runs do not move. */
export const SNAP_FLIGHT = process.env.SNAP_FLIGHT === '1';
export const SNAP_FLIGHT_SPEED = 5.5, SNAP_REACH = 0.75;
/** When the snap is secured in the QB's hands (s after the snap), from where he stands. */
export function snapSecured(qbPos: { x: number; y: number }, ballSpot: { x: number; y: number }): number {
  const d = Math.hypot(qbPos.x - ballSpot.x, qbPos.y - ballSpot.y);
  if (d < 2) return 0;
  return SNAP_FLIGHT ? Math.max(0, d - SNAP_REACH) / SNAP_FLIGHT_SPEED + SNAP_SECURE : d / SNAP_SPEED + SNAP_SECURE;
}

/** When the gun QB can first give the ball (s after the snap): the snap secured plus his own handoff action (QB_EXTEND). The gun handoff time was measured directly
 * (BDB 2025: gun handoffs 1.2 s after the snap event, 0.1 s of it the event's own lag), and QB_EXTEND = 0.6 was derived from it as 1.1 - the old secure (0.5). With
 * SNAP_FLIGHT the secure moves to 0.80, so QB_EXTEND is re-derived the same way and the measured handoff time stays where it is: `max(secure + 0.2, 1.1)` (a 0.2 s floor for
 * the action; 0.3 s at the 4.6 yd snap). So SNAP_FLIGHT moves the passer's clock (+0.30 s) and the pass pocket, not the gun runs' handoff. */
export function gunHandoffReady(qbPos: { x: number; y: number }, ballSpot: { x: number; y: number }): number {
  const secured = snapSecured(qbPos, ballSpot);
  return SNAP_FLIGHT ? Math.max(secured + 0.2, 1.1) : secured + QB_EXTEND;
}
