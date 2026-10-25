# Rushing benchmarks and the next engine priorities

The benchmark now uses four complete NFL regular seasons, 2022–2025, plus the
nine-week 2022 Big Data Bowl concept sample. It compares distributions and
situations, rather than making 4.3 yards per carry a universal engine target.
The [evidence and reproduction commands](../../../data/reviews/rushing-benchmark/README.md)
include source pins, query definitions, missing-data audits, clustered uncertainty,
the current engine comparison and a withheld movement experiment.

The immediate priority remains executed run fits, pursuit and achievable movement
requests. Do not expand anatomical physics or change strength to fit these averages.
The reduced World can execute the local movements examined here; the new movement
choice improves a local instruction but makes two retained football finishes
materially worse. It is **withheld**, with production spacing unchanged.

## What was actually studied

| Reference | Population and purpose |
| --- | --- |
| nflverse/nflfastR 2022–2025 | 1,087 completed REG games; 52,113 clean designed runs and 3,883 observed scrambles. Full-season outcomes and game-state context. The canceled 2022 BUF–CIN game is not an additional completed game. |
| Season roster snapshots | Exact season/player-ID join to listed RB/FB, QB, other or unknown positions. Listed position is not the player's role on that snap. |
| FTN 2022–2025 | Exact game/play joins for box count, QB location, motion, RPO, trick and sneak labels; missingness retained. Motion includes before **or** at the snap. |
| BDB2025's 2022 sample | All nine weeks, 136 games: 6,223 provider-designed runs, including 120 positively charted sneaks; 6,103 non-sneak runs. Exact primary concepts and secondary modifiers, situations, formation, observed lineup composition and motion. |
| Engine native eight-game cohort | Actual post-audible calls, pre-snap game state, generated rosters, settled gains and native flags. Fixed lab calls are a separate mechanical control, not NFL call frequencies. |

The full-season primary operator excludes kneels, spikes, two-point attempts,
postseason, sacks and all provider-flagged penalties, and requires a finite
whole-play gain. Fumbles and short touchdowns remain. Failed escapes recorded as
sacks are not successful scrambles. The BDB provider's non-nullified population
can retain penalty yards, so its main and pre-penalty gains are separate
sensitivity reports rather than interchangeable with the clean full-season pool.

Raw public inputs stay ignored. Verified manifests and aggregate results are
committed so collaborators can inspect or reproduce the analysis. NFL source
definitions: [PBP dictionary](https://nflreadr.nflverse.com/articles/dictionary_pbp.html),
[FTN dictionary](https://nflreadr.nflverse.com/articles/dictionary_ftn_charting.html),
and [roster dictionary](https://nflreadr.nflverse.com/articles/dictionary_rosters.html).

## Define success before comparing it

The primary **yard-based success** rule chosen here is at least 40% of yards to
go on first down, 60% on second and 100% on third/fourth. It is a declared
evaluation convention, not a uniquely correct NFL definition. Its four-season
rate is **49.65%**; changing first down to 45% makes it **43.98%**. NFL integer
spots make the difference particularly visible on first-and-ten.

Keep these measurements separate:

- **Conversion:** gain at least yards to go; also report recorded first down/TD
  and the version requiring no lost fumble.
- **Positive EPA:** provider model-derived EPA greater than zero, **40.78%** for
  designed runs here. The engine does not yet provide an equivalent EPA model;
  absent engine EPA is unavailable, not zero.
- **Stuff:** gain at most zero; distinguish negative gains and exactly zero.
- **Explosiveness:** inclusive 10/15/20/30/40-yard thresholds, each with numerator
  and denominator. No single threshold substitutes for the entire tail.
- **Field-eligible explosiveness:** only starts with enough known yards to the
  opponent goal for that threshold. All-run 20+ is **2.30%**; field-eligible 20+
  is **2.77%**. A five-yard touchdown remains successful but cannot generate a
  twenty-yard gain. Its endpoint does not reveal hypothetical extra yards.
- **Distribution and composition:** pooled percentiles, gain bins, capped-mean
  sensitivities, and how much total yardage comes from the long-gain tail.

NFL reported yards are spotted integers; engine yards are continuous. The adapter
retains actual gains and separately reports nearest-whole-yard sensitivity. Do
not turn a fractionally positive engine gain into evidence that NFL stuff rates
are too high, or quietly round the source outcomes to improve agreement.

## Useful reference populations

All rates below use the population stated in the row. Success is the chosen
40/60/100 rule. Short-yardage, sneak and long-yardage selection materially change
what a sensible outcome looks like.

| Clean NFL population | Runs | Mean / median yd | Stuff | Success | 10+ | 20+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| All designed runs | 52,113 | 4.29 / 3 | 18.56% | 49.65% | 10.47% | 2.30% |
| Listed RB/FB designed runs | 46,621 | 4.31 / 3 | 17.77% | 48.75% | 10.13% | 2.25% |
| Ordinary neutral RB/FB witness | 15,315 | 4.70 / 3 | 15.01% | 46.86% | 10.79% | 2.62% |
| Listed QB designed runs, including sneaks | 3,458 | 3.42 / 2 | 27.33% | 57.40% | 9.80% | 1.94% |
| Third/fourth down, 1–2 to go | 4,455 | 3.14 / 2 | 25.79% | 69.88% | 7.05% | 2.20% |
| Goal line, 1–5 yards to goal | 2,814 | 1.04 / 1 | 33.19% | 57.46% | 0% | 0% |
| Positively charted sneaks | 1,171 | 1.58 / 2 | 18.28% | 77.37% | 0.26% | 0.09% |
| Third down, 20+ to go | 146 | 6.97 / 6 | 2.74% | 0% | 26.71% | 0% |
| Leading by 9+, final two regulation minutes | 350 | 3.65 / 3 | 18.86% | 38.00% | 7.43% | 2.57% |
| Observed scrambles, excluding sacks | 3,883 | 7.43 / 6 | 0.13% | 62.79% | 26.06% | 4.64% |

The ordinary witness means first/second down, 8–10 to go, outside the red zone,
score within eight, and before the final ten regulation minutes. It is an
observed selected workload, not a talent-controlled trial. Its p90/p95/p99 are
10/14/31 yd. The all-designed equivalents are 10/14/29 yd, with 15+/30+/40+
rates of 4.51%/0.94%/0.51%.

The third-and-long witness is especially useful for the owner's drop-eight run
stress idea: a run can gain nearly seven yards on average while almost never
converting. PBP does not tell us that these 146 plays were Inside Zone against
three rushers, and zero observed conversions or twenty-yard gains is not a
physical prohibition. Keep the actual three-rusher installation test separate.

## Down, distance and field change the job

These are marginal designed-run descriptions. The machine-readable joint
kind/carrier/down/distance/field cells provide the closer comparisons; do not
combine marginal rows as if they identify the same plays.

| Down | Runs | Mean yd | Stuff | Success | Conversion | 10+ | 20+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| First | 28,704 | 4.42 | 17.46% | 48.66% | 12.45% | 10.44% | 2.37% |
| Second | 16,788 | 4.31 | 18.59% | 48.68% | 32.61% | 11.05% | 2.24% |
| Third | 5,546 | 3.88 | 22.18% | 54.02% | 54.02% | 9.81% | 2.31% |
| Fourth | 1,075 | 2.50 | 28.84% | 68.65% | 68.65% | 5.67% | 1.58% |

| Yards to go | Runs | Mean yd | Stuff | Success | Conversion | 10+ | 20+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 5,547 | 2.89 | 27.47% | 72.53% | 72.53% | 6.18% | 1.71% |
| 2–3 | 4,727 | 3.68 | 19.99% | 63.55% | 55.47% | 9.12% | 1.93% |
| 4–6 | 6,456 | 4.16 | 18.65% | 54.17% | 31.32% | 9.98% | 2.39% |
| 7–10 | 32,985 | 4.59 | 17.05% | 45.29% | 12.10% | 11.18% | 2.49% |
| 11–19 | 1,910 | 4.70 | 16.75% | 18.59% | 6.18% | 13.66% | 1.57% |
| 20+ | 488 | 5.85 | 11.48% | 11.27% | 1.84% | 18.03% | 2.25% |

| Distance to opponent goal | Runs | Mean yd | Stuff | Success | 10+ | 20+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1–5 | 2,814 | 1.04 | 33.19% | 57.46% | 0% | 0% |
| 6–20 | 6,419 | 3.46 | 20.25% | 47.45% | 7.23% | 0.20% |
| 21–50 | 16,366 | 4.51 | 18.51% | 49.90% | 11.82% | 3.03% |
| 51–89 | 24,826 | 4.72 | 16.66% | 50.10% | 11.65% | 2.67% |
| 90–100 | 1,688 | 4.33 | 16.23% | 35.90% | 9.72% | 1.72% |

Score, clock, shotgun, no-huddle, run direction/gap, goal-to-go and FTN charted
box/motion/RPO/sneak strata are retained with their own missing counts. Reported
run gap is end/tackle/guard, not a zone/gap scheme. Box count is not a called
front or number of rushers.

## What we can say about concepts

This separate nine-week sample retains the provider's exact labels and its own
yard operator. Its ordinary non-sneak population is not automatically RB-only
or penalty-free.

| Provider primary | Runs | Mean / median yd | Stuff | Success | 10+ | 20+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Inside Zone | 1,343 | 4.20 / 3 | 14.30% | 50.71% | 9.23% | 1.86% |
| Outside Zone | 1,641 | 4.34 / 3 | 18.83% | 45.03% | 10.54% | 2.74% |
| Power | 589 | 5.16 / 4 | 17.15% | 55.18% | 13.92% | 4.41% |
| Counter | 396 | 5.09 / 3 | 21.46% | 50.25% | 15.40% | 3.28% |
| Draw | 184 | 5.82 / 5 | 17.39% | 44.02% | 20.11% | 3.26% |
| Trap | 108 | 6.31 / 4 | 12.96% | 53.70% | 18.52% | 6.48% |

Outside Zone is more volatile than Inside Zone in this sample: more stuffs,
lower success and somewhat more long gains, rather than uniformly easier
running. That agrees with the owner's hypothesis but is not a causal scheme
comparison. Power/Counter/Draw/Trap averages also mix different selected jobs,
teams and fronts. Trap's seven twenty-yard gains provide weak evidence for a
precise tail target.

The [concept report](../../../data/reviews/rushing-benchmark/concepts/README.md)
contains 2,716 aggregate cells and a closer first-down/midfield slice. Of 551
primary/down/distance/field cells, **484 have fewer than twenty plays** and
only ten have at least a hundred. Preserve that sparsity instead of making
hundreds of exact scheme targets. `MAN` is not established Duo; overlapping
`SPLIT`/`PITCH`/`LEAD`/`READ OPTION` modifiers cannot be summed as disjoint schemes.
Observed position composition is not charted personnel, and named defensive
fronts are unavailable.

## Uncertainty, roster differences and situation matching

The primary intervals resample complete games, keeping both offenses together,
and stratify by season. Shared deterministic draws make the calculation
reproducible. Intervals require enough **metric-specific** observations and
games. Rare events and zero observed events stay explicitly weak evidence;
resampling cannot discover an unseen event. Repeated teams and players across
games still create dependence these descriptive intervals do not eliminate.

For all designed runs the game-cluster interval for mean gain is roughly
4.23–4.35 yd, and for twenty-yard gains 2.17–2.44%. These are precision estimates
for the observed NFL mixture, **not acceptance limits for generated rosters**.
Across 128 RB/FB team-seasons, the observed central 80% of mean gains spans
about 3.68–4.84 yd. That spread also includes opponents, play selection and
situation; it is not an isolated distribution of RB or OL skill.

The 2022/23 versus 2024/25 comparison uses common kind/carrier/down/distance/field
weights, with support and omitted mass reported. For RB/FB designed runs,
the standardized means are 4.23 versus 4.37 yd and twenty-yard rates 2.26%
versus 2.27%. Ordinary neutral RB/FB means are about 4.59/4.60/4.81/4.82 by
season. This supports a reasonably stable reference with real temporal
variation. All four seasons have been inspected; this is **temporal replication**,
not a blind holdout or a claim of out-of-sample tuning.

Trailing and leading teams select different work. After common-cell matching,
listed RB/FB runs by teams trailing versus leading by nine-plus still show
different stuff/success/tail rates, but not a simple universal increase in
rushing efficiency when trailing. The report preserves excluded exposure.
Do not translate these observational rates into a hidden bravery, strength or
QB-risk multiplier.

The engine adapter takes its actual pre-snap mix and looks up supported NFL
conditional rows. At least 100 clean gains, 100 known observations for the
specific metric and twenty exposed games are required; unsupported exact rows
broaden by dropping field, then distance,
then down while retaining run kind and carrier group. Every fallback reports
what was discarded. Unavailable populations remain unavailable. Weighted
conditional means/rates are valid; averages of cell quantiles are not pooled
percentiles and are not produced.

## What the current engine actually needs

The published eight-game cohort has 388 actual called runs, including seven
two-point calls and 72 nullified scrimmage runs. Its familiar 309 official
non-nullified runs include seven declined/flagged native fouls. The stricter
comparison therefore uses **302 clean RB/FB runs**, not a mixture of these
different counts. Settled and raw gains agree on all 302. Native called-foul
flags are less complete than NFL officiating, so the flag filters are transparent
but not claims of identical officiating coverage.

| Current clean runs versus their supported NFL situation mix | Engine | NFL expected |
| --- | ---: | ---: |
| Mean gain | 6.262 yd | 4.679 yd |
| Mean after capping each gain at 10 yd | 3.411 yd | 3.838 yd |
| Mean after capping each gain at 20 yd | 4.228 yd | 4.350 yd |
| Stuff | 20.53% | 16.11% |
| Chosen 40/60/100 success | 31.79% | 41.05% |
| 10-yard gains | 41 | 34.00 |
| 20-yard gains | 18 | 7.61 |
| 30-yard gains | 13 | 3.22 |
| 40-yard gains | 13 | 1.90 |

These are the actual engine denominators weighting supported NFL conditional
rows; fractional expected counts are deliberate. Some references use broader
fallback populations, so full support is not a claim that every exact context
is well sampled. The current median is 2.305 yd and p99 about 77.92 yd.
Its thirteen forty-yard gains provide **45.65% of net rushing yards**.
The ordinary middle is weak while the far tail is much too large. Lowering a
global gain, strength or speed multiplier cannot address both coherently.

Nearest-whole-yard sensitivity raises current stuffs to 26.49% and yard-based
success to 35.10%; twenty/forty-yard frequencies remain 18/13. Thus the
spotting operator matters for ordinary gains but does not explain the far-tail
problem. Compare the sensitivity against its own recalculated context weights,
not against an unchanged raw-context expectation.

The historical 3cb measurement baseline has forty-nine clean pass-call scrambles
without native rusher IDs. That report retains unknown carriers. The promoted
recording fix identifies all forty-nine actual QBs in a separate source-pinned
report, without changing any gain, movement or outcome. The native sack/scramble
classification still differs from the NFL action labels, as described below.
The packet also retains generated concept/front/coverage margins and all selected
native witnesses; those engine labels do not invent equivalent NFL labels.

The largest current run witnesses start with `G1-P077` Power, 87.2 yd;
`G2-P136` Outside Zone, 84.6; `G6-P181` Wide Zone, 84.6; and `G1-P026`
Outside Zone, 78.0. They are cohort-specific IDs, not permanent seed-independent
play names. Recover their exact native inputs from the pinned index before
attempting a counterfactual. Later calls cannot be treated as paired after
earlier game history changes.

Counter is the strongest ordinary-execution nomination: **one success and
fourteen stuffs in 28 clean calls**, median 0.08 yd. Inspect `G1-P038`,
`G2-P045`, `G3-P019`, `G3-P159`, `G5-P053`, `G7-P103` and `G7-P166` for the
first failed puller/assignment/approach transition. These small samples do not
establish a causal scheme effect, but they identify useful native cases.
Outside Zone has six twenty-yard gains in 51 calls and Wide Zone three in 41;
their high means should not hide the separate Counter/Draw/Trap consistency
problem. Use the exact source/run ID as well as the scheme name.

## Physics versus football: the tested movement experiment

The exact native Cover 2/right safety witness has a plausible crossing Mike
in his already-consumed 50 ms delayed picture. The original turn overlaps
that extrapolated picture, half speed also overlaps, and production chooses
a complete stop at 4.20 and 4.25 seconds. A quarter-speed request clears all
ten observed teammates and remains upright through the same physical preview.
No extra vision, hidden teammate intent, RNG, body mutation or stronger traction
is needed to establish that local alternative.

The experiment adds one quarter-speed preview only after the existing half-speed
gather fails. It retains load/contact/squeeze exclusions and all-peer checks.
The physical World and every capability are unchanged. Local mirrored tests
support the hypothesis, but the broader football evidence blocks promotion:

| Guard | Current production | Quarter-speed experiment |
| --- | ---: | ---: |
| Ordinary 160-call mean gain | 2.617 yd | 2.988 yd |
| Stuffs / ten-yard gains | 28 / 5 | 28 / 6 |
| Retained Split Zone Under/L/S11 | 7.15 yd, tackle | 70 yd, TD |
| Retained PA Post-Dig Cover 0/R | 33.03 yd | 70 yd, TD |
| 96-pass clean completion YAC | 8.31 yd | 9.04 yd |
| Eight-game points/team-game | 37.94 | 46.06 |

All fixed inputs/profiles match and recording/plain execution is verified. The
eight games use the same initial generated rosters/seeds but later calls diverge;
the scoring comparison is a regression signal, not a paired causal estimate.
The six old native passing tails remain visible, including the unchanged
70-yard outcomes and the adverse PA mirror, 41.96→42.36 yd. The apparent
ordinary-panel mean improvement is dominated by one newly broken finish.

The experiment is retained for diagnosis, **not installed in production**.
Its source is `8d27d085b6e469115435aeae79835c571f0e124f330c8ff856a55532a5e77006`;
the measurement baseline is `3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f`.
The promoted source `8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d`
adds only the QB carrier output and preserves that baseline's physical execution.
The complete diagnosis distinguishes a safe held-command preview from future
replanned 11v11 behavior. A better local movement option is not sufficient
proof of a better shared football controller.

The retained Split Zone's first fork is the RB at **2.15 s**. All 22 bodies,
raw requests, containment and consumed pictures match beforehand; he has no
grip, engagement or last-step contact. Quarter speed clears the observed LG
by 0.392 yd, and an exact two-body held-command rollout clears actual LG by
0.737 yd without contact. Full/half requests instead collide with LG. That
first alternative is physically coherent, rather than an acceleration cheat.
Later, production gets a standing CB_S wrap at 3.90 s and a runner fall at
4.15. The experiment gets a FS lunge at 3.65, the FS falls at 3.70, and CB_S
assists at 3.80 with about 1.44 yd of extension. Both holds later slip and the
runner escapes. An extended assist may be consuming a better later standing
wrap opportunity; this is a **new hypothesis**, not yet a proven invalid
decision under that defender's actual consumed picture. Keep ordinary assists
and physically legitimate broken holds as opposing controls before changing it.

The new benchmark catches that distinction quantitatively. The experiment's
312 clean runs have near-matched ordinary success (41.99% versus 42.96%) and
ten-yard capped mean (3.841 versus 3.837 yd), yet its mean is 8.259 versus
4.653 yd and forty-yard gains are 21 versus 1.80 expected. Matching an ordinary
success rate alone would have promoted the wrong change.

## Promoted improvement: make the carrier observable

When the QB commits to scrambling, the engine now records his actual player ID
in `stats.rusher`, just as existing handoffs and keepers record their carriers.
This closes a measurement hole rather than altering an escape decision or force.
Three native tests compare the full natural scramble with recording suppressed,
a normal pass, and a real Inside Zone handoff. The original scramble test fails
only the missing-ID assertion; the repaired tests pass.

The fresh eight-game guard adds 54 scramble IDs overall, including all 49 clean
escapes, and retains **all 1,149 native final snapshots** after removing only the
new scramble-carrier output. Initial inputs, complete enumerable final runtime
state, next RNG, scores and outcomes match. External module WeakMaps are outside
the snapshot contract. All 96 passing controls also agree except for 17 added
scramble IDs and the hashes derived from that output. All 302 designed-run
aggregates and situation-matched comparisons stay identical. Historical reports
are preserved, with a separate latest report and comparability sidecar.

The repaired measurement exposes an important classification debt. Once a QB
commits to `BallCarrier`, native `finishCarry` excludes him from sack
classification even if he is tackled behind the line. The 49 clean committed
escapes average **−1.63 yd**, with a median of −5.81 and 26 negative gains.
NFL observed scrambles exclude failed escapes recorded as sacks. Therefore the
roughly 7.77-yard situation-matched NFL scramble reference is not an equivalent
attempted-escape population. Do not delete the negatives, relabel the report
after collection, or increase physical speed to fit that gap. Audit escape
decisions and official sack/scramble attribution separately before calibration.

Final validation: **1,108 TypeScript tests, 118 Python tests, typecheck and build
pass**. No controller, RNG sequence, movement capability or physical law changes
in the promoted repair.

## How to choose the next improvement

1. **Fix the largest invalid decision in a native tail first.** Retain the actual
   earlier game history, bodies, roster capabilities, minds and RNG. Trace
   installed responsibility → consumed cue → request → achieved movement →
   attempted contact → grip/support response. Repair the first demonstrated
   contradiction, then retain ordinary and mirrored cases. Do not classify
   every explosive run as a failed physical tackle.
2. **Improve ordinary run execution separately.** Use matched IZ/OZ/Power/Counter
   contexts to inspect initial contact, loaded combos, release to linebackers,
   puller paths and carrier creases. The fixed lab's cramped middle and a full
   game's excessive long tail can coexist. More strength is not a justified
   response to that combination.
3. **Open a physical law only for an infeasible or incoherent execution.** Reuse
   shared traction, grip, arm-work, momentum and support budgets. A plausible
   requested plant that generates unexplained work, fails resolution checks,
   or reacts inconsistently across football interactions warrants physics work.
   A safe preview followed by the wrong football objective warrants controller
   work. Keep the simplified World and its existing regression evidence.
4. **Then tune task and roster mappings against supported contexts.** Vary
   generated rosters, retain normal and extreme situations, and check the body
   and contact observables as well as success/tails. Preserve actual weak players
   and imperfect readings. A reasonable NFL neighborhood plus credible mechanics
   is the goal; exact league means from unrelated generated teams are not.

Start with the source-pinned current engine tail witnesses in the new packet,
and the withheld Split Zone finish as a shared movement/pursuit stress case.
Keep the unresolved airborne receiving-window issue separate. There is enough
mechanical evidence to improve football controllers now, but not enough to
give a universal physics OK or declare that 95% of physical gains are exhausted.

**Attribution:** FTN-derived charted aggregates: FTN Data via nflverse,
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
PBP/roster sections retain NFL/nflfastR/nflverse provenance. BDB-derived
aggregates do not grant rights or access to raw competition data.
