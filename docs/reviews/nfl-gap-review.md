# Current engine versus NFL evidence

Reviewed 2026-10-11 on `claude/engine-priorities`. **Prioritize the transition
from coverage through the catch to first effective contact.** Diagnose one
repeated bad request or physical response before implementing a fix. Do not
globally tighten coverage, reduce receiver speed or strengthen grips.

Keep the bounded hand/contact angular-law repair as the next shared-physics
task. Continue selected gap/pull blocking work; outside-zone lateral technique
is being investigated separately. A larger foot solver is not justified by
this review. NFL outcomes are the final exam, not tuning targets.

This task changed measurement and review tools, not engine behavior. Source
remained `b1164289` throughout. The [compact receipt](../../data/reviews/current/nfl-gap-review.json)
pins inputs, tools, populations, checks and the sampled play IDs. Large outputs
remain in ignored `out/nfl-review/`.

## What was compared

- Two native eight-game cohorts: seeds 101–108 and 202–209. Each uses a fixed
  generated roster pair at strength 0.55: four teams total. Calls adapt normally.
  These are two roster samples, not 16 independent talent samples.
- Shared tracking operators: 2,193 non-nullified plays, including 526 RB
  handoff runs and 1,667 dropbacks. Actual-catcher summaries include 948 catches.
  Separate NFL tracking references cover 2017, 2021, 2022 and 2023; their windows
  and player populations differ. The primary all-22 reference is 2022 weeks 1–9.
- Outcome operators: exclude every flagged-foul play on both sides. The sim
  has 2,156 clean plays, 1,637 dropbacks, 1,479 throws, 933 completions and 519
  designed runs. NFL 2022–23 regular season has 66,543 clean plays, 40,315
  dropbacks, 35,790 throws, 23,092 completions and 26,228 designed runs.
  Sacks and scrambles are dropbacks, not throws or designed runs. Three sim
  dropbacks end in a safety or QB fumble without a throw/sack/scramble label.

Public references have already been examined; they are not blind holdouts.
The reserved 2026 exam was not read. NFL team-season variation is descriptive,
not a talent-adjusted acceptance interval for generated teams.

## Outcomes: the largest gaps

These numbers describe the clean outcome populations above. Success means
gaining 40% of first-down distance, 60% on second, and 100% on third/fourth;
it is not EPA success. Completion gains use offensive whole-play yardage.

| Measure | NFL 2022–23 | Current sim |
| --- | ---: | ---: |
| Completion rate per throw | 64.5% | 63.1% |
| Mean gain per completion | 10.90 yd | 20.17 yd |
| Mean YAC per completion | 5.16 yd | 12.32 yd |
| YAC, 90th percentile | 12.0 yd | 39.68 yd |
| YAC of 20+ yd per completion | 3.6% | 18.3% |
| Completed gain of 20+ yd per throw | 8.9% | 19.9% |
| Interceptions per throw | 2.3% | 6.1% |
| Passing touchdowns per throw | 4.1% | 12.9% |
| Sacks per dropback | 6.7% | 3.9% |
| Designed-run success | 49.2% | 27.7% |
| Designed-run median gain | 3.0 yd | 1.9 yd |
| Designed-run mean gain | 4.27 yd | 5.32 yd |
| Designed runs gaining 20+ yd | 2.4% | 4.8% |

About 77% of the *arithmetic excess* in mean completion gain sits in recorded
YAC. That is not a causal attribution: coverage establishes the catch state
that pursuit and contact inherit. Mean rushing gain is similarly misleading:
too many ordinary runs fail while occasional escapes inflate the mean.

The roster cohorts average 67.4 and 44.4 points per team-game. Their different
calls and later RNG histories prevent paired explanations of whole-game swings.
Both have a long YAC tail: corrected tracking p90 is 47.6 and 31.6 yd. That
repeatability supports investigating the mechanism, not fitting a score target.

## Mechanisms: where to look

Tracking below uses the same operator on both sides. Its quantized-position
YAC differs slightly from native outcome YAC and includes flagged-foul plays.
Do not mix those denominators or average subgroup quantiles.

| Observation | NFL 2022 | Current pooled | Interpretation to test |
| --- | ---: | ---: | --- |
| Yards after first catch contact, p90 | 6.1 yd | 18.46 yd | Inspect first actual grip, loading, slips and assists. |
| Same, side approaches | 6.2 yd | 56.2 yd | Crossing momentum and attainable reach are strong leads. |
| Same, fast carriers | 7.4 yd | 38.6 yd | Match entry geometry/speed before changing contact strength. |
| Broken-contact proxy on catches | 12.5% | 27.1% | This is retained-speed/further-gain classification, not a labeled missed tackle. |
| Run tackler speed at contact, median | 2.85 yd/s | 1.50 yd/s | Is he requesting a stationary gather, or failing to execute an attack? |
| Run head-on approach proxy | 9.0% | 22.3% | Square-and-wait may be overused; behind/side controls matter. |
| Run contact to whistle, median | 1.4 s | 0.7 s | Slow/mid entries stop abruptly while fast entries can escape. |
| Fast-run yards after contact, p90 | 10.6 yd | 43.7 yd | An overall broken-contact rate hides opposite conditional errors. |
| Eligible route separation at 1.5 s, median | 3.32 yd | 1.90 yd | Early route separation is already unusually small. |
| Nearest-defender closing during flight, median | +0.51 yd | −0.05 yd | Follow the same defender and his observed catch window. |
| Time to throw, median | 2.60 s | 2.35 s | No support for a globally excessive time to throw. |
| Geometric pressure before release | 30.5% | 24.5% | Match release time, QB depth and protection before blaming force. |
| Greatest proximate DL retreat at 3 s, p90 | 2.5 yd | 3.0 yd | Still inspect bad drives, but this is no longer the largest broad gap. |
| Gap/pull run median / p90 | 3 / 12 yd | 1.18 / 5.57 yd | Path, edge pickup, climb and runner timing still need work. |
| Outside-zone run median / p90 | 3 / 10 yd | 2.49 / 16.96 yd | Ordinary success and escape tail are different problems. |

Run tackler speed is also 2.85 yd/s in 2017. Catch-contact p90 is 9.7 yd in
2017; side-contact p90 is 7.9. Early route separation is 2.91 in 2017 and 3.42
in 2021. These differences do not erase the current gaps. The selected-player
2023 flight reference has a different arrival window; treat it as corroboration.
Nearest-defender identity can change. Run engagement means proximity, not
measured hand load. These observations cannot identify forces or intentions.

Receiver speed at catch is lower, not higher: median 4.07 yd/s against 4.80.
There are also more defenders within five yards on average, 1.38 against 1.08.
Those are mixed catch populations, not proof that each catch is well covered.
They argue against blaming the whole YAC tail on excessive receiver speed or
too few nearby defenders.

Drops do not dominate current incompletions: 52 drops among 456 non-interception
incompletions, or 11.4%. FTN's corresponding 2022/23 labeled shares are 11.1%
and 11.4%. The sim also records 145 PBUs, two throwaways and 257 other
incompletions. These are event labels, not causal pressure/accuracy judgments.
Of 90 clean interceptions, 72 are by CB/S, 13 by LB and five by DL; 12 follow
a recorded drop and two a deflection. Most are not the old drop/DL pathway.
Completion frequency alone cannot establish good QB decisions or throw error.

The gap persists after a limited context comparison. Using shared down,
distance and field bins, retain cells with at least 20 known sim observations
and 100 NFL observations, then apply the same pooled NFL exposure weights to
both sides. Mean completion gain is 21.51 versus 11.34 yd; mean YAC is 13.49
versus 5.48 (625/933 sim completions across ten cells). Run success is 26.1%
versus 46.1% (312/519 runs across five cells). Both rosters show the same
direction. These comparisons retain only common support, not every play;
talent, scheme, score, clock and carrier mix remain uncontrolled. No quantiles
were averaged. The sim's designed carriers are all RB/FB; NFL designed runs
include other roles. Cell weights and excluded exposure are in the receipt.

Geometric pressure and native `pressured` are different: 24.4% versus 13.1%
on clean sim dropbacks. The native logger misses parts of the throwing windup.
We cannot honestly report what share of incompletions was *caused* by pressure.

## Random completion review and the supplied YAC analysis

Drawn before reviewing results: 24 uniform completions from each cohort,
Python seed `20261011`; all 48 retained. This is a targeted completion review,
not a replacement for the earlier random all-snap review. It is an engineering
path/event review, not an independent coach's adjudication.

There are 16 catches within two yards of a defender, 27 at two–five yards,
and five farther away. Forty have a first recorded grasp/wrap, one body contact
and seven no recorded contact. Absence of an event is not proof of no contact.
The repeated concerns rank as follows; categories overlap:

1. **Catch approach or pursuit request needing a trace: 10/48.** Prioritize
   `S108-P143` and `S107-P233`. A defender is close but the arrival momentum and
   subsequent grip are questionable. Positions alone cannot prove wrong braking.
2. **Acquisition/support sequence needing a load trace: 6/48.** Two overlap
   the first group. Distinguish a complete whiff, a glancing collision and an
   acquired grasp that later slips. Do not call all three weak tackling.
3. **Measurement/recording issues:** six intended/actual catcher mismatches;
   two plays with earlier QB-contact markers. These are not defensive bug rates.

No wrong request or physical defect was confirmed from light paths alone.
Preserve ordinary opposing controls `S107-P214`, `S204-P60`, `S207-P161` and
`S204-P41`: immediate wraps, useful gathering and assisted pursuit already occur.
The earlier all-snap review's pocket-adjustment concerns remain open; this
targeted sample does not establish their overall frequency has changed.

The user-supplied deep dive is useful, with these qualifications against current code:

- `onBallCaught` replaces behavior classes, but body state, perception and
  `runFit` survive; pursuit already retains some box/force leverage and
  support-aware gathering. Lost coordination is a hypothesis to demonstrate,
  not a confirmed explanation for every long gain.
- Catch height/extension changes catch probability without a corresponding
  achieved jump/landing/support transition. That is a genuine representational
  gap. Ordinary turning still costs movement, and receivers already slow/turn
  toward a catch. Do not add an unconditional post-catch delay.
- `DownfieldBlocker` uses true carrier/defender state and other blockers'
  private targets. It also returns `stand()` after rejected `engage()`.
  These are concrete controller concerns, but repairing them could improve
  blocking and increase YAC. They are not automatic ways to reduce the tail.
- Global `firstContactX` can suppress a receiver body-contact marker if the QB
  contacted first. Native YAC uses the separate catch segment. Track possession
  segments observationally; do not reset production state as a measurement fix.
- The quoted **one-yard `playBall` stand-off is already removed**. Current
  code targets the catch point. Its comment explains the old failure.
  A possible incorrect catch window or unsuitable braking remains unproved.

## Next experiment, and when to stop

Use existing recording and approach tools on the nominated native cases before
adding flags. Follow the covering/first-approach defender through acquired cue,
chosen catch window, raw/applied movement request, achieved support and reach,
first actual contact, transmitted load, slip and assist. Use actual recipient IDs.

Then reproduce the first wrong mechanism in a small controlled panel: stationary,
crossing and vertical catches; blocking TE versus released TE; one defender and
complementary inside/outside support; complete whiff, glancing contact and grasp.
Match bodies, entry speed, geometry and observations. Include mirrors and the
ordinary native controls. A defender must not gain hidden target/route knowledge.

Change one controller only if its request is wrong. Repair shared contact if
the achieved response violates its limits or laws. Catch-height support should
be added only with the same shared support rules and a demonstrated case that
cannot be represented now. No separate receiver agility or strength bonus.

Success is a corrected cue/request/response sequence with ordinary controls
preserved, followed by two native roster checks and the existing 12 mechanism
guards. A lower YAC mean by itself is insufficient. If two candidates fail to
repair the mechanism, or an ordinary control breaks, stop and re-diagnose.

In parallel, repair the known isolated tangential angular-transfer failure
before richer hand/shoulder mechanics. Its football payoff is not yet measured;
it does not require postponing all controller diagnosis until physics is perfect.

## Measurement repairs and reproduction

The live-window predicate was rejecting legitimate half-grid sim contact times.
It now checks the actual recording/whistle window, without extrapolation.
Catch metrics previously used the intended target even when somebody else
caught the ball: 35/511 and 36/437 cases. The exporter now records `receiver`
separately; old packets can be normalized from the native sidecar. Air/route
metrics retain the intended target. Positions, events, yardage and RNG are unchanged.

All 141 Python checks, three exporter checks, typecheck and build pass. The
existing guards pass 12/12 for both cohorts and pooled; no thresholds changed.
NFL adapters' integer-frame events and official/inferred target fallback are unaffected,
verified by invariance checks rather than pretending raw NFL was reprocessed.
Historical catch summaries without recoverable actual recipients remain legacy.
The known angular-law failure remains a failure; it was not part of this repair.

With Node 22 and the six cached NFL inputs identified by tracked manifests:

```sh
python3 scripts/mechanics/nfl-outcomes.py --out-dir out/nfl-review
node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out out/nfl-review/plays101.jsonl.gz --review-out out/nfl-review/outcomes101.json
node --import tsx scripts/mechanics/sim-export.ts --seed 202 --games 8 --out out/nfl-review/plays202.jsonl.gz --review-out out/nfl-review/outcomes202.json
python3 scripts/mechanics/outcomes.py --outcomes out/nfl-review/outcomes101.json out/nfl-review/outcomes202.json --tracking out/nfl-review/plays101.jsonl.gz out/nfl-review/plays202.jsonl.gz --reference out/nfl-review/reference.json --out out/nfl-review/native-outcomes.json
python3 -I scripts/mechanics/measure.py out/nfl-review/plays101.jsonl.gz out/nfl-review/sim101.json
python3 -I scripts/mechanics/measure.py out/nfl-review/plays202.jsonl.gz out/nfl-review/sim202.json
```

These commands reproduce mechanisms/outcomes at the pinned engine, not old
collector byte hashes after the additional receiver field. Source/input/tool
hashes distinguish those versions. Raw acquisition, licensing and archive
instructions are in [the data guide](../../data/README.md).

Sources: nflverse/nflfastR play-by-play and roster positions; NFL Big Data Bowl
tracking. **FTN Data via nflverse**: charting and derived drop aggregates are
licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
