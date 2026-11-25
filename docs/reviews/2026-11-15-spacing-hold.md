# SPACING_HOLD: the carrier keeps his spacing decision (Tools, 2026-11-15)

Flag `SPACING_HOLD` (off; `=1` turns on). Code: `src/sim/spacing.ts` (`holdBend`, `bendHolds`, `limitHolds`, the carrier branch of
`gatherForMotion`, the headway loop of `spaceTeammates`). Test: `test/spacing-hold.test.ts`. Diagnostics:
`scripts/diag/effective-mass/{dither-panel,carrier-teammate-contacts}.mts`.

## The defect

Carrier / spacing reversed re-aims rose from 0.122 /s (engine-49) to 0.170 /s (engine-66). Turning the sight flags off
(`HONEST_READS`, `SIGHT_CARRIER`, `SIGHT_COVER`, `SIGHT_RECOG`) gave 0.120; they did not create the dither, they exposed it through aged, stepped
pictures of the teammate. Two knife-edge choices in the carrier's spacing pass were re-made from scratch every tick, with no memory and no
exit margin (the CLAUDE.md "commit to a decision" rule):

1. **The bend.** `gatherForMotion` took the request back when the swept clearance to the peer was >= 0, else the first feasible of
   +-0.2, +-0.4, +-0.6, +-0.8 rad. Next tick the same picture could hand back the request, or the other sign. The
   `selected` restore (the raw request returned when the preview shows "passed") flipped it again at the end of the horizon.
2. **The headway limit.** `spaceTeammates` drops a teammate from the limits when the closing line's offset from him exceeds the touch distance
   (`hypot(dx - rx*closest, dy - ry*closest) > touch`) or when he is farther than his stopping distance. Braking lowers his own speed, which lowers
   the stopping distance, and the offset sits at 0.50 against a touch of 0.48: the limit is on at 4.65 (turn to -73 deg at 1.5 yd/s),
   off at 4.70 (65 deg at 9.0 yd/s), on again at 4.75. (stick/3, `HEAD=1`.)

## The change (carrier and a lead blocker on the carrier's steer; `RB_STEER` population only)

* The bend persists: once he bends around a peer he keeps that side and bend while the held request still conflicts with the same peer. The magnitude
  may grow in 0.2 rad steps, never shrink-then-flip, and never changes sign. He returns to the held request only when it clears by a margin (enter at
  clearance < 0, exit at clearance > his body width) or he has passed the peer. A held bend that no longer clears every peer falls back to the
  ordinary choice, so it cannot hold him into a body.
* While the hold exists the `selected` restore does not hand the raw request back.
* A headway limit he is braking under stays until the closing line clears the touch distance by a body width (and the aware distance likewise),
  and only while he is closing on that peer.
* A new decision needs a perceived change: a different peer, or the clearance crossing the exit margin. Re-scoring the same picture is not one.

Nothing here rewards or bans a technique; it only removes the tick-to-tick flip.

## Gates (engine-67 develop 0f5f7645, the dither panel's 135 plays)

| Gate | Result |
| --- | --- |
| wz_strong seed 1: one bend held and released once | the bend starts at 1.50, grows smoothly, is held to 2.40 and released at 2.50 (baseline had `selected` toggles at 2.00, 2.15, 2.25). The panel's reversed carrier / spacing re-aims on wz_strong/1 go 5 -> 0 (`HEAD=1`), wz_strong/2 4 -> 0 |
| carrier / spacing, default stack | 0.1709 /s (58 events, 339 s) -> 0.1087 /s (37, 340 s); engine-49 recorded 0.1217 /s (36). Budget 0.174 |
| carrier / spacing, `HEAD=1` | 0.1988 (69) fails the budget without the hold; 0.1197 (41, 343 s) with it |
| carrier / spacing, sight flags off, hold on | 0.1210 (40): the hold, not the sight flags, owns the result |
| other stages | unchanged: block / spacing 0.0762 -> 0.0753, rush / spacing 0.0515 -> 0.0510, coverage / spacing 0.0988 -> 0.0983, QB / spacing 0.0378 -> 0.0374 |
| `test/dither-budget.test.ts` | passes with `SPACING_HOLD=1`, with and without `HEAD=1`; the recorded budget is not raised (a lowered row is for the PR that promotes the flag) |
| carrier into own teammate contacts (centres within 0.9 of the radii sum, once per teammate per 0.5 s) | panel: 8 episodes (15 ticks) -> 14 (36); `HEAD=1` 11 (38) -> 11 (34). The extra episodes are slow brushes (0.8 to 3 yd/s, d 0.45 to 0.56) in seven run plays; two counter plays lose theirs. On 255 plays (40 -> 160 run plays) 26 (75 ticks) -> 30 (91): inside the +-2 sqrt(n) of plays that diverge, no systematic increase |

## Who else shares the function

`spaceTeammates` and `gatherForMotion` serve every agent with a team peer. The early `worst >= 0` return, the yield and the gather branches and the
headway loop (including the lane-offset knife-edge) are shared by blockers, defenders, the QB and receivers. The bend branch is `RB_STEER`'s: carrier
and lead blocker only. The new holds are gated to `behavior.kind === 'carrier'` (bend: carrier or lead blocker); nothing changes for the others.
The same lane-offset threshold is in their code path, but their panel rates did not erode (block / spacing 0.0762 against 0.0683 at engine-49,
coverage 0.0988 against 0.1056, rush 0.0515 against 0.0736, QB 0.0378 against 0.0511), so the defect only matters where a body at 9 yd/s turns on it.
Reported, not widened.

## Football read

Run set (`npm run ref:report -- --flag SPACING_HOLD=1`, 1,321 plays, paired; `out/hold/refreport*.md`):

| | ref | hold | paired |
| --- | --- | --- | --- |
| mean yards, capped at 20 | 3.68 | 3.64 | -0.04 (SE 0.08) |
| stuffs (<= 0) | 11.2% | 12.9% | +1.7 pts; gain to stuff 61, stuff to gain 38 (sign test p about 0.02) |
| 10+ yd / 20+ yd | 7.5% / 2.2% | 7.5% / 2.6% | |
| missed + broken open, per run | 0.248 | 0.253 | |

The 4 to 8 yd bin goes from 304 to 276 and the 8+ yd runs rise (8 to 20: 118 to 126; 20+: 29 to 35): the same mean with fatter tails, the shape of a held
decision that is sometimes wrong. Bend only: stuffs 12.3%, yards -0.07 (SE 0.07). Limit only: stuffs 12.0%, yards +0.07 (SE 0.05). Each part adds about a
point. Hitter-back and first-contact depth operators are within noise.

Scorecard, 16 games per arm, 2 leagues, paired, `--arm off:SPACING_HOLD=0 --arm on:SPACING_HOLD=1`:

| | seed 23 off / on | seed 31 off / on | pooled |
| --- | --- | --- | --- |
| YAC per reception | 7.04 / 7.14 | 7.90 / 7.49 | 7.45 / 7.32 (unresolved on either seed) |
| completion % | 67.2 / 66.1 | 67.5 / 64.7 | |
| yards per attempt | 9.01 / 8.68 | 9.29 / 8.90 | |
| designed rush yards per carry (uncapped / capped at 20) | 3.93 / 4.26, 3.43 / 3.56 | 3.98 / 3.82, 3.76 / 3.49 | |
| yards before contact | 0.64 / 0.84 (moved) | 0.91 / 0.75 | |
| stuff rate | 10.4 / 11.4 | 8.9 / 11.9 (moved) | |
| sack rate | 5.5 / 4.2 (moved) | 5.1 / 3.7 (moved) | sacks 154 -> 114; scrambles flat (113 -> 123) |

Unexplained: sacks fall on both seeds (about 2.4 sigma pooled) with scrambles flat. The hold does reach the quarterback while he holds the ball in
`carrier` mode (860 bend ticks on 96 pass plays, ball held, 3 to 9 s), where it keeps his step around his own linemen and backs; that is the candidate
mechanism, not shown. YAC (the pass-game read of the post-catch carrier) is flat: -0.13 pooled, unresolved.

## On engine-68 (fbeeef9b), and the choice of side (Integration's question)

Merged into engine-68. Dither panel (135 plays), `SPACING_HOLD` off, on, and on with `HEAD=1`: carrier / spacing 0.1486 (51 events), 0.0742 (25), 0.0669 (22); block / spacing 0.0684, 0.0681, 0.0711;
rush / engagement 0.0332, 0.0344, 0.0330. The test passes in all three; the budget is not raised.

Run set (1,321 plays, paired, `ref:report --flag SPACING_HOLD=1`): mean yards capped at 20 3.30 to 3.23 (-0.07, SE 0.07); stuffs (<= 0) **13.1 to 17.1%** (+4.0 points: gain to stuff 83 plays, stuff to
gain 30); 10+ yd 5.4 to 5.8; missed + broken open 0.260 to 0.254. By part: bend only 16.0% (+2.9), limit only 14.6% (+1.5); bend only on the ball carrier (no lead blocker) 15.7%, so the lead blockers
are not the cost: the carrier's held bend is.

**Was the bend he holds the first-feasible one where a better side existed?** Instrumented bend entries (`scripts/diag/bend-choice-replay.mts`, the replay is bit-identical to the candidate arm:
1,321 of 1,321 plays):

* 73 of the 83 gain-to-stuff plays (88%) have a carrier bend, against 50% of all other plays (601 of 1,208). These are the plays where he bent around a teammate at all.
* The choice is first-feasible and the ordering is `+0.2, -0.2, +0.4, ...`, so a tie goes to the + side: he chose + at 68% of entries in gain-to-stuff plays, 58% in the rest.
* In 60% of the gain-to-stuff entries the other side also cleared. Taking the free space along a 4 yd ray down each bent heading (true defender positions, a diagnostic of what was there, not something he has),
  the chosen side had more than 1 yd LESS free space than the other in 14% of those (9 of 63) and more than 1 yd MORE in 21%; the rest within a yard. The rest of the plays: 11% and 18%. So the choice is
  not worse than usual in the stuffed plays, it is arbitrary in all of them (60% of entries have a free choice and the + side wins it).
* **Oracle (diagnostic only, not a candidate: it reads true defender positions).** Choosing the side with more free space where both clear, bend hold on the carrier only: stuffs 15.7% to 14.6%, mean
  yards 3.28 to 3.40 (+0.10 against the reference, SE 0.07), 10+ yd 6.4%. It recovers about 40% of the stuff cost and a tenth of a yard, so the side matters.

So the decision to fix next is the side: pick it from where the space and his blockers are in HIS picture (the carrier's `sighted()` picture of the defenders, with his cone), not the first angle that
clears. That needs the bend search to take a `space(heading)` read from the play (spacing.ts has no `see`), which is a design change, not built; with it the hold's stuff cost should fall toward what the
oracle shows. Until then the cost is +4.0 points of stuffs on this set.

## The side of the bend, chosen from his picture (Integration's requirements, 2026-11-15)

`pickBendSide` (spacing.ts): one decision at bend entry, held by the hold until a perceived change clears a margin. The smallest clearing bend is found on each side; where one side clears, that side; where both do, the side with more
free space ahead in HIS picture (`SpacingContext.space`, built by the play from `see`, never from true positions, with his vision in it as a smooth seeded error that shrinks as he reads space better, sd 0.6 x (1 - vision) yd);
where that is no better by 0.1 yd, or he has no picture of space (a lead blocker), the smaller bend, then the side away from the teammate he bends around. The first-feasible `+` tie-break is gone under the flag. Blockers enter
through the peers the bend already must clear. Unit test `test/spacing-hold-side.test.ts`.

Gates (engine-68): dither panel passes, carrier / spacing 0.1034 (35 events) and with `HEAD=1` 0.0966 (32), against 0.0742 for the first-feasible hold and 0.1486 off.

Run set (1,321 plays, paired; the oracle is a diagnostic that reads true defender positions, the ceiling and not a target):

| | mean yards (capped 20) | stuffs | 10+ yd |
| --- | --- | --- | --- |
| reference | 3.30 | 13.1% | 5.4% |
| first-feasible hold (both parts) | 3.23 (-0.07, SE 0.07) | 17.1% | 5.8% |
| **side from his picture (both parts)** | **3.44 (+0.14, SE 0.08)** | **16.0%** | 6.4% |
| bend only, first-feasible | 3.26 | 16.0% | 5.8% |
| **bend only, side from his picture** | **3.43 (+0.13, SE 0.07)** | **14.8%** | 6.4% |
| bend only, oracle (true positions, carrier only) | 3.40 (+0.10, SE 0.07) | 14.6% | 6.4% |

On the bend alone the picture-based side reaches the oracle: stuffs 14.8% against 14.6%, mean yards 3.43 against 3.40. (The oracle was carrier-only and the picture arm also gives a lead blocker the away-from-peer tie rule.)
The limit hold still adds about 1.2 points of stuffs on top (16.0% with both parts), as before.

Scorecard (16 games per arm, 2 leagues, seeds 23 and 31, paired off against on):

| | seed 23 | seed 31 | pooled |
| --- | --- | --- | --- |
| YAC per reception | 7.58 to 7.91 | 7.53 to 7.45 | 7.56 to 7.69 (+0.13, within noise) |
| designed rush yd per carry (uncapped) | 3.99 to 4.34 | 3.92 to 4.05 | |
| yards before contact (runs) | 0.73 to 0.72 | 0.80 to 0.62 | 0.77 to 0.67 |
| run stuff rate | 12.0 to 12.6% | 12.1 to 15.3% | 12.0 to 14.0% |
| missed + broken | 352 to 337 | 384 to 341 | |
| completion | 67.4 to 67.8% | 67.9 to 66.1% | |

The pass game after the catch is unmoved (YAC +0.13 pooled, opposite signs on the two seeds); the first-contact distance falls a tenth of a yard on the pooled runs (one seed carries it).

## Read on Integration's card candidate (claude/laughing-cray-4vqegz at 6fb74695, engine-70 route flips on; 2026-11-16)

Asked for: the dither panel with `SPACING_HOLD=1 CRAFT_HOLD=1 RELEASE_SIDE=1` against off, the limit hold on film for a dozen added stuffs, and the two side-choice constants written down as choices.

### Dither panel (135 plays) and `test/dither-budget.test.ts`

| arm | carrier / spacing (reversed / moving s) | carrier controller | route controller |
| --- | --- | --- | --- |
| all three off | 0.1853 (55 / 297) | 0.4448 | 0.1304 |
| `SPACING_HOLD=1` | 0.0964 (30 / 311) | 0.3599 | 0.1310 |
| all three on | 0.1025 (32 / 312) | 0.3779 | 0.0785 |
| `CRAFT_HOLD=1 RELEASE_SIDE=1`, no hold | 0.2088 (63 / 302) | 0.4938 | 0.0780 |

The budget for carrier / spacing is 0.1744 (engine-49 record 0.1217 x 1.10 plus the slack). With the flags off the candidate fails `test/dither-budget.test.ts` on that stage alone (0.185); with all three on both tests in the file pass. The hold is what brings the stage back under: CRAFT_HOLD and RELEASE_SIDE halve the route controller's rate (0.130 to 0.079) but, without the hold, they add to the carrier stage (0.209). Other stages move by less than the noise of the panel.

### The limit hold on film

`scripts/diag/effective-mass/limit-hold-film.mts` with the measurement hooks in `docs/reviews/patches/2026-11-16-limit-hold-hooks.patch` (not committed to `src`; it logs, draws no random numbers and keeps no state). On the 1,321-play run set, hold off and all three on: stuffs 185 to 196 (14.0 to 14.8%), 64 plays stuffed only with the hold and 53 only without it (a net +11 on a count of about 117 changes, one sigma); mean yards capped at 20: 3.38 to 3.34 (paired -0.05, SE 0.08).

A "hold-only" tick is one where he is braking for a teammate only because the hold keeps the limit: the plain test would have dropped it (the teammate is beyond the awareness gap, or his swept path clears the touch distance). They are common, not specific to the added stuffs: 882 of the 1,321 plays have them. For the 64 added stuffs, 60 have binding ones.

Twelve added stuffs (every fifth of the 60, `out/cand/film_on.txt`), 132 binding hold-only ticks:

* the teammate was stalled (under 1.5 yd/s) in 37 (28%), moving in 95 (72%). Two plays are mostly stalled (s9-95, s23-34: braking behind a blocker who has stopped, which is real); seven are mostly moving peers (s7-26, s7-67, s15-28, s19-39, s25-58, s27-41, s27-102); three are mixed.
* the swept line missed the teammate by only 0.0 to 0.3 yd beyond the touch distance (median 0.12 over the 324 ticks; per-play medians -0.02 to 0.32), that is, inside the hold's exit margin (one body width, about 0.65 yd), and the plain rule would have dropped the limit. On the 60 added stuffs (first six ticks per play, 324 ticks), 83% are "path clears" ticks and 21% have a stalled peer.
* s7-26 is the plain case: an outside carrier behind the line with a lead blocker 1.2 to 1.5 yd ahead moving at 4.7 to 5.0 yd/s (his own speed), swept line clear by 0.3 to 0.4 yd, the hold removes 3.5 yd/s of closing for 0.6 s and his speed falls from 5.4 to 4.5.

So the film says the hold keeps a brake after the lane is open in most of the added stuffs. Does that cost the stuffs? It does not: the exit margin on the limit (`2 * radius`, the bend hold's) at 1.0, 0.5 and 0.25 of a body width, all three flags on:

| margin | stuffs | mean yards (capped 20), paired vs off | carrier / spacing |
| --- | --- | --- | --- |
| off | 14.0% | 3.38 | 0.1853 |
| 1.0 body width | 14.8% | 3.34 (-0.05, SE 0.08) | 0.1025 |
| 0.5 | 14.7% | 3.38 (-0.00, SE 0.07) | 0.1027 |
| 0.25 | 14.5% | 3.41 (+0.03, SE 0.08) | 0.0955 |

The margin moves the stuff rate by 0.3 points and the mean by 0.08 yd, inside the noise (SE 0.08), and the dither stays under budget at all three. The margin is not what produces the stuffs, so I have not changed it; one body width stays as the stated choice (the same one the bend hold uses: enter at the touch distance, exit one body width beyond it). If someone wants the limit's exit tighter on principle (the film shows the brake outliving the lane), 0.5 is free on this evidence.

### The two choices, written down

* **Free-space error, 0.6 x (1 - vision) yd (`PlaySim`, the carrier's `space` read):** the nearest pictured opponent to a 4 yd ray along the bent heading, with a smooth seeded error whose size is 0.6 yd at vision 0 and none at vision 1 (about one torso diameter for the least perceptive carrier). There is no source for the size; it is a stated choice, large enough that a low-vision carrier mistakes which side has room and small enough that a good one is not misled by more than a stride.
* **Side margin, 0.1 yd (`pickBendSide`):** he takes the side with more free space only if it has at least 0.1 yd more; closer than that he takes the smaller bend, then the side away from the teammate he bends around. 0.1 yd is below what he can tell apart given the error above, so below it the picture is not a reason.

Read at three levels each (run set, all three flags on):

| | stuffs | mean yards (capped 20), paired vs off |
| --- | --- | --- |
| error 0.3 | 15.1% | 3.32 (-0.07, SE 0.08) |
| error 0.6 (choice) | 14.8% | 3.34 (-0.05, SE 0.08) |
| error 0.9 | 15.0% | 3.33 (-0.06, SE 0.08) |
| side margin 0.05 | 15.1% | 3.31 (-0.07, SE 0.08) |
| side margin 0.1 (choice) | 14.8% | 3.34 (-0.05, SE 0.08) |
| side margin 0.2 | 15.1% | 3.31 (-0.07, SE 0.08) |

Nothing in either choice moves the result by more than the noise. On this candidate the hold is a dither repair with a net effect on the run set of -0.05 yd (SE 0.08) and +0.8 points of stuffs (one sigma); the +0.13 yd on engine-68 (3.30 to 3.43) was against a different route stack, and I do not carry it over.
