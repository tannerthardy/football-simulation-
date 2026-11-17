/** HANDS_CUE (on by default; HANDS_CUE=0 turns it off): a receiver's hands coming up for the ball, as evidence a
 * defender trailing him can see.
 *
 * The trailer's throw cue (`readsHandsAt` in defense.ts) read only his man's body facing turned past ~102 deg off his
 * run: a look over the back, fitting a vertical. On man-trail catches it fired on 2 of 62 (man-trail-fixture.ts): the
 * receiver's body turns to the ball only in his last 3 yd, ~53 deg off his run at the secure on a crosser, so a
 * trailer who had not seen the ball himself (14 of 62, back to the QB) had no cue at all.
 *
 * Here, while he tracks a ball coming to him, his hands come up a lead time before it reaches his spot; his running
 * facing and speed are untouched (the model has no separate head/hands channel, so this is a state, not a pose). How
 * late he shows them is his craft: 0.55 - 0.35 x route running (s), a stand-in (hands are not in tracking): it is
 * bounded by the observable end of the trailer's recognition, his break, which in the NFL begins at p50 0.40 s before
 * arrival on trail catches (trail_break.py); recognition through this cue lands about 0.1 s after it. Late hands is
 * coached exactly against this read. A defender within 3 yd of him sees it like any picture, from when it became visible, with his own
 * reaction delay. No receiver shows hands without a ball coming (no decoy hands are modelled yet: the seam for that is
 * this state). */
import type { Agent } from './agent.js';

export const HANDS_CUE = process.env.HANDS_CUE !== '0';
/** When each receiver's hands came up for the ball in flight to him (sim time). */
const handsUp = new WeakMap<Agent, number>();

/** His hands-up lead before the ball reaches his spot (s): earlier for a poorer route runner. */
export function handsLead(routeRunning: number): number { return 0.55 - 0.35 * routeRunning; }

/** Mark his hands up if the ball reaches his spot within his lead time. */
export function noteHands(a: Agent, now: number, spotT: number): void {
  if (!handsUp.has(a) && spotT - now <= handsLead(a.r('routeRunning'))) handsUp.set(a, now);
}

/** When his hands came up, if they have. */
export function handsUpAt(a: Agent): number | undefined { return handsUp.get(a); }
