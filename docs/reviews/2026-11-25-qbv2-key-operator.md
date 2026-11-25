# QB_V2 scorecard: #936's key operator built, hand-checked, and the decision row re-issued (2026-11-25)

QB lane. This builds `docs/reviews/2026-11-24-qbv2-key-classifier.md` (#936) into `scripts/diag/qbv2/decision-card.ts`
as `classify936`. Patch: `docs/reviews/patches/qbv2/key-operator-936-on-890558713.patch` (sha256 3be08aa333fe…;
applies to develop 890558713). The script reads true tracks to label what the key did. It is an observer, never an
input to the passer.

Cells: 8 × 30, a mid passer. V2 runs with `QB_V2=1 QB_QUICK_DRIFT=3`; the old controller runs with flags off. Same
seeds in both. Formations: gun_doubles_11, and gun_trips_11 for stick.

## #936's three checks on the old classifier

| Check | Result |
|---|---|
| 1. A defender aligned inside 3.5 yd named the flat key | **Fails.** Quick outs vs cover3: 13/30 old-controller rows. Vs cover2: 12/30 old, 3/30 V2. Slant-flat vs cover1: a DE was named in 5/30 V2 rows. |
| 2. Cover 2 reads the corner | **Partly.** The old classifier's key was the corner in 30/30 V2 rows (stick) and 27/30 (quick outs). Old-controller rows: 12/30 and 18/30, because it keyed the S side whatever side he played. |
| 3. Man coverage on the man rubric | **Fails in kind.** It never labelled #2's man "widens, so the slant". But it scored the man cells with zone keys: "none" (no key found) → the flat, on 29/30 slant-flat vs cover1 rows. |

So the old classifier is retired for the decision row. The other card rows (timing, side, stall) are unchanged by this.

## Operator changes found by the hand check (10 plays a cell)

| Found | Change |
|---|---|
| A DE at depth 0.9, out 6.3 qualified as the apex (slant-flat vs cover3). | The defensive line is excluded from corner, apex and hook. |
| The taught answers were in the field frame; the thrown ref is mirrored to the plan's frame when he flips sides. | Answers are in the plan's frame. |
| The zone "midpoint" used the receivers' positions at t_eval, before the routes had moved. | The midpoint of the two routes' landmarks: each receiver at his own break, from the observer track (1.8 s if none). |
| Man rubric at the 0.85 s cap: every route "between", because nothing had broken yet. | Each route's man is judged at that route's break. "Open on the break" is the rubric's own wording, and the same label then serves both controllers. |
| An off LB on the TE starts 4–5 yd away (outside 3.5 yd), so #2 scored "vacated" on every play. | Fallback: within 6 yd at 0.35 s, and moving with him (cos > 0.6) within 6 yd at the break. #2's man is then the SS on 23/30. |
| **Kept, flagged:** the zone label is taken at the release, capped at 0.85 s. Our releases are about 1.6–2.1 s (the gun drift's 1.1 s set), so the label can predate what he sees at his read. | A second label taken at the release itself is reported as a sensitivity column ("late"). |

Hand-check verdicts:
- **sf_c3:** the SS widens with the flat, 1.4–1.7 yd out by 0.85 s, on all 10. The label is right.
- **st_c3:** the NB, aligned over #2, drifts out 1–1.5 yd by 0.85 s and widens by the release. The label is right: the taught answer is the stick.
- **qo_c2sq:** the corner sits at 3.4–5 yd depth and gains nothing. "Squatting" is right at 0.85 s. At the release he reads "sitting mid", because the midpoint test is the reviewer's choice for a corner. That is a caution on the late column.
- **Man cells:** in quick outs vs cover1 and 2-man, #1 is contested at 1.2–1.7 yd on the break, so the out is refused. Both controllers threw #2's route.
- **No "hook walls the slant"** case occurred in these cells. That row is not exercised.

## Re-issued decision row (taught answer, #936 operator)

| Cell | Label (0.85 s) | Old | V2 | Old late | V2 late |
|---|---|---|---|---|---|
| Quick outs vs cover3 | corner off; apex widens 11, sits 17 | 10 | **27** | 19 | **27** |
| Quick outs vs cover2 (squat) | corner squats 28–30 | **29** | 11 | 8 | **21** |
| Quick outs vs cover1 | #1 contested | 30 | 30 | 30 | 30 |
| Quick outs vs 2-man | #1 contested | 30 | 30 | 30 | 30 |
| Slant-flat vs cover1 | slant contested; flat open 11, between 10 | **16** | 12 | **16** | 12 |
| Slant-flat vs cover3 | apex widens 30 | **11** | 7 | 16 | 15 |
| Stick vs cover2 | corner squats 30 | 23 | 22 | 20 | **22** |
| Stick vs cover3 | apex sits outside 18, widens 11 (late: widens 26) | 3 | **7** | 4 | **7** |
| **Total /240** | | **152** | **146** | **143** | **164** |

On this operator V2 does not clearly beat the old controller on decisions. It wins one cell outright, loses three, and
the total depends on the label time.

- **Where V2 wins:** quick outs vs cover3. The old controller throws the backside out on 15/30.
- **Where V2 loses, three mechanisms:**
  1. **Quick outs vs cover2:** V2 throws the out into a squat corner on 21/30. Its plan keys the apex ("flat" role).
     On the picked side the apex is vacated, so the key reads "none" and the plan's rule sends it to the out. #936
     says the Cover 2 flat defender is the corner. That is a role question (roles.ts, Flex) and a plan question (does
     quick outs key the corner first, as #936's table has it for Cover 3 too; Rules).
  2. **Slant-flat vs cover3:** the apex widens on every play (taught: the slant). V2 throws the checkdown at 2.85 s on
     19/30. This is the parked slant-break timing (#925) plus the curl-flat's width (Coverage).
  3. **Stick vs cover3:** the NB widens with the flat (taught: the stick). V2 throws the flat on 19/30. Next
     diagnostic: V2's own cue on these plays (key-sequence), whether his picture at the plant shows the drift.
- **Stick's 3/30 for the old controller** reverses the old card's 22/30: the old classifier called this NB "sits".

Next: the side metric like for like, then stick's timing on its planned break (card items b and c). Then V2's cue on
the three losing cells, one at a time.

## (b) Side, like for like

The old controller makes no pre-snap side pick, so both controllers are scored on the field side of the throw against
the softer corner. V2's pick is reported apart.

**Hand check: the old cushion operator was wrong.** It took the nearest defender within 3 yd laterally of #1. On the
tight S side (#1 at 8.9 yd out) that was the DE, 3.3 yd away, which is why V2's pick read 13/30 and 8/30. Cushion is
now the distance from #1 to #936's corner at the snap.

22 of 30 plays a cell have the two corners within 1 yd of each other, so either side counts as right. The table gives
only the 8 decisive plays a cell:

| Cell | Old: thrown to the soft side | V2: thrown to the soft side | V2's pick |
|---|---|---|---|
| Quick outs vs cover3 | 3/5 (3 to the back) | **7/8** | 7/8 |
| Quick outs vs cover2 | 5/8 | **8/8** | 7/8 |
| Cover1 and 2-man | press on both sides, all within 1 yd | — | — |

V2 beats the old controller on side, like for like. It's a small sample, 16 decisive plays.

## (c) Stick's timing on its planned break

The planned break is the installed route's break point from the passer's forecast prior: his install, not the true
body. The table is release minus the moment the true receiver's progress along start → planned break first reaches it.

| Cell | Route | Old: n, p25 / p50 / p75 (s) | V2: n, p25 / p50 / p75 (s) |
|---|---|---|---|
| Stick vs cover3 | flat (S3) | 22: −0.30 / −0.10 / +0.10 | 19: −0.25 / −0.20 / −0.15 |
| | stick (S2) | 2: about 0 | 6: −0.45 / −0.35 / −0.35 |
| Stick vs cover2 | flat | 7: −0.10 / 0 / +0.20 | 8: −0.25 / −0.25 / −0.20 |
| | stick | 0 | 19: −0.35 / −0.35 / −0.25 |
| | the back | 19: +0.9 / +1.3 / +1.35 | 3: +0.6 |

**The old operator's figures were artifacts.** The flat's "+1.05 s" was its velocity-turn detector firing late on the
flat's rounded path. Its stop detector found the stick on only 3 of 19 stick throws.

**Hand check, stick vs cover2, seeds 1–4.** The stick's planned break is 7.2 yd from his start (about 6 yd past the
line). The true receiver reaches it at about 2.35 s and does not settle: he is still at 4.6–5 yd/s there, and bending
inside (y 15.2 → 13.0). V2's release at 2.0 s is anticipation, ahead of a landmark the body runs through.

That the stick runs through its landmark is route execution, not the passer. Noted for Rules and Tools; not chased here.
