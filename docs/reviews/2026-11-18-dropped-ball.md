# The dropped ball after a back_flat checkdown (Integration's trace, 2026-11-18)

Base develop 021a42a7 (engine-80). Question: after a drop or bobble, what state is the ball in and what moves it; does it hover with the receiver?

**There is no hover.** After a drop the ball is `air` with `deflected = true`; `deflect()` (src/sim/catching.ts) sets its velocity once and `stepFlight` (src/physics/ball.ts) moves it from then on under gravity (`G` = 10.73 yd/s²) and tumble drag, with nothing carrying or pinning it. The only place the ball is pinned to a body is the securing window (`pinToHands`, z = 1.2 yd, 0.12-0.45 s), which ends in a catch or a dislodge, not a drop.

What the drop gives it (`deflect`, DEFLECT_BALL on):
- Horizontal velocity: 0.15-0.55 of its incoming velocity, rotated by up to 1.1 rad. Measured over 35 ordinary drops: incoming 19 yd/s, 4 yd/s after (median ratio 0.18), about the pace of the man who dropped it, which is why it looks as if it moves with him.
- Vertical velocity: N(0.1 + 1.6 solid², 0.4) yd/s, where `solid` is 1 for a ball squarely in the hands (the catchable bobble). Fitted from the tracks: median pop 1.15 yd/s (the apex is a tenth of a yard above the hands).
- Then gravity. Median start height 1.4 yd; a ball dropped from rest at 1.4 yd lands in 0.51 s, and the median track reaches the ground 0.6 s after the drop.

So z "1.6 to 1.4 over 0.45 s" is a ball thrown at shoulder height falling with a small pop: z after the drop (seed 11, play 12): 1.92, 2.03, 2.05, 1.95, 1.75, 1.44, 1.02, 0.50 at 0, .1 ... .7 s. A corner who reaches it 0.4-0.55 s after the drop takes it at 1.0-1.2 yd before it lands, which is what the staged arm shows.

**How common (seeds 7-14, Ironmen v Comets 0.55, 8 games, develop):** 35 drops (the first four of those games had 365 passes). 29 end on the ground. 6 are followed by a catch or interception more than 0.3 s later: 2 interceptions (0.40 s and 0.55 s after the drop; DNB and DCB_S) and 4 re-catches by the dropper's own team (0.85-1.0 s after the drop event, after the ball was pinned again).

**One asymmetry, not material:** the dropper cannot catch again for 0.6 s (`R.noCatchUntil = sim.t + 0.6`), about the whole hang time, while a defender can. Cutting it to 0.15 s (tried as a numeric flag, not kept) on 4 of the same seeds changed re-catches from 3 to 4 and drops that end on the ground from 13 to 17; games diverge after the first changed play, so this is noise-level, and I did not ship it.

**Not a defect in the ball's state.** If the staged picks are judged too easy, the knobs are the pop (`0.1 + 1.6 solid²`), the horizontal keep (0.15-0.55) and the lockout, which are calibration choices for the receiver lane, not a physics fault. A real NFL check would be the share of dropped passes that are intercepted (here 2 of 35); I have no tracking-side number for it.

Tool: `scripts/diag/ball/drop-tracks.mts SEED...` writes every drop's ball track and what followed.

## Reproduced on the QB lane's staged play (added after their repro arrived)

develop 021a42a7 + `qb-stack-all-on-develop-021a42a7.patch`, `QB_WINDOW_ARRIVE=1 QB_PEEK_CLOCK=1 QB_MOF_READ=1`, `four_verts` / `gun_doubles_11` / roster 3 / seed 2 / cover2: the back drops it at t = 3.55 s. Ball per 0.1 s after the drop: `kind` air, `deflected` true, `securing` false throughout.

| +t (s) | ball z (yd) | ball vz (yd/s) | ball horizontal (yd/s) | back's velocity (yd/s) |
|---|---|---|---|---|
| 0.0 | 1.39 | +2.01 | (1.69, 2.99) | (2.85, 4.27) |
| 0.1 | 1.53 | +0.93 | (1.69, 2.98) | (2.85, 4.28) |
| 0.2 | 1.56 | -0.14 | (1.68, 2.98) | (2.86, 4.29) |
| 0.3 | 1.49 | -1.21 | (1.68, 2.97) | (2.87, 4.30) |
| 0.4 | 1.31 | -2.28 | (1.68, 2.96) | (2.87, 4.31) |

vz falls by 10.7 yd/s every second, which is gravity. The pop is 2.01 yd/s (a draw about one standard deviation above the 1.7 mean for a squarely held ball), so the ball stays near 1.4-1.6 yd for 0.3 s before it falls; the horizontal 3.4 yd/s is the 0.2 keep of the incoming velocity, alongside a back running 5.1 yd/s. The corner picks it at +0.45 s at about 1.2 yd. This is the same mechanism as the ordinary-game drops above.
