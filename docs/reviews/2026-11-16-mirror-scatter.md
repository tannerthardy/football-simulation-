# Mirror asymmetry under LINE_START: traced to the defensive alignment scatter; MIRROR_SCATTER (off)

Run Game for Integration, 2026-11-16, on engine-70 (develop fb870814 merged as 4b542608). Rules found the read
compiler's offence-only sample is not mirror-symmetric under the defaults: pa_flood compiles `pure` one way and
`vertical_peek` the other, and trips_sail's order changes. LINE_START=0 removed the plan difference.

## The trace

`scripts/diag/mirror/getoff-mirror.mts` replicates `sampleRoutes` (features.ts) flipped and not, and prints every
skill player's position, velocity, facing and command (vel, drive) per tick in the ball-relative mirrored frame,
with the first differing tick and term. `scripts/diag/mirror/_def.mts` dumps the defence's spots and placement.

1. **The first divergence is at tick 1, before anyone moves, with LINE_START on or off.**
   - Y's depth is −1.06 vs −0.83 (gun doubles).
   - X/Z/H are 0.033 yd off their mirror.
2. **Sources, each "the same seed, absolute field y":**
   - (a) `playsim.ts` placement adds `mind.alignmentError` to every defender's y in absolute field coordinates. DE_S is
     placed 6.08 vs 6.41 yd from the ball (spot 6.25 both). The same applies on a stem (`playsim.ts` ~528).
   - (b) ALIGN_HABIT's lateral scatter (drawn in `playsim.ts`, applied in `alignDefense`) is absolute y. The back
     seven's spots differ: LB_M 2.36 vs 2.90, FS +0.40 vs −0.40, SS 6.45 vs 5.79. ALIGN_HABIT=0 makes every spot
     mirror exactly.
   - (c) The compiler sample itself (Rules' `features.ts`): ballY 26.65 vs CENTER_Y 26.667 picks a field side (the
     0.033 yd receiver offsets), and the parked defence sits at y = 1, one sideline.
3. **Into the offence.** RECEIVER_DEPTH backs a line receiver off 0.23 yd when a defender is within 1.5 yd laterally
   at press depth. DE_S is 1.46 yd from Y unflipped and 1.79 flipped, so Y is backed off on one side only.
4. **LINE_START is symmetric; it carries the 0.23 yd.** With every body on its mirrored spot, ALIGN_HABIT off, the ball
   centred and the park on the ball's line:
   - smash and y_cross agree to the tick for 2.0 s in gun doubles and trips;
   - Y's get-off terms agree tick by tick (distance from start, read time, focus, stress, drive).
   The 0.23 yd deeper start shifts his get-off and readiness enough to tip pa_flood and trips_sail between plans.
   With LINE_START=0 the depth difference is still there and the plan does not tip. So "LINE_START=0 restores the
   mirror" holds for the plan, not for the sample.
5. **For Rules: those two plans sit on a threshold.** A 0.23 yd deeper start for one receiver flips pa_flood and
   trips_sail between installed plans.

## MIRROR_SCATTER (off)

A defender's lateral alignment error and his ALIGN_HABIT lateral scatter are now a cheat wide or tight of his
landmark, on his own side: the draw is multiplied by his side's sign (`scatterSide`: his spot's side of the ball, or
the offence's strong sign for a man aligned on the ball). Draws and magnitudes are unchanged. Touched:

- `alignment.ts`: `MIRROR_SCATTER`, `scatterSide`, the ALIGN_HABIT scatter.
- `playsim.ts`: placement and stem alignment error.
- Flag rows: FLAGS.md, reference-stack `off`, baseline `"0"`.

Field-side meaning (Integration's question): neither term has one.

- The alignment error is per-player discipline noise (`mind.ts`: spread by discipline and consistency).
- ALIGN_HABIT's personal habit is depth only; its lateral part is per-snap placement scatter.
- Field and boundary leverage is set explicitly in `alignDefense` (strong side, field side when tied, technique
  spots), not through either draw.
- So nothing needs to stay absolute.

## Gates

| gate | off | MIRROR_SCATTER=1 |
|---|---|---|
| compiler sample, ball centred and park on the ball line: 6 concepts × 3 formations agreeing to the tick for 2.0 s | 11/18 (every gun-doubles pair differs at tick 1, Y depth) | 16/18 |
| the two that still differ (pa_flood, trips_sail) | – | the RB's command, about 1%, from 0.15–0.9 s; there with LINE_START=0 too (separate, small; next) |
| compiler sample as it stands (ballY 26.65, park y = 1) | Y depth and X/Z/H offsets | X/Z/H 0.033 yd offsets only: Rules' half (centred ball, park on the ball line) |
| live plays, 6 calls × 4 seeds, flipped vs not, same seed, ball centred: defence and skill alignment mirror at tick 0 | 0/24 | 24/24 |
| live plays agreeing to 3.0 s | 0/24 | 0/24 |
| staged plays changed (Cover 1 / Cover 3 / Cover 2, 7 plays, 6 seeds × flip, 252) | – | 252/252 trajectories, 175/252 result yards |
| defender width at the snap (mean / sd of \|y − ball\|) | 6.11 / 5.12 | 6.19 / 5.19 |

The live 0/24 is not a symmetry fault. A flipped formation keeps the same LT and RT (and LG/RG) players, each with
his own body and seeds, so the mirrored play has different people on each side. After tick 0 the first difference in
every live pair is on the line. A full live mirror would need mirrored line personnel, and the compiler's offence-only
sample (skill players, defence parked) is the right gate.

**Changes plays on the defaults: every play** (the sign of each defender's draw flips on one orientation). The
distribution is unchanged. So this is a promotion decision with a seed card, not a no-op.

## Was a bias hidden in absolute y? (Integration's question)

`scripts/diag/mirror/scatter-bias.mts`: 400 plays (four formations × flip, four coverages). Each defender's draw,
expressed relative to his own side (+ = wide of his landmark):

| | off (absolute y: draw × side) | on (draw) |
|---|---|---|
| alignment error, mean (SE), n 4,400 | +0.0012 (0.0020) | −0.0016 (0.0020) |
| alignment error off, raw draw by side | +y side −0.0004 (n 2,409); −y side −0.0031 (n 1,991) | – |
| ALIGN_HABIT lateral scatter, off-ball non-press, n 2,500 | +0.022 (0.008) | −0.002 (0.008) |

No real bias was hidden. Both draws are centred within 0.02 yd either way; the scatter's +0.022 is about 3 SE in one
of several comparisons and has no football size. The asymmetry was purely in direction under a mirror, not a
sideline-wide shade. So the flag changes symmetry, not the mean placement.
