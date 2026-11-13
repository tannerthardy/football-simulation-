# Football simulation engine review

Reviewed 2026-10-08, repository `tannerthardy/football-simulation-`, checkout `work`, commit `2c77763482dd7cc06f28ead447f99c29ca160654`. The requested source ref was `claude/football-sim-engine`.

**Recommendation:** first repair game rules and statistical accounting, then establish comparable NFL measurements. The largest behavioral priorities are run blocking and defensive run fits, protection assignments, and the relationship between coverage, pressure, and quarterback decisions. These changes should make the engine more realistic across situations and player matchups. Current aggregate calibration cannot reliably identify the right parameter changes.

## Scope and evidence

Both supplied Google Drive aids were downloaded successfully after the environment settings changed. They contain CSV archives:

| Aid | Contents | Material analyzed |
|---|---|---|
| [Drive file 1](https://drive.google.com/file/d/1gL9sbsrRPvrR21alUB83fcsvWRbgohk7/view) | Big Data Bowl 2025: 2022 season, weeks 1–9; games, plays, players, player-play labels, and nine tracking files | All play/player labels; tracking weeks 1 and 2 |
| [Drive file 2](https://drive.google.com/file/d/13Q5f54OG3FZOKA49Y6RO8k7jnAHweLmL/view) | Big Data Bowl 2026 analytics: 2023 season, supplementary pass-play labels and 18 weeks of input/output tracking | All 18 weeks through the existing extractor; additional player-selection audit of week 1 |

The unchanged repository extractors regenerated **exactly the committed JSON summaries** from these files. The 2025 tracking summary corresponds to the two extracted weeks, rather than all nine. Small generated diagnostics are included in [data/reviews/2026-10-08](../../../data/reviews/2026-10-08). Raw data remained outside the checkout during the review; application source was unchanged.

The review covered the major layers: player generation and physical profiles, field geometry and physics, alignment and playbooks, agent perception and decisions, blocking and engagement, catching and tackling, game rules and coaching, statistical accounting, replay export, tests, and calibration scripts. It is a code and numerical review; browser interaction and every possible rules sequence were not exercised.

Validation performed:

- Existing suite: **15 tests pass** across physics and alignment. Typecheck and build pass.
- Seeded 16-game calibration: 2,293 logged scrimmage plays, approximately 14.8 seconds total.
- Eight recorded games for the kinematics comparison.
- Controlled 200-repetition protection lab and 200 repetitions each of inside zone, outside zone, and counter.
- Ten targeted defect reproductions, plus a separate audit of the 16-game sample.
- One CPU profile of the built seed-7 demonstration game.

The small generated league and fixed-roster labs establish useful discrepancies and regressions. They do not establish league-wide confidence intervals or prove that a proposed behavior change will cause a particular improvement.

## What is already working well

The separation of physical profiles, movement, behaviors, play simulation, and game management is a useful foundation. Measurables anchor sprint capability; acceleration, braking, directional movement, reach, and ball flight provide mechanisms through which ratings can affect outcomes. Full-game simulation, a replay viewer, and targeted labs make those mechanisms inspectable.

The existing data extractors and committed aggregate summaries are reproducible. The controlled labs are especially valuable: a change to run blocking or protection can be examined with fixed personnel and calls before adaptive coaching changes the mix of plays. Preserve these tools and expand their diagnostics.

The engine is already fast enough for iterative development. The 16-game run averaged about 923 ms per game in this environment. Realism and correctness are the immediate constraints; CPU improvements can increase the number of calibration experiments afterward.

## Priority findings: correctness and measurement

The following are reproduced defects. “P1” means address before relying on game outcomes or calibration; “P2” means address before expanding the affected feature or using it for evaluation. The reproduction harness exposes the compiled private `Game` class in an external copy. Two scoring fixtures substitute a known `PlaySim.run` result temporarily. Other probes call the relevant methods directly. This distinguishes controlled rule demonstrations from naturally occurring full-game events.

| Priority | Finding and evidence | Code | Recommended correction |
|---|---|---|---|
| P1 | **Dead-ball offside consumes a down.** Third-and-10 becomes fourth-and-5 and adds a third-down attempt. | [game.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L370), [advance](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L527) | Give dead-ball enforcement its own transition. Preserve the down unless the penalty reaches the line to gain; do not count a play or conversion attempt. |
| P1 | **Offensive holding cannot wipe out a touchdown.** The enforcement branch explicitly excludes scoring plays. A holding-plus-TD fixture awards six points and records zero penalties. | [game.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L426) | Resolve acceptance, enforcement, and the resulting score before committing the official play. Use penalty-specific rules, including spot enforcement where applicable. |
| P1 | **Accepted holding rolls back only part of the statistics.** A wiped-out completion leaves team plays, receiver YAC, and defender pressure credit behind. In 16 games, 37 accepted-holding plays still enter the calibration log. | [recordStats](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L697), [undoPlayStats](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L802), [calibrate.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/scripts/calibrate.ts#L53) | Keep raw physical events separately from official, accepted play records. Calculate box scores and official calibration metrics from the accepted record; avoid partial rollback. A separate pressure diagnostic may deliberately retain nullified plays if its cohort says so. |
| P1 | **A completed pass followed by a lost fumble loses its completion and reception.** Four such completions occurred in the sample. The play result also loses pre-turnover yardage. | [game.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L727), [playsim.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/playsim.ts#L545) | Store the catch, carrier progress to the fumble, recovery, and return as separate segments. Credit the completed pass/rush through the relevant statistical spot. |
| P1 | **Overtime can finish on a tying TD plus PAT.** A second-possession team trailing 7–0 scores six, setting `over=true`; the PAT ties 7–7 without clearing that flag. | [game.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L194) | Decide overtime completion after the scoring sequence and required try. Make regular-season/postseason and season-specific rules explicit. |
| P1 | **Third- and fourth-down touchdowns bypass conversion accounting.** A third-down TD fixture records zero attempts and conversions. The sample contains 23 third-down TDs and three fourth-down TDs. Turnover branches also bypass the shared down accounting. | [TD branch](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L457), [advance](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L535) | Count eligible down attempts and conversions from the resolved play, including scores and turnovers. Repair this before tuning coaches against the current 32.8% third-down figure. |
| P1 | **A live play crossing the two-minute warning restores elapsed time.** An eight-second play starting at 125 seconds ends at 120 instead of 117. | [game.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/game/game.ts#L201) | Distinguish live-play elapsed time from between-play runoff. Apply the warning after the live play ends, retaining its elapsed time. |
| P2 | **Sprint endurance is calculated but omitted by the movement integrator.** Fresh and loaded runners have identical resulting velocity although the loaded runner's endurance factor is 0.9. | [effectiveVmax](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/physics/kinematics.ts#L62), [stepBody](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/physics/kinematics.ts#L96) | Use a consistent effective speed cap in movement and reach estimates; then validate workload/recovery across free movement and contact phases. |
| P2 | **Named RNG forks depend on creation order.** Adding another fork changes the subsequent `physics` stream. Most play behaviors also share a common random stream. | [rng.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/core/rng.ts#L110) | Derive subsystem streams from immutable seed/key material. Keep telemetry from consuming gameplay draws. Existing same-input determinism is useful, but it does not provide subsystem isolation. |
| P2 | **Player IDs depend on a process-global generation counter.** Repeating the same seeded generation yields the same measurables but different IDs. | [generator.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/players/generator.ts#L194) | Scope identity generation to a league/roster generation context. Persist stable IDs and test reproduction after unrelated generation work. |

Detailed results: [reproduced-findings.json](../../../data/reviews/2026-10-08/reproduced-findings.json), [full-game audit](../../../data/reviews/2026-10-08/engine-audit.json).

Additional rule paths merit dedicated cases before expanding the game layer: legal versus illegal throwaways, pass interference, defensive-return holding, loose balls through either end zone, onside recovery field coordinates, kneels with defensive timeouts, and the kickoff after a safety. These are review targets; they were not all demonstrated with end-to-end fixtures. For example, [tryHold](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/engagement.ts#L631) always marks holding against `O`, which needs examination when the blocking team changes during a defensive return.

### The calibration comparison needs repair

**Selected defenders are not an all-22 nearest-defender measurement.** The 2026 input contains a subset of offensive and coverage players. Output trajectories contain only selected players. In week 1, **816 of 819 plays have fewer output defenders than input defenders**, and 66 plays have no output defender. The extractor measures arrival separation among available output defenders; the simulation comparison measures it among all simulated defenders.

Consequently, current separation-at-arrival and closing comparisons are not equivalent cohorts. They remain useful diagnostics, but they cannot justify an exact coverage-speed adjustment. Inspect the selection rules and align the simulated player subset where a defensible mapping exists. For complete nearest-defender measurements, use 2025 tracking with all players. Also calculate assigned-defender distance from player-play matchup labels: assignment coverage and nearest geometric coverage answer different questions.

Other measurement corrections:

- **Catch separation is selectively recorded.** [catching.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/catching.ts#L110) populates the target's separation during receiver catch contests. Uncatchable misses and some defender-first plays are missing. The 4.75% tight-window result is calculated over this selected subset, not all comparable pass attempts.
- **Pressure has multiple definitions.** The game pressure flag, a defender within two yards, and PFF pressure labels are distinct. Do not compare the 23% engine flag directly with a PFF range without validating the mapping. Keep separate metrics for proximity, an unblocked rusher, forced QB movement, and labelled pressure.
- **The 2026 supplementary cohort contains thrown passes, rather than all dropbacks.** Its observed completion rate is approximately 69.25%; its tracking subset is smaller again. It cannot supply a sack-rate denominator. Use 2025 labels for sacks, scrambles, and pressure denominators.
- **TTT and ball-arrival endpoints differ.** The 2026 extractor uses input frame count divided by 10 for TTT; elapsed time between first and last frames is one frame shorter if both endpoints are included. Verify the intended convention. The output duration and the engine's first catch/PBU/incompletion event also need a common arrival definition.
- **Speed and acceleration use different operators.** Real summaries use provided `s` and `a`; simulated summaries differentiate positions rounded to 0.1 yard and apply a moving average. That is not proof of identical smoothing. Compute both sides from positions with the same operator and retain high-precision simulation state for diagnostics. Harmonize OLB/EDGE versus LB/DL groups too.
- **Timing is conditional on survival.** Pocket depth at 2.5 seconds excludes earlier releases; time to the LOS excludes runners who never cross. Preserve those conditions and also report the excluded fraction.
- **Baselines require provenance.** The generic ranges in `calibrate.ts` combine seasons, definitions, and player qualification criteria. For example, its 1.5–2.3 YBC target differs from the supplied two-week tracking mean of 1.16. The engine uses a 2025 kickoff model while these NFL aids describe 2022 and 2023. Version rule settings and comparison cohorts.

Update the [roadmap](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/docs/ROADMAP.md#L33) claim that the kinematics comparison measures both sides “exactly the way” the extractors do. It currently overstates measurement equivalence.

## Current numerical picture

The following simulation figures are **current diagnostic output**, including the accounting limitations above. NFL figures marked “harness” are the repository's generic ranges, not newly estimated targets from these archives.

| Metric | Simulation, 16 games | Reference | Interpretation |
|---|---:|---:|---|
| Points/team-game | 35.41 | 21–23.5, harness | Scoring is high; fix score enforcement, tempo, and pass efficiency. |
| Logged scrimmage plays/team-game | 71.66 | 61–65, harness | Includes nullified holding; clock and coaching need joint review. |
| Total yards/team-game | 458.31 | 320–345, harness | Large efficiency imbalance remains after allowing for accounting issues. |
| Passing yards/attempt | 9.01 | 6.8–7.2, harness | Too much output per attempt. |
| Pass TD/attempt | 7.49% | 4–4.8%, harness | Investigate depth, explosive windows, red-zone behavior, and wiped-out scores. |
| Completion rate | 66.89% | 63–66%, harness | Near the broad range; the joint distribution is still wrong. Removing logged accepted-holding attempts alone gives 66.53%, not fully corrected official statistics. |
| Interceptions/attempt | 3.75% | 2–2.5%, harness | High despite high scoring; examine risky throw selection and contest resolution separately. |
| aDOT | 9.77 yd | 7.5–8.5 yd, harness | QB/coach selection is skewed toward deeper throws. |
| Rush yards/carry | 2.95 | **4.48**, 2022 labels | Major run-game weakness. |
| Runs gaining ≤0 yards | 38.99% | **18.37%**, 2022 labels | Approximately twice the observed stuff rate. |
| Runs gaining 10+ yards | 8.66% | **11.73%**, 2022 labels | Improve the distribution, including ordinary successful runs. |
| Dropbacks/logged plays | 75.84% | **61.01%**, 2022 defined runs/dropbacks | Coach selection and weak run efficiency interact. |

See [calibration log](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/2026-10-08/calibration-16-seed7.log). The real 2022 run/dropback comparison excludes plays outside those definitions, such as kneels/spikes; the current engine log uses its own narrower play categories. Reconcile those definitions before establishing pass/fail thresholds.

The eight-game tracking diagnostic adds useful directional evidence:

- Median TTT is 2.30 s versus 2.60 s in the 2023 traditional-dropback summary; median QB depth at throw is close, 7.90 versus 7.85 yards.
- Prethrow WR maximum-speed median is 15.3 versus 14.05 mph; CB is 11.3 versus 9.82. Speed, route execution, effort, and time available must be disentangled.
- Two-yard geometric pressure occurs on 27.0% versus 32.49% of the 2022 tracking cohort. Its median first occurrence is earlier, 2.20 versus 2.70 s. The engine may have too few pressure events but an overly early subset; a single rush-strength multiplier cannot reliably repair both.
- Handoff median is 1.20 versus 1.30 s; LOS-crossing median among crossers is 2.10 versus 2.60 s. Contact timing and the failure-to-cross fraction matter alongside these medians.

The printed separation and flight-time differences require the cohort and event fixes described above. Full output: [kinematics log](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/2026-10-08/kinematics-8-seed5.log).

## What the Big Data Bowl data can teach the engine

### 1. Learn blocking responsibilities and run phases

The 2025 labels contain **49,104 player-play rows with a first blocking opponent** across the file. They also identify additional opponents, run concepts, motion, and defensive alignments. Use these with tracking to build empirical distributions of who initially blocks whom, who helps, when combinations separate, where pullers engage, and which defender makes first contact. Labels do not automatically supply an exact time-varying assignment; infer changes from trajectories and verify representative plays.

The current [run-block planner](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/behaviors/blocking.ts#L227) uses greedy covered/uncovered assignments. Combination release is mostly mesh time plus a constant, or linebacker proximity. [Pullers](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/behaviors/blocking.ts#L428) follow fixed waypoints. Those are useful starting rules, but they cannot express all leverage and responsibility changes.

Improve assignments by concept, front, strength, and box composition. Release a combination when the remaining blocker can sustain it and the backer threatens the intended lane. Give pullers paths that account for congestion, kick-out versus wrap responsibility, and the actual defender's leverage. Let the runner press a landmark and then choose a lane from observed blocking progress.

There is also a credible defensive mechanism to inspect: [pursueIfLive](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/behaviors/defense.ts#L32) can trigger chase as soon as a non-QB carrier is recognized, even behind the LOS. [Underneath zone defenders](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/behaviors/defense.ts#L259) then return the chase command before their run-fit branch. Maintain gap, force, spill, and alley responsibility until the runner's movement warrants committing. This is a code-path finding, not a proven sole cause of the observed stuff rate.

Concept-level diagnostics expose where to look. Excluding accepted holding in the sample, draw averages 0.73 yards on 39 carries with 64.1% stuffs; power averages 1.97 on 85 with 38.8% stuffs. Outside zone averages 5.10 on 37 but still has 48.6% stuffs. A respectable mean can hide an unrealistic mixture of losses and long gains.

The fixed I-form/Over/Cover-3 lab yields 2.32 yards for inside zone, 4.42 for outside zone, and 0.93 for counter. These are controlled regression scenarios, not direct NFL concept estimates. Expand to mirrored calls, hashes, fronts, roster strengths, and box counts before concluding that a side or concept is intrinsically broken.

**Measure success:** assignment errors, contact point, blocker displacement, shed timing, first-contact defender, YBC distribution, failure to cross the LOS, stuff rate, and yards after contact by concept/front. Keep rare explosive plays from dominating the fitting objective.

### 2. Learn protection and pressure as a timed process

The 2022 labels record 3,265 pressured dropbacks out of 9,736, approximately **33.54%**. Four rushers account for about 67% of labelled dropbacks; pressure rate increases with observed rush count. These are useful conditional benchmarks, with protection, personnel, and situation accounted for.

The [protection coordinator](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/behaviors/blocking.ts#L41) reads the defender's true behavior kind. Blitz recognition includes a fixed 0.35-second delay rather than the blocker's mental rating. Greedy, sticky assignment within home zones can produce missed pickups. In the 200-repetition held-QB lab, the weak-side end is never blocked in 25 reps; other slots have no such reported misses. Diagnose that assignment asymmetry before changing every rusher's power.

Use blocker-opponent and pressure-caused/allowed labels to evaluate slides, man responsibility, chips, check releases, and twist handoffs. Represent recognition from movement and alignment cues with rating-dependent delay. Fit when a blocker makes contact, maintains leverage, allows pocket displacement, loses, and permits pressure.

Treat throw, scramble, pressure, and sack as competing timed events. A quick release prevents some later pressures from being observed. The raw data's pressured plays have longer mean TTT than unpressured plays, 3.297 versus 2.525 s; that association does not establish that pressure causes a longer hold. A held-QB lab is a separate cohort from normal game dropbacks.

**Measure success:** cumulative pressure incidence over time, unblocked-rusher share, pressure source, pocket shape, and sacks conditional on exposure. Validate opponent matchup and rush-count effects. Verify the field dictionary before interpreting a labelled “get-off” time as a reaction delay.

### 3. Learn coverage responsibility and the response to a throw

The 2025 file has **43,484 player-play rows with a primary coverage matchup** and labelled coverage responsibilities. These support evaluating who a defender is responsible for, the landmark or receiver he follows, and when he passes a route off. Verify the meaning of assignment codes against the dataset dictionary before mapping them to engine zones.

The 2026 trajectories are particularly useful for the transition from prethrow coverage to pursuit of the receiver/ball. Use matched players to fit response latency, directional change, acceleration, leverage, and closing distance by coverage and route. Separate man trailing technique from zone breaks and deep-safety help. Player orientation is a body-direction cue, not measured eye gaze.

Current hand-tuned coverage signatures in [qbmind.ts](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/qbmind.ts#L52) can be replaced or checked against observable shell and defender-motion distributions. The engine's 73.43% “coverage family read right” is an internal diagnostic. These archives do not tell us what the real QB believed, so that percentage has no direct empirical target.

The data's coverage and route outcome tables can reveal missing tactical interactions. For instance, hitches have different completion rates against labelled man and zone. Do not implement those tables as unconditional completion bonuses: depth, receiver skill, pressure, play design, and selection also differ.

**Measure success:** coverage assignment consistency, leverage and separation trajectories for matched cohorts, route carry/pass-off behavior, and outcomes conditional on route, depth, coverage, and pressure.

### 4. Improve QB choices and distinguish them from throw execution

The [window evaluator](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/behaviors/qb.ts#L385) combines reach estimates into hand-tuned probabilities and assigns a roughly fixed 45-yard interception cost. Completion percentage alone does not validate those probabilities or the action selection they drive. High YPA, aDOT, TD rate, and INT rate together suggest a need to examine the joint distribution of chosen throws and their execution.

Use tracking and labels to fit/check completion and interception estimates conditional on observable state: receiver/defender geometry and velocity, depth, leverage, pressure, and available flight time. Evaluate probability calibration by reliability bins and proper scoring rules. Then improve target/release policy using down, distance, field position, clock, and expected points. Keep a separate mechanical accuracy model for arm strength, movement, pressure, and target location.

A minimal first model can be an interpretable regression or conditional lookup with shrinkage. The architecture does not require a large neural model. Sparse cells and ambiguous labels need uncertainty rather than extreme inferred probabilities.

There are information shortcuts to remove as this matures. [Option receivers](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/behaviors/receiver.ts#L106) query the actual coverage's man flag, and protection reads true assignments. Shared predicted ball trajectories can make agents more informed than their perception model implies. Use noisy estimates from observable cues consistently. Future `ball_land_x`/`ball_land_y` in the 2026 inputs are useful labels; they must not enter prethrow decisions or a presnap coverage classifier.

### 5. Calibrate movement by task and phase

Preserve the combine-derived physical capability model. Learn game effort and directional behavior separately: initial acceleration, braking before a break, lateral redirection, backpedal-to-turn transition, pursuit angle, and speed under contact. Global burst/cut multipliers currently combine multiple causes.

Run and pass phases show different discrepancies. The current diagnostic has high WR/CB prethrow maximum speeds, high run-play OL/DL peak accelerations, and lower run-play RB acceleration. Uniformly reducing acceleration cannot resolve that pattern. Use comparable smoothing, then condition on role, route, phase, direction, and distance to the play.

Correct the unused sprint-endurance factor and review effort expenditure during run engagements and tackle bonds. The existing data can support within-play workload observations. These short season excerpts do not independently establish long-term aging, injury, or fatigue laws; those league features will need additional evidence.

### 6. Calibrate catching, contact, and tackling separately

The 2025 all-player trajectories and reception, YAC, solo/assisted tackle, pass-defense, and fumble labels can connect approach geometry to the final event. Compare relative speed, approach angle, first-contact location, additional defenders arriving, contact duration, and yards gained afterward. This supports checking the [tackle bond](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/tackle.ts#L192) model's stopping force, forward progress, and gang-tackle behavior.

First align the contact definition: [attempt](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/tackle.ts#L103) records `firstContactX` before the miss roll, so a whiff can establish the engine's first-contact spot. That may differ from the real `first_contact` event and therefore affect YBC comparisons. Track attempted tackles, actual impact, wraps, broken wraps, and the final tackle distinctly. These particular archives do not provide a complete explicit label for every missed tackle; infer opportunities carefully and report uncertainty.

Likewise, distinguish inaccurate throws, receiver drops, contested catches, pass breakups, and interceptions. Validate the hand-tuned [catch/defender contest probabilities](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/catching.ts#L83) against joint depth, leverage, pressure, and outcome distributions. Overall completion rate can look plausible while those components compensate for one another.

The 2026 output contains player x/y trajectories, not measured three-dimensional ball flight or hand/foot positions. It can constrain travel duration and horizontal movement, but it does not identify drag, jump timing, legal foot placement, or reach independently. Use physical constraints and targeted tests for those details. At release, also verify the final solved launch velocity against the QB's arm limit: [minFlightTime](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/physics/ball.ts#L90) returns an optimum lob time for out-of-range targets, and [QB release](https://github.com/tannerthardy/football-simulation-/blob/2c77763482dd7cc06f28ead447f99c29ca160654/src/sim/behaviors/qb.ts#L462) solves the re-aimed throw without a final arm-speed check. This is a validation gap identified in code, rather than a measured incidence of impossible throws.

### 7. Add missing tactical actions and improve coaching

RPO labels appear on **1,634 of the 15,959 defined runs/dropbacks**, approximately 10.24%, in the 2022 sample. RPOs, motion/shift, screens, and dedicated short-yardage actions deserve support because they alter assignments and the decision tree. A static playbook cannot reproduce their frequencies or interactions simply by tuning existing outcomes.

Motion offers a useful example of careful interpretation. Runs with motion at the snap average 4.472 yards versus 4.481 without it in this sample. Passing completion rates are 67.98% versus 63.27%, with other conditions uncontrolled. The evidence supports investigating alignment changes, defensive checks, and matchups; it does not justify a flat motion yardage or completion bonus.

Use situational labels for coach tendencies: the supplied summary has around 52% dropbacks on first down, 72% on second-and-long, and 93% on third/fourth-and-long. Fit neutral situation tendencies first, then score/time effects and adaptation. Evaluate coaching separately under fixed physical parameters. Otherwise the coach can avoid a broken run scheme and hide its problem while driving the pass share upward.

Special teams need a separate reference cohort. The 93.55% field-goal rate in the current game sample should be examined by distance, kicker strength, conditions, and attempt selection. These scrimmage-focused aids do not establish a matched league-wide kicking or modern kickoff benchmark. Keep special-teams outcome calibration separate from pass/run tracking and version the relevant rules.

## Computational optimization

The single compiled-game profile has 1,342 samples over approximately 1.45 seconds. Aggregated exclusive sample shares are about **8.42% `sprintTime`, 8.12% `timeToReach`, 5.22% `interceptPoint`, and 6.26% garbage collection**. The three reach/intercept functions account for roughly 22% of exclusive samples. Inclusive timings overlap and must not be added.

Prioritize:

1. Reuse per-tick state and repeated reach inputs within pursuit/window/carrier evaluation. Cache only genuinely identical inputs, including fatigue, effort, heading, and radius when those affect the model.
2. Reduce temporary vectors, arrays, closures, and repeated candidate construction in hot loops. Profile after each change; allocations are a plausible contributor to GC, not a measured object-level attribution here.
3. Test cheaper reach approximations or coarser-to-finer interception searches against the exact solver on representative distances and directions. Check decisions near tackle/throw boundaries, where small errors can change outcomes.
4. Process offline games independently with stable game/roster seeds. Keep CSV extraction streaming and preserve reproducible summaries.

Collision resolution is about 2.61% of exclusive samples in this profile. A complex spatial index is a lower-priority experiment for 22 agents than reducing repeated reach work. Avoid reducing the physics tick rate merely to gain speed before checking contact and event accuracy.

This profile is one cold game, not a production benchmark. Benchmark multiple warmed seeds, with and without recording, before claiming a speedup. Require identical results for changes intended to preserve behavior; use statistical and controlled-lab acceptance criteria for deliberate approximations. [Profile summary](../../../data/reviews/2026-10-08/cpu-profile-summary.json).

## Implementation order and acceptance gates

| Stage | Concrete work | Gate before proceeding |
|---|---|---|
| 1. Reliable game results | Fix the seven P1 rules/accounting issues; add resolved-play and carrier-segment records; distinguish official/nullified events. | All reproduced cases become passing regression tests; box score, official log, score, possession, and down state agree. |
| 2. Comparable measurements | Document cohorts/units/time conventions; fix selected-defender and catch-only comparisons; emit precise diagnostic state. | One measurement pipeline can process normalized real and simulated records with explicit exclusions and sample counts. |
| 3. Run mechanics | Improve assignments, combinations, puller movement, runner choices, and defensive fits in controlled situations. | Stuff/contact distributions improve across concept/front/strength cells and mirrored scenarios without relying on rare long runs. |
| 4. Protection and pass behavior | Repair missed pickups; fit timed pressure and coverage responses; calibrate QB probabilities and action choice. | Matched conditional timing/outcome distributions improve together; no worsening hidden behind aggregate completion rate. |
| 5. Tactical breadth and coaches | Add motion, RPOs, screens, and short-yardage actions; learn situational calling. | New actions have plausible assignments and observed frequency; full-game scoring, tempo, and play mix hold on untouched seeds. |
| 6. Throughput and league growth | Optimize demonstrated CPU hotspots; stabilize RNG/IDs; broaden season/roster features. | Repeated benchmarks show a gain with the intended fidelity guarantees and reproducible roster/game identity. |

Meaningful regression coverage should include penalty-plus-score/turnover sequences, fumble-after-catch statistics, overtime tries, clock crossings, down conversions, mirrored coordinates, and recording-on/off determinism. Current tests have no game, stats, penalty, tackling, or coverage integration suite. Target observable invariants and known failures rather than duplicating implementation formulas.

For calibration, split by **game** before generating player/frame samples. Reserve later weeks and some teams/matchups for validation; use player/group holdouts for questions about unseen players. Keep the 2022 and 2023 cohorts identifiable. Never place frames from the same play in both training and validation.

Define separate losses for movement, assignments, timing, contact, action selection, and official outcomes. Report medians/tails and conditional cells with sample counts; bootstrap by game rather than treating correlated frames as independent. Tune a small parameter family at a time with paired seeds where possible. Keep a frozen final evaluation set so repeated tuning does not consume the validation evidence.

Success should be demonstrated on untouched seeds and cohorts, with meaningful error reductions and preserved rules invariants. The present runs establish where the engine needs work; they do not quantify the benefit of changes that have not yet been implemented.

## Reproduction and provenance

Use Node 22 in your own checkout before invoking repository scripts:

```bash
cd <your-checkout>
npm ci
npm test
npm run typecheck
npm run build
npm run calibrate -- 16 7
npx tsx scripts/kinematics-compare.ts 8 5
npx tsx scripts/trench-lab.ts 200 7 over
npx tsx scripts/sim-play.ts iz_strong cover3 200 7
npx tsx scripts/sim-play.ts oz_strong cover3 200 7
npx tsx scripts/sim-play.ts counter cover3 200 7
```

The targeted reproductions and additional game audit used session-specific helpers outside the checkout, tied to the reviewed build. Their result JSON is included here; the helpers are not a portable committed regression suite. The reproduction helper asserted the existing failures to demonstrate them, rather than corrected behavior.

The regenerated summaries matched the committed outputs: [2025 summary](../../../data/bdb2025-summary.json), [2026 summary](../../../data/bdb2026-summary.json). Independent raw-label audit: [2025 labels](../../../data/reviews/2026-10-08/2025-label-audit.json). Selected-player audit: [2026 week 1](../../../data/reviews/2026-10-08/2026-cohort-audit.json).

Archive SHA-256:

```text
aid-1.zip  743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3
aid-2.zip  360a32614d528e69220cacb39f6beddc580bfd2b9818c22194f1c3c394ccc1a1
```

Raw archives remain outside the checkout. No engine fixes, dependency changes, or calibration-parameter edits were made as part of this review.

## Additional source: 2017 tracking collection

After this review, the shared source catalog added [ryurko/Big-Data-Bowl](https://github.com/ryurko/Big-Data-Bowl), pinned to `0dac66ce81e5fd22ca48f35ea6a637c523dda12b`. It exposes 91 tracking games from the 2017 season (about 2.47 GB of CSVs). The existing `bdb2017.ts` extractor uses only one tracking game; broadening that selection can improve validation across matchups. These additional trajectories have not been analyzed in the numerical findings above. See [the collaborator access guide](../../../data/archive/catalog-2026-10-11.md) for provenance, dataset terms, and storage choices.

## Additional source: Big Data Bowl 2023

The newly supplied 2023 competition archive covers the **2021 season, weeks 1–8**. Its 8,557 plays have complete 22-player scouting records, including blocker opponents, block codes, beaten-blocker labels, and hits/hurries/sacks caused or allowed. A week-1 tracking check confirms 22 players plus the football over each play, with tracked throws ending shortly after release. This strengthens protection assignment and timed pressure validation; it does not provide complete postthrow trajectories for YAC or long-flight closing. See [the dataset review](bdb2023-data-review.md) and [label summary](../../../data/bdb2023-summary.json). The prior numerical engine findings above have not been rerun or retuned using this source.

## Verified archive of the 2017 tracking collection

The additional `Big-Data-Bowl-master.zip` Drive upload is an exact snapshot of the pinned 2019 competition repository. All 94 CSVs match the cataloged Git blob hashes and byte sizes, and the unchanged extractor reproduces the committed 2017 summary exactly. This is another access route to the same 91 games, not an independent dataset; tracking summary metrics still use only one game. See [the archive review](bdb2019-archive-review.md).

## Additional source: Big Data Bowl 2027

The authenticated Kaggle download supplies nine CSVs (2.31 GB) linking a 510-player 2023–2025 draft cohort to combine drill trajectories, selected game trajectories, player-play labels and career outcomes. The initial 2023 game audit confirms selected-player coverage rather than all-22 tracking. This strengthens capability-versus-effort calibration and later scouting/development evaluation, subject to missing drills, selection and exposure/censoring controls. See [the dataset review](bdb2027-data-review.md) and [comprehensive implementation plan](../plans/REALISM_PLAN.md). No prior engine baseline was retuned with this source.
