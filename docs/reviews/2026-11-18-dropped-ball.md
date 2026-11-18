# The dropped ball after a back_flat checkdown (Integration's trace, 2026-11-18)

Base develop 021a42a7 (engine-80). Question: after a drop or bobble, what state is the ball in and what moves it; does it hover with the receiver?

**There is no hover.** After a drop the ball is `air` with `deflected = true`; `deflect()` (src/sim/catching.ts) sets its velocity once and `stepFlight` (src/physics/ball.ts) moves it from then on under gravity (`G` = 10.73 yd/s²) and tumble drag, with nothing carrying or pinning it. The only place the ball is pinned to a body is the securing window (`pinToHands`, z = 1.2 yd, 0.12-0.45 s), which ends in a catch or a dislodge, not a drop.

What the drop gives it (`deflect`, DEFLECT_BALL on):
- Horizontal velocity: 0.15-0.55 of its incoming velocity, rotated by up to 1.1 rad. Measured over 35 ordinary drops: incoming 19 yd/s, 4 yd/s after (median ratio 0.18), about the pace of the man who dropped it, which is why it looks as if it moves with him.
- Vertical velocity: N(0.1 + 1.6 solid², 0.4) yd/s, where `solid` is 1 for a ball squarely in the hands (the catchable bobble). Fitted from the tracks: median pop 1.15 yd/s (the apex is a tenth of a yard above the hands).
- Then gravity. Median start height 1.4 yd; a ball dropped from rest at 1.4 yd lands in 0.51 s, and the median track reaches the ground 0.6 s after the drop.

So z "1.6 to 1.4 over 0.45 s" is a ball thrown at shoulder height falling with a small pop: z after the drop (seed 11, play 12): 1.92, 2.03, 2.05, 1.95, 1.75, 1.44, 1.02, 0.50 at 0, .1 ... .7 s. A corner who reaches it 0.4-0.55 s after the drop takes it at 1.0-1.2 yd before it lands, which is what the staged arm shows.

**How common (seeds 7-14, Ironmen v Comets 0.55, 8 games, develop):** 35 drops in 351 filmed passes. 29 end on the ground. 6 are followed by a catch or interception more than 0.3 s later: 2 interceptions (0.40 s and 0.55 s after the drop; DNB and DCB_S) and 4 re-catches by the dropper's own team (0.85-1.0 s after the drop event, after the ball was pinned again).

**One asymmetry, not material:** the dropper cannot catch again for 0.6 s (`R.noCatchUntil = sim.t + 0.6`), about the whole hang time, while a defender can. Cutting it to 0.15 s (tried as a numeric flag, not kept) on 4 of the same seeds changed re-catches from 3 to 4 and drops that end on the ground from 13 to 17; games diverge after the first changed play, so this is noise-level, and I did not ship it.

**Not a defect in the ball's state.** If the staged picks are judged too easy, the knobs are the pop (`0.1 + 1.6 solid²`), the horizontal keep (0.15-0.55) and the lockout, which are calibration choices for the receiver lane, not a physics fault. A real NFL check would be the share of dropped passes that are intercepted (here 2 of 35); I have no tracking-side number for it.

Tool: `scripts/diag/ball/drop-tracks.mts SEED...` writes every drop's ball track and what followed.
