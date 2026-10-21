# A comprehensive plan for football realism

Prepared 2026-10-08 from the engine review, source inspection, seeded simulations,
and supplied Big Data Bowl datasets. This is a proposed implementation program;
the mechanisms and acceptance gates below are the proposed program. The
[run blocking and decision update](../reviews/run-blocking-and-decision-update.md)
implements an initial subset with explicit calibration limits; the larger
program and its acceptance gates remain outstanding.

**The goal is a coherent simulation of football responsibilities, physical
execution, imperfect information, and game decisions.** Realistic averages
should follow from realistic play sequences and an appropriate mix of those
sequences. We must verify both levels.

The current movement/ball/agent/game architecture is a useful foundation.
Keep it and improve its contracts, assignments, and calibrated execution.
Use mechanics for observable movement and geometry, football rules for
responsibility, and calibrated stochastic models for unresolved execution.
Tracking data cannot identify hand placement, eye gaze, or body forces
precisely enough to justify a fully inferred biomechanical simulation.

Read this alongside the [review](../reviews/2026-10-08-engine-review.md) and
[data catalog](../../../data/archive/catalog-2026-10-11.md). The latter distinguishes competition years
from seasons and records duplicate sources and analysis scope.

## 1. What realism must mean

Evaluate five dimensions together:

1. **Legal results:** scores, downs, spots, clocks, tries, penalties, and
   official statistics reconcile under a chosen ruleset.
2. **Plausible execution:** athletes obey movement limits, contacts occur in
   plausible geometry, and ball flight respects release capability.
3. **Football responsibility:** blockers, receivers, rushers, and coverage/run
   defenders execute an assignment and adjust under recognizable rules.
4. **Human decisions:** agents act on limited observations, coaches respond to
   situation and personnel, and communication/recognition mistakes have causes.
5. **Statistical fidelity:** conditional distributions, interactions, tails,
   and player/team variation match comparable observed cohorts.

A correct completion percentage does not establish realistic passing when
depth, pressure, touchdowns, interceptions, and target selection are wrong.
A correct run mean does not establish realistic running when too many plays
are stuffed and rare long gains make up the difference.

The reviewed 16-game sample has 2.95 YPC and 38.99% stuffs; the supplied 2022
labels have 4.48 and 18.37%. The sample also has 9.01 passing yards per attempt
and 35.41 points per team-game. These are diagnostic starting points, not
reconciled official metrics or sufficiently large league estimates.

## 2. The architecture we should build toward

Keep world state, observations, football plans, execution, and adjudication
separate, with typed boundaries:

| Contract | Owns | Must provide |
|---|---|---|
| `RuleSet` | Season/competition rules | Legal alignment, action legality, penalties, clocks, scoring, possession and tries |
| `PlayPlan` | Intended team responsibilities | Formation, protection, route/run rules, defensive fits and coverage, checks and communication |
| `WorldState` | Actual physical state | Positions, velocities, body orientation, ball, contacts and workload |
| `AgentObservation` | What an athlete can know | Delayed/noisy visible state, known team call, communication and uncertainty |
| `AgentMemory` | Beliefs and attention | Identified threats, responsibilities, anticipated actions, cue histories |
| `AgentIntent` | Requested action | Movement, technique, effort, target, timing, uncertainty and reason |
| `PhysicalEvent` | What actually happened | Precise time, actor IDs, spot, contact/ball/carrier changes, relevant state |
| `ResolvedPlay` | Official consequence | Accepted/declined/offsetting penalties, carrier segments, enforced spot, score, clock and down transition |
| `MetricView` | A defined measurement | Cohort, exclusions, endpoint conventions, units, sample count and provenance |

These are proposed contracts, not existing interfaces. Introduce them gradually
behind current APIs. The current `Behavior.update(a, sim)` exposes the full
simulation; migrate decision code to a restricted decision context. Physics
and adjudication can retain authoritative world access.

Each tick should sample the world consistently, compute agent intentions from
that snapshot, resolve actions and contacts, then record the resulting state
at its actual timestamp. Avoid giving a player an advantage because his update
happens earlier in an array. Use contact/ball substeps and event interpolation
where a crossing between ticks matters.

Use versioned schemas and model parameters. Store run metadata such as engine
commit, ruleset, seed hierarchy, roster seed/version, parameter version,
dataset cohort, and measurement version. Saves/replays must identify their
versions rather than silently replay through changed models.

## 3. Foundation: legal plays and trustworthy statistics

Fix the reproduced defects before outcome tuning:

- Dead-ball offside consumes a down.
- Offensive holding is skipped on touchdowns.
- Accepted holding only partially removes credited statistics.
- A completed pass followed by a lost fumble loses its completion and yards.
- A tying overtime TD/PAT can leave the game marked over.
- Third/fourth-down touchdown and turnover branches bypass down accounting.
- A live play crossing the two-minute warning restores elapsed time.

Replace partial statistical rollback with an explicit resolution pipeline:

```text
physical play events
  -> carrier and scoring segments
  -> penalty candidates and adjudication
  -> legal acceptance/decline alternatives
  -> selected official result
  -> score / possession / spot / down / clock transition
  -> official statistics and play-by-play
```

Keep raw physical diagnostics even when an accepted foul erases official
yardage, but label their cohort separately. A catch followed by a fumble needs
the reception spot, offensive progress, fumble/recovery spot, and return
segment. One net end position cannot represent all of those statistics.

Give officiating state sufficient facts: team, actor, foul time, spot,
live/dead-ball status, relation to possession changes, scoring, and the try.
Add automatic-first-down, loss-of-down, half-distance, spot enforcement,
offsetting, and timing rules where the selected rulebook requires them.
Penalty acceptance should compare legal alternatives and the game objective;
it should not simply skip every foul on a scoring or turnover play.

Implement formation legality, eligible receivers, motion/shift restrictions,
legal forward passes, grounding, DPI/OPI, defensive holding/illegal contact,
roughing, and major block restrictions. Generate foul candidates from
relevant behavior/contact whenever possible, with observation/enforcement
uncertainty. A missing rules mechanism can otherwise inflate offensive
efficiency or allow an unrealistic tactic.

Make the current-era NFL regular-season rule pack explicit, with separate
postseason and historical variants. Verify actual rulebook conditions before
implementing overtime, kickoff, end-zone loose-ball, and clock edge cases.
Comparison runs against older seasons should use compatible rule settings.

**Gate:** scenario and sequence tests for every known defect; official log,
box score and final state reconcile; possession/clock/score invariants hold
across generated games; recording does not change gameplay.

## 4. Data engineering and a common measurement pipeline

Create one normalized representation for real tracking and simulation
diagnostics. Recommended fields include dataset/season/game/play/player IDs,
frame time, coordinate transform, team side, position and on-field role,
position/velocity/orientation, ball/player availability, events, assignments,
and outcome/penalty labels. Keep missing values and uncertainty explicit.

Normalize all coordinates consistently. Preserve direction, field/boundary
side, hash, strength, and original coordinates so mirrored scenarios remain
testable. Verify frame rate, snap and release conventions, gaps, duplicate
rows, event names, participant selection, and joins.

Use high-precision simulation diagnostics; compress replay positions
separately. Compare velocities/accelerations using the same differencing and
smoothing operator on both datasets. Sensor noise and position rounding
should be represented in the measurement layer, rather than forced into
movement parameters.

Define a metric registry. Each metric must specify the denominator, timing
endpoint, player subset, penalty handling, position grouping, missingness,
units, season/ruleset, weighting, and uncertainty method. Distinguish:

- PFF hit/hurry/sack pressure labels from a two-yard proximity measure.
- Nearest-defender distance from assigned-defender distance.
- All attempts from catchable contests or completed passes.
- Target location from actual ball location and receiver catch location.
- First tackle attempt from actual first contact.
- Time to cross the LOS among crossers from the fraction failing to cross.
- Pocket depth among plays surviving to a time from all dropbacks.

The 2026 selected-player output cannot be compared directly with all 11
simulated defenders. Future `ball_land_x/y` are labels for evaluation and
learning, not information available to an agent before the throw.

### Dataset work packages

| Dataset | Best use | Expansion / limitation |
|---|---|---|
| 2019 competition, 2017 season | Broad play tendencies, full-player tracking validation across games | Extend the current one-game tracking extractor across the 91 available files; Drive and GitHub are the same source |
| 2023 competition, 2021 season | Protection roles, blocker opponents, block codes, beaten/disruption labels, pocket motion | Add trajectory extraction across eight weeks; throws observed in the week-1 audit end within five frames of release; translate codes only after dictionary verification |
| 2025 competition, 2022 season | Run concepts, contacts, coverage/blocker assignments, motion/RPOs, pressure timing | Expand tracking beyond the two reviewed weeks to all nine; keep matched-player and full-defender metrics |
| 2026 competition, 2023 season | Prethrow route/coverage motion, early response and selected postthrow trajectories | Respect play/player selection and output masks; supplementary throws do not provide an all-dropback sack denominator |
| 2027 competition, draft cohorts 2023–2025 and game seasons 2023–2025 | Linked combine measurables/drill trajectories, selected-player game execution, protection/coverage labels and career outcomes | 510-player cohort; 2023 tracking audit has only 1–6 selected players per play and no ball rows. No QB combine group. Preserve missing drills, selection, exposure and career-label censoring |

The 2027 download succeeded and its files were fingerprinted. See the
[dataset review](../reviews/bdb2027-data-review.md). Add an early work package to
link combine sprint/cut/pull/position drills to the same player's observed
game movement. This can help separate capability from task-dependent effort.
Its 510-player selection does not represent all NFL athletes; many drills are
missing, and career labels are later outcomes rather than draft-time knowledge.
Use player/draft-class holdouts and record the career observation horizon.

Additional evidence needed: official rulebooks, season-wide play-by-play and
drive data, roster/snap participation, combine and pro-day measurement
uncertainty, film review of tactical responsibilities, and separate kicking,
injury/development/workload data. Record provenance and permissible use when
adding sources. The existing archives do not supply every variable below.

**Gate:** the same metric functions process comparable real and simulated
records; every target has a reproducible cohort and sample count; held-out
splits are frozen before tuning.

## 5. Player models: capability, technique, mind, and variation

Keep four distinguishable categories:

1. **Physical capability:** sprint curve, braking, lateral acceleration,
   turning, mass, reach and reaction constraints.
2. **Technique:** releases, route precision, blocking footwork/hands, rush
   counters, tackling mechanics, throwing and catching execution.
3. **Cognition:** attention, recognition, anticipation, communication,
   decision quality and composure.
4. **State:** effort, workload, fatigue, balance, injury, confidence and
   familiarity with the responsibility.

Combine results are noisy measurements taken under particular conditions.
Use them as informative anchors with uncertainty; do not assume that every
trait has an exact transform from a single drill. Bench repetitions do not
identify football contact force, and shoulder-pad trajectories do not reveal
every player's intention or maximal effort.

Generate correlated traits from defensible position/archetype distributions.
Allow useful specialists: a long, technically strong tackle with ordinary
speed; a fast receiver with less precise routes; a safety who recognizes
patterns quickly but cannot cover every matchup. Avoid having a single
quality scalar make nearly all traits excellent together.

Player-level fitted effects need partial pooling toward position/task
distributions. Tracking opportunities differ, and a few successful reps cannot
establish an elite latent rating. Keep actual attributes separate from the
manager/scout's uncertain estimates.

Apply positional and playbook familiarity to recognition, assignment
consistency, and coordination. It should affect execution, not just lineup
selection. Cap its influence and evaluate whether unfamiliarity creates
recognizable mistakes.

**Gate:** under controlled responsibilities, changing an attribute produces
the intended effect and plausible tradeoffs. Team/coach adaptation must be
held fixed for these sensitivity checks.

## 6. Movement, effort, fatigue, and physical consistency

Fit movement in phases: stance/get-off, controlled acceleration, full sprint,
braking into a break, lateral shuffle, backpedal, hip turn, contact, recovery,
and pursuit. Separate physical potential from task-dependent effort. Role,
route, pressure, and play phase determine how much capability is used.

Retain the traction/acceleration model and validate its reachable envelope.
Fit directional acceleration/braking curves against standardized observations.
Use appropriate body orientation instead of always equating facing with
velocity. Shoulder-pad orientation is not direct eye gaze.

Repair the unused sprint-endurance factor and use consistent effective
capability in integration and reach estimates. Exertion should accumulate
during blocking and tackling as well as free running. Model short effort
bursts, repeated-play recovery, substitutions, and longer workload separately;
one reservoir need not represent every timescale.

Make collisions and engagement displacement physically consistent: no
teleporting to a target, pulling an opponent through another player, gaining
energy from separation correction, or continuing full-speed steering while
wrapped. Position correction and contact response should be bounded and
separate from voluntary propulsion.

Keep the 20 Hz world tick initially, with finer ball/contact resolution when
needed. Use timestep-convergence checks on representative catches, contacts,
and boundary crossings. Stochastic event rates must be time-based
(`p = 1 - exp(-rate * dt)` when that event model applies), with cooldowns and
state transitions for repeated opportunities. Drawing an unrelated failure
roll every tick can make behavior depend on update frequency.

**Gate:** movement/contact envelopes match by role and phase under a common
measurement operator; mirrored plays behave symmetrically where appropriate;
changing numerical resolution does not materially change the tested events.

## 7. Perception, memory, and communication

Build on the delayed perception buffer with attention and uncertainty.
Players know their own call and communicated checks; opponents' assignments
and future actions must be inferred from observable cues.

Give athletes a limited attention budget and a persistent belief about
important threats. Orientation, occlusion, distance, current task, and
communication affect cue quality. A tackle working on an edge should not
identify every late blitz as promptly as a QB scanning the whole front.
Use temporally coherent errors rather than fresh unrelated noise for every
candidate on every tick.

Model recognition transitions explicitly: cue detected, interpretation,
communication, commitment, and possible correction. Anticipation predicts from
observable tendencies and scheme knowledge. A receiver's option route should
use observed leverage/coverage cues; the QB's prediction may use the known
route plan but cannot assume perfect future execution.

Add communication events for protection declarations, coverage checks,
motion adjustments, and route changes. Familiarity and crowd conditions can
affect communication quality when evidence supports the effect.

**Gate:** decision code cannot read restricted truth through the context API;
controlled fakes, motion, disguise, and route breaks produce appropriately
delayed responses. Internal belief accuracy is diagnostic; it is not an NFL
ground-truth variable in these datasets.

## 8. Declarative football responsibilities

Upgrade a play from fixed targets/waypoints to assignment rules and permitted
adjustments. Compile a legal team plan from personnel, formation, hash,
strength, front/shell, and available checks. Athletes execute that plan using
their observations.

Represent the initial responsibility, key/read, leverage, exchange rule,
commit trigger, fallback, and legal constraints for each player. A zone
landmark is a starting reference, not a complete coverage rule. A moving
blocker's target is a responsibility, not a permanently reserved defender.

Introduce pre-snap shifts and motion as real movement with legal timing and
defensive checks. Resolve changes to receiver numbering and formation
strength when appropriate, while preserving call rules and communication.
Require diagrams/examples reviewed for football meaning before treating an
assignment label as sufficient tactical truth.

**Gate:** the assignment compiler can explain every responsibility and every
exchange for representative formations, pressures, motion and mirrored calls;
uncovered threats occur for explicit reasons rather than missing mappings.

## 9. Run offense: create and read real blocking surfaces

This is the highest-priority major behavior repair after foundations.

For inside/outside zone, duo, power, counter, trap, draw, toss and short-yardage
calls, implement distinct assignment and technique families. Check covered /
uncovered rules, gap-down-backer responsibilities, backside cutoff, and
unblocked/read defenders against actual fronts and film/labels.

Combination blocks should track which blocker owns the defender, who helps,
whether the remaining blocker has usable leverage, the back's progress, and
the linebacker threatening the lane. Release timing should follow those
conditions rather than mesh time plus a constant.

Pullers need congestion-aware footwork and an explicit job: kick out, log a
wrong-arming defender, or wrap to the linebacker. Account for exchange of
responsibility when a defender spills the play. Reach blocks should require
actually gaining leverage; failed reaches create bounce/cutback decisions.

The runner should read a small scheme-specific progression: press the landmark,
evaluate the relevant block and defender, then bang/bend/bounce as appropriate.
Use patience and vision to determine timing and the quality of that read.
Open-field heading search can remain useful after the runner leaves the
structured blocking phase. It should include pursuit uncertainty and the
runner's actual effective movement capability.

Treat draws and play action as cue manipulation. Defensive recognition must
come from visible action, so selling a pass has a mechanism. Screens and RPOs
need compatible blocking/release legality rather than being disguised ordinary
passes with an outcome bonus.

**Gate:** by concept/front/box and both directions, validate initial opponents,
combination duration, puller engagement, contact defender/spot, failure to cross
the LOS, YBC, ordinary 2–5-yard gains, stuffs, and explosive tails. Hold
personnel/calling fixed during mechanical diagnosis.

## 10. Run defense and pursuit

Maintain gap, force, spill, contain and alley responsibility through the mesh
and initial runner read. The current common chase transition can bypass
underneath run fits once a non-QB carrier is recognized; repair that transition.

Use visual keys: blocker steps, pullers, mesh action, back trajectory, and
teammate fits. Support one-gap attack and two-gap control with different
engagement objectives. Safeties and edge defenders should have explicit
constraints preventing every defender from racing directly to the ball.

Build coordinated pursuit: first defender constrains the carrier, inside-out
help protects the escape lane, backside pursuit respects cutback, and the
sideline changes the angle. A pursuit angle should reflect uncertainty about
the runner's next choice. Add a controlled breakdown phase before contact.

**Gate:** evaluate first-contact defender, fit occupancy, edge/cutback escape,
overpursuit and tackle approach. Test counters, reverses, draws and play action
with the same rule-based recognition model used on ordinary runs.

## 11. Protection and pass rush

Make protection a team responsibility with man, full/half slide, back/TE
support, check release, chips, and declared hot threats. Establish who calls
the protection and which checks are available. Assignment identification must
use alignment and rush cues; the current true behavior-kind lookup and fixed
blitz-recognition delay should be replaced.

Prioritize diagnosing the weak-side free-rusher pattern found in the held-QB
lab. Evaluate whether the declaration, geometric assignment, contact reach,
or pass-off decision produces the miss. A labelled unblocked rusher can be an
intentional hot responsibility; telemetry must distinguish that from failure.

Protection techniques need plausible set depth/width, inside leverage,
overset, punch/anchor, recovery, and pocket geometry. Use beaten-blocker labels
and displacement before tuning pressure outcomes.

Rushers choose a plan from the set and matchup, execute it, counter if the
blocker changes leverage, and respect rush-lane/contain responsibilities.
Add coordinated T-E/E-T games with penetrator/looper timing and corresponding
offensive handoffs. Simulated pressures require dropping defenders and changed
protection reads; coverage family alone does not determine rush count.

Model an actual sequence: rush engagement or free path, threat to the pocket,
QB response, pressure/disruption, sack/escape/release. Fit event timing with
release as an observation endpoint. Held-QB labs remain separate from game
dropbacks.

**Gate:** responsibility errors, engagement timing, lost reps, unblocked share,
pocket geometry, pressure incidence over time, and sacks conditional on
exposure match within comparable formation/protection/rush-count cohorts.

## 12. Receivers, man technique, and pattern coverage

Routes should have release and stem objectives, landmark/timing constraints,
leverage-dependent breaks, and adjustments coordinated with the QB. Model
press releases, avoiding an illegal pick, attacking a defender's leverage,
settling against zones, and converting legitimate option routes. Receiver
motion changes the initial problem; it does not guarantee a fixed advantage.

Man coverage needs press/off/bail, inside/outside leverage, trail/in-phase
technique, hip transition, help expectations, and ball-location decisions.
The defender should choose whether to play the receiver or locate the ball
from situation and available cues. Make double moves depend on prior stem,
anticipation, commitment, and recovery capability.

Zone coverage needs rule families: spot-drop, match variants, seam carries,
flat/curl exchanges, quarters reads, half-field support and split-field calls.
Represent route pass-offs and distribution between defenders explicitly.
Disguise should preserve legal pre-snap positions and transition timing,
creating a recognition problem rather than changing actual coverage secretly.

Brackets, robber help, banjo/switch checks against bunch/stack, and red-zone
compression are important later extensions. They depend on robust underlying
assignment and communication contracts.

**Gate:** match assigned-defender trajectories, leverage, break latency,
separation versus time, carry/exchange events, route-by-coverage outcomes, and
explosive failure patterns. Use complete 2022 defender sets where nearest
distance is required; preserve 2026 prediction subsets when using that source.

## 13. Quarterback decisions and throwing mechanics

Separate what the QB perceives, the distribution of outcomes he predicts,
which action he chooses, and the physical throw he executes.

Use concept progression, footwork timing, a limited scanning budget, protection
and hot responsibility, and a clock informed by pressure cues. Action choices
include throw now, wait/hitch, reset, check down, climb, escape, scramble,
legal throwaway, or accept a sack. Waiting must have an explicit expected
benefit and rising exposure risk.

Predict completion/interception/gain distributions from observable receiver,
defender and ball-path geometry, uncertainty, depth, pressure and matchup.
Start with interpretable calibrated models and evaluate probability
reliability. Keep QB perception mistakes separate from a receiver dropping a
well-thrown ball or a defender winning a physical contest.

Use an action value based on down, distance, spot, clock, score and possession
risk. Expected points is useful in ordinary situations; win probability and
clock consequences become important late. Replace fixed interception costs
and generic sticks bonuses gradually, validating decision changes with fixed
execution mechanics before introducing coach adaptation.

Execution should model setup/plant, release duration, platform/body movement,
arm speed, trajectory/touch, receiver lead, and correlated directional error.
Use the actual release state and enforce the final solved launch-speed limit,
including re-aimed targets. Validate short throws separately from long flights;
event/cutoff definitions currently differ between the data and engine.

**Gate:** selected depth/target/release timing, pocket response, throwaway and
scramble choices, accuracy by platform/pressure, completion/INT probability
calibration, and joint outcomes improve together on held-out cohorts.

## 14. Catching, tackles, fumbles, and postcatch play

Use a catch process: locate ball, adjust approach, enter a reachable envelope,
attempt control, survive contact, and complete the legal catch. Include boundary
awareness, body orientation, contact timing and legal control requirements.
Choose the catch action based on context, such as securing possession, gaining
yards, or reaching a boundary.

Separate inaccurate/unreachable throws, receiver execution failures, defender
breakups, interceptions, and tips. Detect swept ball-envelope intersections
where coarse ticks could miss a catch opportunity. Airborne reach/jump timing
must have physical constraints, but the supplied x/y trajectories cannot
fully fit hand/foot motion or ball spin.

For tackles distinguish opportunity, attempted contact, real impact, wrap,
miss, broken wrap, helpers, and whistle/forward progress. Repair first-contact
recording before fitting YBC: the current attempt can set that spot before
the miss roll.

Fit tackle approach and result conditional on closing speed, angle, control,
carrier change of direction, leverage, support and contact state. A wrap
changes what both players can do. Additional defenders should arrive under
their pursuit responsibilities rather than immediately freezing the carrier.

Fumbles should arise from hit/strip geometry, exposure, control and security.
Recovery uses ball motion, observation, reach and effort. Preserve carrier
segments through recovery/returns and apply touchback/safety/end-zone rules.
Fumble frequency and recovery bias need their own validation; lost fumbles
alone cannot identify both processes.

**Gate:** contact spot and duration, yards after contact, tackle outcomes and
helpers, catch outcome components, turnover attribution, and loose-ball
results are plausible under targeted scenarios and comparable data.

## 15. Offensive and defensive coaching

Begin with neutral-situation tendencies from defined cohorts, then adjust for
score/time, field zone, personnel, scheme, matchup, workload and observed
opponent tendencies. Avoid allowing early coach adaptation to hide broken
concepts during mechanical calibration.

Offense should choose a package and concept family with a protection/run
answer, then formation, motion and tags compatible with those athletes.
Use series that constrain defensive reactions: a base run, a counter to its
fit, play action off the same presentation, and a quick answer to pressure.

Defense should choose personnel, front, fit, coverage and pressure as a
compatible call. It can disguise, bracket a threat, change contain, or challenge
protection while accounting for the resulting coverage responsibility.

Learning should use plausible observations, priors and uncertainty. A few
plays should not reveal the opponent's entire strategy or latent ratings.
Persist scout/gameplan knowledge where the league model supports it and allow
individual coaches to differ coherently in risk and tactical preferences.

Separate head-coach fourth-down, timeout, tempo, and try decisions from play
execution. Validate choices against expected utility and comparable empirical
tendencies, including desperation states. Elite decision-making still operates
under uncertain beliefs and personnel limits.

**Gate:** situational play mix, tactical sequencing, response to matchup and
clock, and full-game drive/scoring distributions remain plausible without
forcing a desired score or pass/run ratio during a game.

## 16. Special teams and environment

Treat kicking units as football plays with personnel, protection, timing,
coverage lanes, blocking, return decisions, and possession rules.

Field goals/PATs require snap/hold timing and accuracy, kick launch
capability, rush/block opportunity, weather, and distance/angle. Punts require
protection, hang time and distance, directional placement, gunner/vice play,
fair-catch decisions, return blocking, and touchback/downing rules. Kickoffs
and onside attempts need the chosen season's alignment, movement timing,
landing-zone and recovery rules.

First improve result accounting and conditional distance/selection models;
add full unit trajectories where they materially affect outcomes or coaching.
Do not require perfect 22-player choreography as a prerequisite for a coherent
special-teams result model.

Introduce wind and precipitation through defined effects on ball flight,
traction, handling and decisions. Field surface, crowd/communication, and
temperature/workload require evidence and bounded effects. Avoid making
weather a universal success multiplier.

**Gate:** kick/return distributions by distance, conditions and selection,
unit responsibilities and legal field coordinates validate against separate
special-teams data. The supplied scrimmage-focused archives do not suffice.

## 17. League realism and manager decisions

Build a repeatable schedule/season/postseason layer after full-game contracts
are stable. Track participation, workload, recoveries and roster availability.
Generate team identity and player variation rather than 32 statistical copies.

Implement depth charts by actual responsibility, packages, specialists and
substitution constraints. A backup should create plausible tactical tradeoffs
and communication limitations, with coach adjustments based on available
knowledge. Expose enough of this to make roster construction meaningful.

Development should distinguish physical maturation/decline, technique learning,
scheme familiarity, and opportunity. Use position/attribute-specific curves
with uncertainty and player variation. Injury/recovery needs condition-specific
availability and workload evidence; tracking-derived collisions alone do not
identify clinical injury risk.

Scouting should report uncertain observations and scheme fit. Contracts/cap,
draft, training, morale and staff development should influence decisions through
defined mechanisms. Introduce each with invariant and distribution checks;
avoid compounding dozens of unexplained percentage bonuses.

**Gate:** simulated seasons preserve realistic participation and roster
constraints, varied team/player performance, schedule/rules correctness, and
understandable consequences for management choices.

## 18. Calibration and evaluation as an engineering system

The concrete environment for separating execution from play-calling and roster
selection — NFL context replay, policy validation without outcomes, league
structure, diagnostic callers — is planned in
[EVALUATION_ENVIRONMENT.md](EVALUATION_ENVIRONMENT.md).

Split by game before creating player/frame samples. Use held-out weeks and
teams where appropriate; test unseen players separately for that question.
Do not put frames from the same play in both training and validation. Keep
season/measurement differences visible, with hierarchical rather than blind
pooled fits.

Tune in layers: numerical/physical envelopes; observation and responsibility;
technique/contact; individual decisions; calling; full-game and season output.
Then iterate because layers interact. Freeze the unaffected layers during
each diagnosis where possible.

Use multiple criteria:

- Rules invariants and regression cases.
- Assignment and movement errors in matched role/phase cohorts.
- Event incidence and timing with censoring handled explicitly.
- Distribution differences in typical outcomes and tails.
- Completion/INT/decision probability reliability and proper scoring rules.
- Conditional depth/coverage/pressure/run-concept/box distributions.
- Joint outcomes, team/player variation, and cross-season/generalization checks.
- Expert review of representative and adversarial replays.

Observed trajectories are one of many possible executions of a play. Exact
frame-path imitation is useful for some local mechanics, but trajectory error
alone does not judge a generative engine's alternative legal actions. Combine
trajectory constraints with responsibility and distribution checks.

Weight plays or games according to the stated objective; do not let long plays
dominate merely because they have more frames. Bootstrap at game/group level
for correlated observations. Report sparse cells and uncertainty; use partial
pooling rather than forcing every cell to its observed mean.

Use parameter sensitivity and identifiability checks before tuning. If two
parameters repair the same statistic, isolate them with a controlled experiment
or retain uncertainty. Prefer a small, interpretable parameter family over
independent constants for every concept/coverage combination.

For scale, start with cheap fixed-seed scenarios and dozens of games. Promote
candidates to hundreds/thousands of paired, multi-roster games when variance
and runtime justify it. Numbers of games are experiment budgets, not guarantees
of precision. Choose sample size from effect size and measured uncertainty.
Use untouched final seeds/cohorts for release evaluation.

Every realism change should report: hypothesis, mechanism, affected cohorts,
baseline, parameter change, held-out results, uncertainty, regression outcomes,
and remaining limitations. A lower aggregate error alone is insufficient if a
core conditional behavior deteriorates.

## 19. Debugging, replay, and performance

The replay should explain decisions and responsibilities: intended assignment,
observed cue, belief/attention, chosen action, blocker exchange, gap/force
constraint, QB progression, ball estimate, contact and penalty resolution.
Provide overlays for actual versus perceived state without exposing truth to
the agent. Flag unusual plays for review automatically.

Build a realism dashboard with source/cohort filters, conditional histograms,
timing curves, sparse-cell counts, version comparisons and linked replays.
Keep official statistics separate from raw/nullified diagnostic records.

Repair RNG stream derivation and process-global IDs. Use stable seed/key
hierarchies for roster, game, play, player, subsystem and action; telemetry
must not consume gameplay randomness. Stable experiments still need explicit
coupling rules when a changed policy creates a different action sequence.

The reviewed CPU profile places about 22% of exclusive samples in reach and
intercept functions and about 6% in GC. Optimize repeated reach work,
temporary allocations and prediction reuse first, then benchmark multiple
warmed seeds with/without recording. Approximations need decision-boundary
tests and stated fidelity criteria. Parallelize independent offline games
using explicit seeds; preserve deterministic results where promised.

**Gate:** reproducible experiments, stable IDs/saves, recording invariance,
auditable decisions, and measured throughput gains with the intended accuracy.

## 20. Delivery phases and dependencies

| Phase | Deliverables | Exit gate |
|---|---|---|
| A. Trusted foundation | Known rule/stat fixes; event/result contracts; stable RNG/IDs; precise telemetry; metric registry | Resolved results reconcile; meaningful scenario tests pass; matched measurements are reproducible |
| B. Data and movement | Normalized datasets; expanded tracking extractors; frozen splits; 2027 combine-to-game capability study; role/phase motion and observation contracts | Physical envelopes and observability checks pass without fitting mismatched cohorts |
| C. Run vertical slice | One well-specified run/front family; combinations/puller foundations; runner reads; gap/force fits | Contact and gain distributions improve across mirrored controlled cases and held-out comparable cohorts |
| D. Pass vertical slice | Protection declaration/assignment; rush timing; one route/coverage family; QB action/execution separation | Pocket, pressure, leverage, release choices and outcomes improve jointly |
| E. Tactical expansion | More run/route/coverage families; exchanges; stunts; motion/screens/RPOs; contact/foul breadth | Added tactics execute legally and do not destabilize existing validated families |
| F. Full-game realism | Coordinators, head-coach choices, tempo, rotation, special teams and environment | Multi-roster held-out game/drive distributions and rules invariants pass |
| G. Season and management | Scheduling, roster availability, development, scouting, injuries and economics | Coherent seasons and meaningful management consequences with separate evidence |

Stages overlap where dependencies permit. Data plumbing, regression rules,
and explanatory tooling can progress independently against common contracts.
Assign ownership of those contracts before implementation. Calendar estimates
depend on staffing, data access, and the number of tactical variants; the exit
gates above define completion more reliably than an arbitrary date.

### First implementation backlog

| Order | Reviewable change | Primary area | Verification |
|---|---|---|---|
| 1 | Scenario tests and fixes for dead-ball down handling, scoring fouls, and down conversions | `src/game/game.ts`, `test/` | Known failing fixtures become passing rule cases |
| 2 | Carrier segments and official play commitment; remove partial stat rollback | `src/sim/types.ts`, `playsim.ts`, game/stats | Catch-fumble and accepted-penalty accounting reconcile |
| 3 | Live/dead time and complete scoring-sequence/OT transitions | game rules | Clock, try, expiry, timeout and OT sequences |
| 4 | Stable RNG keys and roster-scoped IDs | core/player generation | Repeat generation; instrumentation/recording invariance |
| 5 | High-precision events and versioned run metadata | sim/replay/scripts | Timestamp consistency and a replay explainability sample |
| 6 | Common metrics and explicit cohort selection | `scripts/data/`, calibration | Reproduce baselines with counts/exclusions; selected-defender comparison repaired |
| 7 | Expanded 2017/2021/2022 tracking extraction; 2027 combine-to-game study; frozen splits | data pipeline | Schema/join/event-quality reports, capability/effort separation and bounded-memory extraction |
| 8 | Restricted observations and memory API; migrate initial QB/block/fit decisions | perception/behaviors | Hidden-assignment and future-state leakage scenarios |
| 9 | Movement/endurance/effort consistency and reach fidelity | physics/physical/engagement | Controlled sprint/cut/contact and timestep checks |
| 10 | Scheme-aware run combinations and responsibility-preserving fits | blocking/defense | Inside-zone/front matrix; contact/stuff distribution |
| 11 | Runner read progression and gap-scheme puller exchange | carrier/run blocking | Mirrored power/counter/outside-zone cases |
| 12 | Protection declaration/pickup and pocket diagnostics | pass blocking/engagement | Weak-side free-rusher reproduction and PFF-matched cohorts |
| 13 | Rush counters/stunts and protection handoffs | rush/protection | Fixed protection/rush cases and timed pressure curves |
| 14 | Route leverage and man/zone exchanges | receiver/defense | Matched assignment/separation trajectories |
| 15 | QB probability calibration, action values and final release constraints | QB/qbmind/ball | Reliability, release/depth mix and joint outcomes |
| 16 | Contact/catch components, foul candidates and loose-ball breadth | catch/tackle/rules | First-contact, legal catch, return/fumble sequences |
| 17 | Motion, screens and RPOs on validated responsibility contracts | playbook/agents/rules | Tactical legal/assignment cases, then conditional outcomes |
| 18 | Situation/sequence-aware coaches, special teams and season entry gate | game/league | Held-out full-game evaluation before adding long-term systems |

Progress: rows 1–4 are implemented. Scenario tests in `test/game-rules.test.ts`
cover dead-ball fouls, holding acceptance and enforcement (including scores),
carrier segments for fumble-after-catch credit, conversions on scoring and
turnover plays, the two-minute warning, and overtime tries and periods;
`test/determinism.test.ts` covers named random streams and roster-scoped ids.
From row 9, sprint endurance now caps the integrator and feeds reach
estimates. Toward rows 8 and 10: defenders' run/pass reads come from
observable cues with situational and scouted expectations
(`src/sim/recognition.ts`, `test/recognition.test.ts`) instead of the true
play type, play action and draws work through those cues, and defenders keep
their run fits behind the line instead of chasing from a fixed read time.
Protection, coverage and QB decisions still read some true state.

Each row may require several small PRs. Keep a change focused on one hypothesis
with evidence; do not combine every model adjustment into one unreviewable
rewrite. Build the dashboard and descriptive replay overlays alongside this
backlog so mistakes become visible early.

## 21. The first two end-to-end demonstrations

**Run demonstration:** fixed, comparable rosters; I-form and a zone call
against an Over front with defined fits; both directions and hashes. Explain
covered/uncovered responsibilities, combination release, runner read and
first contact. Then vary the front, linebacker leverage and roster capability
one factor at a time. Compare ordinary gains and stuffs, not just the mean.

**Pass demonstration:** a gun formation, declared five-man protection against
four initial rushers, and a small route/coverage family. Explain the protection
declaration, initial matchups, pocket shape, QB scan/release, defender response
and legal catch/ending. Add one chip, blitz or twist at a time and test the
corresponding answer. Use fixed calling before adapting coaches.

These are representative slices through the architecture, not an attempt to
fit the entire NFL from one formation or one roster. Their value is that a
play can be explained from assignment to result and verified at each link.

## 22. Release criteria

Promote a model version when its specified rules and numerical invariants
pass; held-out conditional and joint distributions improve within stated
uncertainty; representative replays obey responsibility/perception contracts;
team/player variation is plausible; and performance/reproducibility meet the
stated operating target.

Set initial numerical tolerance bands after measuring source quality,
cohort sizes and simulation variance. Prioritize high-impact, well-measured
cells, and predeclare regressions that block promotion. No evidence currently
supports a universal claim such as “all metrics within 5%” or “NFL accuracy.”

The intended outcome is an engine in which roster attributes, tactical calls,
execution, and coaching produce intelligible football consequences—and those
consequences remain defensible across situations, opponents, seeds and seasons.
