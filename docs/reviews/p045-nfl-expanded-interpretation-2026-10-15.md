# P045: available-weeks return validated; no matched explosive comparison

October 15, 2026 (America/Phoenix), Measurement.

**The unchanged weeks 1–9 query is complete and its returned packet validates.**
It contains six qualifying plays: four contained (YAC <=5), two middle-YAC,
zero explosive (YAC >=15). This describes the frozen, narrow filtered sample.
It does not establish that Quarters/POST plays cannot produce explosive YAC,
prescribe P045's outcome, or justify changing the engine. No query was rerun
or broadened during this validation. Hudl/StatsBomb remains a separate source
investigation and contributes no cases to this result.

[Catching's execution handoff](https://github.com/tannerthardy/football-simulation-/pull/58#issuecomment-6200927133) ·
[original returned result](https://github.com/tannerthardy/football-simulation-/blob/07bee7413ee02d7e417f046b599682a77dc9e0fc/data/reviews/current/p045-nfl-available-weeks-return.json) ·
[returned inventory](https://github.com/tannerthardy/football-simulation-/blob/07bee7413ee02d7e417f046b599682a77dc9e0fc/data/reviews/current/p045-nfl-available-weeks-inventory.json) ·
[local validation and measurements](../../data/reviews/current/p045-nfl-expanded-validation.json).

## Integrity, coverage and cost

Returned source commit: `07bee7413ee02d7e417f046b599682a77dc9e0fc`.
Inventory: 3,458 bytes, SHA256
`a82783df2d2c4d2f10d0701571bf116f9479165bea076ee99a80e5269acb0a95`.
Result: 149,755 bytes, SHA256
`4a57b09d246587843f9eb8ac3d03e6fcceb25e0276e679b33371cc63138c272d`.
Their exact Git blob IDs match the source responses. Query `81e43e7`, all three
module hashes, driver `7ffa49e`, fixed filters and week-1 cache `481ad18` agree.

Actual archive inventory and readable restored counterparts cover **weeks 1–9**.
Week 1 is byte-identical cached output; the read ledger contains no
`tracking_week_1.csv` read. Weeks 2–9 complete with no partial/unrun tail. The
49 complete member reads comprise games.csv once, players.csv 16 times,
plays.csv eight times, player_play.csv 16 times, and each new tracking CSV once.
Repeated metadata hashes match the week-1 receipt. Tracking member byte counts
match inventory; recorded hashes identify the consumed streams. Archive SHA256
matches the original catalog and the driver requires unchanged archive identity.

Planned and actual logical input reads agree: **9,257,358,332 bytes / 8.62 GiB**.
Execution took **142.030 s**, within 300 s / 12 GiB. No download, extraction,
week-1 rescan, engine import or simulation was reported. Local returned-packet
validation took about 0.02 s, with zero raw queries/simulations. Original five
driver checks are reused; no duplicate test campaign was necessary.

Boundary: this verifies **returned bytes, pins, ledger and measurement arithmetic**.
The raw ZIP/CSVs remain on Catching's executor. Their rehashes, dense observed-
sample checks, original velocity/mass derivation and full-roster nearest selection
were performed there; they were not independently remeasured here. Readability
and matching size of an unused restored file are not a fresh checksum of it.

| Week | Execution | Converted | Pooled invalid | Geometry matches | Contained | Middle | Explosive |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | reused | 3 | 3 | 1 | 1 | 0 | 0 |
| 2 | new | 7 | 0 | 4 | 3 | 1 | 0 |
| 3 | new | 2 | 1 | 0 | 0 | 0 | 0 |
| 4 | new | 2 | 1 | 1 | 0 | 1 | 0 |
| 5 | new | 1 | 1 | 0 | 0 | 0 | 0 |
| 6 | new | 1 | 0 | 0 | 0 | 0 | 0 |
| 7 | new | 2 | 1 | 0 | 0 | 0 | 0 |
| 8 | new | 1 | 0 | 0 | 0 | 0 | 0 |
| 9 | new | 0 | 0 | 0 | 0 | 0 | 0 |
| Total | | 19 | 7 | 6 | 4 | 2 | 0 |

The **26 label candidates are global and counted once**, not nine times. Their
metadata week counts are 6, 7, 3, 3, 2, 1, 3, 1, 0. Qualifiers occur in weeks
1, 2 and 4. Reading nine weekly files does not create a broad matched sample.
Converted and pooled invalid are original counters, not universally disjoint
stages; week 1's missing reason detail stays unknown.

## Which filters are limiting

The selection is eligible dropbacks, Quarters, official targeted receiver **and
reception**, POST, catch depth 15–30 yd, release-to-catch 1–2 s and nearest-at-
catch 1–4 yd, plus observed all-22 samples from snap through catch. The query
correctly follows X/W1's post within P045's Y-Cross, not the crossing receiver.

The new-week audit reconciles **20 candidates → four missing catch events →
16 event-complete/sample-valid cases → 11 depth rejections → five qualifiers**.
Week 1 contributes the sixth qualifier but cannot supply a reconstructed rejection
funnel. Missing catch annotation despite a reception label is a measurement
exclusion, not evidence the pass was incomplete.

| Restriction | What the returned evidence supports | Relevance limit |
| --- | --- | --- |
| Joint coverage/route/official-reception/admission filters | Only 26 global candidates; no separate upstream admission counts | Cannot rank Quarters, POST or completed-target selection individually. Quarters is not a MOD responsibility label; POST is not the full Y-Cross call. Incompletions/interceptions and their legitimate defense are absent by design. |
| Catch depth 15–30 yd | 11 new-week first failures: eight shallower, three deeper | Strongest measured geometry restriction. Archived P045's 22.8-yd catch fits the interval, but all four retained contained catches are only 15.2–19.3 yd deep. |
| Release-to-catch 1–2 s | Five overlapping failures, all also outside depth | These are annotated catch times, not physical pass-arrival times; the retained NFL arrival-to-catch delays vary. Changing this filter alone admits none of the recorded new-week geometry failures. |
| Catch separation 1–4 yd | Two overlapping failures, both also shallower than 15 yd | Excludes sub-yard contests and more open catches. Scalar proximity cannot identify whether the original defender retained leverage or help replaced him. Changing this alone likewise admits no recorded new-week geometry failure. |
| Required events / full observed positions | Four missing catch events; zero new-week non-22/sample-validity rejections | Preserve the quality rule; it is not the observed new-week bottleneck. Week-1 detail is unavailable. |

The overlapping memberships are **depth 11, flight five, separation two**;
they must not be added to the 11 disjoint geometry rejections. Nothing in this
audit counts explosives among rejected cases: those outcomes were not retained.
No counterfactual widened-cohort count or implied explosive example is reported.

## Qualifying witnesses and useful measurement contrasts

| NFL game/play ID | Week | Catcher nflId | Depth yd | YAC yd | Receiver speed: release → midpoint → catch, yd/s |
| --- | ---: | --- | ---: | ---: | --- |
| 2022091101-4104 | 1 | 52595 | 15.2 | −2.2 | 6.60 → 6.45 → 4.61 |
| 2022091807-2947 | 2 | 54473 | 19.3 | +2.7 | 7.43 → 7.43 → 5.88 |
| 2022091812-2171 | 2 | 40149 | 17.5 | +0.5 | 6.67 → 6.05 → 4.37 |
| 2022091901-1574 | 2 | 53439 | 16.2 | −0.2 | 7.30 → 6.71 → 5.01 |
| 2022091901-2028 | 2 | not retained in summary | not retained in summary | +8.2 | not retained |
| 2022100205-680 | 4 | not retained in summary | not retained in summary | +10.6 | not retained |

The deterministic global top-three supplement omits `2022091901-1574`, but the
week-2 supplement retains its full measurements, so all four contained plays
can be validated without another query. The two middle-YAC cases retain IDs,
bins and YAC in the audit ledger, **not full motion snapshots**. They remain
visible offensive gains; the code's `offensive_win` key names only the >=15 bin
and must not imply that an eight- or ten-yard gain is an offensive failure.

All four contained receivers slow **and change heading** before the catch.
Under this measurement's archived P045 packet, receiver catch speed is 8.75
yd/s (full trailing .4-s operator), versus 4.37–5.88 here. That P045 comparison
belongs to frozen experimental runtime `f62511a`, not a fresh current-develop
native outcome. Catching's other native speed numbers use their own pinned
inputs/timing. Do not combine them into one calibration target.

Selected fixed-defender rows below follow the **same nflId through all three
phases**. Momentum is body-mass × planar velocity (kg·m/s), not contact impulse.

| Catcher / fixed defender | Separation yd | Downfield lead yd | Defender speed yd/s | Momentum magnitude kg·m/s |
| --- | --- | --- | --- | --- |
| 52595 / 52472 | 5.50 → 3.71 → 1.41 | +5.5 → +3.7 → +1.4 | 3.36 → 4.51 → 5.27 | 296 → 396 → 464 |
| 54473 / 47862 | 2.12 → 3.36 → 2.83 | +1.5 → +2.0 → +1.9 | 6.25 → 6.73 → 7.52 | 508 → 547 → 611 |
| 40149 / 54487 | 3.64 → 6.53 → 7.29 | −3.1 → −5.0 → −5.4 | 3.55 → 2.55 → 4.47 | 354 → 254 → 445 |
| 40149 / 47804 | 11.53 → 7.02 → 1.49 | +7.2 → +4.6 → +1.0 | 4.16 → 3.58 → 3.40 | 345 → 297 → 282 |
| 53439 / 38559 | 4.60 → 3.06 → 1.26 | +4.6 → +3.0 → +1.2 | 3.61 → 5.76 → 6.04 | 320 → 511 → 536 |

For `40149`, the nearest identity changes from `54487` to `47804`. Reporting
only “nearest gap 3.64→1.49” would merge a defender falling farther behind with
a different defender arriving from ahead. This is a useful contrast to P045's
safety reducing distance while losing downfield leverage (+2.7→−2.0→−6.3 yd).
It does not prove either NFL defender's assignment, information or tackle identity.

The midpoint necessary bounds to enter the hindsight 1-yd catch-center disk are:

| Catcher / fixed defender | Horizon s | Required speed cap at least yd/s | Required peak acceleration at least yd/s² |
| --- | ---: | ---: | ---: |
| 52595 / 52472 | .6 | 5.17 | 10.92 |
| 54473 / 47862 | .7 | 8.69 | 14.82 |
| 40149 / 54487 | .7 | 12.74 | 32.00 |
| 40149 / 47804 | .7 | 4.13 | 5.96 |
| 53439 / 38559 | .7 | 5.75 | 7.30 |

These distinguish support geometries; they are **necessary hindsight bounds**,
not a forecast of which athlete can execute a turn or what he could perceive.
No NFL capacity/force budget is established. Do not call a disk-entry bound an
attainable tackle or use a closer endpoint to award a defensive win.

All four recorded first-contact events occur after catch; each retained .4-s
velocity window ends strictly before that event. Frame offsets, position sample
times, IDs, separation, closing, momentum consistency and bound arithmetic
validate. NFL `first_contact` has no actor identity: nearest defenders cannot
be asserted as tacklers, and older central ±.2-s contact-speed aggregates are
not these pre-contact windows. Quantization (.1 yd / .1 s), annotation timing,
rosters, receiver motion, other routes and call responsibilities still differ.
Tracking establishes neither gaze nor grip force or the first wrong decision.

## Decision this can inform

The examples support retaining **distinct measurement checks**: fixed-player
leverage and heading/closing through flight; support geometry; actual first
contact; then contact survival/outcome. A contained result can coexist with the
initially nearest defender falling farther behind, helper support and a receiver
slowing. An eight- or ten-yard offensive gain remains a legitimate outcome. These distinctions help
evaluate a candidate without demanding that every catch become a tackle.

They **cannot select or certify P045's controller change**. Catching's newer
[consumed-flight diagnosis at ba3f9a5](https://github.com/tannerthardy/football-simulation-/blob/ba3f9a53543bcdf1529bf8d605e36096363097ac/docs/reviews/p045-flight-objective.md)
reports 23 fallback ball-landmark drives and no receiver window. Its conditional
same-body acquired-man previews improve heading/closing, not native YAC or
tackle completion. Changing later moving-window arrival gates cannot activate
that recorded branch. The direct evidence for that conclusion is the saved
consumed input/request reconstruction, not the NFL outcomes.

The defensible next controller experiment remains Catching's bounded hypothesis:
retain coherent approach to an **already acquired assigned man** when no
attainable ball contest is forecast, while preserving real reachable contests,
receiver windows and offensive wins. NFL trajectories cannot supply hidden
target identity, a new sighting, future route knowledge or permission to add cue
age again to an already dead-reckoned position. P045 has no receiver contact,
so it still does not establish grip failure. P006's useful rear tackle and
P010's reachable-ball/carry choices remain controls; the historical P010 INT
belongs to its older runtime and is not a new-source preservation claim.

Current remote `develop` was checked as `8c891f4cf887b54297efbbc4c7993ba5e2f318b5`.
The NFL query is engine-independent. Catching explicitly limits its reported
native outcomes to the older pinned source; do not treat either these NFL
examples or its previews as current-develop integration validation.

**This authorized expansion and validation are finished. No further collection
or filter change is launched.** If a later decision needs a broader NFL
comparison, predeclare a separate intermediate/deep catch-approach study grouped
by receiver speed/heading change and fixed-defender initial leverage/support,
with coverage/route strata and all YAC outcomes retained. Select its football
question and observation rules before looking for an explosive bin. That is a
new design decision, not a retroactive repair of this zero-explosive result;
it is not needed to establish the already recorded P045 fallback branch.

## Reproduce validation only

Fetch the two linked JSON artifacts at `07bee74` and the unchanged week-1 cache
at `481ad18`; preserve their exact bytes. Default local locations are ignored
`out/p045-nfl/source/expanded/` and `out/p045-nfl/source/p045-nfl-week1-return.json`.

```sh
python3 -I scripts/diag/p045-nfl-validate-expanded.py --out out/p045-nfl/expanded-validation.json
```

The [validator](../../scripts/diag/p045-nfl-validate-expanded.py) reads constants
with Python AST and JSON packets only. It imports no query/adapter/engine,
opens no raw tracking, and cannot execute a collection. Full returned packets
remain linked at their original commit rather than copied into another study.
