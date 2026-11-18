# QB_PEEK_CLOCK: the vertical peek on his feet's clock (Integration's item v), off

QB lane, 2026-11-18. Patch: `docs/reviews/patches/engine71-footwork/qb-peek-clock-after-consolidated-on-5b49bb93.patch`,
applied after `qb-stack-consolidated-on-develop-5b49bb93.patch` on develop 5b49bb93.

## What held him

Probe: `scripts/diag/eyes/peek-trace.ts`, every 0.1 s on four_verts against cover2_match, seed 2, flipped. It is not
the `close` test. The peek never declared:
- With QB_PEEK off (the engine's setting), the peek declares only when **every** vertical in it is 12 yd downfield.
- The tight end's seam was jammed back from 8.8 to 7.6 yd at 2.6 s and reached 12 yd only at 3.45 s.
- So he sat on the 2.5-look cap: set 1.70, reads from 1.95, off at 3.35.
- The back was priced 0.67–0.78 from 1.8 s.

Off the peek, the installed order then took him through the other side's go and seam before the back. The plan says
"verticals as one look, then the back", but the back is the plan's outlet and is pushed after every other route:
S2, S1, W1, W2, then B. He threw at 4.30 s.

## What the peek is for, and when he comes off it, as taught

It is one look at the deep picture at the top of the drop: the seams against the deep defenders' squeeze. Coming off
it is on three things:
- **The clock in his feet:** top of the drop, hitch, check it down.
- **The deep picture declaring covered:** the existing `!close` after his processing time.
- **The rush he feels.**

What he comes off to is the back (HonestNFL 112: verticals, else the back).

## Built (QB_PEEK_CLOCK=1)

- **Declare on the hitch.** If the stems have not shown by his first hitch (one stride of his own drop after the plant),
  the deep picture is declared as it stands then.
- **Close holds briefly.** A close vertical holds him at most to the second hitch.
- **The rush ends it.** Urgency 0.5 or more takes him off at once.
- **Off the peek, to the back.** He goes to the plan's outlet, not through the other side's verticals.
- The hitch is his own footwork's clock (`stride()`), the same beat the plan's steps use. There is no new constant.

## Staged (`peek-staged.ts`)

Every concept whose installed plan is a vertical peek (four_verts, verts_hitch): 8 coverages × 3 rosters × 4 seeds,
gun doubles and trips. That is 288 rows, but the four squat-corner shells often produce identical plays, so the counts
below are distinct plays:

| arm | plays | off the peek (median) | time to throw (median) | to the back | completions | ints | sacks | yd per play | 20+ yd throws |
|---|---|---|---|---|---|---|---|---|---|
| off | 251 | 3.20 | 3.95 | 66 | 113 | 5 | 7 | 8.22 | 23 |
| on | 210 | 2.35 | 2.88 | 138 | 126 | 4 | 4 | 6.04 | 2 |
| QB_WINDOW_ARRIVE, off | 241 | 3.20 | 4.00 | 68 | 102 | 4 | 9 | 7.78 | 6 |
| QB_WINDOW_ARRIVE, on | 211 | 2.35 | 2.90 | 105 | 107 | 3 | 4 | 8.12 | 0 |

- **The back** is thrown at 2.9 s, against the NFL's about 2.44 s to the back in this concept. Sacks halve.
- **Interceptions are counted on distinct plays.** On raw rows the on arm shows 12 or 14, but those are 3 distinct
  plays (seed 2, four_verts, back_flat), each repeated across cover2, cover2_match, tampa2 and cover6.
  - That is the squat-corner checkdown already diagnosed in item (iv).
  - Its window terms: the reaction charge is fixed by QB_WINDOW_ARRIVE. The stale picture and his own misjudgment are
    left, per Integration.
  - Back-flat throws against those four shells are picked 12 of 82 rows on, 4 of 52 off; 0 of 77 against the other
    shells.
- **The cost: deep balls** (20+ yd: 23 → 2 without the window repair). The seams do not price open by the second
  hitch in our games. They come open late, from 3 s, which the clock no longer waits for.
  - Without the window repair, yards per play fall (8.22 → 6.04).
  - With it, yards per play rise (7.78 → 8.12): the late deep balls it was already pricing out are gone either way.
  - Why the seams do not come open by 2.9 s (NFL four-verts seams leave at about 2.6–3.0 s) is the next question for
    this concept. It is a route or window question, not the peek's.
- Test: `test/qb-peek-clock.test.ts`.
- Checks: typecheck, reference-stack, guard, scan, provenance, dither and read-plan pass on 5b49bb93 with both patches.

## Seams by 2.9 s: measurement (Integration's follow-up)

Probes: `scripts/diag/eyes/seam-hitch.ts` (staged vertical-peek concepts, 324 plays on 5b49bb93 + both patches) and
`scripts/diag/eyes/go_depth_nfl.py` (BDB 2025 week 1, traditional non-play-action dropbacks, GO routes).

**1. Depth: our verticals are on NFL time.** Yards past the line at 2.0 / 2.5 / 3.0 s after the snap:

| | ours | NFL (from his own start) |
|---|---|---|
| TE seam | 5.9 / 9.2 / 12.7 (n 302) | 6.5 / 9.4 / 12.5 (n 122) |
| WR go | 6.7 / 10.5 / 14.6 (n 648) | 7.0 / 10.2 / 13.5 (n 584) |
| slot | 5.6 / 9.0 / 13.0 (n 216) | (not split out) |

- We are 0.1–0.6 yd short at 2.0 s and level or deeper by 3.0 s. The seams are not late.
- This play's jammed tight end is the exception.

**2. The window at his second hitch (median 2.4 s): the seams are shut by the man over the top.**
- 831 ready verticals: median P 0.20, pOpen 0.50, intRisk 0.14. P ≥ 0.5 on 48.
- **The deep defender shuts them.** Of the ready verticals with pOpen < 0.6, the defender contesting most is over the
  top of the receiver (truly deeper by 1+ yd) on 396. On 160 of those he is priced as arriving first (sitting on the
  route). Only 89 are shut by an underneath man.
- pOpen is about 0.5 in every shell, including two-high (cover2 0.5, cover4 0.5, cover6 0.6). The window sees no
  difference between a seam splitting two safeties and one under a middle safety.
- **DEEP_GATE on / off: identical prices.** The window's belief of when a deep defender starts is its own
  (THROW_REACT: a facing zone man goes at the release), not the defenders' behavior. With DEEP_GATE the Cover 2/3 deep
  seats really start later (on the seen ball), so the window now prices them about one reaction early.
- **Not the anticipation gap** (pricing a man who will be open in 0.4 s by his present separation). The window prices
  the arrival from his forecast, and the forecast runs the vertical at full speed.

**3. The read: ours looks at the routes in order; taught, it reads the middle of the field.**
- **Our plan** (`vertical_peek`, read-compiler candidates.ts) is the start side's verticals inside-out as one look,
  then the back. There is no middle-field read: the same two routes are looked at against one-high and two-high, and
  the safety's movement is never the cue.
- **As taught:**
  - Pre-snap, middle of the field open or closed.
  - Against two-high, the seams split the safeties: throw the seam the safety does not widen to, off his hips at the
    top of the drop.
  - Against one-high, the middle safety is the key: the seam away from where he goes, or the bender under him, on time.
  - Covered, the back.

**Proposal (not built).** A middle-field key on the peek, as a QB_KEY_READ-style read on the deep defender:
- the shell named from his pre-snap picture;
- the safety's declare read at the first hitch (the man, from his picture);
- the seam he is not working to thrown on anticipation at the second hitch.

Two parts:
1. **The read**, in the plan or the read compiler, with Rules.
2. **The window's start time for a deep defender under DEEP_GATE**: a held deep seat goes on the seen ball, not on
   the motion. That is the window's belief catching up to the defenders, and it is what lets the seam away from his
   declare price open.

The clock stays as built.
