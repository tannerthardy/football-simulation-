# Current NFL rushing references

The useful next comparison is **conditional rushing distributions and the
mechanisms that create them**, not a single yards-per-carry target. The engine's
balanced concept/front panel can expose wrong instructions, missed contact and
unusable lanes. It is not the NFL's call, front or player mix. Keep the physical
laws stable while tracing those failures; NFL final gains cannot identify the
required grip strength, traction or blocking force.

The new [reference packet](../../../data/reviews/run-game-current/reference/README.md)
adds full-season 2022/2023 PBP distributions and a separate nine-week 2022
Big Data Bowl concept-label study. The
[current engine diagnosis](run-game-current-diagnosis.md) owns the simulator
measurements. The data study changes no production code, ratings or physical
parameters and downloads nothing.

## Whole-season runs are not one interchangeable population

The collector reuses the existing pinned nflverse files and the live-call
selection from the [situational pilot](schematic-data-context-pilot.md).
Regular-season pass/run rows exclude kneels, spikes and two-point attempts.
Outcome rows require `penalty=false` and finite whole-play `yards_gained`.
This is a specific penalty-flag filter, not reconstructed penalty acceptance
or enforcement. Live flagged rows are counted separately: **26,585 observed
designed runs contain 26,228 clean gains; 1,940 observed scrambles contain
1,838 clean gains**. No selected clean run has a missing gain in this snapshot.

| Clean outcome, both full seasons | Designed runs | Scrambles |
| --- | ---: | ---: |
| Gain observations | 26,228 | 1,838 |
| Mean / median gain | 4.27 / 3 yd | 7.22 / 6 yd |
| p90 / p95 / p99 gain | 10 / 14 / 29 yd | 14 / 18 / 25 yd |
| Negative gain | 2,515 / 26,228 = 9.59% | 2 / 1,838 = 0.11% |
| Stuff: gain at most zero | 4,908 / 26,228 = 18.71% | 3 / 1,838 = 0.16% |
| At least ten yards | 2,778 / 26,228 = 10.59% | 459 / 1,838 = 24.97% |
| At least twenty yards | 622 / 26,228 = 2.37% | 75 / 1,838 = 4.08% |
| Yards-based 40/60/100 success | 12,915 / 26,228 = 49.24% | 1,145 / 1,838 = 62.30% |
| Positive model-derived EPA | 10,612 / 26,228 = 40.46% | 1,065 / 1,838 = 57.94% |

Designed runs include QB carries recorded as non-dropbacks and exclude
scrambles. A scramble is a recorded escape from a dropback with `qb_scramble` and
`rush_attempt` true. Sacks remain dropbacks outside this scramble population.
The extremely small scramble stuff rate therefore cannot serve as an expected
success rate for **every attempted QB escape**: failed escapes can remain sacks.
Realized labels also do not expose the original staff call or an RPO's unchosen
alternative.

For listed RB/FB carriers, designed runs have **23,272** clean gains: mean
**4.26 yd**, stuffs **4,175 / 23,272 = 17.94%**, ten-plus gains
**2,349 / 23,272 = 10.09%**, and twenty-plus gains
**524 / 23,272 = 2.25%**. Listed QB designed carries have **1,864** gains,
mean **3.62 yd**, stuffs **25.91%** and 40/60/100 success **57.99%**. Their
situation mixture differs substantially. The other **1,092** designed carriers
retain their separate group. The season roster's listed position is an exact
ID match, not the player's role at the snap; for example, a TE-listed player
can take a QB-style carry. Unknown or conflicting identities are never guessed
from names. All selected carrier IDs resolve in this snapshot.

The 2022 FTN chart adds **285 clean positively labelled QB sneaks**, mean
**1.81 yd**, with **234 / 285 = 82.11%** yards-based success. A one-yard
conversion and a ten-yard explosive are different jobs. The chart has one
labelled sneak gaining 25 yards: retain that provider observation rather than
assuming the label guarantees a one-yard gain. There is no local 2023 FTN
snapshot; absent charting does not become a false sneak, zero box or no motion.

## Success, conversion and field geometry need explicit operators

The new report preserves disjoint gain bins, raw counts and each rate's actual
denominator. Negative means less than zero; stuff includes zero. Ten-plus and
twenty-plus are separate tail thresholds. Percentiles use interpolation on
pooled play gains; they are not averages of cell medians.

40/60/100 success requires at least 40% of distance on first down, 60% on second,
and all the distance on third/fourth. It is distinct from positive EPA, whose
value comes from nflfastR's expected-points model. It is also distinct from
immediately gaining a first down: **6,379 / 26,228 = 24.32%** of designed runs
gain at least `ydstogo`, while **6,362** have a recorded rushing first down or
TD. Differences in final recorded events, lost fumbles and whole-play yardage
must not be hidden by relabelling both measures “conversion.” The report
separately retains lost-fumble observations and distance gained without a lost
fumble; **23** distance-gaining designed runs also have a lost-fumble flag.
Gains and 40/60/100 are explicitly yard-based even on such plays, not a claim
that the offense kept possession.

Field compression matters before any realism judgment. A five-yard TD cannot
gain twenty yards. Designed-run ten-plus frequency is **10.59%** across all
runs, versus **2,778 / 24,070 = 11.54%** where the offense starts at least ten
yards from the goal. Twenty-plus is **2.37%** across all runs versus
**622 / 21,946 = 2.83%** where at least twenty yards remain. These geometry
filters retain touchdowns and do not control scheme, roster or opponent.

## Situation changes what a useful run looks like

These pooled margins illustrate composition; the packet also keeps the joint
season/run-kind/down/distance/field cells.

| Designed-run situation | Clean n | Mean gain | Stuff | Ten-plus | 40/60/100 success |
| --- | ---: | ---: | ---: | ---: | ---: |
| First down | 14,386 | 4.39 yd | 17.63% | 10.48% | 48.30% |
| Fourth down | 518 | 2.35 yd | 29.92% | 5.41% | 67.37% |
| Distance 1–3 | 5,026 | 3.27 yd | 23.54% | 7.76% | 68.92% |
| Distance 8–10 | 15,850 | 4.57 yd | 17.17% | 11.29% | 45.22% |
| Own territory | 13,743 | 4.66 yd | 16.73% | 11.53% | 48.72% |
| Red zone, at most twenty yards to goal | 4,543 | 2.77 yd | 23.71% | 5.46% | 50.87% |

Higher success with lower yards is entirely possible in short-yardage and
goal-line situations. The fourth-down row is heavily selected, not a causal
effect of changing down. Score/clock margins similarly combine staff choices,
personnel, opponents and game scripts. The earlier situational pilot is the
better source for observed call mix; these run-only references do not identify
what play an offense should choose.

A declared ordinary-back witness selects listed RB/FB designed runs on first
or second down, distance 8–10, outside the red zone, score within eight and
before the final ten regulation minutes. In 2022 its **4,095** clean gains
average **4.59 yd**, with **639 stuffs (15.60%)** and **420 ten-plus gains
(10.26%)**. In 2023 **3,826** gains average **4.60 yd**, with **600 stuffs
(15.68%)** and **417 ten-plus gains (10.90%)**. This is a more relevant broad
guard than all-carry averages for an ordinary back-run panel, but it still
has no identified blocking concept or defensive front.

The third-and-at-least-twenty witness reproduces the earlier pilot: **55 clean
designed runs**, mean **6.84 yd**, **16 ten-plus gains (29.09%)**, and zero
distance conversions. Exactly third-and-27 has just **one** clean designed run
in these two seasons, gaining five yards. Neither observation supplies an
inside-zone-versus-three-rushers target. Defensive rush/drop assignments and
run schemes are not known in these PBP rows. A gain can be useful yet fall far
short of conversion, and selected third-and-long runs are not ordinary runs.

2022 FTN box counts provide another conditional guard, not named fronts:

| Charted defenders in box | 2022 clean designed-run n | Mean | Stuff | Ten-plus |
| --- | ---: | ---: | ---: | ---: |
| At most five | 1,419 | 4.56 yd | 17.97% | 11.98% |
| Six | 5,135 | 4.71 yd | 16.51% | 11.88% |
| Seven | 4,595 | 4.38 yd | 18.65% | 10.77% |
| At least eight | 2,115 | 3.67 yd | 22.36% | 8.75% |

One additional clean designed run has an unknown box count. These margins mix
QB sneaks, personnel, situation and chosen runs. They do not estimate what
adding one defender causes; the nonmonotonic light-box means are a useful
reminder. The full box/carrier/down/distance/field cells remain available,
including thin or missing rows. Motion and RPO flags have their own known-label
strata; neither is inferred from observed run direction.

## Concept labels: a separate nine-week 2022 reference

The local BDB2025 cache is available under `review-aids`, despite the older
catalog's `data/raw/bdb2025` path being absent. Its actual play/player bytes
match the existing run-reference SHA-256 pins. The new metadata-only collector
uses **16,124 plays from 2022 weeks 1–9**, retaining **6,223 provider-defined
designed runs**, excluding dropbacks and kneels. It keeps all runner positions
and non-nullified plays, then separates **120 charted sneaks** from **6,103
ordinary runs**. “Ordinary” here only means not labelled a sneak: QB keepers,
tricks, FB carries and WR runs remain. It is not an RB-only, penalty-free or
first-and-ten population.

Main outcomes use `yardsGained`, matching the existing run-tracking/tendency
references. `prePenaltyYardsGained` is preserved as a separate operator:
**95 of 6,223** plays differ, both are known on every selected play, and the
mean main-minus-pre-penalty difference is **−0.036 yd**. `penaltyYards` is
missing on **6,108**, zero on **34**, and nonzero on **81** plays. All source
metadata has nullification `N`; this does not establish that its plays are
penalty-free. Missing penalty yards are not proof of no penalty. Do not mix
these outcomes with the PBP's explicit clean filter without accounting for
the operator and selection difference.

| Exact provider primary label, ordinary cohort | n | Mean | Stuff count / rate | Ten-plus count / rate | Twenty-plus count / rate | 40/60/100 success |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| INSIDE ZONE | 1,343 | 4.20 yd | 192 / 14.30% | 124 / 9.23% | 25 / 1.86% | 681 / 1,343 = 50.71% |
| OUTSIDE ZONE | 1,641 | 4.34 yd | 309 / 18.83% | 173 / 10.54% | 45 / 2.74% | 739 / 1,641 = 45.03% |
| MAN | 1,059 | 4.04 yd | 192 / 18.13% | 102 / 9.63% | 17 / 1.61% | 544 / 1,059 = 51.37% |
| POWER | 589 | 5.16 yd | 101 / 17.15% | 82 / 13.92% | 26 / 4.41% | 325 / 589 = 55.18% |
| COUNTER | 396 | 5.09 yd | 85 / 21.46% | 61 / 15.40% | 13 / 3.28% | 199 / 396 = 50.25% |
| PULL LEAD | 504 | 4.76 yd | 126 / 25.00% | 75 / 14.88% | 17 / 3.37% | 260 / 504 = 51.59% |
| TRAP | 108 | 6.31 yd | 14 / 12.96% | 20 / 18.52% | 7 / 6.48% | 58 / 108 = 53.70% |
| DRAW | 184 | 5.82 yd | 32 / 17.39% | 37 / 20.11% | 6 / 3.26% | 81 / 184 = 44.02% |

Outside zone's higher stuff rate and modestly higher tail, alongside lower
yard-based success, are consistent with the user's intuition in this sample.
These are selected observations, not a universal causal advantage of a scheme.
Inside/outside zone share a median of three yards. TRAP's higher mean does not
justify giving traps a strength bonus: there are just 108 plays, mixed teams
and conditions, and seven twenty-plus gains. The packet retains the less
interpretable `NA`, `UNDEFINED`, `TRICK` and `FB RUN` groups rather than
forcing them into a familiar concept.

The raw secondary label is important. There are **735 plays with a `SPLIT`
token**, of which **554 have pure `SPLIT`** and **181 a compound annotation**.
Inside zone has **489** split-tagged plays (**365 pure, 124 compound**);
outside zone has **173** (**145 pure, 28 compound**). Other annotations include
`READ OPTION`, `LEAD`, `PITCH`, `CROSS LEAD` and `BACKSIDE FOLD`. The old run
extractor ignored secondary labels; that was an extraction limitation, not
evidence that the dataset lacked split tags. A tag still does not verify our
exact slice player, motion, kick/log rule or handoff installation. `MAN` is not
established Duo, and primary `OUTSIDE ZONE` does not isolate our Wide Zone or
Toss calls. Raw compound labels and overlapping token margins remain separate.

This new cohort has no offense-personnel restriction. The older tendency
reference has **5,505 concept runs**, including 1,319 inside-zone and 1,579
outside-zone observations, under its own sneak/personnel/concept exclusions.
Its counts should not be substituted into this new table. Of **341
primary-by-down/distance/field cells**, **177 have one to four plays**, **93
five to nineteen**, **60 twenty to ninety-nine**, and only **11 at least
one hundred**. Thin concept/situation tails need film and broader support,
not stronger tuning from a precise-looking fraction.

There is no box-count field in this BDB play metadata. The older two-week
tracking study has **1,394** runs and measured snap geometry, but
these are explicitly **front proxies**: 832 are other/ambiguous, 285 Over,
83 Under, 122 odd/reduced, 41 Tite, 30 Bear, and one overlapping reduced proxy.
Of its **63 concept/proxy cells**, **46 have fewer than twenty plays**.
An attached TE/shade heuristic cannot identify a called front, its strength
check, post-snap slant or gap exchange. The small Bear/Tite cells cannot
calibrate our named-front matchup independently.

## Exposure, generated rosters and the current engine panel

The observed **64 team-seasons** have p10/p90 designed-run means
**3.71/4.83 yd**, stuff rates **15.89/23.49%**, ten-plus rates
**7.59/12.93%**, and 40/60/100 success **44.55/55.11%**. Their clean run counts
have p10/p90 **350/471**. These describe teams playing their actual schedules
and game scripts, not confidence intervals or bounds for a synthetic roster.
Multiple games against the same generated bodies do not sample NFL roster
variation. Preserve a few contrasting roster seeds, their player profiles and
call distributions before interpreting aggregate differences.

There are **100 designed-run joint cells**; **29 have fewer than twenty clean
runs**, and **62 fewer than one hundred**. Those 29 smallest cells together
contain only 208 gains. The full 2022 box/context table includes both run kinds:
**436 of 539 cells** have fewer than twenty clean gains, including three
zero-clean cells. A large source population does not make every conditional
tail reliable. Zero clean observations yield missing rates, not 0% success.
With ten observations, one event changes a rate by ten percentage points;
with forty, by 2.5 points. Always retain numerator/denominator and adverse
examples rather than ranking tiny cells by their apparent percentage.
Plays cluster within games, teams and players, so naive independent-play
binomial error bars would overstate precision. No population uncertainty or
significance claim is made by this packet.

The current engine baseline is **160 balanced diagnostic runs**:
eight concepts × five fronts × both directions × two seeds, **one roster**,
Ace 11 except Split Zone in Gun Wing 12, LOS 40, first-and-ten and Cover 3.
That fixed scheme/front population is deliberately unlike NFL usage. Its
reported mean **1.28 yd**, **39 gains at most zero** and **one ten-plus gain**
motivate examining lost lanes and contact, not multiplying every run's force
until its mean is 4.27. Its reported first-contact YBC near **0.08 yd** also
needs an operator/selection match before comparison with historical tracking.
The engine review owns the exact source, inputs, operators and outcomes.

## Why the two contact references disagree

The published two-week run reference has **1,310 annotated first contacts**,
mean YBC **1.164 yd**. The older error-budget contact reference reports
**1,142** handoff/contact/tackle complete cases, mean **0.37 yd**. Those are
different metrics and populations. Neither has been overwritten.

The new [contact operator audit](../../../data/reviews/run-game-current/reference/contact-operator-audit.json)
reproduces the exact older 1,142 cases, then changes one coordinate operator
at a time while retaining those cases:

| Same 1,142 first-contact observations | Mean YBC |
| --- | ---: |
| Football position minus metadata `absoluteYardlineNumber` | 0.372 yd |
| Football position minus football position at snap | 0.746 yd |
| Runner position minus football position at snap | 0.997 yd |

Changing the LOS reference adds **0.374 yd**; using the runner rather than
the tracked football adds **0.251 yd** in the same cases. Therefore much of
the disagreement is measurement choice rather than a changed football finding.
The older complete-case selection also removes no-handoff and no-tackle runs.
A separate football-event shortcut finds **1,303**, rather than the published
all-player-row **1,310**, contacts; its 161 additional contacts have higher
mean YBC. That shortcut is expressly incomplete and does not identify the
remaining seven observations or prove an exact decomposition of the broader
mean. Keep its limitations visible rather than declaring either old value
incorrect or universally calibrated.

Provider `first_contact` frames at 10 Hz are annotations. Tracking points and
the ball's snap coordinate are not body surfaces, hand contact, force, grip,
block control or necessarily official ball-spot geometry. The engine can
record actual loaded touch and native body position more precisely, but a
physical-load event is a different operator from a tracking annotation. Match
definitions and missing/censored-event policies before deciding whether first
contact is early or a runner carries a tackler too far. A run with no annotated
contact must not acquire zero YBC automatically.

The existing local BDB2025 ZIP contains tracking weeks **1–9**, although only
weeks **1–2** are extracted. It can support a future streamed all-nine-week
conditional tracking study without another download. That expansion has not
been performed here. First agree the same carrier/LOS/contact operator and
which concept/context cells need more support; then stream those weeks rather
than collecting another large generic dataset. Sparse blocking-opponent labels
(251 of 136,905 run player rows in the old audit) still cannot supervise all
assignments, hand positions or combo releases.

## How to use the evidence next

1. Compare like observations. Use native full-play gain and the same explicit
   penalty policy, separate back runs from QB/scramble work, and retain field
   and distance. Label balanced laboratory cells separately from mixed games.
2. Locate the first failure. On ordinary IZ/OZ, inspect actual OL assignments,
   first fit, achieved loaded contact, keeper support and climb, RB entry and
   defender leverage. A missed lane followed by a tackle does not identify
   insufficient strength. Likewise a physically valid collision does not
   validate its approach instruction.
3. Compare distributions and mechanisms together. Track negative/zero gains,
   median, upper tail, success and turnovers; retain block/contact timing with
   each metric's own n. A higher mean can conceal new stuffs or a few outliers.
4. Use exact provider concept/modifier labels as conditional references,
   validate the installation mapping on film, and keep geometric fronts as
   proxies. Do not impose one NFL target on every simulated front/concept.
5. After instructions and matched operators work, check a small mixed-game
   sample across several roster seeds for broad relationships. Tune physical
   capacity only with a demonstrated movement/contact failure and transferable
   capability evidence, never directly from league final yards.

## Verification and reproduction

All five PBP/chart/roster inputs match the existing acquisition manifest's
size and SHA-256. The query receipt pins the collector and both shared helpers
before its first outcome collection. It is a modest descriptive study using
already inspected data, not blinded or registered hypothesis testing. Ten
operator tests cover run classification, penalties/missing values, success
versus turnover, gain bins, field eligibility, roster conflicts, box counts,
pooled quantiles and changed-input rejection. An independent raw-CSV loop
without collector/helper imports verifies main outcomes and team-season
counts; partition/rate checks cover every reported cell. Historical packets
and manifests are unchanged.

The separate BDB collector has **nine passing operator tests**. Its receipt
was frozen after the initial descriptive audit and before the new collection,
with that timing stated explicitly. Independent raw Decimal recomputation
checks 26 primary-label/yard-operator combinations; invariant checks cover
1,000 emitted aggregates and seven complete partitions. Its three metadata
inputs match the old reference's byte pins. The contact probe verifies both
tracking-week and metadata hashes before reproducing the older complete cases.
BDB and contact commands, exact probe bytes and their limits are retained in
the packet README. Only the new collectors and new evidence were written.

```sh
python3 -m unittest discover -s test -p test_run_outcome_context.py
python3 scripts/data/run_outcome_context.py \
  --plan-only out/run-reference-current/pbp-query-plan.json
python3 scripts/data/run_outcome_context.py \
  --query-receipt out/run-reference-current/pbp-query-plan.json \
  --out out/run-reference-current/pbp-report.json
```

The new packet preserves source URLs/update metadata, tool/test hashes,
query receipts, logs, compact aggregate reports and verification. Raw source
rows remain ignored. A fresh collection has new timestamps; its metric values
should agree on the same pinned inputs and operator bytes.

**Charting attribution:** FTN Data via nflverse. The FTN-derived 2022
box/sneak/motion/RPO strata and their conditional aggregates are under
[CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Changes are
exact game/play joins, declared regular-season/live-run and penalty filtering,
roster-position grouping, context grouping and outcome aggregation. Other
PBP/roster sections retain their NFL/nflfastR/nflverse provenance; this does
not infer a raw-data licence from the collector code. Big Data Bowl access
and reuse remain subject to its competition terms; only derived aggregates
and provenance are published here.
